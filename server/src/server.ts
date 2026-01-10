import express from 'express';
import cors from 'cors';
import { IrcService } from './ircService.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// IRC Service (singleton)
const ircService = new IrcService();

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
