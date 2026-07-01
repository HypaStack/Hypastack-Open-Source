-module(hypasched_redis).

%% Minimal RESP client used only to bust the main app's caches after a
%% deletion so dashboards refresh promptly. Strictly best-effort: any failure
%% is logged and swallowed (Redis is a cache, Postgres stays the truth).

-export([bust_user_caches/1]).

-define(TIMEOUT_MS, 3000).

-spec bust_user_caches(binary() | undefined | null) -> ok.
bust_user_caches(UserId) when is_binary(UserId), UserId =/= <<>> ->
    try
        with_conn(fun(Sock) ->
            Keys = [
                <<"hs:user:", UserId/binary, ":files">>,
                <<"hs:user:", UserId/binary, ":file-stats">>,
                <<"hs:user:", UserId/binary, ":storage">>
            ],
            _ = command(Sock, [<<"DEL">> | Keys]),
            Pattern = <<"hs:route:", UserId/binary, ":files:list:*">>,
            del_pattern(Sock, Pattern, <<"0">>)
        end)
    catch
        Class:Reason ->
            logger:warning("cache bust failed for ~s: ~p:~p", [UserId, Class, Reason]),
            ok
    end;
bust_user_caches(_) ->
    ok.

del_pattern(Sock, Pattern, Cursor) ->
    case command(Sock, [<<"SCAN">>, Cursor, <<"MATCH">>, Pattern, <<"COUNT">>, <<"100">>]) of
        {ok, [NextCursor, Keys]} when is_list(Keys) ->
            case Keys of
                [] -> ok;
                _ -> _ = command(Sock, [<<"DEL">> | Keys])
            end,
            case NextCursor of
                <<"0">> -> ok;
                _ -> del_pattern(Sock, Pattern, NextCursor)
            end;
        _ ->
            ok
    end.

with_conn(Fun) ->
    {Host, Port, Auth} = parse_url(hypasched_env:get_str("REDIS_URL", "redis://127.0.0.1:6379")),
    {ok, Sock} = gen_tcp:connect(Host, Port, [binary, {active, false}, {packet, raw}], ?TIMEOUT_MS),
    try
        case Auth of
            undefined -> ok;
            {user, U, P} -> {ok, _} = command(Sock, [<<"AUTH">>, U, P]);
            {pass, P} -> {ok, _} = command(Sock, [<<"AUTH">>, P])
        end,
        Fun(Sock),
        ok
    after
        gen_tcp:close(Sock)
    end.

parse_url(Url) ->
    Map = uri_string:parse(Url),
    Host = maps:get(host, Map, "127.0.0.1"),
    Port = maps:get(port, Map, 6379),
    Auth = case maps:get(userinfo, Map, undefined) of
        undefined -> undefined;
        Info ->
            case string:split(Info, ":") of
                ["", Pass] -> {pass, list_to_binary(Pass)};
                [User, Pass] -> {user, list_to_binary(User), list_to_binary(Pass)};
                [Pass] -> {pass, list_to_binary(Pass)}
            end
    end,
    {Host, Port, Auth}.

%% --- RESP encode/decode -----------------------------------------------------

command(Sock, Args) ->
    ok = gen_tcp:send(Sock, encode(Args)),
    {Reply, _Rest} = read_reply(Sock, <<>>),
    case Reply of
        {error, _} = E -> E;
        Value -> {ok, Value}
    end.

encode(Args) ->
    N = integer_to_binary(length(Args)),
    Parts = [begin
        L = integer_to_binary(byte_size(A)),
        [<<"$">>, L, <<"\r\n">>, A, <<"\r\n">>]
    end || A <- Args],
    [<<"*">>, N, <<"\r\n">> | Parts].

read_reply(Sock, Buf) ->
    {Line, Rest} = read_line(Sock, Buf),
    case Line of
        <<"+", S/binary>> -> {S, Rest};
        <<":", I/binary>> -> {binary_to_integer(I), Rest};
        <<"-", E/binary>> -> {{error, E}, Rest};
        <<"$", L/binary>> ->
            case binary_to_integer(L) of
                -1 -> {null, Rest};
                Len ->
                    {Data, Rest2} = read_exact(Sock, Rest, Len + 2),
                    <<Bulk:Len/binary, "\r\n">> = Data,
                    {Bulk, Rest2}
            end;
        <<"*", L/binary>> ->
            case binary_to_integer(L) of
                -1 -> {null, Rest};
                Count -> read_array(Sock, Rest, Count, [])
            end
    end.

read_array(_Sock, Buf, 0, Acc) ->
    {lists:reverse(Acc), Buf};
read_array(Sock, Buf, N, Acc) ->
    {Value, Rest} = read_reply(Sock, Buf),
    read_array(Sock, Rest, N - 1, [Value | Acc]).

read_line(Sock, Buf) ->
    case binary:split(Buf, <<"\r\n">>) of
        [Line, Rest] -> {Line, Rest};
        _ ->
            {ok, More} = gen_tcp:recv(Sock, 0, ?TIMEOUT_MS),
            read_line(Sock, <<Buf/binary, More/binary>>)
    end.

read_exact(Sock, Buf, Len) when byte_size(Buf) >= Len ->
    <<Data:Len/binary, Rest/binary>> = Buf,
    {Data, Rest};
read_exact(Sock, Buf, Len) ->
    {ok, More} = gen_tcp:recv(Sock, 0, ?TIMEOUT_MS),
    read_exact(Sock, <<Buf/binary, More/binary>>, Len).
