// Room Page — File sharing dashboard with peers, transfers, and drop zone

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DropZone from '../components/DropZone';
import PeerList from '../components/PeerList';
import TransferProgress from '../components/TransferProgress';
import FilePreview from '../components/FilePreview';
import { getSocket } from '../services/socket';

export default function Room({ roomId, peers, username, connectionStatus, transfers, completedFiles, onSendFile, onCancelTransfer, onDownloadFile, onLeaveRoom }) {
  const [previewFile, setPreviewFile] = useState(null);
  const navigate = useNavigate();

  const socket = getSocket();
  const currentSocketId = socket?.id;

  const otherPeersExist = peers.filter((p) => p.socketId !== currentSocketId).length > 0;

  const handleFilesSelected = async (files) => {
    if (!otherPeersExist) {
      toast.error('No peers connected. Wait for someone to join.');
      return;
    }

    for (const file of files) {
      try {
        await onSendFile(file);
      } catch (err) {
        toast.error(`Failed to send ${file.name}: ${err.message}`);
      }
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Room link copied to clipboard!');
    }).catch(() => {
      // Fallback — select and copy
      toast.success(`Room ID: ${roomId}`);
    });
  };

  const handleLeave = () => {
    onLeaveRoom();
    navigate('/');
  };

  const transferList = Object.values(transfers);
  const activeTransfers = transferList.filter((t) => t.status === 'transferring');
  const doneTransfers = transferList.filter((t) => t.status !== 'transferring');

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-surface-200">P2P FileShare</h1>
              <p className="text-xs text-surface-500">Room: {roomId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800/60 border border-surface-700/50 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-400'
                    : connectionStatus === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-red-400'
                }`}
              />
              <span className="text-surface-400 capitalize">{connectionStatus}</span>
            </div>

            <button
              id="btn-copy-link"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 text-xs font-medium hover:bg-primary-500/20 transition-colors border border-primary-500/20"
            >
              📋 Copy Link
            </button>

            <button
              id="btn-leave-room"
              onClick={handleLeave}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors border border-red-500/20"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left sidebar — Peers */}
          <div className="lg:col-span-3 space-y-4">
            <PeerList peers={peers} currentSocketId={currentSocketId} />

            {/* User info */}
            <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-4 backdrop-blur-sm">
              <p className="text-xs text-surface-500 mb-1">Signed in as</p>
              <p className="text-sm font-medium text-surface-200">{username}</p>
            </div>
          </div>

          {/* Main area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Drop zone */}
            <DropZone onFilesSelected={handleFilesSelected} disabled={!otherPeersExist} />

            {!otherPeersExist && (
              <div className="text-center py-4 px-6 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm text-amber-400">
                  Waiting for peers to connect before you can share files.
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  Share the room link: <span className="text-primary-400 font-mono">{roomId}</span>
                </p>
              </div>
            )}

            {/* Active Transfers */}
            {activeTransfers.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                  Active Transfers ({activeTransfers.length})
                </h2>
                <div className="space-y-3">
                  {activeTransfers.map((t) => (
                    <TransferProgress key={t.transferId} transfer={t} onCancel={onCancelTransfer} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed / History */}
            {doneTransfers.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">
                  Transfer History ({doneTransfers.length})
                </h2>
                <div className="space-y-3">
                  {doneTransfers.map((t) => (
                    <TransferProgress key={t.transferId} transfer={t} />
                  ))}
                </div>
              </div>
            )}

            {/* Received Files */}
            {completedFiles.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">
                  Received Files ({completedFiles.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {completedFiles.map((file, idx) => (
                    <div
                      key={`${file.transferId}-${idx}`}
                      className="rounded-xl bg-surface-900/70 border border-surface-800 p-4 flex items-center gap-3"
                    >
                      {/* File icon */}
                      <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-200 truncate">{file.fileName}</p>
                        <p className="text-xs text-surface-500">{file.fileType || 'Unknown type'}</p>
                      </div>

                      <div className="flex gap-1.5">
                        {(file.fileType?.startsWith('image/') || file.fileType?.startsWith('text/')) && (
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors"
                            title="Preview"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => onDownloadFile(file)}
                          className="w-8 h-8 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 flex items-center justify-center text-primary-400 transition-colors"
                          title="Download"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Preview modal */}
      {previewFile && (
        <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
