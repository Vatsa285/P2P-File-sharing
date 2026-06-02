// useChat — Custom hook for real-time chat via Socket.IO
// Manages room-wide messages and peer DMs, persisted in sessionStorage.

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';

const STORAGE_PREFIX = 'chat:';

function loadMessages(roomId) {
  if (!roomId) return [];
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${roomId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(roomId, messages) {
  if (!roomId) return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${roomId}`, JSON.stringify(messages));
  } catch {
    // Storage full — silently drop oldest messages
    const trimmed = messages.slice(-200);
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX}${roomId}`, JSON.stringify(trimmed));
    } catch { /* give up */ }
  }
}

export default function useChat(roomId) {
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({}); // { 'room': 0, [peerId]: 0 }
  const activeTabRef = useRef('room'); // which tab the user is viewing
  const roomIdRef = useRef(roomId);

  // Keep roomIdRef in sync
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Load messages from sessionStorage when roomId changes
  useEffect(() => {
    if (roomId) {
      const loaded = loadMessages(roomId);
      setMessages(loaded);
    } else {
      setMessages([]);
    }
    setUnreadCounts({});
  }, [roomId]);

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    if (roomId && messages.length > 0) {
      saveMessages(roomId, messages);
    }
  }, [roomId, messages]);

  // Listen for incoming chat events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRoomMessage = (payload) => {
      setMessages((prev) => [...prev, payload]);

      // Increment unread if not viewing room tab
      if (activeTabRef.current !== 'room') {
        setUnreadCounts((prev) => ({
          ...prev,
          room: (prev.room || 0) + 1,
        }));
      }
    };

    const handleDM = (payload) => {
      setMessages((prev) => [...prev, payload]);

      // Increment unread if not viewing that peer's tab
      const senderId = payload.from;
      if (activeTabRef.current !== senderId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    };

    socket.on('chat:room-message', handleRoomMessage);
    socket.on('chat:dm', handleDM);

    return () => {
      socket.off('chat:room-message', handleRoomMessage);
      socket.off('chat:dm', handleDM);
    };
  }, [roomId]);

  const sendRoomMessage = useCallback(
    (text) => {
      const socket = getSocket();
      if (!socket || !roomId || !text.trim()) return;

      const msg = {
        id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from: socket.id,
        fromUsername: 'You',
        text: text.trim(),
        timestamp: Date.now(),
        type: 'room',
        isOwn: true,
      };

      socket.emit('chat:room-message', { roomId, message: text.trim() });
      setMessages((prev) => [...prev, msg]);
    },
    [roomId]
  );

  const sendDM = useCallback(
    (targetSocketId, text) => {
      const socket = getSocket();
      if (!socket || !targetSocketId || !text.trim()) return;

      const msg = {
        id: `${socket.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from: socket.id,
        fromUsername: 'You',
        text: text.trim(),
        timestamp: Date.now(),
        type: 'dm',
        dmPeerId: targetSocketId,
        isOwn: true,
      };

      socket.emit('chat:dm', { targetSocketId, message: text.trim() });
      setMessages((prev) => [...prev, msg]);
    },
    []
  );

  const setActiveTab = useCallback((tabId) => {
    activeTabRef.current = tabId;
    // Clear unread for this tab
    setUnreadCounts((prev) => {
      if (prev[tabId] === 0 || prev[tabId] === undefined) return prev;
      return { ...prev, [tabId]: 0 };
    });
  }, []);

  const clearChat = useCallback(() => {
    if (roomIdRef.current) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${roomIdRef.current}`);
    }
    setMessages([]);
    setUnreadCounts({});
  }, []);

  return {
    messages,
    unreadCounts,
    sendRoomMessage,
    sendDM,
    setActiveTab,
    clearChat,
  };
}
