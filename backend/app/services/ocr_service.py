"""
OCR Service using pytesseract
"""
import pytesseract
from PIL import Image
import cv2
import numpy as np
import logging
from typing import Dict, Any, Optional
import re
from datetime import datetime
import os

logger = logging.getLogger(__name__)

# Configure Tesseract path - Windows automatic detection
_tess_cmd = os.getenv('TESSERACT_CMD')
if _tess_cmd and os.path.exists(_tess_cmd):
    pytesseract.pytesseract.tesseract_cmd = _tess_cmd
    logger.info(f"Tesseract path from env: {_tess_cmd}")
elif os.name == 'nt':  # Windows
    # Try common installation paths
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Tesseract-OCR\tesseract.exe",
    ]
    
    tesseract_found = False
    for path in possible_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            tesseract_found = True
            logger.info(f"Tesseract found at: {path}")
            break
    
    if not tesseract_found:
        # Try to find in PATH
        try:
            import shutil
            tesseract_path = shutil.which('tesseract')
            if tesseract_path:
                pytesseract.pytesseract.tesseract_cmd = tesseract_path
                logger.info(f"Tesseract found in PATH: {tesseract_path}")
                tesseract_found = True
        except Exception as e:
            logger.warning(f"Could not find Tesseract in PATH: {e}")

# Detect if Tesseract is available at startup
try:
    _tesseract_version = pytesseract.get_tesseract_version()
    TESSERACT_AVAILABLE = True
    logger.info(f"Tesseract version detected: {_tesseract_version}")
except Exception as e:
    TESSERACT_AVAILABLE = False
    logger.error(f"Tesseract not available: {e}")
    logger.error("Please install Tesseract OCR or set TESSERACT_CMD environment variable")


