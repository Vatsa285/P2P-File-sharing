// WebRTC Peer Connection Manager
// Handles peer connections, data channels, file chunking, and transfer logic.

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/**
 * @typedef {Object} PeerConnection
 * @property {RTCPeerConnection} pc
 * @property {RTCDataChannel|null} dataChannel
 * @property {string} peerId
 */

class WebRTCManager {
  constructor() {
    /** @type {Map<string, PeerConnection>} peerId -> connection info */
    this.peers = new Map();

    // Callbacks set by the consuming hook/component
    this.onFileReceiveStart = null;   // ({ from, fileName, fileSize, fileType, transferId }) => void
    this.onFileReceiveProgress = null; // ({ transferId, received, total, speed }) => void
    this.onFileReceiveComplete = null; // ({ transferId, fileName, fileType, blob }) => void
    this.onFileSendProgress = null;    // ({ transferId, sent, total, speed }) => void
    this.onFileSendComplete = null;    // ({ transferId }) => void
    this.onTransferCancelled = null;   // ({ transferId, by }) => void
    this.onPeerConnected = null;       // (peerId) => void
    this.onPeerDisconnected = null;    // (peerId) => void

    // Active transfers state
    this._incomingTransfers = new Map(); // transferId -> { chunks, received, fileName, fileSize, fileType, startTime }
    this._outgoingTransfers = new Map(); // transferId -> { cancelled }
  }

  /**
   * Create a new peer connection and set up a data channel (as the initiator).
   * Used when we are the one creating the offer.
   */
  createPeerConnection(peerId, socket) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Create data channel for file transfer
    const dataChannel = pc.createDataChannel('fileTransfer', {
      ordered: true,
      maxRetransmits: 30,
    });

