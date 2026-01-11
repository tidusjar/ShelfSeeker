# eBook Search (Multi-Source)

A multi-platform ebook search application that searches across multiple sources including IRC (IRCHighway #ebooks) and NZB/Newznab indexers.

## 🚀 Quick Start with Docker

The fastest way to get started is using Docker:

```bash
# Clone the repository
git clone <repo-url>
cd ircbooks

# Start the application
./docker-setup.sh
# OR manually:
docker-compose up -d
```

**Access the web interface at:** http://localhost:3001

See [docs/DOCKER.md](docs/DOCKER.md) for detailed Docker documentation.

## 📦 Components

This project includes three ways to use the ebook search:

1. **Web Application** (Recommended for most users)
   - Modern React UI with animations
   - Accessible via browser at `http://localhost:3001`
   - Configure multiple search sources (IRC + NZB)
   - Unified search results from all enabled sources

2. **API Server** (For developers)
   - RESTful API for multi-source search operations
   - Serves the web frontend in production
   - See server/README.md for API documentation

3. **CLI Tool** (For power users)
   - Interactive command-line interface
   - Direct terminal-based IRC searches and downloads

## Features

- 🔍 **Multi-Source Search**: Search IRC and NZB indexers simultaneously
- 📥 **Multiple Download Methods**: IRC DCC transfers and NZB downloads
- 🔄 Auto-reconnect on IRC connection loss
- ⏱️ Smart timeout handling with retry options
- 📦 Automatic extraction of search results from zip files
- 💾 Organized downloads in `./downloads/` directory
- ⚙️ **Configurable Sources**: Enable/disable IRC, add multiple NZB providers

## 🐳 Docker Deployment (Recommended)

### Quick Start

```bash
# Copy environment example (optional)
cp .env.example .env

# Edit configuration if needed
nano .env

# Start the application
docker-compose up -d
```

Access at `http://localhost:3001`

### Environment Variables

Configure paths and IRC settings using environment variables in `.env`:

```env
# Paths - customize where data is stored
DOWNLOAD_PATH=./downloads      # Where ebooks are saved
DATA_PATH=./data               # Where config is stored

# IRC Settings (optional - can also configure via web UI)
IRC_SERVER=irc.irchighway.net
IRC_PORT=6667
IRC_CHANNEL=#ebooks
IRC_SEARCH_COMMAND=@search
```

See [docs/DOCKER.md](docs/DOCKER.md) for complete documentation and all available variables.

**Docker commands:**
```bash
docker-compose up -d        # Start
docker-compose logs -f      # View logs  
docker-compose down         # Stop
docker-compose restart      # Restart
```

## 💻 Local Development

### Web Application

```bash
# Start the API server
cd server
npm install
npm run dev

# In another terminal, start the web frontend
cd web
npm install
npm run dev
```

Access at `http://localhost:5173` (web dev server with hot reload)

### CLI Tool

```bash
npm install
npm run dev
```

### API Server Only

```bash
cd server
npm install
npm run dev
```

## 🐳 Docker Deployment

See [docs/DOCKER.md](docs/DOCKER.md) for complete Docker documentation.

**Quick commands:**
```bash
docker-compose up -d        # Start
docker-compose logs -f      # View logs
docker-compose down         # Stop
```

## Installation

### Using Docker (Recommended)

```bash
docker-compose up -d
```

### Manual Installation

```bash
npm install
```

## Usage

### Web Interface (Easiest)

1. Start the application: `docker-compose up -d` or run the server and web dev servers
2. Open http://localhost:3001 in your browser
3. Click "Connect" to join the IRC channel
4. Search and download ebooks through the UI

### CLI Tool

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
npm run build
npm start
```

### API Server

See full API documentation in `server/README.md`

**Available endpoints:**
- `POST /api/connect` - Connect to IRC
- `GET /api/status` - Get connection status
- `POST /api/search` - Search for ebooks
- `POST /api/download` - Download an ebook
- `GET /api/config` - Get IRC configuration
- `PUT /api/config` - Update IRC configuration

## Project Structure

```
ircbooks/
├── src/                     # CLI application
│   ├── index.ts            # Main CLI entry point
│   ├── irc/                # IRC client & DCC handler (shared with server)
│   ├── parser/             # Search result parser
│   └── cli/                # Interactive prompts
├── server/                  # API server
│   └── src/
│       ├── server.ts       # Express app
│       ├── ircService.ts   # IRC singleton service
│       └── configService.ts # Configuration management
├── web/                     # React frontend
│   └── src/
│       ├── components/     # UI components
│       └── api.ts          # API client
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
└── docs/
    ├── DOCKER.md           # Docker documentation
    └── plans/              # Design documents
```

## How It Works

1. **Connect**: The app connects to irc.irchighway.net and joins the #ebooks channel
2. **Search**: Enter your search term (e.g., "harry potter")
3. **Wait**: The bot sends `@search <term>` and waits for search results (30 seconds)
4. **Select**: Choose from the numbered list of results
5. **Download**: The app sends the download command and saves the ebook to `./downloads/`

## Example Session

```
╔════════════════════════════════════════╗
║   IRC Ebook Search & Download Tool    ║
╚════════════════════════════════════════╝

Connecting to irc.irchighway.net...
Joining #ebooks...
✓ Connected to #ebooks as ircbooks_1234

Enter search term (or "exit" to quit): diary of a wimpy kid

Searching for "diary of a wimpy kid"...
Waiting for results...
Receiving file: SearchResults.zip...
Parsing search results...

✓ Found 5 results:

1. [!Bsk] Cube Kid - Minecraft- Diary of a Wimpy Villager - Book 02.epub (1001.7KB)
2. [!Bsk] Cube Kid - Minecraft- Diary of a Wimpy Villager - Book 03.epub (634.3KB)
3. [!Bsk] Cube Kid - Minecraft- Diary of a Wimpy Villager - Book 04.epub (855.4KB)
4. [!Bsk] Cube Kid - Minecraft- Diary of a Wimpy Villager - Book 06.epub (1.0MB)
5. [!Bsk] Diary of a Wimpy Kid - Old School - Jeff Kinney.epub (13.1MB)

Select book (1-5, or 0 to search again): 5

Downloading "Diary of a Wimpy Kid - Old School - Jeff Kinney.epub"...
Receiving file: Diary of a Wimpy Kid - Old School - Jeff Kinney.epub...
✓ Download complete: downloads/Diary of a Wimpy Kid - Old School - Jeff Kinney.epub
```

## Project Structure

```
ircbooks/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── types.ts                 # TypeScript type definitions
│   ├── irc/
│   │   ├── client.ts           # IRC connection manager
│   │   └── dccHandler.ts       # DCC file transfer handler
│   ├── parser/
│   │   └── searchResultParser.ts  # Parse search results
│   └── cli/
│       └── interface.ts         # Interactive CLI prompts
├── downloads/                   # Downloaded ebooks
├── .tmp/                       # Temporary search result files
└── docs/
    └── plans/
        └── 2026-01-04-irc-ebook-search-design.md  # Design document
```

## Configuration

### Download Path Settings

You can configure where downloaded ebooks are saved through the **Settings** menu in the web interface:

1. Click the **Settings** button (⚙️) in the top right
2. Go to the **General** tab  
3. Set your desired **Download Path**
4. Click **Save**

#### For Docker Users

When running as a Docker container, ensure your download path matches your volume mount. 

**Example `docker-compose.yml`:**
```yaml
volumes:
  - ./downloads:/app/server/downloads  # Host:Container mapping
```

Then set the download path in Settings → General to `/app/server/downloads` (the container path).

**Default Docker paths:**
- Downloads: `/app/server/downloads`
- Configuration: `/app/server/data`

You can also override these via environment variables:

```yaml
environment:
  - DOWNLOAD_PATH=/app/server/downloads
  - CONFIG_PATH=/app/server/data/config.json
```

### IRC Configuration

### Web/Server Configuration
The web interface includes a settings panel to configure:
- IRC server and port
- Channel name
- Search command

Configuration is persisted in `data/config.json` (auto-created on first run)

### CLI Configuration
Currently hardcoded for IRCHighway:
- **Server**: irc.irchighway.net
- **Port**: 6667
- **Channel**: #ebooks
- **Timeout**: 30 seconds (with option to extend)

## Error Handling

- **Connection failures**: Auto-retry 3 times with 5-second delays
- **No search results**: Option to wait an additional 30 seconds
- **File collisions**: Automatically appends timestamp to filename
- **Invalid input**: Prompts for valid input

## Data Persistence

When using Docker, the following directories are persisted:
- `./downloads` - Downloaded ebook files
- `./data` - IRC configuration and application state

## Future Enhancements

- [ ] User authentication and multi-user support
- [ ] Download history and favorites
- [ ] Advanced search filters
- [ ] Multiple IRC server support
- [ ] Download queue management

See `docs/plans/2026-01-04-irc-ebook-search-design.md` for the original design document.

## Development

### Running Tests

```bash
# CLI tests
npm test

# Server tests
cd server && npm test

# Web tests
cd web && npm test
```

### Architecture

- **CLI**: Single IRC connection, synchronous operations
- **Server**: Singleton IRC service handling concurrent API requests
- **Web**: React SPA with Framer Motion animations
- **Shared**: IRC modules (`src/irc/*`) used by both CLI and server

## License

MIT
