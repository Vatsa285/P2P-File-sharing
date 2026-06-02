// ChatPanel — Floating collapsible chat panel with Room + DM tabs
// Renders in the bottom-right corner of the Room page.

import { useState, useEffect, useRef, useMemo } from 'react';
import { getSocket } from '../services/socket';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg, isOwn }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 chat-msg-enter`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
          isOwn
            ? 'bg-gradient-to-br from-accent-500 to-accent-600 text-white rounded-br-md'
            : 'bg-surface-800/90 text-surface-200 border border-surface-700/50 rounded-bl-md'
        }`}
      >
        {!isOwn && (
          <p className="text-[11px] font-semibold text-primary-400 mb-0.5">{msg.fromUsername}</p>
        )}
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/50' : 'text-surface-500'} text-right`}>
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
  );
}

function UnreadBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow-lg shadow-red-500/30 animate-pulse">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function ChatPanel({
  peers,
  currentSocketId,
  messages,
  unreadCounts,
  onSendRoomMessage,
  onSendDM,
  onSetActiveTab,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('room'); // 'room' | peerId
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const otherPeers = useMemo(
    () => peers.filter((p) => p.socketId !== currentSocketId),
    [peers, currentSocketId]
  );

  // Derive the filtered messages for the active tab
  const filteredMessages = useMemo(() => {
    const socket = getSocket();
    const myId = socket?.id;
    if (activeTab === 'room') {
      return messages.filter((m) => m.type === 'room');
    }
    // DM tab: show messages between me and this peer
    return messages.filter(
      (m) =>
        m.type === 'dm' &&
        (m.dmPeerId === activeTab || (m.isOwn && m.dmPeerId === activeTab) || (m.from === activeTab && !m.isOwn))
    );
  }, [messages, activeTab]);

  // Auto-scroll to bottom when new messages arrive or tab changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages, isOpen]);

  // Focus input when panel opens or tab changes
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, activeTab]);

  // Notify hook of active tab changes
  useEffect(() => {
    if (isOpen) {
      onSetActiveTab(activeTab);
    }
  }, [activeTab, isOpen, onSetActiveTab]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (activeTab === 'room') {
      onSendRoomMessage(inputText);
    } else {
      onSendDM(activeTab, inputText);
    }
    setInputText('');
  };

  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
    onSetActiveTab(tabId);
  };

  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  // ─── Collapsed state: floating chat button ─────────────────
  if (!isOpen) {
    return (
      <button
        id="btn-chat-toggle"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center group"
      >
        {/* Chat icon */}
        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold px-1.5 shadow-lg shadow-red-500/40 ring-2 ring-surface-950">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
    );
  }

  // ─── Expanded state: chat panel ────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl bg-surface-900/95 border border-surface-700/60 shadow-2xl shadow-black/40 backdrop-blur-xl chat-panel-enter">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-surface-200">Chat</h3>
        </div>
        <button
          id="btn-chat-close"
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg bg-surface-800/60 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-800/60 shrink-0 overflow-x-auto scrollbar-hide">
        {/* Room tab */}
        <button
          onClick={() => handleTabSwitch('room')}
          className={`relative shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === 'room'
              ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
              : 'text-surface-400 hover:text-surface-300 hover:bg-surface-800/60'
          }`}
        >
          🌐 Room
          <UnreadBadge count={unreadCounts.room} />
        </button>

        {/* Peer DM tabs */}
        {otherPeers.map((peer) => (
          <button
            key={peer.socketId}
            onClick={() => handleTabSwitch(peer.socketId)}
            className={`relative shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === peer.socketId
                ? 'bg-accent-500/15 text-accent-400 border border-accent-500/30'
                : 'text-surface-400 hover:text-surface-300 hover:bg-surface-800/60'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-[10px] font-bold">
              {(peer.username || '?')[0].toUpperCase()}
            </span>
            <span className="max-w-[60px] truncate">{peer.username || 'Anon'}</span>
            <UnreadBadge count={unreadCounts[peer.socketId]} />
          </button>
        ))}
      </div>

      {/* ── Messages area ──────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5"
      >
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full bg-surface-800/70 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm text-surface-500">No messages yet</p>
            <p className="text-xs text-surface-600 mt-1">
              {activeTab === 'room' ? 'Send a message to the room' : 'Start a private conversation'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isOwn={msg.isOwn || msg.from === getSocket()?.id} />
          ))
        )}
      </div>

      {/* ── Input area ─────────────────────────────────────── */}
      <form onSubmit={handleSend} className="px-3 py-3 border-t border-surface-800 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            id="chat-message-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={activeTab === 'room' ? 'Message the room…' : 'Private message…'}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50 text-sm text-surface-100 placeholder-surface-600 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
            autoComplete="off"
          />
          <button
            id="btn-chat-send"
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 text-white flex items-center justify-center hover:from-primary-400 hover:to-accent-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 active:scale-90 shadow-md shadow-primary-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        {activeTab !== 'room' && (
          <p className="text-[10px] text-surface-600 mt-1.5 px-1">
            🔒 Private message — only visible to you and this peer
          </p>
        )}
      </form>
    </div>
  );
}
