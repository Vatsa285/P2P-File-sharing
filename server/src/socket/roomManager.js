// Room Manager — In-memory room storage for the signaling server
// Rooms are ephemeral: they exist only while peers are connected.

const rooms = new Map(); // roomId -> Map<socketId, { socketId, username }>

/**
 * Create a new room and add the creator as the first peer.
 */
function createRoom(roomId, socketId, username) {
  const peers = new Map();
  peers.set(socketId, { socketId, username });
  rooms.set(roomId, peers);
  return getRoomPeers(roomId);
}

/**
 * Join an existing room. Returns null if the room doesn't exist.
 */
function joinRoom(roomId, socketId, username) {
  const peers = rooms.get(roomId);
  if (!peers) return null;
  peers.set(socketId, { socketId, username });
  return getRoomPeers(roomId);
}

/**
 * Remove a peer from a room. Deletes the room if empty.
 * Returns the remaining peers, or null if the room was deleted.
 */
function leaveRoom(roomId, socketId) {
  const peers = rooms.get(roomId);
  if (!peers) return null;
  peers.delete(socketId);
  if (peers.size === 0) {
    rooms.delete(roomId);
    return null;
  }
  return getRoomPeers(roomId);
}

/**
 * Remove a peer from ALL rooms they belong to.
 * Returns an array of { roomId, remainingPeers } for each affected room.
 */
function removeFromAllRooms(socketId) {
  const affected = [];
  for (const [roomId, peers] of rooms.entries()) {
    if (peers.has(socketId)) {
      peers.delete(socketId);
      if (peers.size === 0) {
        rooms.delete(roomId);
        affected.push({ roomId, remainingPeers: [] });
      } else {
        affected.push({ roomId, remainingPeers: Array.from(peers.values()) });
      }
    }
  }
  return affected;
}

/**
 * Get all peers in a room as an array.
 */
function getRoomPeers(roomId) {
  const peers = rooms.get(roomId);
  if (!peers) return [];
  return Array.from(peers.values());
}

/**
 * Check if a room exists.
 */
function roomExists(roomId) {
  return rooms.has(roomId);
}

/**
 * Get the username associated with a socket ID across all rooms.
 */
function getUsername(socketId) {
  for (const peers of rooms.values()) {
    const peer = peers.get(socketId);
    if (peer) return peer.username;
  }
  return null;
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  removeFromAllRooms,
  getRoomPeers,
  roomExists,
  getUsername,
};
