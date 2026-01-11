# NZB Newznab Provider Integration - Implementation Progress

**Date Started:** 2026-01-11
**Current Status:** Phase 4 Complete - Backend Fully Functional (7/14 tasks)

## Overview

Adding full NZB Newznab indexer support to enable searching both IRC and NZB sources simultaneously with combined results.

### User Requirements
- ✅ Multiple NZB providers (add/remove/enable/disable)
- ✅ Provider configuration (URL, API key, name, API limit, categories)
- ✅ Combined search (IRC + NZB with merged results)
- ✅ Full search/download implementation (backend complete)

---

## ✅ Completed (7/14 tasks)

### Phase 1: Backend Foundation

#### 1. Install fast-xml-parser dependency
**File:** `server/package.json`
- ✅ Added `fast-xml-parser@4.3.4` for parsing Newznab XML responses
- Zero dependencies, handles RSS + namespaced attributes

#### 2. Create server/src/types.ts
**File:** `server/src/types.ts` (NEW)
- ✅ `NzbProvider` interface with all required fields
- ✅ `NzbSearchItem` for XML parsing
- ✅ `NzbApiResponse` for API responses
- ✅ `NzbSearchResult` for unified search results

**Key interfaces:**
```typescript
interface NzbProvider {
  id: string;                    // UUID
  name: string;                  // e.g., "NZBGeek"
  url: string;                   // API base URL
  apiKey: string;                // Authentication
  enabled: boolean;              // Toggle
  categories: number[];          // Newznab IDs (7000=Books, 8010=Audiobooks)
  priority: number;              // Search order
  apiLimit?: number;             // Daily limit
  requestsToday?: number;        // Usage tracking
  lastResetDate?: string;        // For daily reset
}
```

#### 3. Update ConfigService with NZB CRUD
**File:** `server/src/configService.ts`
- ✅ Updated `NzbConfig.indexers` type to `NzbProvider[]`
- ✅ Added `validateNzbProvider()` - validates URL, API key, categories
- ✅ Added `getNzbProviders()` - returns defensive copy
- ✅ Added `addNzbProvider()` - creates with UUID, validates, saves
- ✅ Added `updateNzbProvider()` - updates existing provider
- ✅ Added `deleteNzbProvider()` - removes provider
- ✅ Added `incrementNzbUsage()` - tracks API usage with daily auto-reset

**Note:** TypeScript types were fixed by user (added explicit type annotations to lambda parameters)

#### 4. Create NzbService ✅
**File:** `server/src/nzbService.ts` (COMPLETED)

- ✅ Implemented all required methods with TypeScript
- ✅ Uses `fast-xml-parser` for Newznab XML parsing
- ✅ 10-second timeout per provider with AbortController
- ✅ Graceful error handling (returns empty array on failure)
- ✅ Metadata extraction from titles (author, title, format)
- ✅ Download method saves `.nzb` files to `downloads/` folder
- ✅ Handles filename collisions with counters

#### 5. Create SearchService ✅
**File:** `server/src/searchService.ts` (COMPLETED)

- ✅ Orchestrates parallel IRC + NZB searches with Promise.all()
- ✅ Detects which sources are enabled (IRC connection status + NZB provider count)
- ✅ Graceful error handling (each source wrapped in .catch())
- ✅ Automatic NZB usage counter incrementation
- ✅ Sequential renumbering of combined results
- ✅ Returns empty array if all sources fail (no crashes)

#### 6. Update IrcService SearchResult ✅
**File:** `server/src/ircService.ts` (COMPLETED)

- ✅ Updated SearchResult interface with `source` and `sourceProvider` fields
- ✅ Added optional `nzbUrl` and `guid` fields for NZB compatibility
- ✅ Updated result mapping to include source tracking
- ✅ Fixed all test files to match new interface

#### 7. Add NZB API endpoints to server.ts ✅
**File:** `server/src/server.ts` (COMPLETED)

- ✅ Added NzbService and SearchService imports
- ✅ Initialized both services in server startup
- ✅ Updated POST /api/search to use unified SearchService
- ✅ Updated POST /api/download to handle both IRC and NZB sources
- ✅ Added GET /api/nzb/providers (list all)
- ✅ Added POST /api/nzb/providers (create)
- ✅ Added PUT /api/nzb/providers/:id (update)
- ✅ Added DELETE /api/nzb/providers/:id (delete)
- ✅ Added POST /api/nzb/providers/:id/test (test connection)
- ✅ All endpoints tested with curl and verified working

---

