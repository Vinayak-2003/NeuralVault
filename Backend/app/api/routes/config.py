from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Annotated

from app.db.database import get_db_session
from app.services.config_service import create_config, active_config, create_default_config
from app.models.config_model import BaseConfig

router = APIRouter(
    prefix="/config",
    tags=["Config"]
)


@router.get("/")
def get_active_config(db: Annotated[Session, Depends(get_db_session)]):
    return active_config(db)


@router.post("/")
def create_setting(config_data: BaseConfig, db: Annotated[Session, Depends(get_db_session)]):
    return create_config(db)


@router.post("/default")
def create_default_setting(db: Annotated[Session, Depends(get_db_session)]):
    return create_default_config(db)