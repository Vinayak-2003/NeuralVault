from app.rag.retrieval_pipeline import hybrid_retriever
from app.rag.llm_service import output_generation

from app.services.config_service import active_config

def document_retrieval_output_generation(query: str, db):
    try:
        config = active_config(db)

        if not config:
            raise Exception("No active config found")
        
        retrieved_docs = hybrid_retriever(query=query, top_k=config.top_k)

        print("__________retrieved docs in retrieval service_____________")

        output_generation_response = output_generation(retrieved_docs=retrieved_docs, 
                                                       query=query, 
                                                       temperature=config.temperature)

        return output_generation_response
    except Exception as e:
        print(f"Error in retrieval service: {e}")
        raise e