# IRC Ebook Search CLI Application - Design Document

**Date:** 2026-01-04
**Status:** Approved

## Overview

A Node.js/TypeScript CLI tool that connects to IRCHighway (#ebooks channel) to search for and download ebooks through IRC bot commands and DCC file transfers.

## Architecture

### Core Flow
1. App starts → connects to IRC → joins #ebooks channel
2. User enters search term → bot sends `@search <term>` to channel
3. Wait for DCC file transfer (30s timeout) → auto-accept and extract .zip
4. Parse .txt results → display numbered list to user
5. User selects a book → bot sends command (e.g., `!Bsk filename.epub`) to channel
6. Wait for DCC file transfer → auto-accept and save to ./downloads/
7. Return to search prompt (or exit)

### Key Technologies
- **irc-framework**: IRC client with DCC support
- **prompts**: Interactive CLI prompts
- **adm-zip**: Extract .zip files containing search results
- **TypeScript strict mode**: Type safety throughout

## Component Structure

### 1. `src/irc/client.ts` - IRC Connection Manager
- Handles connection to irc.irchighway.net
- Manages join/part for #ebooks channel
- Sends messages to channel (@search, !Bsk commands)
- Generates random nickname (ircbooks_xxxx format)
- Emits events for DCC transfers and connection states

### 2. `src/irc/dccHandler.ts` - DCC File Transfer Handler
- Auto-accepts all incoming DCC SEND requests
- Downloads files to temporary directory for search results
- Downloads files to ./downloads/ for ebooks
- Extracts .zip files automatically
- Returns file paths for further processing

### 3. `src/parser/searchResultParser.ts` - Search Results Parser
- Reads the .txt file from search results zip
- Parses lines matching pattern: `!BotName filename ::INFO:: size`
- Extracts: bot command, filename, file size
- Returns array of structured result objects

### 4. `src/cli/interface.ts` - CLI Interface Manager
- Uses prompts library for interactive input
- Displays search results in numbered format
- Handles user selection
- Manages main application loop (search → download → repeat)

### 5. `src/index.ts` - Main Entry Point
- Initializes IRC client
- Orchestrates flow between components
- Handles graceful shutdown (disconnect from IRC)

## Data Flow & State Management

### Application State
- IRC connection status (connecting, connected, joined, error)
- Current operation mode (idle, searching, downloading)
- Pending file transfers (tracking what we're waiting for)
- Search results cache (current search results for selection)

### Search Flow
```
User input "harry potter"
  ↓
CLI → IRC Client: send "@search harry potter"
  ↓
IRC Client: emit "waiting_for_transfer" event
  ↓
DCC Handler: receive file → extract .zip → return .txt path
  ↓
Parser: parse .txt → return SearchResult[]
  ↓
CLI: display numbered list → await user selection
```

### Download Flow
```
User selects "3"
  ↓
CLI → IRC Client: send "!Bsk filename.epub"
  ↓
IRC Client: emit "waiting_for_transfer" event
  ↓
DCC Handler: receive file → save to ./downloads/ → return path
  ↓
CLI: show success message → return to main menu
```

### Type Definitions
```typescript
interface SearchResult {
  botCommand: string;    // e.g., "!Bsk"
  filename: string;      // e.g., "Diary of a Wimpy Kid.epub"
  filesize: string;      // e.g., "1001.7KB"
  rawCommand: string;    // Full command to send
}
```

## Error Handling & Edge Cases

### Connection Errors
- IRC connection failure → retry 3 times with 5-second delays → if all fail, show error and exit
- Disconnect during operation → attempt reconnect → notify user "Connection lost, reconnecting..."
- Channel join failure → retry once → if fails, exit with error message

### File Transfer Errors
- No DCC transfer received within 30 seconds → prompt "No results yet. Wait longer? (y/n)"
  - If yes: wait another 30 seconds
  - If no: return to main menu
- DCC transfer fails mid-download → show error, return to main menu
- .zip file extraction fails → show error "Invalid search results file", return to menu

### Parsing Errors
- Empty search results → show "No results found for '<search term>'"
- Malformed .txt file → show "Could not parse results", return to menu
- .txt file too large (>5MB) → show warning, attempt to parse anyway

### User Input Errors
- Invalid selection number → "Please enter a number between 1 and X"
- Empty search term → "Please enter a search term"
- Special characters in search → pass through as-is (IRC bot handles it)

### File System Errors
- ./downloads/ directory doesn't exist → create it automatically
- Download file already exists → append timestamp to filename (e.g., book_1234567890.epub)
- Disk space full → catch error, show message "Download failed: insufficient disk space"

## Project Structure

```
ircbooks/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── irc/
│   │   ├── client.ts           # IRC connection manager
│   │   └── dccHandler.ts       # DCC file transfer handler
│   ├── parser/
│   │   └── searchResultParser.ts  # Parse search results
│   └── cli/
│       └── interface.ts         # Interactive CLI prompts
├── downloads/                   # Created automatically
├── .tmp/                       # Temp dir for search result files
├── package.json
├── tsconfig.json
└── .gitignore
```

## Dependencies

```json
{
  "dependencies": {
    "irc-framework": "^4.x",     // IRC client with DCC support
    "prompts": "^2.x",            // Interactive CLI prompts
    "adm-zip": "^0.5.x"          // Zip file extraction
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "@types/prompts": "^2.x",
    "tsx": "^4.x"                 // Run TypeScript directly
  }
}
```

## Build & Run

- Development: `npm run dev` → uses tsx to run TypeScript directly
- Build: `npm run build` → compiles to dist/
- Production: `npm start` → runs compiled JavaScript

## Configuration

### Hardcoded Settings (v1)
- Server: irc.irchighway.net
- Port: 6667
- Channel: #ebooks
- Nickname: ircbooks_ + random 4-digit number
- Download directory: ./downloads/
- Temp directory: ./.tmp/
- Search timeout: 30 seconds
- Connection retries: 3 attempts

## Future Web API Considerations

The design keeps components loosely coupled for future API transition:

### What Stays in Backend
- `src/irc/client.ts` - becomes a singleton service in the API
- `src/irc/dccHandler.ts` - handles file transfers server-side
- `src/parser/searchResultParser.ts` - reusable parsing logic

### What Gets Replaced
- `src/cli/interface.ts` - replaced by REST/GraphQL endpoints
- Interactive prompts → HTTP requests/responses
- Local ./downloads/ → server storage with download URLs

### Future API Endpoints (Conceptual)
```
POST /api/search
  Body: { query: "harry potter" }
  Response: { results: SearchResult[], searchId: "uuid" }

POST /api/download
  Body: { searchId: "uuid", resultIndex: 3 }
  Response: { downloadUrl: "/downloads/abc123.epub", filename: "..." }

GET /api/status
  Response: { connected: true, searches: [...] }
```

### Design Decisions That Help Later
- Event-driven IRC client (easy to hook into WebSocket or polling)
- Structured SearchResult type (maps directly to API responses)
- Separate parser (no CLI dependencies)
- State tracking (can become database records)

## Testing

Testing will be deferred for the initial implementation. Focus on getting core functionality working first.
