from fastapi import UploadFile
import os

from app.core.config import Settings

settings = Settings()

async def store_file(document: UploadFile):
    try:
        print("___________storing file_____________")
        doc_path = settings.document_path

        if not os.path.exists(doc_path):
            raise FileNotFoundError(f"Document path {doc_path} does not exist.")
        
        file_path = os.path.join(doc_path, document.filename)

        with open(file_path, "wb") as file:
            content = await document.read()
            file.write(content)

        print("____________File stored_____________", file_path)

        return {"status": f"File: {document.filename} saved successfully", "path": file_path}
    except Exception as e:
        print(f"Error storing file: {e}")
        raise