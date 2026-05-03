from app.models.config_model import BaseConfig, FetchConfig, SearchCategory
from app.schemas.config_schema import RAGConfig

def create_config(config_data: BaseConfig, db_session):
    try:
        db_session.query(RAGConfig).update({
            RAGConfig.is_active: False},
            synchronize_session=False
        )

        new_config = RAGConfig(
            **config_data.model_dump(),
            is_active=True
        )

        db_session.add(new_config)
        db_session.commit()
        db_session.refresh(new_config)

        return BaseConfig.model_validate(new_config)
    except Exception as e:
        db_session.rollback()
        print(f"Error creating config: {e}")
        raise e
    

def active_config(db_session):
    try:
        active_config = db_session.query(RAGConfig).filter_by(is_active=True).first()
        return FetchConfig.model_validate(active_config)
    except Exception as e:
        print(f"Error fetching active config: {e}")
        raise e


def create_default_config(db_session):
    existing = db_session.query(RAGConfig).filter(RAGConfig.is_active == True).first()

    if not existing:
        default_config = RAGConfig(
            top_k=5,
            search_category=SearchCategory.Semantic,
            reranker=False,
            temperature=0.2,
            stream=False,
        )

        db_session.add(default_config)
        db_session.commit()
        print("✅ Default config created")

    db_session.close()