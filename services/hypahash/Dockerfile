# Tiny static Go binary for the hash sidecar. No external modules, so the build
# needs no network for `go mod download`.
FROM golang:1.24-bookworm AS build
WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /hypahash .

# distroless/static (root uid 0). Under rootless Podman that maps to the host
# user (uid 1000), which is also what the Next.js container runs as via
# UserNS=keep-id — so the shared socket is owned consistently.
FROM gcr.io/distroless/static-debian12
COPY --from=build /hypahash /hypahash
ENTRYPOINT ["/hypahash"]