## ⏳ Remaining Tasks (7/14)

### Phase 5: Frontend Data Layer (Priority: MEDIUM)

#### 8. Update web/src/types.ts ⏳
**File:** `web/src/types.ts`

**Add NzbProvider interface:**
```typescript
export interface NzbProvider {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  categories: number[];
  priority: number;
  apiLimit?: number;
  requestsToday?: number;
  lastResetDate?: string;
}
```

**Update SearchResult interface (lines 1-10):**
```typescript
export interface SearchResult {
  source: 'irc' | 'nzb';      // NEW
  sourceProvider: string;      // NEW
  botName: string;
  bookNumber: number;
  title: string;
  author: string;
  fileType: string;
  size: string;
  filename: string;
  command?: string;            // IRC only
  nzbUrl?: string;             // NZB only
  guid?: string;               // NZB only
}
```

#### 9. Add NZB API methods to web/src/api.ts ⏳
**File:** `web/src/api.ts`

**Add methods:**
```typescript
async getNzbProviders(): Promise<ApiResponse<NzbProvider[]>>
async addNzbProvider(provider: Omit<NzbProvider, 'id'>): Promise<ApiResponse<NzbProvider>>
async updateNzbProvider(id: string, updates: Partial<NzbProvider>): Promise<ApiResponse<{message: string}>>
async deleteNzbProvider(id: string): Promise<ApiResponse<{message: string}>>
async testNzbProvider(id: string): Promise<ApiResponse<{message: string, resultCount: number}>>
```

**Update download method:**
```typescript
async download(result: SearchResult): Promise<ApiResponse<{filename: string}>> {
  const payload = result.source === 'irc'
    ? { source: 'irc', command: result.command }
    : { source: 'nzb', nzbUrl: result.nzbUrl, providerId: result.sourceProvider };
  // ... fetch
}
```

---

### Phase 6: Settings UI (Priority: MEDIUM)

#### 10. Create NzbProviderList component ⏳
**File:** `web/src/components/NzbProviderList.tsx` (NEW)

**Features:**
- List all providers with enable/disable toggle
- Show usage: `requestsToday / apiLimit`
- Edit/Delete/Test buttons per provider
- "Add Provider" button
- Empty state message

#### 11. Create NzbProviderForm component ⏳
**File:** `web/src/components/NzbProviderForm.tsx` (NEW)

**Form fields:**
- Name (text)
- API URL (text with validation)
- API Key (password)
- Categories (checkboxes: Books 7000, Magazines 7020, Audiobooks 8010)
- Daily API Limit (optional number)
- Priority (number, default 1)
- Enabled (checkbox, default true)

**Also need:** `NzbProviderList.css` and `NzbProviderForm.css`

#### 12. Update SettingsModal with tabs ⏳
**File:** `web/src/components/SettingsModal.tsx`

**Changes:**
- Add tab state: `const [activeTab, setActiveTab] = useState<'irc' | 'nzb'>('irc')`
- Add tab buttons in header
- Conditional rendering: IRC form OR NzbProviderList
- Import and render `<NzbProviderList />`

**File:** `web/src/components/SettingsModal.css`
- Add tab button styles with active state

---

### Phase 7: Results Display (Priority: LOW)

#### 13. Update ResultsList with source filtering ⏳
**File:** `web/src/components/ResultsList.tsx`

**Add:**
- Source filter state: `const [sourceFilter, setSourceFilter] = useState<'all' | 'irc' | 'nzb'>('all')`
- Filter buttons showing counts: "All (25)", "IRC (15)", "NZB (10)"
- Source badge per result: `📡 IRC` or `🌐 NZB`
- Update metadata display to show source

**File:** `web/src/components/ResultsList.css`
- `.source-badge` styles (green for IRC, blue for NZB)
- `.source-filter` button group styles

**File:** `web/src/App.tsx`
- Update `handleDownload` to pass full result object

---

### Phase 8: Testing (Priority: HIGH)

#### 14. Test end-to-end NZB integration ⏳

**Backend testing:**
```bash
# Test NZB provider CRUD
curl http://localhost:3001/api/nzb/providers
curl -X POST http://localhost:3001/api/nzb/providers \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","url":"https://api.example.com","apiKey":"test123","enabled":true,"categories":[7000],"priority":1}'

# Test unified search
curl -X POST http://localhost:3001/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"test"}'

# Test NZB download
curl -X POST http://localhost:3001/api/download \
  -H 'Content-Type: application/json' \
  -d '{"source":"nzb","nzbUrl":"https://...","providerId":"uuid"}'
```

