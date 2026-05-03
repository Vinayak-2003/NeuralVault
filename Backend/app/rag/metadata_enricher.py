from datetime import datetime, timezone
import os


def split_document_enricher(chunks, id, file_path: str):
    try:
        enriched_chunks = []

        filename = os.path.basename(file_path)
        uploaded_at = datetime.now(timezone.utc).isoformat()
        file_size_byte = os.path.getsize(file_path)

        for i, chunk in enumerate(chunks, 0):
            chunk.metadata.update({
                "id": id,
                "file_name": filename,
                "file_path": file_path,
                "file_size_mb": file_size_byte/(1024*1024),
                "chunk_nos": f"chunk_{i}",
                "uploaded_at": uploaded_at
            })

            enriched_chunks.append(chunk)

        print(f"Chunks enriched with metadata successfully: {enriched_chunks[0].metadata}")
        print(f"_____________Total enriched chunks: {len(enriched_chunks)}_________________________")
        return enriched_chunks
    except Exception as e:
        print(f"Error in metadata enrichment: {e}")
        raise e