from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, Session
from app.core.config import settings

Base = declarative_base()

engine, session_factory, async_session_factory = None, None, None

def local_pgsql_db_url():
    return "postgresql://{0}:{1}@{2}:{3}/{4}".format(
        settings.database_user,
        settings.database_password,
        settings.database_host,
        settings.database_port,
        settings.database_name
    )

def neon_db_url():
    return "postgresql://{0}:{1}@{2}/{3}?sslmode=require&channel_binding=require".format(
        settings.neon_db_user,
        settings.neon_db_password,
        settings.neon_db_host,
        settings.neon_db_name
    )

def init_db():
    global engine, session_factory
    try:
        engine = create_engine(
            url = neon_db_url(),
            echo=True,
            pool_size=10,
            max_overflow=0
        )

        session_factory = sessionmaker(
            bind = engine,
            autocommit=False,
            autoflush=False
        )
        print("Database connection pool initialized successfully.")
    except Exception as e:
        print(f"Error initializing connection pool: {e}")
        raise e


def get_new_session() -> Session:
    if session_factory is None:
        raise RuntimeError("Database session factory is not initialized. Call init_db() first.")
    return session_factory()


def get_db_session():
    if session_factory is None:
        raise RuntimeError("Database session factory is not initialized. Call init_db() first.")
    db: Session = session_factory()
    try:
        yield db
    finally:
        db.close()