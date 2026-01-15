import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { IrcService } from './ircService.js';
import { ConfigService } from './configService.js';
import { NzbService } from './nzbService.js';
import { SearchService } from './searchService.js';
import { DownloaderService } from './downloaderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize configuration service
const configService = new ConfigService();
await configService.initialize();

// IRC Service (singleton) - initialized with configuration
const ircService = new IrcService(configService.getIrcConfig(), configService.getGeneralConfig().downloadPath, configService);

// NZB Service - handles Newznab API interactions
const nzbService = new NzbService(configService);

// Search Service - orchestrates unified IRC + NZB searches
const searchService = new SearchService(ircService, nzbService, configService);

// Downloader Service - handles sending NZBs to downloaders
const downloaderService = new DownloaderService();

// Routes
app.post('/api/connect', async (req, res) => {
  try {
    // Only connect if IRC is enabled
    const ircConfig = configService.getIrcConfig();
    if (!ircConfig.enabled) {
      return res.json({ 
        success: false, 
        error: 'IRC is disabled. Please enable it in settings.' 
      });
    }

    await ircService.connect();
    res.json({ success: true, data: { status: 'connected' } });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/status', (req, res) => {
  const status = ircService.getStatus();
  res.json({ success: true, data: { connectionStatus: status } });
});

app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.json({ success: false, error: 'Invalid query' });
    }

    // Use unified search service (searches both IRC and NZB)
    const results = await searchService.search(query);
    res.json({ success: true, data: results });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { source, command, nzbUrl, providerId, title } = req.body;

    if (!source || (source !== 'irc' && source !== 'nzb')) {
      return res.json({ success: false, error: 'Invalid or missing source' });
    }

    let filename: string;

    if (source === 'irc') {
      // IRC DCC download
      if (!command || typeof command !== 'string') {
        return res.json({ success: false, error: 'Invalid command for IRC download' });
      }
      filename = await ircService.download(command);
    } else {
      // NZB download
      if (!nzbUrl || typeof nzbUrl !== 'string') {
        return res.json({ success: false, error: 'Invalid nzbUrl for NZB download' });
      }

      // Get provider API key
      const providers = configService.getNzbProviders();
      const provider = providers.find(p => p.id === providerId);

      if (!provider) {
        return res.json({ success: false, error: 'NZB provider not found' });
      }

      filename = await nzbService.download(nzbUrl, provider.apiKey, title);
    }

    res.json({ success: true, data: { filename } });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// NZB Provider endpoints
