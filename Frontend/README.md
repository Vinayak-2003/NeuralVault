# NeuralVault — Premium AI Knowledge Library

A state-of-the-art Personal Knowledge RAG (Retrieval-Augmented Generation) dashboard. Built for speed, precision, and aesthetic excellence.

## Technical Stack
- **Vite** — Lightning-fast build tool and dev server
- **React 18** — High-performance UI framework
- **Framer Motion** — Premium micro-animations and physics-based transitions
- **React Markdown** — Elegant rendering of AI-generated insights
- **Axios** — Robust API communication

## Setup & Requirements

### Requirements
- **Node.js**: v18.0 or higher
- **Backend**: A running FastAPI server (pointing to ChromaDB/Pinecone)

### Quick Start
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Environment Setup**:
    I have already created a `.env` file for you. If you need to change your backend URL, update `VITE_API_URL`.
    ```bash
    VITE_API_URL=http://127.0.0.1:8000
    ```
3.  **Launch Dashboard**:
    ```bash
    npm start
    ```

## Project Architecture
- `src/main.jsx` — Entry point (Vite module)
- `src/styles/globals.css` — NeuralVault design system (Glassmorphism, High-tech aesthetics)
- `src/services/api.js` — All communication logic with the FastAPI backend
- `src/store/AppContext.jsx` — Global state management (Library, Config, Health)
- `src/hooks/` — Custom logic for Chat, Uploads, and Pipeline management

## Connecting Your Backend
The frontend is designed to be plug-and-play. Search for `// ── REAL:` comments to switch from mock data to your live FastAPI endpoints:

| File | Integration Point |
|------|-------------------|
| `src/store/AppContext.jsx` | Document list & Health checks |
| `src/hooks/useUpload.js`   | File ingestion pipeline |
| `src/hooks/useChat.js`     | AI Query / SSE Streaming |
| `src/components/settings/SettingsPanel.jsx` | Pipeline configuration |

### CORS Configuration
Ensure your FastAPI server allows requests from the frontend:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"]
)
```

## API Endpoints Reference
The following endpoints should be implemented on your FastAPI backend:

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/health` | Server & Database status |
| GET    | `/documents` | Retrieve indexed knowledge |
| POST   | `/ingest` | Upload new knowledge files |
| GET    | `/ingest/status/{job_id}` | Track ingestion progress |
| POST   | `/query` | Execute RAG search & generation |
| GET    | `/config` | Fetch current RAG parameters |
| POST   | `/config` | Update system configuration |
