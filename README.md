# IRC Ebook Search CLI

A command-line tool for searching and downloading ebooks from IRCHighway (#ebooks channel).

## Features

- 🔍 Search for ebooks using natural language queries
- 📥 Download ebooks directly via DCC file transfers
- 🔄 Auto-reconnect on connection loss
- ⏱️ Smart timeout handling with retry options
- 📦 Automatic extraction of search results from zip files
- 💾 Organized downloads in `./downloads/` directory

## Installation

```bash
npm install
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
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

## Future Enhancements

This CLI tool is designed to be easily converted into a web API:
- The IRC client can become a singleton service
- The parser is already independent and reusable
- The DCC handler can manage server-side downloads
- State tracking can be moved to a database

See `docs/plans/2026-01-04-irc-ebook-search-design.md` for the full design document.

## License

MIT
