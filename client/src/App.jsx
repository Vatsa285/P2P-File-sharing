// App.jsx — Main application shell with routing

import { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import useRoom from './hooks/useRoom';
import useFileTransfer from './hooks/useFileTransfer';
import useChat from './hooks/useChat';
import Home from './pages/Home';
import Room from './pages/Room';

/**
 * Inline join form shown when a user arrives via a shared room link
 * but hasn't joined the room yet.
 */
function JoinViaLink({ urlRoomId, onJoinRoom }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      await onJoinRoom(urlRoomId, name.trim());
      toast.success('Joined room successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-600 mb-6 shadow-lg shadow-primary-500/25">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary-300 via-primary-400 to-accent-400 bg-clip-text text-transparent">
          P2P FileShare
        </h1>
        <p className="mt-3 text-surface-400 text-lg max-w-md mx-auto">
          You've been invited to join a room
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-surface-900/80 border border-surface-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-6">
            <p className="text-sm text-surface-400 mb-1">Room ID</p>
            <p className="text-lg font-mono font-semibold text-primary-400">{urlRoomId}</p>
          </div>

          <form onSubmit={handleJoin}>
            <div className="mb-5">
              <label htmlFor="join-username" className="block text-sm font-medium text-surface-400 mb-2">
                Your Name
              </label>
              <input
                id="join-username"
                type="text"
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-700 text-surface-100 placeholder-surface-600 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
              />
            </div>
            <button
              id="btn-join-via-link"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold text-sm hover:from-accent-400 hover:to-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-accent-500/20 hover:shadow-accent-500/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Joining…
                </span>
              ) : (
                'Join Room'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-surface-600 mt-6">
          🔒 End-to-end encrypted • No files stored on server • Powered by WebRTC
        </p>
      </div>
    </div>
  );
}

function RoomWrapper({ roomId, peers, username, connectionStatus, transfers, completedFiles, sendFile, cancelTransfer, downloadFile, leaveRoom, joinRoom, chatMessages, chatUnreadCounts, sendRoomMessage, sendDM, setChatActiveTab }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // User hasn't joined this room yet — show join form (arrived via shared link)
  if (!roomId || roomId !== id) {
    return <JoinViaLink urlRoomId={id} onJoinRoom={joinRoom} />;
  }

  return (
    <Room
      roomId={roomId}
      peers={peers}
      username={username}
      connectionStatus={connectionStatus}
      transfers={transfers}
      completedFiles={completedFiles}
      onSendFile={sendFile}
      onCancelTransfer={cancelTransfer}
      onDownloadFile={downloadFile}
      onLeaveRoom={leaveRoom}
      chatMessages={chatMessages}
      chatUnreadCounts={chatUnreadCounts}
      onSendRoomMessage={sendRoomMessage}
      onSendDM={sendDM}
      onSetChatActiveTab={setChatActiveTab}
    />
  );
}

export default function App() {
  const { roomId, peers, username, connectionStatus, error, createRoom, joinRoom, leaveRoom } = useRoom();
  const { transfers, completedFiles, sendFile, cancelTransfer, downloadFile } = useFileTransfer();
  const { messages: chatMessages, unreadCounts: chatUnreadCounts, sendRoomMessage, sendDM, setActiveTab: setChatActiveTab, clearChat } = useChat(roomId);

  const handleLeaveRoom = () => {
    clearChat();
    leaveRoom();
  };

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#1e293b' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#1e293b' } },
        }}
      />

      <Routes>
        <Route
          path="/"
          element={<Home onCreateRoom={createRoom} onJoinRoom={joinRoom} />}
        />
        <Route
          path="/room/:id"
          element={
            <RoomWrapper
              roomId={roomId}
              peers={peers}
              username={username}
              connectionStatus={connectionStatus}
              transfers={transfers}
              completedFiles={completedFiles}
              sendFile={sendFile}
              cancelTransfer={cancelTransfer}
              downloadFile={downloadFile}
              leaveRoom={handleLeaveRoom}
              joinRoom={joinRoom}
              chatMessages={chatMessages}
              chatUnreadCounts={chatUnreadCounts}
              sendRoomMessage={sendRoomMessage}
              sendDM={sendDM}
              setChatActiveTab={setChatActiveTab}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
