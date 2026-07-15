# Tiny static Go binary for the sanitizer sidecar. Unlike hypahash this pulls
# one vetted module (bluemonday) — hand-rolling an HTML sanitizer is not a
# place to avoid dependencies.
FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /hypasan .

# distroless/static (root uid 0). Under rootless Podman that maps to the host
# user (uid 1000), which is also what the Next.js container runs as via
# UserNS=keep-id — so the shared socket is owned consistently.
FROM gcr.io/distroless/static-debian12
COPY --from=build /hypasan /hypasan
ENTRYPOINT ["/hypasan"]
