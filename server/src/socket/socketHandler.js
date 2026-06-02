// Socket.IO Event Handler
// Manages room lifecycle and WebRTC signaling relay

const { v4: uuidv4 } = require('uuid');
const {
  createRoom,
  joinRoom,
  leaveRoom,
  removeFromAllRooms,
  getRoomPeers,
  roomExists,
  getUsername,
} = require('./roomManager');

/**
 * Register all socket event handlers for a connection.
 */
function registerSocketHandlers(io, socket) {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ─── Room Events ───────────────────────────────────────────

  /**
   * Create a new room.
   * Payload: { username: string }
   * Response: { roomId, peers }
   */
  socket.on('room:create', ({ username }, callback) => {
    try {
      const roomId = uuidv4().slice(0, 8); // short readable ID
      socket.join(roomId);
      const peers = createRoom(roomId, socket.id, username || 'Anonymous');
      console.log(`[Room] Created room ${roomId} by ${username}`);

      if (typeof callback === 'function') {
        callback({ success: true, roomId, peers });
      }
    } catch (err) {
      console.error('[Room] Create error:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to create room' });
      }
    }
  });

  /**
   * Join an existing room.
   * Payload: { roomId: string, username: string }
   * Response: { roomId, peers }
   */
  socket.on('room:join', ({ roomId, username }, callback) => {
    try {
      if (!roomExists(roomId)) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Room not found' });
        }
        return;
      }

      socket.join(roomId);
      const peers = joinRoom(roomId, socket.id, username || 'Anonymous');
      console.log(`[Room] ${username} joined room ${roomId}`);

      // Notify existing peers about the new user
      socket.to(roomId).emit('room:peer-joined', {
        socketId: socket.id,
        username: username || 'Anonymous',
        peers,
      });

      if (typeof callback === 'function') {
        callback({ success: true, roomId, peers });
      }
    } catch (err) {
      console.error('[Room] Join error:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to join room' });
      }
    }
  });

  // ─── WebRTC Signaling Events ───────────────────────────────

  /**
   * Relay WebRTC offer to a specific peer.
   * Payload: { targetSocketId, offer }
   */
  socket.on('signal:offer', ({ targetSocketId, offer }) => {
    console.log(`[Signal] Offer from ${socket.id} → ${targetSocketId}`);
    io.to(targetSocketId).emit('signal:offer', {
      fromSocketId: socket.id,
      fromUsername: getUsername(socket.id),
      offer,
    });
  });

  /**
   * Relay WebRTC answer to a specific peer.
   * Payload: { targetSocketId, answer }
   */
  socket.on('signal:answer', ({ targetSocketId, answer }) => {
    console.log(`[Signal] Answer from ${socket.id} → ${targetSocketId}`);
    io.to(targetSocketId).emit('signal:answer', {
      fromSocketId: socket.id,
      answer,
    });
  });

  /**
   * Relay ICE candidate to a specific peer.
   * Payload: { targetSocketId, candidate }
   */
  socket.on('signal:ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('signal:ice-candidate', {
      fromSocketId: socket.id,
      candidate,
    });
  });

  // ─── Chat Events ───────────────────────────────────────────

  /**
   * Broadcast a chat message to all other peers in the room.
   * Payload: { roomId: string, message: string }
   */
  socket.on('chat:room-message', ({ roomId, message }) => {
    if (!message || !roomId) return;
    const senderUsername = getUsername(socket.id) || 'Anonymous';
    const payload = {
      id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: socket.id,
      fromUsername: senderUsername,
      text: message,
      timestamp: Date.now(),
      type: 'room',
    };
    socket.to(roomId).emit('chat:room-message', payload);
  });

  /**
   * Send a private chat message to a specific peer.
   * Payload: { targetSocketId: string, message: string }
   */
  socket.on('chat:dm', ({ targetSocketId, message }) => {
    if (!message || !targetSocketId) return;
    const senderUsername = getUsername(socket.id) || 'Anonymous';
    const payload = {
      id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: socket.id,
      fromUsername: senderUsername,
      text: message,
      timestamp: Date.now(),
      type: 'dm',
      dmPeerId: socket.id, // sender's ID so receiver knows who sent it
    };
    io.to(targetSocketId).emit('chat:dm', payload);
  });

  // ─── Disconnect ────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    const username = getUsername(socket.id);
    const affectedRooms = removeFromAllRooms(socket.id);

    // Notify remaining peers in each affected room
    for (const { roomId, remainingPeers } of affectedRooms) {
      io.to(roomId).emit('room:peer-left', {
        socketId: socket.id,
        username,
        peers: remainingPeers,
      });
    }
  });
}

module.exports = { registerSocketHandlers };
