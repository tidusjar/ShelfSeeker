# Implementation Plan: NZB Newznab Provider Integration

## Overview
Add full NZB Newznab indexer support to the IRC ebooks application, allowing users to search both IRC and NZB sources simultaneously with combined results.

## User Requirements
- **Multiple NZB providers**: Add/remove/enable/disable multiple Newznab indexers
- **Combined search**: Search IRC + all enabled NZB providers, merge results
- **Provider configuration**: URL, API key, name, API limit (requests/day), categories (ebook, audiobook, etc.)
- **Full implementation**: Both configuration UI and search/download functionality

## Architecture Integration

### Current System
- **Search**: POST /api/search → IrcService.search() → SearchResult[]
- **Download**: POST /api/download → IrcService.download(command) → filename
- **Config**: ConfigService with lowdb, already has `sources.nzb.indexers[]` placeholder
- **SearchResult**: `{ botName, bookNumber, title, author, fileType, size, command, filename }`

### Enhanced System
- **Search**: SearchService orchestrates parallel IRC + NZB searches, merges results with sequential numbering
- **Download**: Handles both IRC commands and NZB file downloads
- **SearchResult**: Add `source: 'irc' | 'nzb'`, `sourceProvider`, `nzbUrl`, `guid` fields
- **Config**: NZB provider CRUD operations with validation and rate limiting

## Implementation Steps

### Phase 1: Backend Type System & Configuration (Priority 1)

#### 1.1 Create Server Types
**File**: `server/src/types.ts` (NEW)

```typescript
export interface NzbProvider {
  id: string;                    // UUID for management
  name: string;                  // e.g., "NZBGeek"
  url: string;                   // e.g., "https://api.nzbgeek.info"
  apiKey: string;                // API authentication
  enabled: boolean;              // Toggle without deletion
  categories: number[];          // Newznab IDs (7000=Books, 8010=Audiobooks)
  priority: number;              // Search order
  apiLimit?: number;             // Daily request limit
  requestsToday?: number;        // Usage tracking
  lastResetDate?: string;        // ISO date for daily reset
}
```

#### 1.2 Update ConfigService
**File**: `server/src/configService.ts`

Add methods:
- `validateNzbProvider(provider)` - Validates URL format, non-empty name/apiKey, categories
- `addNzbProvider(provider)` - Creates UUID, sets defaults, validates, saves
- `updateNzbProvider(id, updates)` - Updates existing provider
- `deleteNzbProvider(id)` - Removes provider
- `getNzbProviders()` - Returns defensive copy
- `incrementNzbUsage(id)` - Tracks API usage, auto-resets daily

**Validation rules**:
- Name: non-empty string
- URL: valid URL format (use `new URL()`)
- API key: non-empty string
- Categories: at least one category required

### Phase 2: NZB Service Layer (Priority 2)

#### 2.1 Install Dependencies
```bash
cd server
npm install fast-xml-parser@4.3.4
```

**Why fast-xml-parser**: Zero dependencies, handles Newznab RSS + namespaced attributes cleanly

#### 2.2 Create NzbService
**File**: `server/src/nzbService.ts` (NEW)

**Core methods**:
```typescript
class NzbService {
  async search(query: string, providers: NzbProvider[]): Promise<NzbSearchResult[]>
  private async searchProvider(query: string, provider: NzbProvider): Promise<NzbSearchResult[]>
  private parseXml(xmlText: string): NzbApiResponse
  private parseItem(item: any): NzbSearchItem | null
  private convertToSearchResult(item: NzbSearchItem, providerName: string): NzbSearchResult
  private extractMetadata(title: string): { title, author, fileType }
  private formatBytes(bytes: number): string
  async download(nzbUrl: string, apiKey: string): Promise<string>
}
```

**Newznab API format**:
- Search: `GET {url}/api?apikey={key}&t=search&q={query}&cat={categories}&extended=1&limit=100`
- Response: XML RSS feed with `<item>` elements

**XML parsing**:
- Use `fast-xml-parser` with array detection for `<item>` and `<newznab:attr>`
- Extract: title, link (NZB URL), size (from newznab:attr), pubDate, guid
- Handle missing/malformed responses gracefully

**Metadata extraction**:
- Parse title patterns: "Author - Title (Year) [Format]"
- Remove brackets, parentheses, detect file type
- Default to 'epub' if not specified

**Download implementation**:
- Fetch NZB XML file from URL (with API key)
- Save to `downloads/` folder as `.nzb` file
- Extract filename from Content-Disposition header
- Return filename for user

**Error handling**:
- 10-second timeout per provider (AbortController)
- Catch individual provider failures, return empty array
- Log errors but don't fail entire search
- Rate limit check before searching

### Phase 3: Unified Search System (Priority 3)

#### 3.1 Create SearchService
**File**: `server/src/searchService.ts` (NEW)

```typescript
class SearchService {
  constructor(ircService, nzbService, configService)

  async search(query: string): Promise<UnifiedSearchResult[]> {
    // 1. Check which sources enabled (IRC, NZB)
    // 2. Launch parallel searches (Promise.all with .catch)
    // 3. Increment NZB usage counters
    // 4. Merge results, renumber sequentially
    // 5. Return combined array
  }
}
```

