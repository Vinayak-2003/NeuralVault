import pickle
import os 
from langchain_community.retrievers import BM25Retriever

BM25_PATH = "app/db/bm25_retriever.pkl"

class BM25RetrieverClass:

    def __init__(self, path=BM25_PATH):
        self.path = path
        self.store = self._load_store()

    def _load_store(self):
        if os.path.exists(self.path):
            with open(self.path, "rb") as f:
                return pickle.load(f)
        return {}
    
    def _save_store(self):
        with open(self.path, "wb") as f:
            pickle.dump(self.store, f)

    def add_documents(self, doc_id: str, chunks: list):
        self.store[doc_id] = chunks
        self._save_store()

    def delete_document(self, doc_id: str):
        if doc_id in self.store:
            del self.store[doc_id]
            self._save_store()

    def get_document(self, doc_id: str):
        return self.store.get(doc_id, [])
    
    def get_all_documents(self):
        all_docs = []
        for docs in self.store.values():
            all_docs.extend(docs)
        return all_docs
    
    def bm25_retriever(self):
        all_docs = self.get_all_documents()
        bm25_retriever = BM25Retriever.from_documents(all_docs)
        bm25_retriever.k = 10
        return bm25_retriever
    