import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { IrcService } from './ircService.js';
import { ConfigService } from './configService.js';
import { NzbService } from './nzbService.js';
import { SearchService } from './searchService.js';

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
const ircService = new IrcService(configService.getIrcConfig());

// NZB Service - handles Newznab API interactions
const nzbService = new NzbService();

// Search Service - orchestrates unified IRC + NZB searches
const searchService = new SearchService(ircService, nzbService, configService);

// Routes
app.post('/api/connect', async (req, res) => {
  try {
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
    const { source, command, nzbUrl, providerId } = req.body;

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

      filename = await nzbService.download(nzbUrl, provider.apiKey);
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

    // Perform a test search (using a common term)
    const results = await nzbService.search('test', [provider]);

    res.json({
      success: true,
      data: {
        message: 'Connection successful',
        resultCount: results.length
      }
    });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

// Configuration endpoints
app.get('/api/config', (req, res) => {
  try {
    const ircConfig = configService.getIrcConfig();
    // Return only user-editable fields
    const userConfig = {
      server: ircConfig.server,
      port: ircConfig.port,
      channel: ircConfig.channel,
      searchCommand: ircConfig.searchCommand,
    };
    res.json({ success: true, data: { irc: userConfig } });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    const { irc } = req.body;

    if (!irc || typeof irc !== 'object') {
      return res.json({ success: false, error: 'Invalid configuration' });
    }

    // Validate the IRC config
    const errors = configService.validateIrcConfig(irc);
    if (errors.length > 0) {
      return res.json({
        success: false,
        error: errors.map(e => e.message).join(', ')
      });
    }

    // Save configuration
    await configService.updateIrcConfig(irc);

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
          ? 'Configuration updated successfully'
          : `Configuration saved but failed to reconnect: ${reconnectError}`
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
