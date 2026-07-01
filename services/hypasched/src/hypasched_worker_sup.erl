-module(hypasched_worker_sup).
-behaviour(supervisor).

%% One child per pending deletion job. transient: a worker that crashes is
%% restarted with the same job args (nothing is lost), a worker that finishes
%% (exit normal) is not.

-export([start_link/0, start_job/1]).
-export([init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

start_job(Job) ->
    supervisor:start_child(?MODULE, [Job]).

init([]) ->
    SupFlags = #{strategy => simple_one_for_one, intensity => 50, period => 60},
    Child = #{
        id => hypasched_worker,
        start => {hypasched_worker, start_link, []},
        restart => transient,
        shutdown => 5000,
        type => worker
    },
    {ok, {SupFlags, [Child]}}.
