-module(hypasched_app).
-behaviour(application).

-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    hypasched_env:load(),
    hypasched_sup:start_link().

stop(_State) ->
    ok.
