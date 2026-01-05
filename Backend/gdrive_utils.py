import os
import io
import requests
import http.client
from googleapiclient.http import MediaIoBaseUpload
from googleapiclient.errors import HttpError
from fastapi import UploadFile
from db import drive_service, creds  # <--- IMPORT creds from db.py

# Your Folder ID
PARENT_FOLDER_ID = "1SUWfwdjJTunwl0wB-_ohm1OA2AB0UnP8"

async def upload_file_to_drive(file: UploadFile):
    """
    Uploads a single file. (This remains unchanged, but we call it differently in expense.py)
    """
    if not drive_service:
        raise Exception("Google Drive Service not initialized.")

    file_metadata = {
        'name': file.filename,
        'parents': [PARENT_FOLDER_ID] 
    }
    
    # Read file into memory
    content = await file.read()
    buffer = io.BytesIO(content)
    
    media = MediaIoBaseUpload(
        buffer, 
        mimetype=file.content_type,
        resumable=True
    )
    
    file_drive = drive_service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, name, webViewLink, webContentLink'
    ).execute()
    
    return {
        "id": file_drive.get('id'),
        "filename": file_drive.get('name'),
        "viewLink": file_drive.get('webViewLink'),
        "downloadLink": file_drive.get('webContentLink')
    }

def delete_file_from_drive(file_id: str):
    """ Robust delete function from previous step """
    if not drive_service: return False
    try:
        drive_service.files().delete(fileId=file_id).execute()
        return True
    except http.client.IncompleteRead:
        # Check if actually deleted
        try:
            drive_service.files().get(fileId=file_id).execute()
            return False 
        except HttpError as err:
            if err.resp.status == 404: return True
            return False
    except HttpError as e:
        if e.resp.status == 404: return True
        return False
    except Exception:
        return False

def stream_file_content(file_id: str):
    """
    NEW: Generators that yield file chunks for instant download start.
    Returns: (generator, filename, mime_type)
    """
    try:
        # 1. Get Metadata (to know filename and type)
        meta = drive_service.files().get(
            fileId=file_id, 
            fields="name, mimeType, size"
        ).execute()
        
        filename = meta.get('name')
        mime_type = meta.get('mimeType')

        # 2. Prepare the Direct Download URL
        url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
        
        # 3. Get the Token (Refresh if needed handled by google-auth)
        if not creds or not creds.valid:
            from google.auth.transport.requests import Request
            creds.refresh(Request())
            
        headers = {"Authorization": f"Bearer {creds.token}"}

        # 4. Stream the request using 'requests' library
        # stream=True prevents loading the whole file into RAM
        response = requests.get(url, headers=headers, stream=True)
        
        # Define a generator function to yield chunks
        def iterfile():
            # Chunk size: 64KB (balance between memory usage and speed)
            for chunk in response.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk

        return iterfile, filename, mime_type

    except Exception as e:
        print(f"Stream Error: {e}")
        return None, None, None