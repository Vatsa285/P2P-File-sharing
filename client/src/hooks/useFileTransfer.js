// useFileTransfer — Custom hook for managing file transfers
// Tracks active sends/receives, progress, speed, and completed files.

import { useState, useEffect, useCallback } from 'react';
import webrtcManager from '../services/webrtc';

export default function useFileTransfer() {
  // { [transferId]: { fileName, fileSize, fileType, direction, progress, speed, status, blob? } }
  const [transfers, setTransfers] = useState({});
  const [completedFiles, setCompletedFiles] = useState([]);

  useEffect(() => {
    // ─── Outgoing transfer callbacks ──────────────────────

    webrtcManager.onFileSendProgress = ({ transferId, sent, total, speed, fileName }) => {
      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          ...(prev[transferId] || {}),
          transferId,
          fileName,
          fileSize: total,
          direction: 'upload',
          progress: Math.min((sent / total) * 100, 100),
          speed,
          status: 'transferring',
        },
      }));
    };

    webrtcManager.onFileSendComplete = ({ transferId, fileName }) => {
      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          ...(prev[transferId] || {}),
          progress: 100,
          status: 'completed',
          fileName,
        },
      }));
    };

    // ─── Incoming transfer callbacks ──────────────────────

    webrtcManager.onFileReceiveStart = ({ transferId, fileName, fileSize, fileType }) => {
      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          transferId,
          fileName,
          fileSize,
          fileType,
          direction: 'download',
          progress: 0,
          speed: 0,
          status: 'transferring',
        },
      }));
    };

    webrtcManager.onFileReceiveProgress = ({ transferId, received, total, speed, fileName }) => {
      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          ...(prev[transferId] || {}),
          transferId,
          fileName,
          fileSize: total,
          direction: 'download',
          progress: Math.min((received / total) * 100, 100),
          speed,
          status: 'transferring',
        },
      }));
    };

    webrtcManager.onFileReceiveComplete = ({ transferId, fileName, fileType, blob }) => {
      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          ...(prev[transferId] || {}),
          progress: 100,
          status: 'completed',
        },
      }));

      setCompletedFiles((prev) => [
        ...prev,
        { transferId, fileName, fileType, blob, receivedAt: new Date() },
      ]);
    };

    // ─── Cancellation ────────────────────────────────────

    webrtcManager.onTransferCancelled = ({ transferId }) => {
      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          ...(prev[transferId] || {}),
          status: 'cancelled',
        },
      }));
    };

    return () => {
      webrtcManager.onFileSendProgress = null;
      webrtcManager.onFileSendComplete = null;
      webrtcManager.onFileReceiveStart = null;
      webrtcManager.onFileReceiveProgress = null;
      webrtcManager.onFileReceiveComplete = null;
      webrtcManager.onTransferCancelled = null;
    };
  }, []);

  const sendFile = useCallback(async (file) => {
    try {
      const transferId = await webrtcManager.sendFile(file);
      return transferId;
    } catch (err) {
      console.error('[useFileTransfer] Send error:', err);
      throw err;
    }
  }, []);

  const cancelTransfer = useCallback((transferId, direction) => {
    if (direction === 'upload') {
      webrtcManager.cancelSend(transferId);
    } else {
      webrtcManager.cancelReceive(transferId);
    }
  }, []);

  const downloadFile = useCallback((file) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const clearCompleted = useCallback(() => {
    setTransfers((prev) => {
      const active = {};
      for (const [id, t] of Object.entries(prev)) {
        if (t.status === 'transferring') active[id] = t;
      }
      return active;
    });
  }, []);

  return {
    transfers,
    completedFiles,
    sendFile,
    cancelTransfer,
    downloadFile,
    clearCompleted,
  };
}
