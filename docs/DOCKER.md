# Docker Deployment

This guide explains how to run IRCBooks using Docker.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at: **http://localhost:3001**

## Configuration

### Environment Variables

IRCBooks can be configured using environment variables. Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env

# Edit with your settings
nano .env
```

**Available environment variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `DOWNLOAD_PATH` | Directory for downloaded ebooks | `./downloads` |
| `DATA_PATH` | Directory for config and data | `./data` |
| `IRC_SERVER` | IRC server address | `irc.irchighway.net` |
| `IRC_PORT` | IRC server port | `6667` |
| `IRC_CHANNEL` | IRC channel (with #) | `#ebooks` |
| `IRC_SEARCH_COMMAND` | Search command prefix | `@search` |
| `PORT` | Application port | `3001` |

**Note:** IRC settings (server, port, channel) can also be configured via the web UI. Environment variables set the **initial defaults** on first run.

### Example Configuration

```env
# Use custom paths
DOWNLOAD_PATH=/mnt/nas/ebooks
DATA_PATH=/mnt/nas/ircbooks-data

# Connect to a different IRC server
IRC_SERVER=irc.example.com
IRC_PORT=6697
IRC_CHANNEL=#bookshare
```

### Using Docker CLI

```bash
# Build the image
docker build -t ircbooks .

# Run with custom paths
docker run -d \
  --name ircbooks \
  -p 3001:3001 \
  -v /mnt/nas/ebooks:/app/server/downloads \
  -v /mnt/nas/ircbooks-data:/app/server/data \
  -e IRC_SERVER=irc.irchighway.net \
  -e IRC_CHANNEL=#ebooks \
  ircbooks

# View logs
docker logs -f ircbooks

# Stop the container
docker stop ircbooks
docker rm ircbooks
```

## What's Included

The Docker container runs a single service that includes:
- **Express API Server** (port 3001) - Handles IRC connections and operations
- **Web Frontend** - Served as static files by the API server

## Data Persistence

Two directories are mounted as volumes by default:
- `./downloads` - Downloaded ebook files (configurable via `DOWNLOAD_PATH`)
- `./data` - IRC configuration and application state (configurable via `DATA_PATH`)

These persist between container restarts. You can customize the paths using environment variables to point to network storage, external drives, etc.

## Environment Variables

The following environment variables are available:

### Path Configuration
- `DOWNLOAD_PATH` - Where ebooks are saved (default: `./downloads`)
- `DATA_PATH` - Where config is stored (default: `./data`)
- `CONFIG_PATH` - Config file location (default: `/app/server/data/config.json`)
- `TEMP_PATH` - Temporary files (default: `/app/server/.tmp`)

### IRC Configuration
- `IRC_SERVER` - IRC server hostname (default: `irc.irchighway.net`)
- `IRC_PORT` - IRC server port (default: `6667`)
- `IRC_CHANNEL` - IRC channel to join (default: `#ebooks`)
- `IRC_SEARCH_COMMAND` - Search command (default: `@search`)

### Application
- `PORT` - HTTP server port (default: `3001`)
- `NODE_ENV` - Runtime environment (default: `production`)

**Note:** IRC settings can also be changed via the web UI settings panel.

## Build Details

The Dockerfile uses a multi-stage build:
1. **web-builder** - Builds the React frontend with Vite
2. **server-builder** - Compiles TypeScript for server and shared IRC modules
3. **production** - Minimal runtime image with only production dependencies

## Healthcheck

The container includes a healthcheck that pings `/api/status` every 30 seconds.

## Troubleshooting

### View container logs
```bash
docker-compose logs -f
# or
docker logs -f ircbooks
```

### Access container shell
```bash
docker-compose exec ircbooks sh
# or
docker exec -it ircbooks sh
```

### Rebuild after code changes
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Check container status
```bash
docker-compose ps
# or
docker ps
```

## Development vs Production

- **Development**: Run separate processes for web (`npm run dev` in `/web`) and server (`npm run dev` in `/server`)
- **Production**: Docker container serves everything on port 3001
