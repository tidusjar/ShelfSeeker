# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShelfSeeker is a web-based ebook search application consisting of:
- **Web Frontend** (`web/`) - React + Vite frontend with Framer Motion animations
- **API Server** (`server/`) - Express.js backend with IRC and NZB search functionality

The application connects to IRCHighway (#ebooks channel) to search and download ebooks via IRC bots and DCC file transfers, and also supports NZB indexer integration.

## Common Commands

### Web Frontend
```bash
cd web
npm run dev      # Start Vite dev server (default: http://localhost:5173)
npm run build    # Build production bundle (TypeScript + Vite)
npm run preview  # Preview production build
```

### API Server
```bash
cd server
npm run dev      # Start Express server with tsx (default: port 3001)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled server from dist/
```

## Architecture

### Web + Server Architecture
- **Web Frontend** (`web/src/`): React SPA with components in `web/src/components/`
- **API Layer** (`web/src/api.ts`): HTTP client that calls server endpoints
- **Server** (`server/src/server.ts`): Express API with IRC and NZB services
- **IRC Service** (`server/src/ircService.ts`): Manages persistent IRC connection
- **NZB Service** (`server/src/nzbService.ts`): Integrates with Newznab-compatible indexers

### Key Server Components
- **IRC Client** (`server/src/lib/irc/client.ts`): EventEmitter-based IRC connection manager with auto-reconnect
- **DCC Handler** (`server/src/lib/irc/dccHandler.ts`, `server/src/lib/irc/dccReceiver.ts`): Handles DCC SEND protocol for file transfers
- **Search Parser** (`server/src/lib/parser/searchResultParser.ts`): Parses bot response format: `!BotName filename ::INFO:: size`
- **NZB Parser** (`server/src/lib/parser/nzbFilenameParser.ts`): Parses NZB scene release formats

## Important Technical Details

### DCC File Transfer Handling
- All DCC transfers are auto-accepted
- Search results: downloaded to `.tmp/`, zip extracted automatically
- Ebooks: downloaded to `downloads/` directory (configurable)
- File collisions are handled by appending timestamps to filenames

### IRC State Management
- **Server**: Singleton IRC service, handles concurrent API requests
- **Timeouts**: Search = 30s, Download = 5min (large files can be slow over IRC)

### Type Definitions
- Server types in `server/src/types.ts` (SearchResult, NZB types, config types)
- Web types in `web/src/types.ts` (matches server API responses)
- Shared IRC/parser types in `server/src/lib/types.ts`

### Error Handling Patterns
- IRC connection failures: Auto-retry 3 times with 5-second delays
- No search results: User prompted to wait additional 30 seconds
- NZB provider failures: Caught gracefully, other providers continue

## Security Considerations

### File Transfer Security
- All DCC filenames are sanitized to prevent path traversal attacks
- Paths are validated before file operations to ensure they stay within target directories
- No trusted bot whitelist - relies on aggressive filename sanitization
- Dangerous characters `[<>:"|?*\x00-\x1f]` are replaced with underscores
- Zip file entries are also sanitized to prevent zip slip attacks

### Request Handling
- IRC requests are queued to prevent race conditions
- Request payload limited to 1MB (prevents large payload attacks)
- Concurrent search/download requests processed sequentially (FIFO queue)
- Each request tracked with unique UUID for proper timeout handling

### Logging
- Structured logging with winston
- Logs stored in `server/logs/` directory (gitignored)
- Error logs: `server/logs/error.log`
- Combined logs: `server/logs/combined.log`
- Log rotation: 5MB max per file, 5 files kept
- Log level configurable via LOG_LEVEL environment variable

### Error Transparency
- API responses include `errors` array showing which sources failed
- Users can see partial failures (e.g., IRC failed but NZB succeeded)
- All errors logged to file with structured metadata

## Development Workflow

### Working on IRC Functionality
- IRC modules are in `server/src/lib/irc/`
- Changes affect server only (no CLI anymore)
- Test using server endpoints via web UI or API client

### Working on Web UI
- Frontend makes API calls to `http://localhost:3001/api/*`
- Server must be running for frontend to function
- API responses follow pattern: `{ success: boolean, data?: any, error?: string }`

### Testing End-to-End
1. Start server: `cd server && npm run dev`
2. Start web: `cd web && npm run dev`
3. Browser opens to web interface
4. Connect → Search → Download flow exercises full stack

## File Organization

### Generated/Ignored Directories
- `server/dist/` - Compiled server JavaScript (gitignored)
- `web/dist/` - Compiled frontend bundle (gitignored)
- `.tmp/` - Temporary search result files (gitignored)
- `downloads/` - Downloaded ebook files (gitignored)
- `server/logs/` - Application logs (gitignored)
- `node_modules/` - Dependencies (gitignored, separate for root/web/server)

### Documentation
- `docs/plans/2026-01-04-irc-ebook-search-design.md` - Original design document

## Configuration

IRC and NZB settings are configurable via web UI:
- **IRC Server**: Default `irc.irchighway.net`
- **Port**: Default `6667`
- **Channel**: Default `#ebooks`
- **Nickname Format**: `shelfseeker_<random4digits>`
- **NZB Providers**: Add multiple Newznab-compatible indexers

## Dependencies

### Shared Dependencies (Server)
- `irc-framework` - IRC client with DCC support
- `adm-zip` - Zip file extraction for search results
- `typescript` - TypeScript compilation

### Web-Specific
- `react` + `react-dom` - UI framework
- `framer-motion` - Animations
- `vite` - Build tool and dev server

### Server-Specific
- `express` - Web framework
- `cors` - Enable cross-origin requests from web frontend
- `fast-xml-parser` - Parse NZB XML responses
