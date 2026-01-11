# Settings Configuration Guide

This guide explains how to configure IRCBooks, especially when running in Docker.

## General Settings

### Download Path

The download path determines where your ebooks are saved after downloading.

**Accessing Settings:**
1. Open the web interface at `http://localhost:3001`
2. Click the **Settings** button (⚙️) in the top right corner
3. Select the **General** tab
4. Configure your download path
5. Click **Save**

### Docker Configuration

When running IRCBooks as a Docker container, the download path **must** match your volume mount.

#### Default Configuration

By default, `docker-compose.yml` sets up the following:

```yaml
volumes:
  - ${DOWNLOAD_PATH:-./downloads}:/app/server/downloads
  - ${DATA_PATH:-./data}:/app/server/data
```

This means:
- **Host path**: `./downloads` (on your machine)
- **Container path**: `/app/server/downloads` (inside Docker)
- **Settings value**: `/app/server/downloads` (what you enter in the UI)

#### Custom Paths

If you want to use a different location on your host machine:

1. **Update docker-compose.yml or .env:**

   Option A - Edit `.env`:
   ```env
   DOWNLOAD_PATH=/path/on/your/host/ebooks
   DATA_PATH=/path/on/your/host/config
   ```

   Option B - Edit `docker-compose.yml`:
   ```yaml
   volumes:
     - /path/on/your/host/ebooks:/app/server/downloads
     - /path/on/your/host/config:/app/server/data
   ```

2. **Restart the container:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **Set the path in Settings:**
   - Go to Settings → General
   - Set Download Path to: `/app/server/downloads`
   - Click Save

> ⚠️ **Important**: Always use the **container path** (`/app/server/downloads`) in the Settings UI, not the host path.

## IRC Settings

Configure your IRC connection in the **IRC** tab:

- **IRC Server**: Default is `irc.irchighway.net`
- **Port**: Default is `6667`
- **Channel**: Default is `#ebooks`
- **Search Command**: Default is `@search`

Changes to IRC settings will automatically reconnect to apply the new configuration.

## NZB Providers

The **NZB Providers** tab allows you to configure Newznab-compatible indexers for additional search sources beyond IRC.

### Adding a Provider

1. Click **Add Provider**
2. Fill in:
   - Name (e.g., "NZBGeek")
   - URL (e.g., "https://api.nzbgeek.info")
   - API Key (from your provider)
   - Categories (7000 for Books, 8010 for Audiobooks)
   - Priority (lower = searched first)
3. Click **Save**

## Troubleshooting

### Downloads Not Appearing

**Issue**: Files download but don't appear on your host machine.

**Solution**: 
1. Check that your volume mount is correct in `docker-compose.yml`
2. Verify the download path in Settings matches the container path
3. Check container logs: `docker-compose logs -f`

### Permission Errors

**Issue**: "Permission denied" when saving files.

**Solution**:
1. Ensure the download directory on your host has proper permissions:
   ```bash
   mkdir -p ./downloads ./data
   chmod 777 ./downloads ./data
   ```
2. Or run with specific user ID:
   ```yaml
   # In docker-compose.yml
   user: "1000:1000"  # Your user:group ID
   ```

### Config Not Persisting

**Issue**: Settings reset after container restart.

**Solution**:
1. Ensure the data volume is mounted:
   ```yaml
   volumes:
     - ./data:/app/server/data
   ```
2. Check that `config.json` exists in `./data/`
3. Verify file permissions on the host

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DOWNLOAD_PATH` | `./downloads` | Host directory for downloads |
| `DATA_PATH` | `./data` | Host directory for config |
| `PORT` | `3001` | Application port |
| `NODE_ENV` | `production` | Node environment |

## Example Configurations

### Home Server Setup

```yaml
# docker-compose.yml
volumes:
  - /mnt/media/ebooks:/app/server/downloads
  - /opt/ircbooks/config:/app/server/data
```

Settings UI: Download Path = `/app/server/downloads`

### Multi-User NAS

```yaml
# docker-compose.yml
volumes:
  - /volume1/public/ebooks:/app/server/downloads
  - /volume1/docker/ircbooks:/app/server/data
```

Settings UI: Download Path = `/app/server/downloads`

### Development Setup

```yaml
# docker-compose.yml
volumes:
  - ./downloads:/app/server/downloads
  - ./data:/app/server/data
```

Settings UI: Download Path = `/app/server/downloads`

## Tips

1. **Always use absolute paths** in docker-compose.yml for production
2. **Use environment variables** (`.env`) to keep compose files clean
3. **Test downloads** after changing paths to ensure they work
4. **Back up your config** by copying `./data/config.json`
5. **Check logs** if things aren't working: `docker-compose logs -f`

## Support

For issues or questions:
- Check the [README.md](README.md) for general information
- Review [docs/DOCKER.md](docs/DOCKER.md) for Docker-specific details
- Open an issue on GitHub
