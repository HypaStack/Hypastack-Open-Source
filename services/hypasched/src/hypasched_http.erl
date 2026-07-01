-module(hypasched_http).
-behaviour(gen_server).

%% Minimal HTTP/1.1 endpoint over a Unix domain socket, mirroring the
%% transport the hash sidecar uses. One short-lived request per connection.
%%
%%   GET  /health            -> {"ok":true,"jobs":N}
%%   POST /schedule          -> arm/replace an expiry job
%%        {"id","r2_key","user_id","fire_at_ms"}
%%   POST /burn              -> arm a burn-after-download deletion
%%        {"id","r2_key","user_id","delay_ms"}

-export([start_link/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).
-export([acceptor/1]).

-define(RECV_TIMEOUT_MS, 5000).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

init([]) ->
    Path = hypasched_env:get_str("SCHED_SOCKET_PATH", "/run/hypasched/sched.sock"),
    _ = file:delete(Path),
    case gen_tcp:listen(0, [binary, {ifaddr, {local, Path}}, {active, false},
                            {packet, raw}, {backlog, 64}]) of
        {ok, LSock} ->
            _ = file:change_mode(Path, 8#660),
            Acceptor = proc_lib:spawn_link(?MODULE, acceptor, [LSock]),
            logger:info("listening on ~s", [Path]),
            {ok, #{lsock => LSock, acceptor => Acceptor, path => Path}};
        {error, Reason} ->
            {stop, {listen_failed, Reason}}
    end.

handle_call(_Msg, _From, State) ->
    {reply, {error, badcall}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Msg, State) ->
    {noreply, State}.

terminate(_Reason, #{lsock := LSock, path := Path}) ->
    catch gen_tcp:close(LSock),
    _ = file:delete(Path),
    ok.

acceptor(LSock) ->
    case gen_tcp:accept(LSock) of
        {ok, Sock} ->
            Pid = proc_lib:spawn(fun() -> handle_conn(Sock) end),
            _ = gen_tcp:controlling_process(Sock, Pid),
            Pid ! go,
            acceptor(LSock);
        {error, closed} ->
            ok;
        {error, Reason} ->
            logger:warning("accept failed: ~p", [Reason]),
            timer:sleep(100),
            acceptor(LSock)
    end.

handle_conn(Sock) ->
    receive go -> ok after ?RECV_TIMEOUT_MS -> ok end,
    try
        {Method, Path, Body} = read_request(Sock, <<>>),
        {Status, RespBody} = route(Method, Path, Body),
        respond(Sock, Status, RespBody)
    catch
        Class:Reason ->
            logger:warning("request handling failed: ~p:~p", [Class, Reason]),
            catch respond(Sock, 400, #{error => <<"bad request">>})
    after
        gen_tcp:close(Sock)
    end.

route(<<"GET">>, <<"/health">>, _Body) ->
    {200, #{ok => true, jobs => hypasched_manager:job_count()}};
route(<<"POST">>, <<"/schedule">>, Body) ->
    #{<<"id">> := Id, <<"r2_key">> := R2Key, <<"fire_at_ms">> := FireAt} = Body,
    UserId = maps:get(<<"user_id">>, Body, null),
    true = is_binary(Id) andalso is_binary(R2Key) andalso is_integer(FireAt),
    hypasched_manager:schedule_expiry(Id, R2Key, UserId, FireAt),
    {200, #{ok => true}};
route(<<"POST">>, <<"/burn">>, Body) ->
    #{<<"id">> := Id, <<"r2_key">> := R2Key, <<"delay_ms">> := Delay} = Body,
    UserId = maps:get(<<"user_id">>, Body, null),
    true = is_binary(Id) andalso is_binary(R2Key) andalso is_integer(Delay),
    hypasched_manager:schedule_burn(Id, R2Key, UserId, Delay),
    {200, #{ok => true}};
route(_Method, _Path, _Body) ->
    {404, #{error => <<"not found">>}}.

read_request(Sock, Buf) ->
    case binary:split(Buf, <<"\r\n\r\n">>) of
        [Head, Rest] ->
            [ReqLine | HeaderLines] = binary:split(Head, <<"\r\n">>, [global]),
            [Method, Path | _] = binary:split(ReqLine, <<" ">>, [global]),
            Len = content_length(HeaderLines),
            Body = read_body(Sock, Rest, Len),
            Parsed = case Body of
                <<>> -> #{};
                _ -> json:decode(Body)
            end,
            {Method, strip_query(Path), Parsed};
        _ when byte_size(Buf) > 65536 ->
            error(request_too_large);
        _ ->
            {ok, More} = gen_tcp:recv(Sock, 0, ?RECV_TIMEOUT_MS),
            read_request(Sock, <<Buf/binary, More/binary>>)
    end.

content_length(HeaderLines) ->
    lists:foldl(fun(Line, Acc) ->
        case binary:split(Line, <<":">>) of
            [Name, Value] ->
                case string:lowercase(string:trim(Name)) of
                    <<"content-length">> -> binary_to_integer(string:trim(Value));
                    _ -> Acc
                end;
            _ -> Acc
        end
    end, 0, HeaderLines).

read_body(_Sock, Buf, Len) when byte_size(Buf) >= Len ->
    binary:part(Buf, 0, Len);
read_body(Sock, Buf, Len) ->
    {ok, More} = gen_tcp:recv(Sock, 0, ?RECV_TIMEOUT_MS),
    read_body(Sock, <<Buf/binary, More/binary>>, Len).

strip_query(Path) ->
    case binary:split(Path, <<"?">>) of
        [P, _] -> P;
        [P] -> P
    end.

respond(Sock, Status, BodyMap) ->
    Body = iolist_to_binary(json:encode(BodyMap)),
    Reason = case Status of
        200 -> <<"OK">>;
        400 -> <<"Bad Request">>;
        404 -> <<"Not Found">>;
        _ -> <<"Error">>
    end,
    Resp = [
        <<"HTTP/1.1 ">>, integer_to_binary(Status), <<" ">>, Reason, <<"\r\n">>,
        <<"content-type: application/json\r\n">>,
        <<"content-length: ">>, integer_to_binary(byte_size(Body)), <<"\r\n">>,
        <<"connection: close\r\n\r\n">>,
        Body
    ],
    gen_tcp:send(Sock, Resp).
