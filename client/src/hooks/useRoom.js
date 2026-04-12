// useRoom — Custom hook for room management
// Handles room creation, joining, and peer list state.

import { useState, useEffect, useCallback, useRef } from 'react';
import { connect, getSocket, disconnect } from '../services/socket';
import webrtcManager from '../services/webrtc';

export default function useRoom() {
  const [roomId, setRoomId] = useState(null);
  const [peers, setPeers] = useState([]);
  const [username, setUsername] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected | connecting | connected | failed
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // Connect socket on mount
  useEffect(() => {
    return () => {
      webrtcManager.closeAll();
      disconnect();
    };
  }, []);

  const initSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;

    const socket = connect();
    socketRef.current = socket;
    setConnectionStatus('connecting');

    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('connect_error', () => setConnectionStatus('failed'));

    // ─── Signaling listeners ────────────────────────────

    socket.on('signal:offer', async ({ fromSocketId, offer }) => {
      try {
        await webrtcManager.handleOffer(fromSocketId, offer, socket);
      } catch (err) {
        console.error('[useRoom] Error handling offer:', err);
      }
    });

    socket.on('signal:answer', async ({ fromSocketId, answer }) => {
      try {
        await webrtcManager.handleAnswer(fromSocketId, answer);
      } catch (err) {
        console.error('[useRoom] Error handling answer:', err);
      }
    });

    socket.on('signal:ice-candidate', async ({ fromSocketId, candidate }) => {
      try {
        await webrtcManager.handleIceCandidate(fromSocketId, candidate);
      } catch (err) {
        console.error('[useRoom] Error handling ICE candidate:', err);
      }
    });

    // When a new peer joins, initiate a WebRTC connection to them
    socket.on('room:peer-joined', async ({ socketId: newPeerId, peers: updatedPeers }) => {
      setPeers(updatedPeers);
      try {
        await webrtcManager.createOffer(newPeerId, socket);
      } catch (err) {
        console.error('[useRoom] Error creating offer for new peer:', err);
      }
    });

    socket.on('room:peer-left', ({ peers: updatedPeers, socketId: leftPeerId }) => {
      setPeers(updatedPeers);
      webrtcManager.closePeer(leftPeerId);
    });

    return socket;
  }, []);

  const createRoom = useCallback(
    (name) => {
      return new Promise((resolve, reject) => {
        const socket = initSocket();
        setUsername(name);
        setError(null);

        socket.emit('room:create', { username: name }, (response) => {
          if (response.success) {
            setRoomId(response.roomId);
            setPeers(response.peers);
            resolve(response.roomId);
          } else {
            setError(response.error);
            reject(new Error(response.error));
          }
        });
      });
    },
    [initSocket]
  );

  const joinRoom = useCallback(
    (id, name) => {
      return new Promise((resolve, reject) => {
        const socket = initSocket();
        setUsername(name);
        setError(null);

        socket.emit('room:join', { roomId: id, username: name }, (response) => {
          if (response.success) {
            setRoomId(response.roomId);
            setPeers(response.peers);
            resolve(response.roomId);
          } else {
            setError(response.error || 'Room not found');
            reject(new Error(response.error || 'Room not found'));
          }
        });
      });
    },
    [initSocket]
  );

  const leaveRoom = useCallback(() => {
    webrtcManager.closeAll();
    disconnect();
    socketRef.current = null;
    setRoomId(null);
    setPeers([]);
    setConnectionStatus('disconnected');
  }, []);

  return {
    roomId,
    peers,
    username,
    connectionStatus,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}
