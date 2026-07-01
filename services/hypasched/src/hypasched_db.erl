-module(hypasched_db).
-behaviour(gen_server).

%% Owns a single epgsql connection, reconnecting with backoff when it drops.
%% Query volume here is tiny (a handful of deletes/lookups per firing job),
%% so one shared connection is plenty.

-export([start_link/0, query/2]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(RECONNECT_MS, 5000).
-define(QUERY_TIMEOUT_MS, 20000).

-record(state, {conn = undefined :: pid() | undefined}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% Returns {ok, Rows} (list of tuples, possibly empty) for SELECTs,
%% {ok, Count} for DML, or {error, Reason}.
-spec query(iodata(), list()) -> {ok, list() | non_neg_integer()} | {error, term()}.
query(Sql, Params) ->
    try
        gen_server:call(?MODULE, {query, Sql, Params}, ?QUERY_TIMEOUT_MS)
    catch
        exit:Reason -> {error, {db_call_failed, Reason}}
    end.

init([]) ->
    process_flag(trap_exit, true),
    self() ! connect,
    {ok, #state{}}.

handle_call({query, _Sql, _Params}, _From, #state{conn = undefined} = State) ->
    {reply, {error, not_connected}, State};
handle_call({query, Sql, Params}, _From, #state{conn = Conn} = State) ->
    Reply = case epgsql:equery(Conn, Sql, Params) of
        {ok, _Cols, Rows} -> {ok, Rows};
        {ok, Count} -> {ok, Count};
        {ok, Count, _Cols, _Rows} -> {ok, Count};
        {error, Reason} -> {error, Reason}
    end,
    {reply, Reply, State};
handle_call(_Msg, _From, State) ->
    {reply, {error, badcall}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(connect, State) ->
    Opts = #{
        host => hypasched_env:get_str("DB_HOST", "127.0.0.1"),
        port => list_to_integer(hypasched_env:get_str("DB_PORT", "5432")),
        username => hypasched_env:get_str("DB_USER", "postgres"),
        password => hypasched_env:get_str("DB_PASSWORD", ""),
        database => hypasched_env:get_str("DB_NAME", "postgres"),
        ssl => case hypasched_env:get_str("DB_SSL", "false") of
            "true" -> required;
            _ -> false
        end,
        timeout => 10000
    },
    case epgsql:connect(Opts) of
        {ok, Conn} ->
            logger:info("db connected"),
            {noreply, State#state{conn = Conn}};
        {error, Reason} ->
            logger:error("db connect failed: ~p", [Reason]),
            erlang:send_after(?RECONNECT_MS, self(), connect),
            {noreply, State#state{conn = undefined}}
    end;
handle_info({'EXIT', Conn, Reason}, #state{conn = Conn} = State) ->
    logger:error("db connection lost: ~p", [Reason]),
    erlang:send_after(?RECONNECT_MS, self(), connect),
    {noreply, State#state{conn = undefined}};
handle_info(_Msg, State) ->
    {noreply, State}.

terminate(_Reason, #state{conn = Conn}) when is_pid(Conn) ->
    catch epgsql:close(Conn),
    ok;
terminate(_Reason, _State) ->
    ok.
