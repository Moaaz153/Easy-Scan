"""
OCR API endpoints
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from PIL import Image
import io
import logging
import os
import uuid
from typing import Dict, Any
from app.services.data_extractor import DataExtractor
from app.models.user import User
from app.core.dependencies import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ocr", tags=["OCR"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
    logger.info(f"Created uploads directory: {UPLOAD_DIR}")


@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Upload invoice image and extract text using OCR
    
    Args:
        file: Uploaded image file
        
    Returns:
        Dictionary with raw_text and extracted_fields
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (JPG, PNG, etc.)"
            )

        # Read file content
        contents = await file.read()
        
        # Validate file size (10MB max)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(contents) > max_size:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 10MB limit"
            )

        # Open image with PIL
        try:
            image = Image.open(io.BytesIO(contents))
            # Convert to RGB if necessary (for JPEG compatibility)
            if image.mode != 'RGB':
                image = image.convert('RGB')
        except Exception as e:
            logger.error(f"Error opening image: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image file: {str(e)}"
            )

        # Save the uploaded image file
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        if not file_extension or file_extension not in ['.jpg', '.jpeg', '.png', '.pdf']:
            file_extension = '.jpg'
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        image_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save the file
        try:
            with open(image_path, 'wb') as f:
                f.write(contents)
            logger.info(f"Saved uploaded image to: {image_path}")
        except Exception as e:
            logger.error(f"Error saving image file: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error saving image file: {str(e)}"
            )
        
        # Process image
        result = await DataExtractor.process_invoice_image(image)
        
        logger.info(f"Successfully processed invoice: {file.filename}")
        
        return {
            "success": True,
            "filename": file.filename,
            "image_path": image_path,  # Return the saved image path
            "raw_text": result["raw_text"],
            "extracted_fields": result["extracted_fields"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing invoice upload: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing invoice: {str(e)}"
        )

