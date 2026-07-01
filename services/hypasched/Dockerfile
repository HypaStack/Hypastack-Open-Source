FROM docker.io/library/erlang:27 AS build

WORKDIR /src
COPY rebar.config ./
COPY config ./config
COPY src ./src
RUN rebar3 as prod release

FROM docker.io/library/debian:bookworm-slim AS run

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libssl3 libncursesw6 libtinfo6 libsctp1 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /src/_build/prod/rel/hypasched /opt/hypasched

ENV SCHED_SOCKET_PATH=/run/hypasched/sched.sock
# epmd must not listen beyond loopback (the node name exists only because the
# release start script requires one).
ENV ERL_EPMD_ADDRESS=127.0.0.1

CMD ["/opt/hypasched/bin/hypasched", "foreground"]
