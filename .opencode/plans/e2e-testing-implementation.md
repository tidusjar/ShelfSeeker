# E2E Testing Implementation Plan for ShelfSeeker

**Date:** January 18, 2026  
**Status:** Planning Phase Complete  
**Estimated Duration:** 8-10 days

## Overview

This plan outlines the implementation of **browser-based E2E tests using Playwright** with **mock IRC and Newznab servers** to test the complete user journey without depending on external services.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  Playwright Browser Tests (Chromium/Firefox)       │
│  • Clicks buttons, types text, verifies UI         │
└────────────────┬────────────────────────────────────┘
                 │ HTTP requests
┌────────────────▼────────────────────────────────────┐
│  Web Frontend (localhost:5173)                      │
│  • React App.tsx, Home, SearchResults components   │
└────────────────┬────────────────────────────────────┘
                 │ API calls (localhost:3001)
┌────────────────▼────────────────────────────────────┐
│  Express API Server                                 │
│  • /api/connect, /api/search, /api/download         │
│  • IrcService, NzbService, SearchService (REAL)    │
└────────────────┬────────────────────────────────────┘
                 │ IRC protocol + HTTP
┌────────────────▼────────────────────────────────────┐
│  Mock Servers (Test-only)                           │
│  ├─ Mock IRC Server (TCP, IRC protocol)            │
│  └─ Mock Newznab Server (HTTP, XML responses)      │
└─────────────────────────────────────────────────────┘
```

**Key Insight:** We only mock at the network boundary. The actual `IrcService`, `NzbService`, and all parsers run with real code, ensuring tests verify actual application behavior.

---

## 📁 File Structure

```
ircbooks/
├── e2e/                                    # NEW: Root-level E2E tests
│   ├── tests/
│   │   ├── search.spec.ts                 # Search flows
│   │   ├── download.spec.ts               # Download flows
│   │   ├── settings.spec.ts               # Configuration UI
│   │   └── error-handling.spec.ts         # Error scenarios
│   │
│   ├── mocks/
│   │   ├── irc-server.ts                  # Mock IRC server (TCP)
│   │   ├── newznab-server.ts              # Mock Newznab (HTTP)
│   │   ├── server-manager.ts              # Start/stop utilities
│   │   └── fixtures/
│   │       ├── irc-responses.ts           # Bot search responses
│   │       ├── newznab-results.ts         # XML templates
│   │       └── test-files/
│   │           └── sample-search.txt      # Sample search result file
│   │
│   ├── helpers/
│   │   ├── global-setup.ts                # Global test setup
│   │   ├── global-teardown.ts             # Global cleanup
│   │   ├── test-helpers.ts                # Utility functions
│   │   └── page-objects.ts                # Page Object Models
│   │
│   ├── playwright.config.ts               # Playwright configuration
│   └── package.json                       # E2E dependencies
│
├── server/                                 # Existing
├── web/                                    # Existing
└── package.json                            # Root package.json
```

---

## 🚀 Execution Plan

### Phase 1: Infrastructure Setup (Day 1-2)
**Tasks:**
- Create `e2e/` directory structure
- Install Playwright
- Create `package.json` and `playwright.config.ts`
- Implement `server-manager.ts` skeleton

### Phase 2: Mock Servers (Day 2-4)
**Tasks:**
- Implement `MockIrcServer` (TCP, IRC protocol, DCC SEND)
- Implement `MockNewznabServer` (HTTP, XML responses)
- Create test fixtures
- Unit test mock servers

### Phase 3: Global Setup (Day 4-5)
**Tasks:**
- Implement `global-setup.ts` and `global-teardown.ts`
- Port allocation logic
- Environment variable injection
- Integration testing

### Phase 4: Page Objects (Day 5-6)
**Tasks:**
- Create `HomePage`, `SearchResultsPage`, `SettingsPage` classes
- Add `data-testid` attributes to UI if needed
- Helper utilities

### Phase 5: Test Implementation (Day 6-8)
**Tasks:**
- Implement 10-12 E2E tests covering:
  - IRC/NZB search flows
  - Download flows
  - Settings configuration
  - Error handling

### Phase 6: Refinement (Day 8-10)
**Tasks:**
- Fix flaky tests
- CI/CD integration (GitHub Actions)
- Documentation
- Performance optimization

---

## 📊 Test Coverage

### Expected Tests (10-12 critical paths):
1. ✓ Search (IRC only)
2. ✓ Search (NZB only)
3. ✓ Search (combined IRC+NZB)
4. ✓ Search (empty results)
5. ✓ Download via IRC DCC
6. ✓ Download NZB file
7. ✓ Settings: Toggle IRC
8. ✓ Settings: Add NZB provider
9. ✓ Error: IRC connection failure
10. ✓ Error: Empty search results
11. ✓ Error: Download failure
12. ✓ Error: Search timeout

---

## 🔧 Key Technical Details

### Mock IRC Server
- TCP server with minimal IRC protocol (NICK, USER, JOIN, PRIVMSG)
- DCC SEND simulation for search results
- Fixture-based responses: `'dune' → ['!SearchBot Frank Herbert - Dune.epub ::INFO:: 2.5MB', ...]`

### Mock Newznab Server
- Express HTTP server
- Newznab-compliant XML responses
- Endpoints: `/api?t=search`, `/api?t=get`
- Fixture-based: `'dune' → [{title, guid, link, size}, ...]`

### Page Object Pattern
```typescript
class HomePage {
  async search(query: string) { ... }
  async getConnectionStatus() { ... }
}

class SearchResultsPage {
  async getResultCount() { ... }
  async downloadResult(index: number) { ... }
}
```

---

## 📦 Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/node": "^20.10.6",
    "express": "^4.18.2",
    "typescript": "^5.3.3"
  }
}
```

---

## 🎯 Success Criteria

1. ✅ All 10-12 tests pass consistently
2. ✅ Tests run in < 5 minutes
3. ✅ No flaky tests (100% pass rate)
4. ✅ CI/CD integration working
5. ✅ Complete documentation

---

## ⚠️ Key Challenges & Solutions

1. **IRC Protocol Complexity** → Implement minimal subset only
2. **DCC File Transfer** → Create pre-made .txt files, transfer via TCP
3. **Port Conflicts** → Dynamic port allocation with `get-port`
4. **Test Flakiness** → Playwright auto-waiting, explicit timeouts, retries
5. **Database State** → Temp config DB, clean downloads directory

---

## 🔄 CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
- Install dependencies (server, web, e2e)
- Install Playwright browsers
- Run E2E tests
- Upload reports/videos on failure
```

---

## 📝 Next Steps

1. Review plan and confirm approach
2. Start Phase 1: Infrastructure Setup
3. Implement mock servers
4. Write tests
5. Integrate with CI

---

**Full detailed plan available in:** `docs/e2e-testing-plan.md` (will be created during implementation)

**Status:** ✅ Ready for Implementation
