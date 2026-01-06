# Code Style and Conventions

## TypeScript Style
- **Imports**: ES modules (`.js` extensions in imports due to ESM)
- **Type Annotations**: Explicit types for parameters and returns
- **Access Modifiers**: `private` for internal methods, `public` for API
- **Interfaces**: Separate type definitions in types.ts or inline
- **Async/Await**: Preferred over raw Promises

## Naming Conventions
- **Classes**: PascalCase (e.g., `IrcClient`, `DccHandler`)
- **Methods**: camelCase (e.g., `handleSearch`, `waitForTransfer`)
- **Events**: snake_case (e.g., `dcc_complete`, `message_sent`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `SEARCH_TIMEOUT`)

## Event-Driven Architecture
- IRC client extends EventEmitter
- Emit events for: connected, joined, dcc_incoming, dcc_complete, dcc_error
- Main app listens to IRC events and orchestrates flow

## Error Handling
- Try-catch for async operations
- Emit error events rather than throwing
- User-friendly error messages via CLI interface
- Log errors with context (component prefix like [IRC], [DCC])

## Logging Convention
- **[IRC]**: IRC protocol operations
- **[DCC]**: DCC file transfer operations  
- **[APP]**: Application-level orchestration
- **[CTCP]**: CTCP protocol handling
- **[NOTICE]**: IRC NOTICE messages from bots
- **[PRIVMSG]**: IRC PRIVMSG messages

## File Organization
- One class per file
- Types in separate file or inline for interfaces
- Event handlers in setup methods
- Public API at bottom of class
