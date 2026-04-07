# =============================================================================
# EmberClaw Dockerfile
# Multi-stage build for minimal production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Rust Builder
# Build the claw-code-parity binary
# -----------------------------------------------------------------------------
FROM rust:1.77-slim-bookworm AS rust-builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Rust source
COPY claw-engine/claw-code-parity ./claw-engine/claw-code-parity

# Build release binary
WORKDIR /build/claw-engine/claw-code-parity/rust
RUN cargo build --release -p rusty-claude-cli && \
    cp target/release/claw /build/claw

# -----------------------------------------------------------------------------
# Stage 2: Node.js Builder
# Install dependencies and build TypeScript
# -----------------------------------------------------------------------------
FROM node:20-slim AS node-builder

WORKDIR /build

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY tsconfig.json ./
COPY src ./src
COPY bin ./bin
COPY config ./config
COPY skills ./skills

# Build TypeScript (if needed)
# RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Image
# Minimal runtime with only necessary files
# -----------------------------------------------------------------------------
FROM node:20-slim AS production

# Labels
LABEL org.opencontainers.image.title="EmberClaw"
LABEL org.opencontainers.image.description="IoT Full-Stack Agent"
LABEL org.opencontainers.image.version="0.2.0"
LABEL org.opencontainers.image.authors="EmberClaw Team"

# Create non-root user
RUN groupadd -r emberclaw && useradd -r -g emberclaw emberclaw

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy Rust binary from rust-builder
COPY --from=rust-builder /build/claw /usr/local/bin/claw

# Copy Node.js app from node-builder
COPY --from=node-builder /build/node_modules ./node_modules
COPY --from=node-builder /build/src ./src
COPY --from=node-builder /build/bin ./bin
COPY --from=node-builder /build/config ./config
COPY --from=node-builder /build/skills ./skills
COPY package.json ./

# Copy documentation
COPY AGENTS.md SOUL.md ./
COPY docs ./docs

# Create data directories
RUN mkdir -p .emberclaw/logs .emberclaw/backups .emberclaw/sessions && \
    chown -R emberclaw:emberclaw /app

# Switch to non-root user
USER emberclaw

# Environment variables
ENV NODE_ENV=production
ENV EMBERCLAW_CLAW_BIN=/usr/local/bin/claw
ENV HEALTH_PORT=9876

# Expose health check port
EXPOSE 9876

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9876/health || exit 1

# Default command: start daemon
CMD ["node", "bin/emberclaw.mjs", "daemon"]

# Alternative: interactive REPL
# CMD ["node", "bin/emberclaw.mjs"]