**Parallel search strategy**:
- IRC and NZB searches run simultaneously via `Promise.all()`
- Each wrapped in `.catch()` to handle failures gracefully
- Partial results better than no results
- Log which sources succeeded/failed

**Result merging**:
- Combine IRC + NZB results into single array
- Renumber `bookNumber` sequentially (1, 2, 3...)
- Preserve source information for filtering

#### 3.2 Update SearchResult Format
**File**: `server/src/ircService.ts` (lines 156-168)

Add to SearchResult conversion:
```typescript
{
  source: 'irc' as const,
  sourceProvider: r.botCommand.replace('!', ''),
  // ... existing fields
}
```

**File**: `web/src/types.ts`

Update SearchResult interface:
```typescript
export interface SearchResult {
  source: 'irc' | 'nzb';
  sourceProvider: string;      // Bot name or provider name
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

### Phase 4: API Endpoints (Priority 4)

#### 4.1 Update Server Routes
**File**: `server/src/server.ts`

**Initialize services**:
```typescript
const nzbService = new NzbService();
const searchService = new SearchService(ircService, nzbService, configService);
```

**Update POST /api/search**:
- Replace `ircService.search()` with `searchService.search()`
- Returns combined IRC + NZB results

**Update POST /api/download**:
- Accept `{ source, command?, nzbUrl?, providerId? }`
- Route to `ircService.download()` or `nzbService.download()`
- For NZB: lookup provider by ID to get API key

**Add NZB provider endpoints**:
- `GET /api/nzb/providers` - List all providers
- `POST /api/nzb/providers` - Add provider
- `PUT /api/nzb/providers/:id` - Update provider
- `DELETE /api/nzb/providers/:id` - Delete provider
- `POST /api/nzb/providers/:id/test` - Test connection (performs search with "test" query)

### Phase 5: Frontend Data Layer (Priority 5)

#### 5.1 Update API Client
**File**: `web/src/api.ts`

Add methods:
```typescript
async getNzbProviders(): Promise<ApiResponse<NzbProvider[]>>
async addNzbProvider(provider): Promise<ApiResponse<NzbProvider>>
async updateNzbProvider(id, updates): Promise<ApiResponse<{message}>>
async deleteNzbProvider(id): Promise<ApiResponse<{message}>>
async testNzbProvider(id): Promise<ApiResponse<{message, resultCount}>>
```

Update download method:
```typescript
async download(result: SearchResult): Promise<ApiResponse<{filename}>> {
  const payload = result.source === 'irc'
    ? { source: 'irc', command: result.command }
    : { source: 'nzb', nzbUrl: result.nzbUrl, providerId: result.sourceProvider };
  // ... fetch
}
```

#### 5.2 Update Types
**File**: `web/src/types.ts`

Add NzbProvider interface (mirror server types)

### Phase 6: Settings UI (Priority 6)

#### 6.1 Create NZB Provider Components

**File**: `web/src/components/NzbProviderList.tsx` (NEW)

Features:
- List all providers with enable/disable toggle
- Show usage: `requestsToday / apiLimit`
- Edit/Delete/Test buttons per provider
- "Add Provider" button
- Empty state with helpful message

**File**: `web/src/components/NzbProviderForm.tsx` (NEW)

Form fields:
- Name (text input)
- API URL (text input with URL validation)
- API Key (password input)
- Categories (checkboxes: Books (7000), Magazines (7020), Audiobooks (8010))
- Daily API Limit (optional number input)
- Priority (number input, default 1)
- Enabled (checkbox, default true)

Validation:
- Name: required
- URL: required, valid URL format
- API Key: required
- Categories: at least one required

**File**: `web/src/components/NzbProviderList.css` (NEW)
**File**: `web/src/components/NzbProviderForm.css` (NEW)

Style to match existing terminal/cyberpunk aesthetic

#### 6.2 Update SettingsModal
**File**: `web/src/components/SettingsModal.tsx`

Add tab navigation:
- State: `const [activeTab, setActiveTab] = useState<'irc' | 'nzb'>('irc')`
- Tab buttons: "IRC Settings" and "NZB Providers"
- Conditional rendering: Show IRC form or NzbProviderList based on active tab

**File**: `web/src/components/SettingsModal.css`

Add tab styles with active state indicator

### Phase 7: Results Display (Priority 7)

#### 7.1 Update ResultsList
**File**: `web/src/components/ResultsList.tsx`

Add source filter:
```typescript
const [sourceFilter, setSourceFilter] = useState<'all' | 'irc' | 'nzb'>('all');
```

Filter UI:
- Buttons: "All (25)", "IRC (15)", "NZB (10)"
- Show counts per source type

Source badge per result:
```tsx
<span className={`source-badge ${result.source}`}>
  {result.source === 'irc' ? '📡 IRC' : '🌐 NZB'}
</span>
```

Update metadata display:
```tsx
<div className="meta-item">
  <span className="meta-label">Source:</span>
  <span className="meta-value">
    {result.source === 'irc' ? 'IRC:' : 'NZB:'} {result.sourceProvider}
  </span>