    dataChannel.binaryType = 'arraybuffer';
    this._setupDataChannelHandlers(dataChannel, peerId);

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal:ice-candidate', {
          targetSocketId: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state (${peerId}): ${pc.connectionState}`);
      if (pc.connectionState === 'connected' && this.onPeerConnected) {
        this.onPeerConnected(peerId);
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        if (this.onPeerDisconnected) this.onPeerDisconnected(peerId);
      }
    };

    this.peers.set(peerId, { pc, dataChannel, peerId });
    return pc;
  }

  /**
   * Create a peer connection as the receiver (no data channel created — we wait for it).
   */
  createPeerConnectionForAnswer(peerId, socket) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal:ice-candidate', {
          targetSocketId: peerId,
          candidate: event.candidate,
        });
      }
    };

    // The data channel arrives from the remote peer
    pc.ondatachannel = (event) => {
      const dataChannel = event.channel;
      dataChannel.binaryType = 'arraybuffer';
      this._setupDataChannelHandlers(dataChannel, peerId);

      const peerInfo = this.peers.get(peerId);
      if (peerInfo) peerInfo.dataChannel = dataChannel;
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state (${peerId}): ${pc.connectionState}`);
      if (pc.connectionState === 'connected' && this.onPeerConnected) {
        this.onPeerConnected(peerId);
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        if (this.onPeerDisconnected) this.onPeerDisconnected(peerId);
      }
    };

    this.peers.set(peerId, { pc, dataChannel: null, peerId });
    return pc;
  }

  /**
   * Create and send an offer to a peer.
   */
  async createOffer(peerId, socket) {
    let pc = this.peers.get(peerId)?.pc;
    if (!pc) {
      pc = this.createPeerConnection(peerId, socket);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('signal:offer', {
      targetSocketId: peerId,
      offer: pc.localDescription,
    });
  }

  /**
   * Handle an incoming offer and send an answer.
   */
  async handleOffer(fromPeerId, offer, socket) {
    let peerInfo = this.peers.get(fromPeerId);
    let pc;
    if (!peerInfo) {
      pc = this.createPeerConnectionForAnswer(fromPeerId, socket);
    } else {
      pc = peerInfo.pc;
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('signal:answer', {
      targetSocketId: fromPeerId,
      answer: pc.localDescription,
    });
  }

  /**
   * Handle an incoming answer.
   */
  async handleAnswer(fromPeerId, answer) {
    const peerInfo = this.peers.get(fromPeerId);
    if (peerInfo) {
      await peerInfo.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  /**
   * Handle an incoming ICE candidate.
   */
  async handleIceCandidate(fromPeerId, candidate) {
    const peerInfo = this.peers.get(fromPeerId);
    if (peerInfo && candidate) {
      try {
        await peerInfo.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTC] ICE candidate error:', err);
      }
    }
  }

  // ─── File Transfer ─────────────────────────────────────────

  /**
   * Send a file to all connected peers via data channels.
   * @param {File} file
   * @returns {string} transferId
   */
  async sendFile(file) {
    const transferId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this._outgoingTransfers.set(transferId, { cancelled: false });

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Send file metadata as JSON to all peers
    const metadata = JSON.stringify({
      type: 'file-meta',
      transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks,
    });

    for (const [, peerInfo] of this.peers) {
      if (peerInfo.dataChannel && peerInfo.dataChannel.readyState === 'open') {
        peerInfo.dataChannel.send(metadata);
      }
    }

    // Read and send chunks sequentially
    let offset = 0;
    let chunkIndex = 0;
    const startTime = Date.now();

    while (offset < file.size) {
      // Check cancellation
      const transfer = this._outgoingTransfers.get(transferId);
      if (!transfer || transfer.cancelled) {
        this._sendControlMessage({ type: 'transfer-cancel', transferId });
        this._outgoingTransfers.delete(transferId);
        return transferId;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();

      // Prepend a small header: transferId + chunkIndex
      const header = JSON.stringify({
        type: 'file-chunk',
        transferId,
        chunkIndex,
      });

      // Send header then binary data
      for (const [, peerInfo] of this.peers) {
        const dc = peerInfo.dataChannel;
        if (dc && dc.readyState === 'open') {
          // Wait for buffer to drain if needed (back-pressure)
          while (dc.bufferedAmount > 16 * 1024 * 1024) {
            await new Promise((r) => setTimeout(r, 50));
          }
          dc.send(header);
          dc.send(buffer);
        }
      }

      offset += CHUNK_SIZE;
      chunkIndex++;

      // Report progress
      if (this.onFileSendProgress) {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? offset / elapsed : 0;
        this.onFileSendProgress({
          transferId,
          sent: Math.min(offset, file.size),
          total: file.size,
          speed,
          fileName: file.name,
        });
      }
    }

    // Send completion message
    const complete = JSON.stringify({ type: 'file-complete', transferId });
    for (const [, peerInfo] of this.peers) {
      if (peerInfo.dataChannel && peerInfo.dataChannel.readyState === 'open') {
        peerInfo.dataChannel.send(complete);
      }
    }

    if (this.onFileSendComplete) {
      this.onFileSendComplete({ transferId, fileName: file.name });
    }

    this._outgoingTransfers.delete(transferId);
    return transferId;
  }

  /**
   * Cancel an outgoing transfer.
   */
  cancelSend(transferId) {
    const transfer = this._outgoingTransfers.get(transferId);
    if (transfer) transfer.cancelled = true;
  }

  /**
   * Cancel an incoming transfer.
   */
  cancelReceive(transferId) {
    this._incomingTransfers.delete(transferId);
    this._sendControlMessage({ type: 'transfer-cancel', transferId });
    if (this.onTransferCancelled) {
      this.onTransferCancelled({ transferId, by: 'receiver' });
    }
  }

  // ─── Data Channel Handlers ────────────────────────────────

  _setupDataChannelHandlers(dataChannel, peerId) {
    let pendingChunkHeader = null;

    dataChannel.onopen = () => {
      console.log(`[DataChannel] Open with peer ${peerId}`);
    };

    dataChannel.onclose = () => {
      console.log(`[DataChannel] Closed with peer ${peerId}`);
    };

    dataChannel.onerror = (err) => {
      console.error(`[DataChannel] Error with peer ${peerId}:`, err);
    };

    dataChannel.onmessage = (event) => {
      // Binary data = file chunk payload
      if (event.data instanceof ArrayBuffer) {
        if (pendingChunkHeader) {
          this._handleChunkData(pendingChunkHeader, event.data, peerId);
          pendingChunkHeader = null;
        }
        return;
      }

      // String data = JSON control message
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'file-meta':
            this._handleFileMeta(msg, peerId);
            break;
          case 'file-chunk':
            // Next binary message is the chunk payload
            pendingChunkHeader = msg;
            break;
          case 'file-complete':
            this._handleFileComplete(msg);
            break;
          case 'transfer-cancel':
            this._handleTransferCancel(msg);
            break;
          default:
            console.warn('[DataChannel] Unknown message type:', msg.type);
        }
      } catch (err) {
        console.error('[DataChannel] Failed to parse message:', err);
      }
    };
  }

  _handleFileMeta(meta, fromPeerId) {
    const { transferId, fileName, fileSize, fileType, totalChunks } = meta;

    this._incomingTransfers.set(transferId, {
      chunks: new Array(totalChunks),
      received: 0,
      totalChunks,
      fileName,
      fileSize,
      fileType,
      startTime: Date.now(),
      from: fromPeerId,
    });

    if (this.onFileReceiveStart) {
      this.onFileReceiveStart({ from: fromPeerId, fileName, fileSize, fileType, transferId });
    }
  }

  _handleChunkData(header, buffer, _fromPeerId) {
    const { transferId, chunkIndex } = header;
    const transfer = this._incomingTransfers.get(transferId);
    if (!transfer) return; // cancelled or unknown

    transfer.chunks[chunkIndex] = buffer;
    transfer.received++;

    if (this.onFileReceiveProgress) {
      const elapsed = (Date.now() - transfer.startTime) / 1000;
      const receivedBytes = transfer.received * CHUNK_SIZE;
      const speed = elapsed > 0 ? receivedBytes / elapsed : 0;
      this.onFileReceiveProgress({
        transferId,
        received: Math.min(receivedBytes, transfer.fileSize),
        total: transfer.fileSize,
        speed,
        fileName: transfer.fileName,
      });
    }
  }

  _handleFileComplete(msg) {
    const { transferId } = msg;
    const transfer = this._incomingTransfers.get(transferId);
    if (!transfer) return;

    // Reassemble file from chunks
    const blob = new Blob(transfer.chunks, { type: transfer.fileType });
    this._incomingTransfers.delete(transferId);

    if (this.onFileReceiveComplete) {
      this.onFileReceiveComplete({
        transferId,
        fileName: transfer.fileName,
        fileType: transfer.fileType,
        blob,
      });
    }
  }

  _handleTransferCancel(msg) {
    const { transferId } = msg;
    this._incomingTransfers.delete(transferId);
    if (this.onTransferCancelled) {
      this.onTransferCancelled({ transferId, by: 'sender' });
    }
  }

  _sendControlMessage(msg) {
    const json = JSON.stringify(msg);
    for (const [, peerInfo] of this.peers) {
      if (peerInfo.dataChannel && peerInfo.dataChannel.readyState === 'open') {
        peerInfo.dataChannel.send(json);
      }
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────

  /**
   * Close a specific peer connection.
   */
  closePeer(peerId) {
    const peerInfo = this.peers.get(peerId);
    if (peerInfo) {
      if (peerInfo.dataChannel) peerInfo.dataChannel.close();
      peerInfo.pc.close();
      this.peers.delete(peerId);
    }
  }

  /**
   * Close all peer connections and reset state.
   */
  closeAll() {
    for (const [peerId] of this.peers) {
      this.closePeer(peerId);
    }
    this._incomingTransfers.clear();
    this._outgoingTransfers.clear();
  }

  /**
   * Get the connection state for a peer.
   */
  getPeerState(peerId) {
    const peerInfo = this.peers.get(peerId);
    if (!peerInfo) return 'new';
    return peerInfo.pc.connectionState || 'new';
  }
}

// Export singleton
const webrtcManager = new WebRTCManager();
export default webrtcManager;
