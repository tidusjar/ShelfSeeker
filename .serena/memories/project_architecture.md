# ShelfSeeker Project Architecture

## Purpose
CLI tool for searching and downloading ebooks from IRCHighway #ebooks channel using IRC and DCC file transfers.

## Tech Stack
- **Language**: TypeScript (Node.js)
- **IRC Library**: irc-framework v4.x
- **CLI**: prompts (interactive prompts)
- **File Handling**: adm-zip (extract search results)
- **Build**: TypeScript Compiler (tsc)
- **Dev**: tsx (TypeScript executor)

## Project Structure
```
src/
├── index.ts                    # Main app with search/download orchestration
├── types.ts                    # TypeScript type definitions
├── irc/
│   ├── client.ts              # IRC connection manager (EventEmitter)
│   └── dccHandler.ts          # DCC file transfer handler
├── parser/
│   └── searchResultParser.ts  # Parse !BotName commands from results
└── cli/
    └── interface.ts           # User prompts and console output
```

## Data Flow
1. User enters search query
2. App sends `@search <query>` to #ebooks channel
3. Bot sends NOTICE "search accepted" and DCC offers SearchResults.zip
4. DccHandler downloads and extracts .txt file to .tmp/
5. SearchResultParser parses results into array
6. User selects a result
7. App sends bot command (e.g., `!Bsk 123`)
8. Bot offers ebook via DCC
9. DccHandler downloads to downloads/

## Key IRC Requirements
- **Server**: irc.irchighway.net:6667
- **Channel**: #ebooks
- **CTCP VERSION**: Must respond with allowed client (HexChat, mIRC, etc.) - bots ignore unknown clients
- **DCC Support**: Required for file transfers
- **Search Command**: `@search <query>`
- **Download Command**: From parsed results (e.g., `!Bsk 123`)
