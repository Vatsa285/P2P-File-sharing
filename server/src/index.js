// P2P File Share — Signaling Server Entry Point
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { registerSocketHandlers } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// ─── REST Routes ─────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Socket.IO ──────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

// ─── Start Server ───────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\n  🚀 Signaling server running on http://localhost:${PORT}`);
  console.log(`  📡 Accepting clients from ${CLIENT_URL}\n`);
});
