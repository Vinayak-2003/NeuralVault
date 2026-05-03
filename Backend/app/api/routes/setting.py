from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import Annotated

from app.db.database import get_db_session
from app.models.setting_model import Setting
from app.schemas.setting_schema import SettingResponse, SettingCreate

router = APIRouter(
    prefix="/config",
    tags=["config"]
)

@router.get("/", response_model=SettingResponse)
async def get_config(db: Annotated[Session, Depends(get_db_session)]):
    query = select(Setting).order_by(Setting.created_at.desc()).limit(1)
    result = await db.execute(query)
    setting = result.scalar_one_or_none()
    
    if not setting:
        return Setting(
            id="00000000-0000-0000-0000-000000000000",
            chunk_size=512,
            chunk_overlap=50,
            top_k=5,
            search_category="Hybrid",
            reranker=False,
            temperature=0.2,
            stream=False,
            created_at=None
        )
    return setting

@router.post("/", response_model=SettingResponse)
async def update_config(payload: SettingCreate, db: Annotated[Session, Depends(get_db_session)]):
    # Strictly enforce 512/50 as requested by user
    new_setting = Setting(
        chunk_size=512,
        chunk_overlap=50,
        top_k=payload.top_k,
        search_category=payload.search_category,
        reranker=payload.reranker,
        temperature=payload.temperature,
        stream=payload.stream
    )
    
    db.add(new_setting)
    await db.commit()
    await db.refresh(new_setting)
    return new_setting
