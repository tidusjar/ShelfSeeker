import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { IrcService } from './ircService.js';
import { ConfigService } from './configService.js';
import { NzbService } from './nzbService.js';
import { SearchService } from './searchService.js';
import { DownloaderService } from './downloaderService.js';
import { logger } from './lib/logger.js';
import { LIMITS } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: LIMITS.MAX_REQUEST_PAYLOAD_SIZE }));

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

// Load version from package.json
let version = '1.0.0';
try {
  const packagePath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  version = packageJson.version;
} catch (error) {
  logger.error('Failed to load version from package.json', { error });
}

// Routes

// System information endpoint
app.get('/api/system/info', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        version,
        name: 'ShelfSeeker',
        description: 'Multi-source ebook search and download application',
        githubUrl: 'https://github.com/tidusjar/ShelfSeeker',
        donationUrl: 'https://www.paypal.com/paypalme/PlexRequestsNet',
        license: 'MIT',
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
      }
    });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});
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

app.post('/api/reconnect', async (req, res) => {
  try {
    // Only reconnect if IRC is enabled
    const ircConfig = configService.getIrcConfig();
    if (!ircConfig.enabled) {
      return res.json({
        success: false,
        error: 'IRC is disabled. Please enable it in settings.'
      });
    }

    // Reconnect with new random nickname (useful after bans)
    await ircService.reconnectWithNewNickname();
    res.json({
      success: true,
      data: {
        status: 'connected',
        message: 'Reconnected with a new random nickname'
      }
    });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/status', (req, res) => {
  const status = ircService.getStatus();
  const isBanned = ircService.isBanned();
  res.json({
    success: true,
    data: {
      connectionStatus: status,
      isBanned
    }
  });
});

app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.json({ success: false, error: 'Invalid query' });
    }

    // Use unified search service WITHOUT enrichment for fast results
    const { results, errors } = await searchService.search(query, false);
    res.json({ success: true, data: results, errors });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/enrich', async (req, res) => {
  try {
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.json({ success: false, error: 'Invalid results array' });
    }

    logger.info('[Server] Enriching results', { resultCount: results.length });

    // Import enrichment service
    const { enrichSearchResults } = await import('./lib/metadata/enrichmentService.js');

    // Enrich the provided results
    const enrichedResults = await enrichSearchResults(results);

    res.json({ success: true, data: enrichedResults });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/enrich/deep
 * Deep enrichment for specific results (Works API call)
 * Body: { results: SearchResult[] }
 */
app.post('/api/enrich/deep', async (req, res) => {
  try {
    const { results } = req.body;
    
    if (!Array.isArray(results)) {
      return res.json({
        success: false,
        error: 'Invalid request: results must be an array'
      });
    }
    
    logger.info('[Server] Deep enriching results', { resultCount: results.length });
    
    // Import enrichment service
    const { enrichSearchResults } = await import('./lib/metadata/enrichmentService.js');
    
    // Deep enrich all provided results
    const enriched = await enrichSearchResults(results, results.length);
    
    res.json({
      success: true,
      data: enriched
    });
  } catch (error: any) {
    logger.error('Deep enrichment failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enrich results'
    });
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

    logger.info('[Server] Testing NZB provider', { 
      providerName: provider.name, 
      enabled: provider.enabled 
    });

    // Perform a test search (using a common term likely to return results)
    const results = await nzbService.search('ebook', [provider]);

    logger.info('[Server] NZB provider test complete', { 
      providerName: provider.name, 
      resultCount: results.length 
    });

    res.json({
      success: true,
      data: {
        message: 'Connection successful',
        resultCount: results.length
      }
    });
  } catch (error) {
    logger.error('[Server] NZB provider test failed', { error });
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
      logger.error('[Server] Failed to reconnect with new IRC config', { error: reconnectError });
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
      logger.error('[Server] Failed to reconnect after config reset', { error: reconnectError });
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

// ============================================================================
// ONBOARDING ENDPOINTS
// ============================================================================

// Get onboarding status
app.get('/api/onboarding/status', (req, res) => {
  try {
    const onboardingState = configService.getOnboardingState();
    console.log('[Server] GET /api/onboarding/status - returning:', onboardingState);
    res.json({ success: true, data: onboardingState });
  } catch (error) {
    console.log('[Server] GET /api/onboarding/status - error:', error);
    res.json({ success: false, error: (error as Error).message });
  }
});

// Update onboarding progress
app.put('/api/onboarding/progress', async (req, res) => {
  try {
    const { lastStep } = req.body;

    if (typeof lastStep !== 'number' || lastStep < 0 || lastStep > 3) {
      return res.json({ success: false, error: 'Invalid step number' });
    }

    await configService.updateOnboardingState({ lastStep });
    res.json({ success: true, data: { message: 'Progress updated' } });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Complete onboarding
app.post('/api/onboarding/complete', async (req, res) => {
  try {
    await configService.completeOnboarding();
    res.json({ success: true, data: { message: 'Onboarding completed' } });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Skip onboarding
app.post('/api/onboarding/skip', async (req, res) => {
  try {
    await configService.skipOnboarding();
    res.json({ success: true, data: { message: 'Onboarding skipped' } });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Reset onboarding (for testing)
app.post('/api/onboarding/reset', async (req, res) => {
  try {
    console.log('[Server] POST /api/onboarding/reset - resetting onboarding');
    await configService.resetOnboarding();
    const newState = configService.getOnboardingState();
    console.log('[Server] POST /api/onboarding/reset - new state:', newState);
    res.json({ success: true, data: { message: 'Onboarding reset' } });
  } catch (error) {
    console.log('[Server] POST /api/onboarding/reset - error:', error);
    res.json({ success: false, error: (error as Error).message });
  }
});

// Serve static files from web frontend (in production)
if (process.env.NODE_ENV === 'production') {
  // __dirname is /app/server/dist when compiled
  // public folder is at /app/server/public
  const publicPath = path.join(__dirname, '..', 'public');
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
  logger.info('API server started', { port: PORT });
  logger.info('CORS enabled for all origins');
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully (SIGINT)');
  ircService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully (SIGTERM)');
  ircService.disconnect();
  process.exit(0);
});