**Frontend testing:**
1. Add provider with test connection
2. Perform search → verify IRC + NZB results
3. Check source badges and filtering
4. Download IRC result → DCC transfer
5. Download NZB result → saves .nzb file
6. Edit/delete provider → verify persistence

---

## Current File State

### ✅ Backend Files (Complete)
- `server/package.json` - Added fast-xml-parser ✅
- `server/src/types.ts` - NZB interfaces (NzbProvider, NzbSearchItem, etc.) ✅
- `server/src/configService.ts` - NZB CRUD methods ✅
- `server/src/nzbService.ts` - NZB search/download logic ✅
- `server/src/searchService.ts` - Unified search orchestration ✅
- `server/src/ircService.ts` - Updated with source tracking ✅
- `server/src/server.ts` - All NZB endpoints added ✅
- `server/src/ircService.test.ts` - Updated for new interface ✅

### ⏳ Frontend Files (Pending)
**To Create:**
- `web/src/components/NzbProviderList.tsx` - Provider management UI
- `web/src/components/NzbProviderForm.tsx` - Add/edit provider form
- `web/src/components/NzbProviderList.css` - Styles
- `web/src/components/NzbProviderForm.css` - Styles

**To Modify:**
- `web/src/types.ts` - Update SearchResult, add NzbProvider
- `web/src/api.ts` - Add NZB provider methods
- `web/src/components/SettingsModal.tsx` - Add tabs
- `web/src/components/SettingsModal.css` - Tab styles
- `web/src/components/ResultsList.tsx` - Add filtering
- `web/src/components/ResultsList.css` - Badge styles
- `web/src/App.tsx` - Update download handler

---

## Architecture Decisions

### 1. XML Parsing: fast-xml-parser
- Zero dependencies, pure JavaScript
- Handles Newznab RSS + namespaced attributes
- Already installed ✅

### 2. HTTP Client: Native fetch
- Node.js 18+ built-in
- Timeout via AbortController
- No additional dependencies

### 3. Download Strategy: Save .nzb Files (MVP)
- NZB files are XML metadata for Usenet
- Save to `downloads/` folder as `.nzb`
- User imports to SABnzbd/NZBGet manually
- Future: Add NNTP client for direct download

### 4. Rate Limiting: Daily Counter with Auto-Reset
- Store `lastResetDate` + `requestsToday` per provider
- Auto-reset on first search of new day
- No cron jobs needed

### 5. Error Handling: Graceful Degradation
- Each source wrapped in `.catch()`
- Failed sources return empty array
- Partial results > no results

---

## Implementation Priority Order

**✅ Backend Complete (Tasks 1-7)**

**Next session - Frontend Implementation:**

1. **MEDIUM:** Frontend types and API (Tasks #8-9)
   - Update web/src/types.ts with NZB interfaces
   - Add NZB API methods to web/src/api.ts
   - Enable frontend to call new endpoints

2. **MEDIUM:** Settings UI (Tasks #10-12)
   - Create NzbProviderList component
   - Create NzbProviderForm component
   - Add tabs to SettingsModal

3. **LOW:** Results display (Task #13)
   - Add source badges (IRC vs NZB)
   - Add source filtering

4. **HIGH:** End-to-end testing (Task #14)
   - Test with real NZB provider
   - Verify IRC + NZB combined search
   - Test downloads from both sources

---

## Reference: Newznab API

**Search endpoint:**
```
GET {url}/api?apikey={key}&t=search&q={query}&cat={categories}&extended=1&limit=100
```

**Category IDs:**
- 7000: Books (All)
- 7020: Books - Magazines
- 8010: Audiobooks

**Response format:** RSS XML
```xml
<rss>
  <channel>
    <newznab:response offset="0" total="100" />
    <item>
      <title>Author - Title (Year) [EPUB]</title>
      <link>https://api.provider.com/nzb/abc123</link>
      <guid>abc123</guid>
      <pubDate>Mon, 01 Jan 2024 12:00:00 +0000</pubDate>
      <category>Books</category>
      <newznab:attr name="size" value="1048576" />
    </item>
  </channel>
</rss>
```

---

## Notes

- TypeScript compilation works ✅
- Backend fully tested with curl ✅
- All NZB CRUD endpoints working ✅
- Unified search operational (graceful error handling) ✅
- Download routing works for both IRC and NZB ✅
- Frontend implementation is next priority

**Last Updated:** 2026-01-11
**Progress:** 7/14 tasks (50% - Backend Complete)