class OCRService:
    """Service for OCR processing and text extraction"""

    @staticmethod
    def preprocess_image(image: Image.Image) -> np.ndarray:
        """
        Preprocess image for better OCR results
        - Convert to grayscale
        - Apply thresholding
        - Remove noise
        - Enhance contrast
        """
        try:
            img_array = np.array(image)
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array

            blurred = cv2.GaussianBlur(gray, (5, 5), 0)

            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )

            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

            return cleaned
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            return np.array(image.convert('L'))

    @staticmethod
    def extract_text(image: Image.Image) -> str:
        """
        Extract raw text from image using OCR
        """
        # Check Tesseract availability before processing
        try:
            # Try to get version to verify Tesseract is accessible
            pytesseract.get_tesseract_version()
        except Exception as e:
            error_msg = f"Tesseract is not installed or it's not in your PATH. Error: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        try:
            processed_img = OCRService.preprocess_image(image)
            pil_image = Image.fromarray(processed_img)
            custom_config = r'--oem 3 --psm 6'
            text = pytesseract.image_to_string(pil_image, config=custom_config)
            logger.info(f"Extracted {len(text)} characters from image")
            return text.strip()
        except RuntimeError:
            # Re-raise Tesseract errors
            raise
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}")
            raise RuntimeError(f"Error processing invoice: {str(e)}")

    @staticmethod
    def extract_structured_data(raw_text: str) -> Dict[str, Any]:
        """
        Extract structured fields from raw OCR text
        """
        extracted = {
            "vendor": None,
            "invoice_number": None,
            "date": None,
            "due_date": None,
            "total": None,
            "subtotal": None,
            "tax": None,
            "discount": None,
            "currency": "USD",
            "items": [],
            "vendor_address": None,
            "vendor_email": None,
            "vendor_phone": None,
            "purchase_order": None,
        }

        if not raw_text:
            return extracted

        text_lines = raw_text.split('\n')
        text_upper = raw_text.upper()

        # Extract invoice number
        invoice_patterns = [
            r'INVOICE\s*#?\s*:?[ ]*([A-Z0-9\-]+)',
            r'INV\s*#?\s*:?[ ]*([A-Z0-9\-]+)',
            r'INVOICE\s+NUMBER\s*:?[ ]*([A-Z0-9\-]+)',
            r'#\s*([A-Z0-9\-]{6,})',
        ]
        for pattern in invoice_patterns:
            match = re.search(pattern, text_upper)
            if match:
                extracted["invoice_number"] = match.group(1).strip()
                break

        # Extract a date (simple)
        date_match = re.search(r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}', raw_text)
        if date_match:
            extracted['date'] = OCRService._parse_date(date_match.group(0))

        # Totals
        total_match = re.search(r'(TOTAL|AMOUNT DUE|GRAND TOTAL)\s*:?\s*\$?\s*([\d,]+\.?\d*)', text_upper)
        if total_match:
            try:
                extracted['total'] = float(total_match.group(2).replace(',', ''))
            except Exception:
                pass

        subtotal_match = re.search(r'SUBTOTAL\s*:?\s*\$?\s*([\d,]+\.?\d*)', text_upper)
        if subtotal_match:
            try:
                extracted['subtotal'] = float(subtotal_match.group(1).replace(',', ''))
            except Exception:
                pass

        tax_match = re.search(r'(TAX|SALES TAX|VAT)\s*:?\s*\$?\s*([\d,]+\.?\d*)', text_upper)
        if tax_match:
            try:
                extracted['tax'] = float(tax_match.group(2).replace(',', ''))
            except Exception:
                pass

        # Vendor name: look in first few non-empty lines
        for ln in text_lines[:10]:
            ln_strip = ln.strip()
            if len(ln_strip) > 2 and not re.search(r'INVOICE|TOTAL|DATE|AMOUNT|TO|FROM', ln_strip.upper()):
                extracted['vendor'] = ln_strip
                break

        # Email
        email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-ZaZ]{2,}", raw_text)
        if email_match:
            extracted['vendor_email'] = email_match.group(0)

        # Phone
        phone_match = re.search(r"\+?\d[\d\s().-]{7,}\d", raw_text)
        if phone_match:
            extracted['vendor_phone'] = phone_match.group(0)

        # Purchase order
        po_match = re.search(r"P\.?O\.?\s*#?\s*:?\s*([A-Z0-9\-]+)", text_upper)
        if po_match:
            extracted['purchase_order'] = po_match.group(1)

        # Simple line-item extraction: after a header like 'DESCRIPTION QTY RATE AMOUNT'
        items = []
        in_items = False
        for line in text_lines:
            up = line.upper()
            if 'DESCRIPTION' in up and ('QTY' in up or 'AMOUNT' in up):
                in_items = True
                continue
            if in_items and line.strip():
                amounts = re.findall(r"[\d,]+\.?\d*", line)
                desc = line
                qty = None
                rate = None
                amt = None
                try:
                    if len(amounts) >= 1:
                        amt = float(amounts[-1].replace(',', ''))
                    if len(amounts) >= 2:
                        rate = float(amounts[-2].replace(',', ''))
                    if len(amounts) >= 3:
                        qty = float(amounts[-3].replace(',', ''))
                except Exception:
                    pass
                desc = re.split(r"[\d,]+\.?\d*", line)[0].strip()
                items.append({'description': desc, 'qty': qty, 'rate': rate, 'amount': amt})

        extracted['items'] = items
        return extracted

    @staticmethod
    def _parse_date(date_str: str) -> Optional[str]:
        date_str = date_str.strip()
        candidates = ['%m/%d/%Y', '%m/%d/%y', '%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d']
        for fmt in candidates:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.date().isoformat()
            except Exception:
                continue
        digits = re.findall(r"\d+", date_str)
        if len(digits) >= 3:
            try:
                parts = list(map(int, digits[:3]))
                if parts[0] > 31:
                    year = parts[0]; month = parts[1]; day = parts[2]
                else:
                    month, day, year = parts[0], parts[1], parts[2]
                return datetime(year, month, day).date().isoformat()
            except Exception:
                pass
        return None

