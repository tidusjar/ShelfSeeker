# Downloader Configuration System - Implementation Complete

**Date:** 2026-01-11  
**Status:** ✅ Complete - Ready for Testing

## Overview

Implemented a complete downloader configuration system that allows users to send NZB files directly to NZBGet or SABnzbd instead of manually downloading .nzb files.

## Key Features

### Backend (Server)

1. **Downloader Types** (`server/src/types.ts`)
   - `DownloaderType`: 'nzbget' | 'sabnzbd'
   - Full `Downloader` interface with all connection settings
   - Support for both username/password and API key authentication

2. **Configuration Service** (`server/src/configService.ts`)
   - `addUsenetDownloader()` - Create new downloader
   - `updateUsenetDownloader()` - Update existing downloader
   - `deleteUsenetDownloader()` - Remove downloader
   - `getUsenetDownloaders()` - Get all downloaders
   - `getEnabledUsenetDownloader()` - Get active downloader
   - **Only one downloader can be enabled at a time**

3. **Downloader Service** (`server/src/downloaderService.ts`)
   - **NZBGet Integration**
     - JSON-RPC API client
     - Fetches NZB, encodes as base64, sends via `append` method
     - Supports category and priority settings
   - **SABnzbd Integration**
     - REST API client
     - Sends NZB URL via `addurl` endpoint
     - Supports API key + optional basic auth
   - **Connection Testing**
     - `testConnection()` - Validates credentials and connectivity
     - Returns version number on success

4. **API Endpoints** (`server/src/server.ts`)
   - `GET /api/downloaders/usenet` - List all downloaders
   - `GET /api/downloaders/usenet/enabled` - Get enabled downloader
   - `POST /api/downloaders/usenet` - Create downloader
   - `PUT /api/downloaders/usenet/:id` - Update downloader
   - `DELETE /api/downloaders/usenet/:id` - Delete downloader
   - `POST /api/downloaders/usenet/:id/test` - Test connection
   - `POST /api/downloaders/send` - Send NZB to configured downloader

### Frontend (Web UI)

1. **Types** (`web/src/types.ts`)
   - Mirrored backend `Downloader` and `DownloaderType` interfaces

2. **API Client** (`web/src/api.ts`)
   - All CRUD methods for downloader management
   - `sendToDownloader()` - Send NZB to active downloader

3. **Downloader List Component** (`web/src/components/DownloaderList.tsx`)
   - Grid view of all configured downloaders
   - Enable/disable toggle (only one can be enabled)
   - Test connection button with version display
   - Edit and delete actions
   - Status indicator for active downloader
   - Empty state with helpful message

4. **Downloader Form Component** (`web/src/components/DownloaderForm.tsx`)
   - Modal form for add/edit operations
   - Type selector (NZBGet or SABnzbd)
   - Dynamic fields based on type:
     - NZBGet: host, port, username, password, SSL, category, priority
     - SABnzbd: same + API key (required)
   - Form validation with error messages
   - SSL checkbox
   - Default port changes based on type (6789 for NZBGet, 8080 for SABnzbd)

5. **Settings Modal Update** (`web/src/components/SettingsModal.tsx`)
   - Added 4th tab: "Downloaders"
   - Tab order: General → IRC → NZB Providers → Downloaders

6. **Results List Update** (`web/src/components/ResultsList.tsx`)
   - **Dual button layout for NZB results:**
     - Primary: "Send to Downloader" (large, prominent)
     - Secondary: "📥 NZB" (small, less prominent)
   - Button disables after sending (shows "Sent ✓")
   - IRC results still show single "Download" button
   - State tracking to prevent duplicate sends

7. **App Integration** (`web/src/App.tsx`)
   - `handleSendToDownloader()` - Calls API, shows progress in DownloadPanel
   - Passes handler to ResultsList component
   - Shows success/error messages in download panel

## Design Decisions

### Single Active Downloader
- Only one usenet downloader can be enabled at a time
- Enabling one automatically disables all others
- Simplifies UX - no selection modal needed
- User can configure multiple, but only one is active

### Auto-Send on Click
- No confirmation modal
- Direct send to configured downloader
- Button disables after sending to prevent spam
- Shows "Sent ✓" feedback

### Dual Button Layout
- Primary button: "Send to Downloader" (if configured)
- Secondary button: "Download NZB" (fallback option)
- Keeps both options available but guides users to preferred method

### Dynamic Button Text
- Shows "Send to NZBGet" or "Send to SABnzbd" based on type
- Clear indication of where NZB is going

## File Structure

