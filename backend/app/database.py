"""
Database connection and session management.
Sets up SQLAlchemy engine and session factory.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

# Get settings
settings = get_settings()

# Create database engine
# echo=True logs all SQL statements (useful for debugging)
engine_kwargs = {
    "echo": True,  # Set to False in production
}

if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update(
        {
            "pool_pre_ping": True,  # Verifies connections before using them
            "pool_size": 10,  # Number of connections to maintain
            "max_overflow": 20,  # Extra connections allowed when pool is exhausted
        }
    )

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for all models
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.
    Yields a session and ensures it's closed after use.
    
    Usage:
        @app.get("/items/")
        def get_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
