-module(hypasched_periodic).
-behaviour(gen_server).

%% The two cleanups that are inherently scans rather than timed events:
%%  - upload staging rows older than 2 hours (abandoned uploads),
%%  - dumpster pastes untouched for 180 days.
%% Runs hourly, mirroring the batch limits of the old in-app sweep.

-export([start_link/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2]).

-define(TICK_MS, 60 * 60 * 1000).
-define(FIRST_TICK_MS, 60 * 1000).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

init([]) ->
    erlang:send_after(?FIRST_TICK_MS, self(), tick),
    {ok, #{}}.

handle_call(_Msg, _From, State) ->
    {reply, {error, badcall}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(tick, State) ->
    try cleanup_staging() catch C1:R1 -> logger:error("staging sweep crashed: ~p:~p", [C1, R1]) end,
    try cleanup_dumpster() catch C2:R2 -> logger:error("dumpster sweep crashed: ~p:~p", [C2, R2]) end,
    erlang:send_after(?TICK_MS, self(), tick),
    {noreply, State};
handle_info(_Msg, State) ->
    {noreply, State}.

cleanup_staging() ->
    cleanup_staging_batch(0, 0).

cleanup_staging_batch(Batch, Cleaned) when Batch >= 3 ->
    report("staging", Cleaned);
cleanup_staging_batch(Batch, Cleaned) ->
    Sql = <<"SELECT id, r2_key FROM upload_staging "
            "WHERE created_at < NOW() - INTERVAL '2 hours' LIMIT 500">>,
    case hypasched_db:query(Sql, []) of
        {ok, []} ->
            report("staging", Cleaned);
        {ok, Rows} when is_list(Rows) ->
            N = lists:foldl(fun({Id, R2Key}, Acc) ->
                _ = hypasched_r2:delete_object(R2Key),  %% best-effort
                case hypasched_db:query(<<"DELETE FROM upload_staging WHERE id = $1">>, [Id]) of
                    {ok, _} -> Acc + 1;
                    {error, Reason} ->
                        logger:warning("staging row ~s delete failed: ~p", [Id, Reason]),
                        Acc
                end
            end, 0, Rows),
            cleanup_staging_batch(Batch + 1, Cleaned + N);
        {error, Reason} ->
            logger:warning("staging sweep query failed: ~p", [Reason])
    end.

cleanup_dumpster() ->
    Sql = <<"SELECT id, r2_key FROM dumpster_pastes "
            "WHERE last_accessed_at < NOW() - INTERVAL '180 days' LIMIT 100">>,
    case hypasched_db:query(Sql, []) of
        {ok, Rows} when is_list(Rows) ->
            N = lists:foldl(fun({Id, R2Key}, Acc) ->
                case hypasched_r2:delete_object(R2Key) of
                    ok ->
                        case hypasched_db:query(<<"DELETE FROM dumpster_pastes WHERE id = $1">>, [Id]) of
                            {ok, _} -> Acc + 1;
                            {error, Reason} ->
                                logger:warning("paste ~s row delete failed: ~p", [Id, Reason]),
                                Acc
                        end;
                    {error, Reason} ->
                        logger:warning("paste ~s r2 delete failed: ~p", [Id, Reason]),
                        Acc
                end
            end, 0, Rows),
            report("dumpster", N);
        {error, Reason} ->
            logger:warning("dumpster sweep query failed: ~p", [Reason])
    end.

report(_What, 0) -> ok;
report(What, N) -> logger:info("~s sweep cleaned ~b", [What, N]).