### New Files (6)
```
server/src/downloaderService.ts        - NZBGet/SABnzbd API clients
web/src/components/DownloaderList.tsx  - Management UI
web/src/components/DownloaderList.css  - UI styling
web/src/components/DownloaderForm.tsx  - Add/edit form
web/src/components/DownloaderForm.css  - Form styling
DOWNLOADER_IMPLEMENTATION.md           - This document
```

### Modified Files (7)
```
server/src/types.ts                    - Downloader interfaces
server/src/configService.ts            - CRUD methods
server/src/server.ts                   - API endpoints
web/src/types.ts                       - Frontend types
web/src/api.ts                         - API methods
web/src/components/SettingsModal.tsx   - Downloaders tab
web/src/components/ResultsList.tsx     - Dual buttons
web/src/components/ResultsList.css     - Button styling
web/src/App.tsx                        - Send handler
```

## Configuration Structure

```typescript
// Config file structure
{
  "downloaders": {
    "usenet": [
      {
        "id": "uuid",
        "name": "My NZBGet",
        "type": "nzbget",
        "enabled": true,
        "host": "localhost",
        "port": 6789,
        "ssl": false,
        "username": "nzbget",
        "password": "password",
        "category": "books",
        "priority": 0
      }
    ],
    "torrent": []  // Reserved for future
  }
}
```

## API Integration Details

### NZBGet (JSON-RPC)
```typescript
POST http://username:password@host:port/jsonrpc
{
  "method": "append",
  "params": [
    "filename.nzb",           // NZB name
    "base64_encoded_content", // NZB file as base64
    "Books",                  // Category
    0,                        // Priority (-100 to 100)
    false,                    // Add to top
    false,                    // Add paused
    "",                       // Duplicate key
    0,                        // Duplicate score
    "SCORE"                   // Duplicate mode
  ]
}
```

### SABnzbd (REST API)
```typescript
GET http://host:port/api?mode=addurl&name={nzbUrl}&apikey={key}&output=json&nzbname={title}&cat={category}&priority={priority}
Authorization: Basic {base64(username:password)}  // Optional
```

## Testing

### Manual Testing Steps

1. **Add NZBGet Downloader**
   - Go to Settings → Downloaders
   - Click "Add Downloader"
   - Select "NZBGet"
   - Fill in: host, port, username, password
   - Click "Test" to verify connection
   - Save

2. **Enable Downloader**
   - Toggle switch on downloader card
   - Verify it shows "Active Downloader"

3. **Search for NZB Result**
   - Search a term (requires NZB provider configured)
   - Filter by "NZB" source
   - Verify dual buttons appear

4. **Send to NZBGet**
   - Click "Send to Downloader"
   - Verify download panel shows "Sending..."
   - Verify button changes to "Sent ✓" and disables
   - Check NZBGet queue for file

5. **Download NZB Fallback**
   - Click small "📥 NZB" button
   - Verify .nzb file downloads

### Error Scenarios
- No downloader configured → Shows error message
- Connection failed → Shows error in download panel
- Invalid credentials → Test button shows error
- NZBGet/SABnzbd offline → Graceful error handling

## Future Enhancements

### Torrent Support
- Same architecture can support torrent downloaders
- Add `DownloaderType: 'transmission' | 'qbittorrent'`
- Store in `downloaders.torrent` array
- Similar UI patterns

### Advanced Features
- Multiple downloaders per category (with selection modal)
- Custom priority per download
- Download history tracking
- Queue management from UI
- Pause/resume downloads

## Configuration Examples

### NZBGet Example
```typescript
{
  "name": "Home NZBGet",
  "type": "nzbget",
  "enabled": true,
  "host": "192.168.1.100",
  "port": 6789,
  "ssl": false,
  "username": "nzbget",
  "password": "tegbzn6789",
  "category": "books",
  "priority": 0
}
```

### SABnzbd Example
```typescript
{
  "name": "Cloud SABnzbd",
  "type": "sabnzbd",
  "enabled": true,
  "host": "sabnzbd.mydomain.com",
  "port": 443,
  "ssl": true,
  "username": "admin",
  "password": "secret",
  "apiKey": "abc123...",
  "category": "ebooks",
  "priority": -1  // High priority
}
```

## Compilation Status

- ✅ Backend TypeScript compiles without errors
- ✅ Frontend TypeScript compiles without errors
- ✅ Vite build successful (340 modules)
- ✅ All type safety verified

## Next Steps

1. Deploy to testing environment
2. Test with real NZBGet instance
3. Test with real SABnzbd instance (if available)
4. Verify error handling edge cases
5. Consider adding download history feature

---

**Implementation Time:** ~2 hours  
**Files Created:** 6  
**Files Modified:** 9  
**Lines of Code:** ~1,200
