-module(hypasched_env).

%% Loads configuration from a mounted .env file (same one the main app uses)
%% into persistent_term. Real OS environment variables take precedence, so a
%% container can still override any single value.

-export([load/0, get/1, get/2, get_str/2]).

load() ->
    Path = case os:getenv("ENV_FILE") of
        false -> "/app/.env";
        P -> P
    end,
    Vars = case file:read_file(Path) of
        {ok, Bin} -> parse(Bin);
        {error, Reason} ->
            logger:warning("env file ~s unreadable: ~p", [Path, Reason]),
            #{}
    end,
    persistent_term:put(?MODULE, Vars),
    ok.

-spec get(string()) -> binary() | undefined.
get(Key) -> ?MODULE:get(Key, undefined).

-spec get(string(), term()) -> binary() | term().
get(Key, Default) ->
    case os:getenv(Key) of
        false ->
            Vars = persistent_term:get(?MODULE, #{}),
            maps:get(list_to_binary(Key), Vars, Default);
        V ->
            list_to_binary(V)
    end.

%% Convenience: value as a charlist (for APIs that want strings).
-spec get_str(string(), string()) -> string().
get_str(Key, Default) ->
    case ?MODULE:get(Key, undefined) of
        undefined -> Default;
        Bin -> binary_to_list(Bin)
    end.

parse(Bin) ->
    Lines = binary:split(Bin, [<<"\r\n">>, <<"\n">>], [global]),
    lists:foldl(fun(Line0, Acc) ->
        Line = string:trim(Line0),
        case Line of
            <<>> -> Acc;
            <<"#", _/binary>> -> Acc;
            _ ->
                case binary:split(Line, <<"=">>) of
                    [K, V] ->
                        Acc#{string:trim(K) => unquote(string:trim(V))};
                    _ ->
                        Acc
                end
        end
    end, #{}, Lines).

unquote(<<Q, Rest/binary>> = V) when Q =:= $"; Q =:= $' ->
    Size = byte_size(Rest),
    case Size > 0 andalso binary:at(Rest, Size - 1) =:= Q of
        true -> binary:part(Rest, 0, Size - 1);
        false -> V
    end;
unquote(V) ->
    V.
