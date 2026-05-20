FROM rust:1-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release --locked

FROM debian:bookworm-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 appuser

WORKDIR /app

COPY migrations ./migrations
COPY --from=builder /app/target/release/xingtu-payment-backend /usr/local/bin/xingtu-payment-backend

ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8080
ENV RUST_LOG=info

USER appuser
EXPOSE 8080

CMD ["/usr/local/bin/xingtu-payment-backend"]
