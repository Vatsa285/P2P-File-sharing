// PeerList — Displays connected peers with connection status indicators

import { useState, useEffect } from 'react';
import webrtcManager from '../services/webrtc';

const STATUS_COLORS = {
  connected: 'bg-emerald-400',
  connecting: 'bg-amber-400 animate-pulse',
  new: 'bg-gray-400 animate-pulse',
  disconnected: 'bg-red-400',
  failed: 'bg-red-500',
  closed: 'bg-gray-500',
};

const STATUS_LABELS = {
  connected: 'Connected',
  connecting: 'Connecting…',
  new: 'Initializing…',
  disconnected: 'Disconnected',
  failed: 'Failed',
  closed: 'Closed',
};

export default function PeerList({ peers, currentSocketId }) {
  const [peerStates, setPeerStates] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const states = {};
      for (const peer of peers) {
        if (peer.socketId !== currentSocketId) {
          states[peer.socketId] = webrtcManager.getPeerState(peer.socketId);
        }
      }
      setPeerStates(states);
    }, 1000);

    return () => clearInterval(interval);
  }, [peers, currentSocketId]);

  const otherPeers = peers.filter((p) => p.socketId !== currentSocketId);

  return (
    <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
        <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
          Peers ({otherPeers.length})
        </h3>
      </div>

      {otherPeers.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-surface-500">Waiting for peers to join…</p>
          <p className="text-xs text-surface-600 mt-1">Share the room link to invite others</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {otherPeers.map((peer) => {
            const state = peerStates[peer.socketId] || 'new';
            return (
              <li
                key={peer.socketId}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-surface-800/50 border border-surface-700/50"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(peer.username || '?')[0].toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">
                    {peer.username || 'Anonymous'}
                  </p>
                  <p className="text-xs text-surface-500">
                    {STATUS_LABELS[state] || state}
                  </p>
                </div>
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[state] || 'bg-gray-400'}`} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
