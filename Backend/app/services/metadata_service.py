from sqlalchemy import select
import os

from uuid import UUID
from app.schemas.document_schema import Document, DocumentStatus
from app.db.database import get_db_session

def document_metadata_service(db_session,
                            id: UUID, 
                            file_path: str,
                            process_status: DocumentStatus,
                            job_id: UUID,
                            pages: int | None = None,
                            chunks: int | None = None,
                        ):
    try:

        filename = os.path.basename(file_path)
        file_size_byte = os.path.getsize(file_path)

        document = Document(
            doc_id=id,
            job_id=job_id,
            file_name=filename,
            file_path=file_path,
            file_size_mb=file_size_byte/(1024*1024),
            total_pages=pages,
            total_chunks=chunks,
            status=process_status
        )

        db_session.add(document)
        db_session.commit()
        db_session.refresh(document)
        print(f"Document record created in the database with ID: {document.id}")
        return {"msg": "Document record created successfully", "document_id": document.id}
    except Exception as e:
        db_session.rollback()
        print(f"Error in document service: {e}")
        raise e
    finally:
        db_session.close()


def update_document_metadata_service(db_session,
                                        id: UUID, 
                                        process_status: DocumentStatus,
                                        pages: int | None = None,
                                        chunks: int | None = None
                                    ):
    try:
        fetch_doc = db_session.execute(select(Document).where(Document.doc_id == id)).scalar_one_or_none()

        if not fetch_doc:
            print(f"No document found with ID: {id}")
            return {"msg": f"No document found with ID: {id}"}
        
        print(f"__________{fetch_doc}_____________")

        fetch_doc.status = process_status

        if pages is not None:
            fetch_doc.total_pages = pages

        if chunks is not None:
            fetch_doc.total_chunks = chunks

        db_session.commit()
        db_session.refresh(fetch_doc)

        print(f"Document record updated in the database with ID: {fetch_doc.id}")
        return {"msg": "Document record updated successfully", "document_id": fetch_doc.id}
    except Exception as e:
        db_session.rollback()
        print(f"Error in document service: {e}")
        raise e
    finally:
        db_session.close()