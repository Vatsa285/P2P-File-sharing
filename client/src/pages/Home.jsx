// Home Page — Create or join a room

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Home({ onCreateRoom, onJoinRoom }) {
  const [username, setUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const roomId = await onCreateRoom(username.trim());
      toast.success(`Room created: ${roomId}`);
      navigate(`/room/${roomId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!joinRoomId.trim()) {
      toast.error('Please enter a room ID');
      return;
    }

    setLoading(true);
    try {
      await onJoinRoom(joinRoomId.trim(), username.trim());
      toast.success('Joined room successfully');
      navigate(`/room/${joinRoomId.trim()}`);
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

      {/* Logo / Branding */}
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
          Share files directly between browsers. No uploads, no servers, just peer-to-peer magic.
        </p>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-surface-900/80 border border-surface-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          {/* Name input */}
          <div className="mb-6">
            <label htmlFor="username" className="block text-sm font-medium text-surface-400 mb-2">
              Your Name
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your name..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-700 text-surface-100 placeholder-surface-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-surface-800/60 p-1 mb-6">
            <button
              id="tab-create"
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'create'
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              Create Room
            </button>
            <button
              id="tab-join"
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'join'
                  ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              Join Room
            </button>
          </div>

          {/* Create tab */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreate}>
              <p className="text-sm text-surface-500 mb-5">
                Create a new room and share the link with others to start transferring files.
              </p>
              <button
                id="btn-create-room"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold text-sm hover:from-primary-400 hover:to-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating…
                  </span>
                ) : (
                  'Create New Room'
                )}
              </button>
            </form>
          )}

          {/* Join tab */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoin}>
              <div className="mb-5">
                <label htmlFor="roomId" className="block text-sm font-medium text-surface-400 mb-2">
                  Room ID
                </label>
                <input
                  id="roomId"
                  type="text"
                  placeholder="Enter room ID..."
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-700 text-surface-100 placeholder-surface-600 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
                />
              </div>
              <button
                id="btn-join-room"
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
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-surface-600 mt-6">
          🔒 End-to-end encrypted • No files stored on server • Powered by WebRTC
        </p>
      </div>
    </div>
  );
}
