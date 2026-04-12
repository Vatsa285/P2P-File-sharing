# P2P FileShare — Peer-to-Peer File Sharing Application

A production-ready web application for sharing files directly between browsers using WebRTC data channels. No files are ever stored on the server — everything is transferred peer-to-peer.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS v4 |
| Backend | Node.js + Express + Socket.IO |
| Real-time | WebRTC data channels |
| Signaling | Socket.IO |

## Features

- **Room System** — Create or join rooms via unique ID / shareable link
- **P2P File Transfer** — Direct browser-to-browser via WebRTC data channels
- **No Server Storage** — Files never touch the server
- **Progress Tracking** — Real-time progress %, transfer speed, ETA
- **Multiple File Types** — Any file type supported
- **File Preview** — Preview images and text files inline
- **Multi-peer** — Full-mesh topology for small rooms
- **Drag & Drop** — Modern drag-and-drop upload UI
- **Cancel Transfers** — Cancel in-progress transfers
- **Connection Status** — Real-time peer connection indicators
- **Responsive UI** — Clean dark-mode design

## Architecture

```
┌─────────────────┐     Socket.IO      ┌─────────────────┐
│   Browser A      │◄──── signaling ───►│   Browser B      │
│   (React App)    │                    │   (React App)    │
│                  │◄── WebRTC P2P ───► │                  │
│                  │    data channel    │                  │
└─────────────────┘                    └─────────────────┘
         │                                      │
         └──────── Socket.IO ──────────────────┘
                       │
              ┌────────┴────────┐
              │  Signaling       │
              │  Server          │
              │  (Node/Express)  │
              └─────────────────┘
```

The server only relays signaling messages (offer/answer/ICE candidates). All file data flows directly between browsers.

## Project Structure

```
Peer-to-Peer/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── DropZone.jsx
│   │   │   ├── FilePreview.jsx
│   │   │   ├── PeerList.jsx
│   │   │   └── TransferProgress.jsx
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useRoom.js
│   │   │   └── useFileTransfer.js
│   │   ├── pages/           # Route pages
│   │   │   ├── Home.jsx
│   │   │   └── Room.jsx
│   │   ├── services/        # Core services
│   │   │   ├── socket.js
│   │   │   └── webrtc.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── .env.example
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── socket/
│   │   │   ├── roomManager.js
│   │   │   └── socketHandler.js
│   │   └── index.js
│   ├── Dockerfile
│   └── .env.example
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
# Backend
cd server
cp .env.example .env
npm install

# Frontend
cd ../client
cp .env.example .env
npm install
```

### 2. Start Development Servers

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

The app will be available at **http://localhost:5173**

### 3. Usage

1. Open the app in **Browser Tab 1**
2. Enter your name and click **Create New Room**
3. Copy the room link
4. Open **Browser Tab 2**, paste the link or enter the room ID
5. Both tabs should show each other as connected peers
6. Drag & drop or browse files to transfer them directly between browsers

## Environment Variables

### Backend (`server/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Server port |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin |

### Frontend (`client/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_SERVER_URL` | `http://localhost:5000` | Backend server URL |

## Docker Deployment

```bash
# Build and run backend
cd server
docker build -t p2p-server .
docker run -p 5000:5000 -e CLIENT_URL=http://your-domain p2p-server

# Build and run frontend
cd client
docker build -t p2p-client .
docker run -p 80:80 p2p-client
```

## Push to GitHub + Deploy (Vercel + Render)

### 1. Push project to GitHub

```bash
# From repository root
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

If this is already a git repo, skip `git init` and only run add/commit/push commands.

### 2. Deploy backend on Render (Node Web Service)

1. Create a new **Web Service** from this GitHub repository.
2. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Add environment variable:
   - `CLIENT_URL` = your Vercel frontend URL (for example `https://your-app.vercel.app`)
4. Deploy and copy the backend URL (for example `https://your-server.onrender.com`).

### 3. Deploy frontend on Vercel

1. Import the same GitHub repository in Vercel.
2. Set:
   - **Root Directory**: `client`
3. Add environment variable:
   - `VITE_SERVER_URL` = Render backend URL from step 2
4. Deploy.

### 4. Final backend CORS update

After Vercel creates your final frontend URL, confirm Render `CLIENT_URL` exactly matches it, then redeploy Render once if needed.

## How It Works

1. **Room Creation**: User creates a room → server generates a unique ID and stores it in memory
2. **Signaling**: When peers join, the server relays WebRTC signaling messages (SDP offers/answers, ICE candidates)
3. **P2P Connection**: WebRTC establishes a direct connection between browsers using STUN servers for NAT traversal
4. **File Transfer**: Files are split into 64KB chunks, sent sequentially over the data channel, and reassembled on the receiver
5. **Progress**: Both sender and receiver track bytes transferred to show real-time progress, speed, and ETA

## License

MIT
