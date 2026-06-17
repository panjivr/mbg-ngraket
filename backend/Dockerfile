# ============================================================
# Backend (Rust/Axum) — builds from source so it works on ARM (Oracle A1) or AMD.
# sqlx uses compile-time query checking; this stage needs a LIVE Postgres reachable
# at $DATABASE_URL during build. docker-compose.prod.yml passes it via build args
# with network: host (DB published on 127.0.0.1:5432). See deploy.sh.
# ============================================================
FROM rust:1.82-bookworm AS builder
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /build
# Workspace manifests + members (only the `backend` package is compiled).
COPY Cargo.toml Cargo.lock ./
COPY backend ./backend
COPY scheduler ./scheduler
COPY shared ./shared
COPY src-tauri ./src-tauri
RUN cargo build --release -p backend --bin backend

# ---- Runtime ----
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libssl3 ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /build/target/release/backend /usr/local/bin/backend
COPY backend/templates /app/backend/templates
COPY backend/migrations /app/backend/migrations
COPY frontend /app/frontend
COPY web /app/web
EXPOSE 8080
ENV CARGO_MANIFEST_DIR=/app/backend
CMD ["backend"]
