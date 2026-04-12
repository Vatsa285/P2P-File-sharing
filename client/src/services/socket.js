// Socket.IO Client Service
// Singleton connection to the signaling server

import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

let socket = null;

/**
 * Connect to the signaling server.
 * Returns the existing socket if already connected.
 */
export function connect() {
  if (socket && socket.connected) return socket;

  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

/**
 * Get the current socket instance.
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect from the server.
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default { connect, getSocket, disconnect };
