# 🧠 MyKnowledgeRAG

<div align="center">

![MyKnowledgeRAG Banner](https://img.shields.io/badge/MyKnowledgeRAG-Personal_AI_Knowledge_Base-6366f1?style=for-the-badge&logo=openai&logoColor=white)

**A full-stack Retrieval-Augmented Generation (RAG) system for building and querying a personal knowledge base from PDF documents.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.135+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Vite](https://img.shields.io/badge/Vite-5.4+-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![LangChain](https://img.shields.io/badge/LangChain-1.2+-1C3C3C?style=flat-square&logo=langchain&logoColor=white)](https://langchain.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)

[Features](#-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Contributing](#-contributing)

</div>

---

## 📖 Overview

**MyKnowledgeRAG** (also known as **NeuralVault**) is a personal AI-powered knowledge base that lets you upload PDF documents and then have intelligent conversations with that content. It uses a hybrid retrieval strategy combining dense vector search (ChromaDB + HuggingFace embeddings) and sparse BM25 search for maximum relevance.

### How It Works

```
PDF Upload → Text Chunking → Embedding → Vector Store (Chroma) + BM25 Index
                                                         ↓
User Query → Hybrid Retrieval → Re-ranking → LLM (Gemini/Groq) → Answer
```

---

## ✨ Features

### Backend
- 📄 **PDF Ingestion** — Upload and process PDF documents with automatic chunking
- 🔍 **Hybrid Search** — Combines dense vector search with BM25 sparse retrieval
- 🤖 **Multiple LLM Providers** — Supports Google Gemini and Groq (Llama, Mistral, etc.)
- 🗄️ **PostgreSQL Persistence** — Document metadata stored via SQLAlchemy + Alembic migrations
- 🧩 **ChromaDB Vector Store** — Fast local vector similarity search
- ⚙️ **Dynamic Configuration** — Runtime-switchable LLM model and embedding settings
- 🏥 **Health Monitoring** — Dedicated health-check endpoint for observability

### Frontend
- 💬 **Chat Interface** — Clean, streaming-ready conversational UI
- 📚 **Document Manager** — Upload, view, and delete ingested documents
- 🎨 **Aurora Design System** — Premium glassmorphic dark-mode UI with micro-animations
- ⚡ **Vite + React 18** — Blazing-fast HMR development experience
- 🔔 **Real-time Feedback** — Toast notifications and loading states throughout

---

## 🗂️ Repository Structure

```
MyKnowledgeRAG/                     # Monorepo root
├── 📁 Backend/                     # FastAPI Python backend
│   ├── 📁 app/
│   │   ├── 📁 api/routes/          # REST API route handlers
│   │   │   ├── document.py         # Document CRUD endpoints
│   │   │   ├── ingest.py           # PDF ingestion pipeline
│   │   │   ├── query.py            # RAG query endpoint
│   │   │   ├── config.py           # Runtime settings endpoints
│   │   │   └── health.py           # Health check endpoint
│   │   ├── 📁 core/                # App configuration (Settings via pydantic)
│   │   ├── 📁 db/                  # Database engine, session, ChromaDB
│   │   ├── 📁 models/              # SQLAlchemy ORM models
│   │   ├── 📁 rag/                 # RAG pipeline (retriever, chain, BM25)
│   │   ├── 📁 schemas/             # Pydantic request/response schemas
│   │   ├── 📁 services/            # Business logic services
│   │   └── 📁 utils/               # Shared utility helpers
│   ├── 📁 alembic/                 # Database migration scripts
│   ├── main.py                     # FastAPI application entry point
│   ├── pyproject.toml              # Python project & dependency manifest
│   ├── uv.lock                     # Locked dependency tree (uv)
│   ├── .env.example                # Environment variable template
│   └── .python-version             # Python version pin (3.12)
│
├── 📁 Frontend/                    # React + Vite frontend
│   ├── 📁 src/
│   │   ├── 📁 components/          # Reusable UI components
│   │   │   └── 📁 ui/              # Core design-system components
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   ├── 📁 services/            # Axios API client layer
│   │   ├── 📁 store/               # Global state management
│   │   ├── 📁 styles/              # Global CSS & design tokens
│   │   └── 📁 utils/               # Frontend utility helpers
│   ├── 📁 public/                  # Static assets
│   ├── index.html                  # HTML entry point
│   ├── vite.config.js              # Vite build configuration
│   ├── package.json                # Node dependencies & scripts
│   └── .env.example                # Environment variable template
│
├── .gitignore                      # Root-level gitignore
├── .editorconfig                   # Consistent editor formatting
├── docker-compose.yml              # One-command local dev stack
└── README.md                       # You are here
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (React)                     │
│              NeuralVault UI  ·  Port 3000                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / REST (Axios)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                          │
│               MyKnowledgeRAG API  ·  Port 8000           │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  /documents │  │  /ingest    │  │   /query        │  │
│  │  /config    │  │  /health    │  │   /settings     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│                         │                                │
│         ┌───────────────┼───────────────┐               │
│         ▼               ▼               ▼               │
│   ┌──────────┐  ┌──────────────┐  ┌──────────────┐     │
│   │PostgreSQL│  │   ChromaDB   │  │  LLM APIs    │     │
│   │(metadata)│  │(vector store)│  │Gemini / Groq │     │
│   └──────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Python](https://python.org) | ≥ 3.12 | Backend runtime |
| [uv](https://docs.astral.sh/uv/) | latest | Python package manager |
| [Node.js](https://nodejs.org) | ≥ 18 LTS | Frontend runtime |
| [npm](https://npmjs.com) | ≥ 9 | Frontend package manager |
| [PostgreSQL](https://postgresql.org) | ≥ 15 | Document metadata store |
| [Docker](https://docker.com) | optional | One-command setup |

---

### Option A — Docker (Recommended)

> Starts the full stack (Postgres + Backend + Frontend) with a single command.

```bash
# Clone the repo
git clone https://github.com/your-username/MyKnowledgeRAG.git
cd MyKnowledgeRAG

# Copy and fill in your secrets
cp Backend/.env.example Backend/.env

# Launch everything
docker compose up --build
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:8000      |
| API Docs | http://localhost:8000/docs |

---

### Option B — Manual Setup

#### 1. Clone the repository

```bash
git clone https://github.com/your-username/MyKnowledgeRAG.git
cd MyKnowledgeRAG
```

#### 2. Backend setup

```bash
cd Backend

# Install dependencies with uv
uv sync

# Copy environment template
cp .env.example .env
# → Edit .env with your API keys and database credentials

# Run database migrations
uv run alembic upgrade head

# Start the development server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

#### 3. Frontend setup

```bash
cd Frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# → VITE_API_URL=http://localhost:8000

# Start the development server
npm run dev
```

The UI will be available at `http://localhost:3000`

---

## ⚙️ Environment Variables

### Backend — `Backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `GROQ_API_KEY` | ✅ | Groq API key (Llama, Mistral, etc.) |
| `HF_TOKEN` | ✅ | HuggingFace token for embeddings |
| `DATABASE_USER` | ✅ | PostgreSQL username |
| `DATABASE_PASSWORD` | ✅ | PostgreSQL password |
| `DATABASE_NAME` | ✅ | PostgreSQL database name |
| `NEON_USER` | ☑️ | Neon DB username (if using Neon) |
| `NEON_DB_PASSWORD` | ☑️ | Neon DB password |
| `NEON_DB_HOST` | ☑️ | Neon DB host URL |
| `NEON_DB_NAME` | ☑️ | Neon DB database name |

### Frontend — `Frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API base URL (e.g., `http://localhost:8000`) |
| `VITE_API_KEY` | ☑️ | Optional API key for protected endpoints |

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/documents` | List all ingested documents |
| `DELETE` | `/documents/{id}` | Delete a document |
| `POST` | `/ingest` | Upload and ingest a PDF |
| `GET` | `/ingest/status/{task_id}` | Poll ingestion job status |
| `POST` | `/query` | Submit a RAG query |
| `GET` | `/config` | Get current LLM/embedding settings |
| `PUT` | `/config` | Update LLM/embedding settings |

> Full interactive API documentation available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc` (ReDoc).

---

## 🧰 Tech Stack

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| FastAPI | ≥ 0.135 | Async REST API framework |
| LangChain | ≥ 1.2 | RAG orchestration |
| langchain-google-genai | ≥ 4.2 | Google Gemini LLM integration |
| langchain-groq | ≥ 1.1 | Groq LLM integration |
| langchain-huggingface | ≥ 1.2 | HuggingFace embeddings |
| langchain-chroma | ≥ 1.1 | ChromaDB vector store |
| rank-bm25 | ≥ 0.2 | BM25 sparse retrieval |
| SQLAlchemy | ≥ 2.0 | ORM for PostgreSQL |
| Alembic | ≥ 1.18 | Database migrations |
| asyncpg | ≥ 0.31 | Async PostgreSQL driver |
| PyPDF | ≥ 6.9 | PDF text extraction |
| uv | latest | Fast Python package manager |

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| React | ≥ 18.3 | UI library |
| Vite | ≥ 5.4 | Build tool & dev server |
| Framer Motion | ≥ 11 | Animations & transitions |
| Axios | ≥ 1.7 | HTTP client |
| react-markdown | ≥ 9 | Markdown rendering for LLM output |
| react-syntax-highlighter | ≥ 15.5 | Code block highlighting |
| react-hot-toast | ≥ 2.4 | Toast notifications |
| date-fns | ≥ 3.6 | Date formatting |

---

## 🛠️ Development Scripts

### Backend

```bash
# Run development server with hot reload
uv run uvicorn main:app --reload

# Run migrations
uv run alembic upgrade head

# Create a new migration
uv run alembic revision --autogenerate -m "description"

# Add a new dependency
uv add <package-name>
```

### Frontend

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Purpose |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `chore:` | Build process or tooling |
| `refactor:` | Code refactor without feature/fix |
| `style:` | Formatting, no logic change |

---

## 📄 License

This project is for personal/educational use. See [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ using FastAPI, LangChain, React, and ChromaDB

</div>
