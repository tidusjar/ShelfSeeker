# Docker Build Guide

## Multi-Platform Support

The Docker image supports the following platforms:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, e.g., Apple Silicon, Raspberry Pi 4/5)
- `linux/arm/v7` (ARM 32-bit, e.g., older Raspberry Pi)

## Local Development

### Standard Build (current platform only)
```bash
docker-compose build
docker-compose up
```

### Multi-Platform Build

#### Prerequisites
1. Enable Docker Buildx (included in Docker Desktop and recent Docker Engine versions)
2. Create a builder instance:
```bash
docker buildx create --name multiplatform --use
docker buildx inspect --bootstrap
```

#### Build for Multiple Platforms
```bash
# Build for all platforms (without pushing)
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t shelfseeker:latest \
  .

# Build and push to registry
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t ghcr.io/YOUR_USERNAME/ircbooks:latest \
  --push \
  .
```

#### Build for Specific Platform
```bash
# For AMD64 only
docker buildx build --platform linux/amd64 -t shelfseeker:amd64 .

# For ARM64 only (Apple Silicon, Raspberry Pi 4/5)
docker buildx build --platform linux/arm64 -t shelfseeker:arm64 .

# For ARM v7 only (Raspberry Pi 3 and older)
docker buildx build --platform linux/arm/v7 -t shelfseeker:armv7 .
```

## GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/docker-publish.yml`) that automatically:
- Builds multi-platform images on push to `main` or version tags
- Pushes images to GitHub Container Registry (ghcr.io)
- Uses layer caching to speed up builds

### Using Published Images

```bash
# Pull and run from GitHub Container Registry
docker pull ghcr.io/YOUR_USERNAME/ircbooks:latest
docker run -p 3001:3001 ghcr.io/YOUR_USERNAME/ircbooks:latest
```

Or update `docker-compose.yml` to use the published image:
```yaml
services:
  shelfseeker:
    image: ghcr.io/YOUR_USERNAME/ircbooks:latest
    # Remove the 'build:' section
```

## Troubleshooting

### "exec format error"
This means you're trying to run an image built for a different architecture. Use Docker Buildx to build for your platform.

### Slow Multi-Platform Builds
Multi-platform builds use QEMU emulation which is slower than native builds. For development, build only for your current platform:
```bash
docker-compose build  # Builds for current platform only
```

### Builder Not Found
If you get builder errors, reinitialize buildx:
```bash
docker buildx rm multiplatform
docker buildx create --name multiplatform --use
docker buildx inspect --bootstrap
```
