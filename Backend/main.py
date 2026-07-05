from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes.document import router as document_router
from app.api.routes.ingest import router as ingest_router
from app.api.routes.query import router as query_router
from app.api.routes.config import router as setting_router
from app.api.routes.health import router as health_check_router

from app.db.database import init_db, get_db_session

from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("Database initialized successfully.")
    yield
    print("Shutting down application...")



app = FastAPI(
    title="MyKnowledgeRAG",
    description="A Retrieval-Augmented Generation (RAG) system for answering questions based on a personal knowledge base created from PDF documents.",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(document_router)
app.include_router(ingest_router)
app.include_router(query_router)
app.include_router(setting_router)
app.include_router(health_check_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@app.get("/")
def root():
    return {"message": "Welcome to MyKnowledgeRAG API!"}
