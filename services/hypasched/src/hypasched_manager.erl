-module(hypasched_manager).
-behaviour(gen_server).

%% Owns the job registry (ETS) and decides what gets a worker:
%%  - on startup, loads every pending row from Postgres and arms a worker per
%%    file (burned rows fire shortly after their burned_at, everything else at
%%    its expires_at), so nothing is lost across restarts;
%%  - accepts schedule/burn requests pushed from the main app over the socket;
%%  - reconciles against the DB every few hours as a safety net for any
%%    notification that never arrived.

-export([start_link/0, schedule_expiry/4, schedule_burn/4, job_count/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2]).

-define(RECOVER_RETRY_MS, 30000).
-define(RECONCILE_MS, 6 * 60 * 60 * 1000).
-define(BURN_DELAY_MS, 90000).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

schedule_expiry(Id, R2Key, UserId, FireAtMs) ->
    gen_server:cast(?MODULE, {schedule, #{kind => expiry, id => Id, r2_key => R2Key,
                                          user_id => UserId, fire_at_ms => FireAtMs}}).

schedule_burn(Id, R2Key, UserId, DelayMs) ->
    FireAt = erlang:system_time(millisecond) + DelayMs,
    gen_server:cast(?MODULE, {schedule, #{kind => burn, id => Id, r2_key => R2Key,
                                          user_id => UserId, fire_at_ms => FireAt}}).

job_count() ->
    case ets:info(hypasched_jobs, size) of
        undefined -> 0;
        N -> N
    end.

init([]) ->
    ets:new(hypasched_jobs, [named_table, public, set]),
    self() ! recover,
    erlang:send_after(?RECONCILE_MS, self(), reconcile),
    {ok, #{}}.

handle_call(_Msg, _From, State) ->
    {reply, {error, badcall}, State}.

handle_cast({schedule, Job}, State) ->
    arm(Job, replace),
    {noreply, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(recover, State) ->
    case load_pending() of
        {ok, Jobs} ->
            [arm(Job, skip_existing) || Job <- Jobs],
            logger:info("recovery armed ~b job(s)", [length(Jobs)]);
        {error, Reason} ->
            logger:warning("recovery load failed (~p), retrying", [Reason]),
            erlang:send_after(?RECOVER_RETRY_MS, self(), recover)
    end,
    {noreply, State};
handle_info(reconcile, State) ->
    case load_pending() of
        {ok, Jobs} ->
            Armed = [Job || Job <- Jobs, arm(Job, skip_existing) =:= armed],
            case Armed of
                [] -> ok;
                _ -> logger:info("reconciliation armed ~b missed job(s)", [length(Armed)])
            end;
        {error, Reason} ->
            logger:warning("reconciliation load failed: ~p", [Reason])
    end,
    erlang:send_after(?RECONCILE_MS, self(), reconcile),
    {noreply, State};
handle_info(_Msg, State) ->
    {noreply, State}.

%% Every row is a pending job: burned rows (burn_on_read = 2) fire at
%% burned_at + delay, everything else at expires_at.
load_pending() ->
    Sql = <<"SELECT id, r2_key, user_id, "
            "(extract(epoch FROM expires_at) * 1000)::bigint, "
            "burn_on_read, "
            "(extract(epoch FROM burned_at) * 1000)::bigint "
            "FROM basedrop_files">>,
    case hypasched_db:query(Sql, []) of
        {ok, Rows} when is_list(Rows) ->
            Now = erlang:system_time(millisecond),
            Jobs = [row_to_job(Row, Now) || Row <- Rows],
            {ok, Jobs};
        {error, Reason} ->
            {error, Reason}
    end.

row_to_job({Id, R2Key, UserId, ExpiresAtMs, BurnState, BurnedAtMs}, Now) ->
    case BurnState of
        2 ->
            FireAt = case BurnedAtMs of
                null -> Now + ?BURN_DELAY_MS;
                Ms -> max(Now, Ms + ?BURN_DELAY_MS)
            end,
            #{kind => burn, id => Id, r2_key => R2Key, user_id => UserId,
              fire_at_ms => FireAt};
        _ ->
            #{kind => expiry, id => Id, r2_key => R2Key, user_id => UserId,
              fire_at_ms => ExpiresAtMs}
    end.

arm(#{id := Id} = Job, Mode) ->
    case ets:lookup(hypasched_jobs, Id) of
        [{Id, Pid, _Kind}] ->
            case {Mode, is_process_alive(Pid)} of
                {skip_existing, true} ->
                    skipped;
                {replace, true} ->
                    Pid ! cancel,
                    start_worker(Job);
                {_, false} ->
                    ets:delete(hypasched_jobs, Id),
                    start_worker(Job)
            end;
        [] ->
            start_worker(Job)
    end.

start_worker(Job) ->
    case hypasched_worker_sup:start_job(Job) of
        {ok, _Pid} -> armed;
        {error, Reason} ->
            logger:error("failed to start worker for ~s: ~p", [maps:get(id, Job), Reason]),
            error
    end.
