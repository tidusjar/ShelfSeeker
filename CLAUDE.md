# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShelfSeeker is a multi-component ebook search application consisting of:
- **CLI Tool** (`src/`) - Interactive command-line interface for searching and downloading ebooks
- **Web Frontend** (`web/`) - React + Vite frontend with Framer Motion animations
- **API Server** (`server/`) - Express.js backend that wraps IRC functionality for web access

All components connect to IRCHighway (#ebooks channel) to search and download ebooks via IRC bots and DCC file transfers.

## Common Commands

### CLI Tool (Root Directory)
```bash
npm run dev      # Run CLI in development mode with tsx
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled CLI from dist/
```

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

### CLI Application Flow
1. **Connection** (`src/irc/client.ts`): Connects to irc.irchighway.net, joins #ebooks
2. **Search** (`src/index.ts`): Sends `@search <term>` command to channel
3. **DCC Reception** (`src/irc/dccHandler.ts`): Auto-accepts DCC file transfer of search results zip
4. **Parsing** (`src/parser/searchResultParser.ts`): Extracts and parses `.txt` file from zip
5. **Selection** (`src/cli/interface.ts`): User selects from numbered list
6. **Download** (`src/irc/dccHandler.ts`): Sends bot command (e.g., `!Bsk filename.epub`), receives file via DCC

### Web + Server Architecture
- **Web Frontend** (`web/src/`): React SPA with components in `web/src/components/`
- **API Layer** (`web/src/api.ts`): HTTP client that calls server endpoints
- **Server** (`server/src/server.ts`): Express API with singleton IRC service
- **IRC Service** (`server/src/ircService.ts`): Manages persistent IRC connection, reuses CLI's IRC modules

### Key Shared Components
- **IRC Client** (`src/irc/client.ts`): EventEmitter-based IRC connection manager with auto-reconnect
- **DCC Handler** (`src/irc/dccHandler.ts`, `src/irc/dccReceiver.ts`): Handles DCC SEND protocol for file transfers
- **Search Parser** (`src/parser/searchResultParser.ts`): Parses bot response format: `!BotName filename ::INFO:: size`

## Important Technical Details

### DCC File Transfer Handling
- All DCC transfers are auto-accepted
- Search results: downloaded to `.tmp/`, zip extracted automatically
- Ebooks: downloaded to `downloads/` directory
- File collisions are handled by appending timestamps to filenames

### IRC State Management
- **CLI**: Single connection, synchronous operations (one search/download at a time)
- **Server**: Singleton IRC service, must handle concurrent API requests
- **Timeouts**: Search = 30s, Download = 5min (large files can be slow over IRC)

### Type Definitions
- Main types in `src/types.ts` (SearchResult interface)
- Web types in `web/src/types.ts` (matches server API responses)
- Server uses same `SearchResult` type from CLI via relative imports

### Error Handling Patterns
- IRC connection failures: Auto-retry 3 times with 5-second delays
- No search results: User prompted to wait additional 30 seconds
- Invalid selections: Re-prompt until valid input received

## Development Workflow

### Working on IRC Functionality
- Changes to `src/irc/*` affect both CLI and server
- Server imports IRC modules from `../src/irc/` (note the parent directory reference)
- Test IRC changes in CLI first (faster iteration), then verify server still works

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
- `dist/` - Compiled JavaScript (gitignored, created by `tsc`)
- `.tmp/` - Temporary search result files (gitignored)
- `downloads/` - Downloaded ebook files (gitignored)
- `node_modules/` - Dependencies (gitignored, separate for root/web/server)

### Documentation
- `docs/plans/2026-01-04-irc-ebook-search-design.md` - Original design document with detailed architecture

## Configuration

All three components currently use hardcoded IRC settings:
- **Server**: `irc.irchighway.net`
- **Port**: `6667`
- **Channel**: `#ebooks`
- **Nickname Format**: `shelfseeker_<random4digits>`

## Dependencies

### Shared Dependencies
- `irc-framework` - IRC client with DCC support
- `adm-zip` - Zip file extraction for search results
- `typescript` - TypeScript compilation

### CLI-Specific
- `prompts` - Interactive CLI prompts

### Web-Specific
- `react` + `react-dom` - UI framework
- `framer-motion` - Animations
- `vite` - Build tool and dev server

### Server-Specific
- `express` - Web framework
- `cors` - Enable cross-origin requests from web frontend