</div>
```

**File**: `web/src/components/ResultsList.css`

Add styles:
- `.source-badge` with color coding (green for IRC, blue for NZB)
- `.source-filter` button group styles
- Active state for filter buttons

#### 7.2 Update Download Handler
**File**: `web/src/App.tsx`

Update `handleDownload`:
- Pass full `result` object to `api.download(result)`
- Display appropriate progress message based on source

## Critical Design Decisions

### 1. XML Parsing: fast-xml-parser
- Zero dependencies, pure JavaScript
- Handles Newznab RSS + namespaced attributes
- Used by similar projects (Sonarr, Radarr)

### 2. HTTP Client: Native fetch
- Node.js 18+ built-in
- No additional dependencies
- Timeout via AbortController

### 3. Download Strategy: Save .nzb Files (MVP)
- NZB files are XML metadata for Usenet
- Full Usenet download requires NNTP (out of scope)
- Save to `downloads/` for import into SABnzbd/NZBGet
- Future: Add NNTP client integration

### 4. Rate Limiting: Daily Counter with Auto-Reset
- Store `lastResetDate` + `requestsToday`
- Auto-reset on first search of new day
- Prevents API bans without complex scheduling

### 5. Error Handling: Graceful Degradation
- Each source wrapped in `.catch()`
- Failed sources return empty array
- Partial results > no results
- Log errors to console

## Implementation Sequence

1. **Backend foundation** (server types, ConfigService updates)
2. **NzbService** (search + download implementation)
3. **SearchService** (unified search orchestration)
4. **API routes** (server.ts endpoints)
5. **Frontend types** (web types + API client)
6. **Settings UI** (provider list + form)
7. **Results display** (source badges + filtering)
8. **Testing** (end-to-end flows)

## Critical Files to Modify

### Server (Backend)
- `server/src/types.ts` - NEW: NzbProvider, NzbSearchItem interfaces
- `server/src/configService.ts` - Add NZB provider CRUD methods
- `server/src/nzbService.ts` - NEW: Search/download with XML parsing
- `server/src/searchService.ts` - NEW: Orchestrate unified search
- `server/src/ircService.ts` - Add source field to SearchResult conversion
- `server/src/server.ts` - Add NZB endpoints, update search/download
- `server/package.json` - Add fast-xml-parser dependency

### Web (Frontend)
- `web/src/types.ts` - Update SearchResult, add NzbProvider
- `web/src/api.ts` - Add NZB provider methods, update download
- `web/src/components/NzbProviderList.tsx` - NEW: Provider management UI
- `web/src/components/NzbProviderForm.tsx` - NEW: Add/edit provider form
- `web/src/components/SettingsModal.tsx` - Add tabbed interface
- `web/src/components/ResultsList.tsx` - Add source filtering + badges
- `web/src/App.tsx` - Update download handler for both sources

## Verification Steps

### Backend Testing
1. **Config API**:
   ```bash
   curl http://localhost:3001/api/nzb/providers
   curl -X POST http://localhost:3001/api/nzb/providers -H 'Content-Type: application/json' -d '{"name":"Test","url":"https://api.example.com","apiKey":"test123","enabled":true,"categories":[7000],"priority":1}'
   ```

2. **Search API**:
   ```bash
   curl -X POST http://localhost:3001/api/search -H 'Content-Type: application/json' -d '{"query":"test"}'
   # Should return combined IRC + NZB results with source field
   ```

3. **Download API**:
   ```bash
   # IRC download
   curl -X POST http://localhost:3001/api/download -H 'Content-Type: application/json' -d '{"source":"irc","command":"!Bsk file.epub"}'

   # NZB download
   curl -X POST http://localhost:3001/api/download -H 'Content-Type: application/json' -d '{"source":"nzb","nzbUrl":"https://...","providerId":"uuid"}'
   ```

### Frontend Testing
1. Open web app → Settings → NZB Providers tab
2. Add provider with test connection → Verify success/failure message
3. Perform search → Verify IRC + NZB results appear
4. Check source badges (📡 IRC vs 🌐 NZB)
5. Use source filter (All/IRC/NZB) → Verify filtering works
6. Download IRC result → Downloads via DCC
7. Download NZB result → Saves .nzb file to downloads/
8. Edit provider → Verify changes persist
9. Disable provider → Verify excluded from search
10. Check rate limiting → Exceed limit, verify provider auto-disabled

### End-to-End Flow
1. Start server: `cd server && npm run dev`
2. Start web: `cd web && npm run dev`
3. Open http://localhost:5173
4. Settings → NZB Providers → Add provider (use real API key)
5. Search for "foundation asimov"
6. Verify mixed results with source indicators
7. Download one IRC result, one NZB result
8. Verify both downloads complete successfully

## Future Enhancements
- NNTP client integration for direct Usenet downloads
- Provider health monitoring (track success/failure rates)
- Automatic provider retry with exponential backoff
- Caching of search results
- Advanced filtering (file size, date range, quality)
- Provider-specific category mappings
