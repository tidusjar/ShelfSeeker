# ShelfSeeker E2E Tests

End-to-end tests for ShelfSeeker using Playwright with mock IRC and Newznab servers.

## Overview

These tests verify the complete user journey through the ShelfSeeker application by:
- Running the actual React frontend
- Running the actual Express API server
- Using **mock IRC and Newznab servers** instead of real external services

This approach provides:
- ✅ Fast, deterministic tests
- ✅ No external dependencies or credentials needed
- ✅ Tests work offline
- ✅ Full stack integration testing

## Architecture

```
Playwright Browser
    ↓
Web Frontend (localhost:5173)
    ↓
API Server (localhost:3001)
    ↓
Mock Servers
    ├─ Mock IRC Server (TCP, IRC protocol)
    ├─ Mock Newznab Server (HTTP, XML)
    └─ Mock OpenLibrary Server (HTTP, JSON)
```

## Prerequisites

- Node.js 20+
- Dependencies installed in `server/` and `web/` directories

## Installation

```bash
cd e2e
npm install
npx playwright install chromium
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests with UI (interactive mode)
```bash
npm run test:e2e:ui
```

### Run enrichment tests only
```bash
npm run test:enrichment
```

### Run enrichment tests with UI
```bash
npm run test:enrichment:ui
```

### Run tests in headed mode (see the browser)
```bash
npm run test:e2e:headed
```

### Debug a specific test
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── tests/
│   ├── smoke.spec.ts            # Basic sanity checks
│   ├── search.spec.ts           # Search functionality
│   ├── download.spec.ts         # Download flows
│   ├── settings.spec.ts         # Settings configuration
│   └── enrichment.spec.ts       # Search result enrichment with OpenLibrary
├── mocks/
│   ├── irc-server.ts            # Mock IRC server
│   ├── newznab-server.ts        # Mock Newznab server
│   ├── openlibrary-server.ts    # Mock OpenLibrary API server
│   ├── server-manager.ts        # Coordinates mock servers
│   └── fixtures/                # Test data
│       ├── irc-responses.ts     # IRC search responses
│       ├── newznab-results.ts   # NZB search responses
│       └── openlibrary-responses.ts  # OpenLibrary metadata
├── helpers/
│   ├── page-objects.ts          # Page Object Models
│   ├── test-helpers.ts          # Utility functions
│   ├── global-setup.ts          # Start mock servers
│   └── global-teardown.ts       # Stop mock servers
└── playwright.config.ts         # Playwright configuration
```

## Writing New Tests

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { HomePage, SearchResultsPage } from '../helpers/page-objects';

test('my new test', async ({ page }) => {
  const homePage = new HomePage(page);
  const resultsPage = new SearchResultsPage(page);

  await homePage.navigate();
  await homePage.search('my query');
  await resultsPage.waitForResults();
  
  const count = await resultsPage.getResultCount();
  expect(count).toBeGreaterThan(0);
});
```

### Adding New Test Fixtures

Edit `e2e/mocks/fixtures/irc-responses.ts` or `newznab-results.ts`:

```typescript
export const IRC_SEARCH_FIXTURES = {
  'my new query': [
    '!SearchBot Author Name - Book Title.epub ::INFO:: 1.5MB'
  ]
};
```

## Mock Servers

### Mock IRC Server
- Implements minimal IRC protocol (NICK, USER, JOIN, PRIVMSG)
- Responds to `@search <query>` commands
- Simulates DCC SEND file transfers
- Returns results from `irc-responses.ts` fixtures

### Mock Newznab Server
- HTTP server with `/api` endpoint
- Returns Newznab-compliant XML
- Validates API key (`test-api-key`)
- Supports search and download endpoints

### Mock OpenLibrary Server
- HTTP server mimicking OpenLibrary API
- Provides enrichment metadata for search results
- Endpoints:
  - `/search.json` - Search by title/author
  - `/b/id/{id}-{size}.jpg` - Cover images
  - `/api/books` - ISBN lookup
- Returns data from `openlibrary-responses.ts` fixtures

## Troubleshooting

### Tests fail to start
- Ensure `server/` and `web/` dependencies are installed
- Check that ports 5173 and 3001 are available
- Run `npm run dev` in both server and web to verify they start

### Mock servers not connecting
- Check logs in test output for port numbers
- Verify `global-setup.ts` completed successfully
- Check environment variables: `MOCK_IRC_PORT`, `MOCK_NZB_PORT`

### Tests are flaky
- Increase timeouts in `playwright.config.ts`
- Add explicit waits in tests
- Check for race conditions in page object methods

### Browser doesn't open
- Run with `--headed` flag to see the browser
- Check Playwright installation: `npx playwright install`

## CI/CD Integration

Tests can run in GitHub Actions or other CI systems:

```yaml
- name: Install E2E dependencies
  run: cd e2e && npm ci

- name: Install Playwright browsers
  run: cd e2e && npx playwright install --with-deps chromium

- name: Run E2E tests
  run: cd e2e && npm run test:e2e
```

## Test Coverage

Current tests cover:
- ✅ IRC search flow
- ✅ Empty search results
- ✅ Multiple sequential searches
- ✅ IRC download via DCC
- ✅ Error handling
- ✅ Connection status
- ✅ Rapid search requests
- ✅ Settings configuration (IRC and NZB)
- ✅ Search result enrichment with OpenLibrary
- ✅ Book cover display
- ✅ Rating and metadata display
- ✅ Page-by-page enrichment
- ✅ Enrichment caching

## Next Steps

Potential additions:
- NZB search integration tests
- Multi-source search tests (IRC + NZB)
- Filter functionality tests
- Pagination tests with enrichment
- Mobile viewport tests
- Multi-browser tests (Firefox, Safari)
- Performance tests for enrichment

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [ShelfSeeker Documentation](../README.md)

## License

MIT
