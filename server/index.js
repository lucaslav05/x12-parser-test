import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseEDI204 } from '../src/edi204Parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../client/dist')));

app.post('/api/parse', (req, res) => {
  try {
    const ediContent = typeof req.body === 'string' ? req.body : req.body.edi;

    if (!ediContent || typeof ediContent !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Please provide EDI content in the request body'
      });
    }

    if (!ediContent.includes('ISA')) {
      return res.status(400).json({
        error: 'Invalid EDI format',
        message: 'EDI content must contain an ISA segment'
      });
    }

    const result = parseEDI204(ediContent);
    res.json(result);
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({
      error: 'Parse error',
      message: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
