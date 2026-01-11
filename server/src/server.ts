import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { IrcService } from './ircService.js';
import { ConfigService } from './configService.js';

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

    const results = await ircService.search(query);
    res.json({ success: true, data: results });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      return res.json({ success: false, error: 'Invalid command' });
    }

    const filename = await ircService.download(command);
    res.json({ success: true, data: { filename } });
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
