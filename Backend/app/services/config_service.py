from app.schemas.config_schema import BaseConfig, FetchConfig, SearchCategory
from app.models.config_model import RAGConfig

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
        active = db_session.query(RAGConfig).filter_by(is_active=True).first()
        if not active:
            active = RAGConfig(
                chunk_size=1000,
                chunk_overlap=200,
                top_k=5,
                search_category=SearchCategory.Semantic,
                reranker=False,
                temperature=0.2,
                stream=False,
                is_active=True
            )
            db_session.add(active)
            db_session.commit()
            db_session.refresh(active)
        return FetchConfig.model_validate(active)
    except Exception as e:
        print(f"Error fetching active config: {e}")
        raise e


def create_default_config(db_session):
    try:
        existing = db_session.query(RAGConfig).filter(RAGConfig.is_active == True).first()

        if not existing:
            default_config = RAGConfig(
                chunk_size=1000,
                chunk_overlap=200,
                top_k=5,
                search_category=SearchCategory.Semantic,
                reranker=False,
                temperature=0.2,
                stream=False,
            )

            db_session.add(default_config)
            db_session.commit()
            print("✅ Default config created")
    except Exception as e:
        db_session.rollback()
        print(f"Error creating default config: {e}")
        raise e