app.get('/api/nzb/providers', (req, res) => {
  try {
    const providers = configService.getNzbProviders();
    res.json({ success: true, data: providers });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/nzb/providers', async (req, res) => {
  try {
    const provider = req.body;

    if (!provider || typeof provider !== 'object') {
      return res.json({ success: false, error: 'Invalid provider data' });
    }

    const newProvider = await configService.addNzbProvider(provider);
    res.json({ success: true, data: newProvider });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.put('/api/nzb/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.json({ success: false, error: 'Invalid update data' });
    }

    await configService.updateNzbProvider(id, updates);
    res.json({ success: true, data: { message: 'Provider updated successfully' } });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.delete('/api/nzb/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await configService.deleteNzbProvider(id);
    res.json({ success: true, data: { message: 'Provider deleted successfully' } });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/nzb/providers/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the provider
    const providers = configService.getNzbProviders();
    const provider = providers.find(p => p.id === id);

    if (!provider) {
      return res.json({ success: false, error: 'Provider not found' });
    }

    console.log(`[Server] Testing NZB provider: ${provider.name} (enabled: ${provider.enabled})`);

    // Perform a test search (using a common term likely to return results)
    const results = await nzbService.search('ebook', [provider]);

    console.log(`[Server] Test complete: ${results.length} results found`);

    res.json({
      success: true,
      data: {
        message: 'Connection successful',
        resultCount: results.length
      }
    });
  } catch (error) {
    console.error(`[Server] Test failed:`, error);
    res.json({ success: false, error: (error as Error).message });
  }
});

// Configuration endpoints
app.get('/api/config', (req, res) => {
  try {
    const ircConfig = configService.getIrcConfig();
    const generalConfig = configService.getGeneralConfig();
    // Return only user-editable fields
    const userConfig = {
      enabled: ircConfig.enabled,
      server: ircConfig.server,
      port: ircConfig.port,
      channel: ircConfig.channel,
      searchCommand: ircConfig.searchCommand,
    };
    res.json({ success: true, data: { irc: userConfig, general: generalConfig } });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Update IRC configuration
app.put('/api/config/irc', async (req, res) => {
  try {
    const ircConfig = req.body;

    if (!ircConfig || typeof ircConfig !== 'object') {
      return res.json({ success: false, error: 'Invalid IRC configuration' });
    }

    // Validate IRC config
    const ircErrors = configService.validateIrcConfig(ircConfig);
    if (ircErrors.length > 0) {
      return res.json({
        success: false,
        error: ircErrors.map(e => e.message).join(', ')
      });
    }

    // Update IRC config
    await configService.updateIrcConfig(ircConfig);

    // Update IRC service and reconnect
    let reconnected = true;
    let reconnectError = null;
    try {
      await ircService.updateConfig(configService.getIrcConfig());
    } catch (error) {
      reconnected = false;
      reconnectError = (error as Error).message;
      console.error('Failed to reconnect with new config:', reconnectError);
    }

    res.json({
      success: true,
      data: {
        reconnected,
        message: reconnected
          ? 'IRC configuration updated successfully'
          : `Configuration saved but failed to reconnect: ${reconnectError}`
      }
    });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Update general configuration
app.put('/api/config/general', async (req, res) => {
  try {
    const generalConfig = req.body;

    if (!generalConfig || typeof generalConfig !== 'object') {
      return res.json({ success: false, error: 'Invalid general configuration' });
    }

    // Validate general config
    const generalErrors = configService.validateGeneralConfig(generalConfig);
    if (generalErrors.length > 0) {
      return res.json({
        success: false,
        error: generalErrors.map(e => e.message).join(', ')
      });
    }

    // Update general config
    await configService.updateGeneralConfig(generalConfig);

    res.json({
      success: true,
      data: {
        message: 'General configuration updated successfully'
      }
    });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/config/reset', async (req, res) => {
  try {
    // Reset configuration to defaults
    await configService.reset();

    // Update IRC service and reconnect
    let reconnected = true;
    let reconnectError = null;
    try {
      await ircService.updateConfig(configService.getIrcConfig());
    } catch (error) {
      reconnected = false;
      reconnectError = (error as Error).message;
      console.error('Failed to reconnect after reset:', reconnectError);
    }

    res.json({
      success: true,
      data: {
        reconnected,
        message: reconnected
          ? 'Configuration reset to defaults'
          : `Configuration reset but failed to reconnect: ${reconnectError}`
      }
    });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// DOWNLOADER ENDPOINTS
// ============================================================================

// Get all usenet downloaders
app.get('/api/downloaders/usenet', (req, res) => {
  try {
    const downloaders = configService.getUsenetDownloaders();
    res.json({ success: true, data: downloaders });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Get enabled usenet downloader
app.get('/api/downloaders/usenet/enabled', (req, res) => {
  try {
    const downloader = configService.getEnabledUsenetDownloader();
    res.json({ success: true, data: downloader });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Add new usenet downloader
app.post('/api/downloaders/usenet', async (req, res) => {
  try {
    const downloader = await configService.addUsenetDownloader(req.body);
    res.json({ success: true, data: downloader });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Update usenet downloader
app.put('/api/downloaders/usenet/:id', async (req, res) => {
  try {
    const downloader = await configService.updateUsenetDownloader(req.params.id, req.body);
    res.json({ success: true, data: downloader });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Delete usenet downloader
app.delete('/api/downloaders/usenet/:id', async (req, res) => {
  try {
    await configService.deleteUsenetDownloader(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Test downloader connection
app.post('/api/downloaders/usenet/:id/test', async (req, res) => {
  try {
    const downloaders = configService.getUsenetDownloaders();
    const downloader = downloaders.find(d => d.id === req.params.id);
    
    if (!downloader) {
      return res.json({ success: false, error: 'Downloader not found' });
    }

    const result = await downloaderService.testConnection(downloader);
    res.json({ 
      success: result.success, 
      data: { version: result.version },
      error: result.success ? undefined : result.message 
    });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Send NZB to downloader
app.post('/api/downloaders/send', async (req, res) => {
  try {
    const { nzbUrl, title } = req.body;

    if (!nzbUrl || !title) {
      return res.json({ success: false, error: 'Missing nzbUrl or title' });
    }

    // Get enabled downloader
    const downloader = configService.getEnabledUsenetDownloader();
    if (!downloader) {
      return res.json({ success: false, error: 'No downloader configured. Please add one in Settings.' });
    }

    // Send to appropriate downloader
    if (downloader.type === 'nzbget') {
      await downloaderService.sendToNZBGet(downloader, nzbUrl, title);
    } else if (downloader.type === 'sabnzbd') {
      await downloaderService.sendToSABnzbd(downloader, nzbUrl, title);
    } else {
      return res.json({ success: false, error: 'Unknown downloader type' });
    }

    res.json({ 
      success: true, 
      data: { 
        message: `Sent to ${downloader.name}`,
        downloaderType: downloader.type 
      } 
    });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Serve static files from web frontend (in production)
if (process.env.NODE_ENV === 'production') {
  // __dirname is /app/server/dist/server/src when compiled
  // public folder is at /app/server/public
  const publicPath = path.join(__dirname, '..', '..', '..', 'public');
  app.use(express.static(publicPath));
  
  // Serve index.html for all non-API routes (SPA fallback)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicPath, 'index.html'));
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`✓ API server running on http://localhost:${PORT}`);
  console.log(`✓ CORS enabled for all origins`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  ircService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  ircService.disconnect();
  process.exit(0);
});
