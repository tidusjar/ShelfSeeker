# Task Completion Checklist

When completing a task, ensure:

## Code Quality
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] Proper error handling added
- [ ] Logging added for debugging (with appropriate [PREFIX])
- [ ] Types are explicit (no implicit `any`)

## Testing
- [ ] Manual testing via `npm run dev`
- [ ] Test both search and download flows
- [ ] Verify error cases (timeout, no results, invalid input)

## Before Committing
- [ ] Code compiles: `npm run build`
- [ ] No runtime errors in dev mode
- [ ] User-facing messages are clear and helpful
- [ ] Logging is appropriate (not too verbose, not too sparse)

## IRC-Specific Checks
- [ ] CTCP VERSION is set correctly (HexChat-like)
- [ ] Event handlers emit events properly
- [ ] DCC transfers work (both search results and downloads)
- [ ] Timeout handling works correctly
- [ ] Bot NOTICE messages are logged

## No Automated Tests
This project currently has no test suite. Testing is manual via CLI.
