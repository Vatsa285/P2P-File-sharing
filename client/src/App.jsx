// App.jsx — Main application shell with routing

import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useRoom from './hooks/useRoom';
import useFileTransfer from './hooks/useFileTransfer';
import Home from './pages/Home';
import Room from './pages/Room';

function RoomWrapper({ roomId, peers, username, connectionStatus, transfers, completedFiles, sendFile, cancelTransfer, downloadFile, leaveRoom }) {
  const { id } = useParams();

  // If room ID in URL doesn't match our joined room, redirect home
  if (!roomId || roomId !== id) {
    return <Navigate to="/" replace />;
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
    />
  );
}

export default function App() {
  const { roomId, peers, username, connectionStatus, error, createRoom, joinRoom, leaveRoom } = useRoom();
  const { transfers, completedFiles, sendFile, cancelTransfer, downloadFile } = useFileTransfer();

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
              leaveRoom={leaveRoom}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
