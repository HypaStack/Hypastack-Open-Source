-module(hypasched_sup).
-behaviour(supervisor).

-export([start_link/0]).
-export([init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    SupFlags = #{strategy => one_for_one, intensity => 10, period => 60},
    Children = [
        #{id => hypasched_db,
          start => {hypasched_db, start_link, []},
          restart => permanent,
          type => worker},
        #{id => hypasched_worker_sup,
          start => {hypasched_worker_sup, start_link, []},
          restart => permanent,
          type => supervisor},
        #{id => hypasched_manager,
          start => {hypasched_manager, start_link, []},
          restart => permanent,
          type => worker},
        #{id => hypasched_periodic,
          start => {hypasched_periodic, start_link, []},
          restart => permanent,
          type => worker},
        #{id => hypasched_http,
          start => {hypasched_http, start_link, []},
          restart => permanent,
          type => worker}
    ],
    {ok, {SupFlags, Children}}.
