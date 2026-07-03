-module(hypasched_periodic).
-behaviour(gen_server).

%% The cleanups that are inherently scans rather than timed events:
%%  - upload staging rows older than 2 hours (abandoned uploads),
%%  - dumpster pastes untouched for 180 days,
%%  - expired display-name holds (released names past their reservation window),
%%  - branding on accounts that are no longer on a paid plan (downgrade cleanup).
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
    try cleanup_name_holds() catch C3:R3 -> logger:error("name-hold sweep crashed: ~p:~p", [C3, R3]) end,
    try reconcile_downgrades() catch C4:R4 -> logger:error("downgrade reconcile crashed: ~p:~p", [C4, R4]) end,
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

%% Delete display-name holds whose reservation window has elapsed, freeing the
%% name for anyone to register again.
cleanup_name_holds() ->
    Sql = <<"DELETE FROM display_name_holds WHERE expires_at < NOW()">>,
    case hypasched_db:query(Sql, []) of
        {ok, _} -> ok;
        {error, Reason} -> logger:warning("name-hold sweep query failed: ~p", [Reason])
    end.

%% Strip download-page branding from accounts that are no longer on a paid plan.
%% Deletes the banner object, holds the freed display name, and clears the
%% columns. The avatar is intentionally left alone (it's not a paid feature).
reconcile_downgrades() ->
    Sql = <<"SELECT id, banner_url, display_name FROM users "
            "WHERE tier NOT IN ('essential','premium','ultimate','advanced') "
            "AND (banner_url IS NOT NULL OR display_name IS NOT NULL) LIMIT 200">>,
    case hypasched_db:query(Sql, []) of
        {ok, Rows} when is_list(Rows) ->
            lists:foreach(fun reconcile_user/1, Rows),
            report("downgrade", length(Rows));
        {error, Reason} ->
            logger:warning("downgrade reconcile query failed: ~p", [Reason])
    end.

reconcile_user({Id, BannerUrl, DisplayName}) ->
    case BannerUrl of
        null -> ok;
        undefined -> ok;
        _ -> _ = hypasched_r2:delete_object(BannerUrl)  %% best-effort
    end,
    case DisplayName of
        null -> ok;
        undefined -> ok;
        _ ->
            %% Hold the released name for 14 days (locked for everyone), matching
            %% DISPLAY_NAME_HOLD_DAYS on the Node side.
            HoldSql = <<"INSERT INTO display_name_holds (name_lower, released_by, expires_at) "
                        "VALUES (lower($1), $2, NOW() + INTERVAL '14 days') "
                        "ON CONFLICT (name_lower) DO UPDATE SET released_by = EXCLUDED.released_by, expires_at = EXCLUDED.expires_at">>,
            _ = hypasched_db:query(HoldSql, [DisplayName, Id])
    end,
    ClearSql = <<"UPDATE users SET banner_url = NULL, display_name = NULL, display_name_changed_at = NULL WHERE id = $1">>,
    case hypasched_db:query(ClearSql, [Id]) of
        {ok, _} -> ok;
        {error, Reason} -> logger:warning("downgrade reconcile clear ~s failed: ~p", [Id, Reason])
    end.

report(_What, 0) -> ok;
report(What, N) -> logger:info("~s sweep cleaned ~b", [What, N]).
