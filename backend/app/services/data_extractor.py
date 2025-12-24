"""
Data extraction service - coordinates OCR and data parsing
"""
import logging
from PIL import Image
from typing import Dict, Any
from app.services.ocr_service import OCRService

logger = logging.getLogger(__name__)


class DataExtractor:
    """Service for extracting structured data from invoice images"""

    @staticmethod
    async def process_invoice_image(image: Image.Image) -> Dict[str, Any]:
        """
        Process invoice image and return raw text and extracted fields
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary with raw_text and extracted_fields
        """
        try:
            # Extract raw text using OCR
            raw_text = OCRService.extract_text(image)
            
            # Extract structured data using layout-based extraction (pass image for position analysis)
            extracted_fields = OCRService.extract_structured_data(raw_text, image=image)
            
            logger.info(f"Successfully processed invoice image. Extracted {len(raw_text)} characters.")
            
            return {
                "raw_text": raw_text,
                "extracted_fields": extracted_fields
            }
        except Exception as e:
            logger.error(f"Error processing invoice image: {str(e)}")
            raise

