---
name: docker-ci
description: "Docker container management for CI/CD, cross-compilation, and reproducible build environments. Use when: (1) building CI images, (2) running builds in containers, (3) managing multi-arch builds, (4) docker-compose orchestration."
metadata:
  {
    "openclaw":
      {
        "emoji": "🐳",
        "requires": { "bins": ["docker"] },
      },
  }
---

# Docker CI Skill

Use Docker for CI/CD pipelines, cross-compilation environments, and reproducible builds.

## When to Use

- Building and managing CI containers
- Running builds in isolated environments
- Multi-architecture builds (ARM, x86)
- Docker Compose orchestration for multi-service stacks
- Cross-compilation toolchain containers

## When NOT to Use

- Local development hot-reload → use native toolchain
- Single-file scripts → run directly

## Common Commands

### Image Management

```bash
# Build image
docker build -t app:latest .

# Build with specific Dockerfile
docker build -f Dockerfile.ci -t app:ci .

# Build with build args
docker build --build-arg SDK_VERSION=2.6.0 -t app:latest .

# List images
docker images

# Remove unused images
docker image prune -f
```

### Container Operations

```bash
# Run container
docker run --rm -it app:latest

# Run with volume mount
docker run --rm -v $(pwd):/workspace app:latest

# Run with env vars
docker run --rm -e API_KEY=xxx app:latest

# Execute command in running container
docker exec -it <container-id> /bin/bash

# View logs
docker logs -f <container-id>
```

### Docker Compose

```bash
# Start services
docker compose up -d

# Build and start
docker compose up -d --build

# View status
docker compose ps

# View logs
docker compose logs -f <service>

# Stop and remove
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Multi-Arch Builds

```bash
# Create buildx builder
docker buildx create --name multiarch --use

# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t app:latest .

# Build and push
docker buildx build --platform linux/amd64,linux/arm64 -t registry/app:latest --push .
```

### CI Patterns

```bash
# Run CI job in container
docker run --rm -v $(pwd):/src -w /src node:22 npm test

# nRF cross-compilation container
docker run --rm -v $(pwd):/ncs nrf-sdk:latest west build -b nrf52840dk/nrf52840

# Android build container
docker run --rm -v $(pwd):/project android-builder:latest ./gradlew assembleDebug
```

### Cleanup

```bash
# Remove stopped containers
docker container prune -f

# Remove unused images, containers, networks, volumes
docker system prune -a -f

# Show disk usage
docker system df
```
