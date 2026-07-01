-module(hypasched_worker).

%% One process per pending deletion. Sleeps until the job's fire time (in
%% chunks, so arbitrarily distant expiries work), re-checks the DB row at the
%% moment of firing (an expiry that moved re-arms instead of deleting), then
%% deletes the R2 object before the DB row and busts the owner's caches.
%% Failures retry forever with capped exponential backoff; a crash gets the
%% process restarted by the supervisor with the same job.

-export([start_link/1]).
-export([init/1]).

-define(MAX_CHUNK_MS, 12 * 60 * 60 * 1000).   %% re-check wall clock every 12h
-define(BACKOFF_BASE_MS, 5000).
-define(BACKOFF_CAP_MS, 10 * 60 * 1000).

%% Job :: #{kind := expiry | burn, id := binary(), r2_key := binary(),
%%          user_id := binary() | null, fire_at_ms := integer()}
start_link(Job) ->
    Pid = proc_lib:spawn_link(?MODULE, init, [Job]),
    {ok, Pid}.

init(#{id := Id, fire_at_ms := FireAt} = Job) ->
    ets:insert(hypasched_jobs, {Id, self(), maps:get(kind, Job)}),
    wait_until(FireAt),
    run(Job, 0).

wait_until(FireAt) ->
    Now = erlang:system_time(millisecond),
    Delay = FireAt - Now,
    if
        Delay =< 0 ->
            ok;
        Delay > ?MAX_CHUNK_MS ->
            receive cancel -> exit(normal)
            after ?MAX_CHUNK_MS -> wait_until(FireAt)
            end;
        true ->
            receive cancel -> exit(normal)
            after Delay -> ok
            end
    end.

run(#{id := Id, kind := Kind} = Job, Attempt) ->
    case pre_check(Kind, Id) of
        gone ->
            finish(Id);
        {rearm, NewFireAt} ->
            wait_until(NewFireAt),
            run(Job#{fire_at_ms => NewFireAt}, 0);
        proceed ->
            attempt_delete(Job, Attempt);
        {error, Reason} ->
            %% Can't see the DB — do NOT touch R2 blindly (the row may have
            %% changed). Back off and re-check.
            logger:warning("job ~s pre-check failed (~p), backing off", [Id, Reason]),
            backoff_then(fun() -> run(Job, Attempt + 1) end, Attempt)
    end.

%% Burned files are already unreachable (burn_on_read = 2) and must always be
%% deleted; expiries re-validate against the row's current expires_at.
pre_check(burn, _Id) ->
    proceed;
pre_check(expiry, Id) ->
    Sql = <<"SELECT (extract(epoch FROM expires_at) * 1000)::bigint "
            "FROM basedrop_files WHERE id = $1">>,
    case hypasched_db:query(Sql, [Id]) of
        {ok, []} -> gone;
        {ok, [{FireAt}]} ->
            Now = erlang:system_time(millisecond),
            case FireAt > Now + 1000 of
                true -> {rearm, FireAt};
                false -> proceed
            end;
        {error, Reason} -> {error, Reason}
    end.

attempt_delete(#{id := Id, r2_key := R2Key, user_id := UserId} = Job, Attempt) ->
    case hypasched_r2:delete_object(R2Key) of
        ok ->
            %% R2 object gone; now the row. If this half fails we retry the
            %% whole thing — re-deleting a missing R2 key is a no-op.
            case hypasched_db:query(<<"DELETE FROM basedrop_files WHERE id = $1">>, [Id]) of
                {ok, _} ->
                    hypasched_redis:bust_user_caches(user_id_bin(UserId)),
                    logger:info("deleted ~s (~p)", [Id, maps:get(kind, Job)]),
                    finish(Id);
                {error, Reason} ->
                    logger:warning("job ~s: row delete failed (~p), retrying", [Id, Reason]),
                    backoff_then(fun() -> attempt_delete(Job, Attempt + 1) end, Attempt)
            end;
        {error, Reason} ->
            logger:warning("job ~s: r2 delete failed (~p), retrying", [Id, Reason]),
            backoff_then(fun() -> attempt_delete(Job, Attempt + 1) end, Attempt)
    end.

backoff_then(Fun, Attempt) ->
    Delay = min(?BACKOFF_BASE_MS bsl min(Attempt, 20), ?BACKOFF_CAP_MS),
    receive cancel -> exit(normal)
    after Delay -> Fun()
    end.

finish(Id) ->
    case ets:lookup(hypasched_jobs, Id) of
        [{Id, Pid, _}] when Pid =:= self() -> ets:delete(hypasched_jobs, Id);
        _ -> ok
    end,
    exit(normal).

user_id_bin(null) -> undefined;
user_id_bin(undefined) -> undefined;
user_id_bin(Bin) when is_binary(Bin) -> Bin;
user_id_bin(_) -> undefined.
