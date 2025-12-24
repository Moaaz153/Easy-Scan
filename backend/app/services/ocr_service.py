"""
OCR Service using pytesseract with layout-based extraction for fixed invoice template
"""
import pytesseract
from PIL import Image
import cv2
import numpy as np
import logging
from typing import Dict, Any, Optional, List, Tuple
import re
from datetime import datetime
import os

logger = logging.getLogger(__name__)

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    logger.warning("Pandas not available, layout-based extraction will be limited")

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
    """Service for OCR processing and text extraction with fixed template layout"""

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
    def _get_text_with_positions(image: Image.Image):
        """
        Extract text with bounding box positions using pytesseract image_to_data
        Returns a DataFrame with text, left, top, width, height, conf
        """
        if not PANDAS_AVAILABLE:
            logger.warning("Pandas not available, cannot use layout-based extraction")
            return None
        
        try:
            processed_img = OCRService.preprocess_image(image)
            pil_image = Image.fromarray(processed_img)
            custom_config = r'--oem 3 --psm 6'
            
            # Get detailed data including positions
            data = pytesseract.image_to_data(pil_image, config=custom_config, output_type=pytesseract.Output.DICT)
            
            # Convert to DataFrame for easier manipulation
            df = pd.DataFrame(data)
            
            # Filter out empty text and low confidence
            df = df[df['text'].astype(str).str.strip() != '']
            df = df[df['conf'] > 0]
            
            return df
        except Exception as e:
            logger.error(f"Error extracting text with positions: {str(e)}")
            return None

    @staticmethod
    def _find_text_near_label(df, label: str, image_width: int, image_height: int, 
                              region: str = 'right', tolerance: int = 50) -> Optional[str]:
        """
        Find text value near a label
        region: 'right', 'left', 'top', 'bottom', 'any'
        """
        if df is None or df.empty:
            return None
        
        label_upper = label.upper()
        text_upper = df['text'].astype(str).str.upper()
        
        # Find label
        label_rows = df[text_upper.str.contains(label_upper, na=False, regex=False)]
        
        if label_rows.empty:
            return None
        
        # Get the first label match
        label_row = label_rows.iloc[0]
        label_x = label_row['left']
        label_y = label_row['top']
        label_w = label_row['width']
        label_h = label_row['height']
        
        # Find text to the right of the label (same line or slightly below)
        if region == 'right':
            candidates = df[
                (df['left'] >= label_x + label_w) &  # To the right of label
                (df['top'] >= label_y - tolerance) &  # Same line or slightly below
                (df['top'] <= label_y + label_h + tolerance) &  # Not too far below
                (~text_upper.str.contains(label_upper, na=False, regex=False))  # Not the label itself
            ]
        else:
            # For other regions, use proximity
            candidates = df[
                (df['left'] >= label_x - tolerance) &
                (df['left'] <= label_x + label_w + tolerance) &
                (df['top'] >= label_y - tolerance) &
                (df['top'] <= label_y + label_h + tolerance) &
                (~text_upper.str.contains(label_upper, na=False, regex=False))
            ]
        
        if candidates.empty:
            return None
        
        # Get the closest candidate (prefer right side)
        if region == 'right':
            closest = candidates.iloc[0]
        else:
            # Find closest by distance
            candidates['distance'] = (
                (candidates['left'] - (label_x + label_w))**2 + 
                (candidates['top'] - label_y)**2
            )**0.5
            closest = candidates.nsmallest(1, 'distance').iloc[0]
        
        return closest['text'].strip()

    @staticmethod
    def _extract_vendor_info_top_right(df, image_width: int, image_height: int) -> Dict[str, Optional[str]]:
        """
        Extract vendor information from top right corner
        Expected order: Vendor Name, Address, Email, Phone (vertical order)
        """
        vendor_info = {
            'vendor': None,
            'vendor_address': None,
            'vendor_email': None,
            'vendor_phone': None
        }
        
        if df is None or df.empty:
            return vendor_info
        
        # Define top right region (right 40% of image)
        right_threshold = image_width * 0.6

        # Try to find the vertical position of the \"Invoice #\" label so we only
        # look ABOVE it for vendor info (vendor block is always above invoice meta)
        invoice_rows = df[
            df['text'].astype(str).str.upper().str.contains('INVOICE', na=False, regex=False)
        ]
        invoice_y = None
        if not invoice_rows.empty:
            # Use the first invoice label as boundary
            invoice_y = invoice_rows['top'].min()

        if invoice_y is not None:
            top_right_text = df[
                (df['left'] >= right_threshold) &
                (df['top'] < invoice_y - 10)  # a little margin above invoice meta
            ].sort_values(['top', 'left'])
        else:
            # Fallback: use top 40% of the image
            top_threshold = image_height * 0.4
            top_right_text = df[
                (df['left'] >= right_threshold) &
                (df['top'] <= top_threshold)
            ].sort_values(['top', 'left'])
        
        if top_right_text.empty:
            return vendor_info
        
        # Group by vertical position (top coordinate) to find lines
        lines = []
        current_line = []
        last_top = None
        
        for _, row in top_right_text.iterrows():
            if last_top is None or abs(row['top'] - last_top) < 10:  # Same line
                current_line.append(row)
            else:
                if current_line:
                    lines.append(current_line)
                current_line = [row]
            last_top = row['top']
        
        if current_line:
            lines.append(current_line)
        
        # Prepare line texts for heuristics
        line_texts = [' '.join([r['text'] for r in line]).strip() for line in lines]

        # Heuristic: if the first line looks like an address (contains digits)
        # and the second line does NOT contain digits, treat the second line as
        # vendor name and the first as address (swap them).
        if len(line_texts) >= 2:
            first = line_texts[0]
            second = line_texts[1]
            first_has_digit = bool(re.search(r'\d', first))
            second_has_digit = bool(re.search(r'\d', second))

            # Swap vendor/address if first line looks like address and second doesn't
            if first_has_digit and not second_has_digit:
                logger.info("Vendor/address heuristic: swapping first two lines (first looks like address).")
                lines = [lines[1], lines[0]] + lines[2:]
                line_texts = [second, first] + line_texts[2:]

        # Extract vendor info from first 4 lines (in STRICT order)
        # Line 1: Vendor Name (first line at top)
        # Line 2: Address (immediately under Vendor Name)
        # Line 3: Email (immediately under Address)
        # Line 4: Phone (immediately under Email)

        logger.info(f"Extracting vendor info from {len(lines)} lines in top right region")

        for i, line in enumerate(lines[:4]):
            line_text = line_texts[i] if i < len(line_texts) else ' '.join([r['text'] for r in line]).strip()
            logger.info(f"Line {i+1} text: '{line_text[:100]}'")  # Log first 100 chars

            if i == 0:  # First line: Vendor Name (MUST be first line)
                vendor_info['vendor'] = line_text
                logger.info(f"✓ Assigned Line {i+1} to VENDOR: '{line_text}'")
            elif i == 1:  # Second line: Address (MUST be immediately under Vendor Name)
                vendor_info['vendor_address'] = line_text
                logger.info(f"✓ Assigned Line {i+1} to VENDOR_ADDRESS: '{line_text}'")
            elif i == 2:  # Third line: Email (MUST be immediately under Address)
                # Always assign to email if it's the 3rd line (as per requirement)
                vendor_info['vendor_email'] = line_text
                logger.info(f"✓ Assigned Line {i+1} to VENDOR_EMAIL: '{line_text}'")
            elif i == 3:  # Fourth line: Phone (immediately under Email)
                # Check if it looks like a phone number
                if re.search(r'\d', line_text):
                    phone_text = line_text.strip()
                    # Normalize leading '+' that OCR might misrecognize as '9'
                    if phone_text.startswith('9') and not phone_text.startswith('+'):
                        # Replace leading '9' with '+' and keep remaining digits only
                        normalized = '+' + re.sub(r'[^\d]', '', phone_text[1:])
                        vendor_info['vendor_phone'] = normalized
                    elif phone_text.startswith('+'):
                        vendor_info['vendor_phone'] = '+' + re.sub(r'[^\d]', '', phone_text[1:])
                    else:
                        vendor_info['vendor_phone'] = phone_text
                    logger.info(f\"✓ Assigned Line {i+1} to VENDOR_PHONE: '{vendor_info['vendor_phone']}'\")
                # If 4th line doesn't look like phone, don't overwrite email
        
        # Fallback: try to find email and phone using regex
        if not vendor_info['vendor_email']:
            try:
                all_text = ' '.join(df['text'].astype(str))
                email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", all_text)
                if email_match:
                    vendor_info['vendor_email'] = email_match.group(0)
            except:
                pass
        
        if not vendor_info['vendor_phone']:
            try:
                all_text = ' '.join(df['text'].astype(str))
                # Improved phone regex to preserve + sign and handle various formats
                # Matches: +1234567890, +1 234 567 8900, (123) 456-7890, etc.
                phone_match = re.search(r"\+?[\d\s().-]{7,}\d", all_text)
                if phone_match:
                    phone_text = phone_match.group(0).strip()
                    # Normalize leading '+' that OCR might misrecognize as '9'
                    if phone_text.startswith('9') and not phone_text.startswith('+'):
                        normalized = '+' + re.sub(r'[^\d]', '', phone_text[1:])
                        vendor_info['vendor_phone'] = normalized
                    elif phone_text.startswith('+'):
                        vendor_info['vendor_phone'] = '+' + re.sub(r'[^\d]', '', phone_text[1:])
                    else:
                        # Check if there's a + nearby (within 3 characters before)
                        start_pos = phone_match.start()
                        if start_pos > 0:
                            before_text = all_text[max(0, start_pos-3):start_pos]
                            if '+' in before_text:
                                vendor_info['vendor_phone'] = '+' + re.sub(r'[^\d]', '', phone_text)
                            else:
                                vendor_info['vendor_phone'] = phone_text
                        else:
                            vendor_info['vendor_phone'] = phone_text
            except:
                pass
        
        return vendor_info

    @staticmethod
    def _extract_bill_to_info(df, image_width: int, image_height: int) -> Dict[str, Optional[str]]:
        """
        Extract Bill To information from left side
        """
        bill_to_info = {
            'bill_to_name': None,
            'bill_to_address': None
        }
        
        if df is None or df.empty:
            return bill_to_info
        
        # Find "BILL TO" label
        bill_to_rows = df[df['text'].astype(str).str.upper().str.contains('BILL TO', na=False, regex=False)]
        
        if bill_to_rows.empty:
            return bill_to_info
        
        bill_to_row = bill_to_rows.iloc[0]
        bill_to_y = bill_to_row['top']
        bill_to_x = bill_to_row['left']
        
        # Find text below "BILL TO" (left side, within reasonable distance)
        left_threshold = image_width * 0.5  # Left half of image
        below_text = df[
            (df['left'] <= left_threshold) &
            (df['top'] > bill_to_y) &
            (df['top'] <= bill_to_y + 150)  # Within 150 pixels below
        ].sort_values('top')
        
        if below_text.empty:
            return bill_to_info
        
        # Group into lines
        lines = []
        current_line = []
        last_top = None
        
        for _, row in below_text.iterrows():
            if last_top is None or abs(row['top'] - last_top) < 10:
                current_line.append(row)
            else:
                if current_line:
                    lines.append(' '.join([r['text'] for r in current_line]).strip())
                current_line = [row]
            last_top = row['top']
        
        if current_line:
            lines.append(' '.join([r['text'] for r in current_line]).strip())
        
        # First line is name, rest is address
        if lines:
            bill_to_info['bill_to_name'] = lines[0]
            if len(lines) > 1:
                bill_to_info['bill_to_address'] = ' '.join(lines[1:])
        
        return bill_to_info

    @staticmethod
    def _extract_invoice_meta(df, image_width: int, image_height: int) -> Dict[str, Optional[str]]:
        """
        Extract invoice meta information from right side (Invoice #, Date, Due Date)
        Invoice #: should be on the same line, value immediately after the label
        """
        meta = {
            'invoice_number': None,
            'invoice_date': None,
            'due_date': None
        }
        
        if df is None or df.empty:
            return meta
        
        # Find Invoice #: on the same line - look for "Invoice #" or "Invoice #:"
        # Try to find the label "Invoice #" or "Invoice #:"
        invoice_label_rows = df[df['text'].astype(str).str.upper().str.contains('INVOICE', na=False, regex=False)]
        
        logger.info(f"Found {len(invoice_label_rows)} rows containing 'INVOICE'")
        
        if not invoice_label_rows.empty:
            # Look for rows that contain both "INVOICE" and "#"
            for _, label_row in invoice_label_rows.iterrows():
                label_text = str(label_row['text']).upper()
                if '#' in label_text:
                    label_y = label_row['top']
                    label_x = label_row['left']
                    label_w = label_row['width']
                    
                    logger.info(f"Found invoice label: '{label_row['text']}' at position ({label_x}, {label_y})")
                    
                    # Find text on the same line (within 10px vertical) and to the right of the label
                    same_line_text = df[
                        (df['top'] >= label_y - 10) &
                        (df['top'] <= label_y + 10) &
                        (df['left'] >= label_x + label_w - 5)  # To the right of label (allow small overlap)
                    ].sort_values('left')
                    
                    logger.info(f"Found {len(same_line_text)} text elements on same line after label")
                    
                    if not same_line_text.empty:
                        # Get the first text element after the label (invoice number)
                        invoice_num_text = same_line_text.iloc[0]['text'].strip()
                        logger.info(f"Raw invoice number text before cleaning: '{invoice_num_text}'")
                        
                        # Remove any colons, spaces, or the label itself
                        invoice_num_text = re.sub(r'^INVOICE\s*#\s*:?\s*', '', invoice_num_text, flags=re.IGNORECASE)
                        invoice_num_text = invoice_num_text.lstrip(':').strip()
                        
                        if invoice_num_text and len(invoice_num_text) > 0:
                            meta['invoice_number'] = invoice_num_text
                            logger.info(f"✓ Extracted INVOICE_NUMBER: '{invoice_num_text}'")
                            break
        
        # If not found with layout, try the label-based approach
        if not meta['invoice_number']:
            invoice_num = OCRService._find_text_near_label(df, 'Invoice #', image_width, image_height, 'right')
            if invoice_num:
                meta['invoice_number'] = invoice_num.strip().lstrip(':').strip()
        
        # Find Date label
        date_value = OCRService._find_text_near_label(df, 'Date', image_width, image_height, 'right')
        if date_value:
            meta['invoice_date'] = OCRService._parse_date(date_value)
        
        # Find Due Date label
        due_date_value = OCRService._find_text_near_label(df, 'Due Date', image_width, image_height, 'right')
        if due_date_value:
            meta['due_date'] = OCRService._parse_date(due_date_value)
        
        return meta

    @staticmethod
    def _extract_items_table(df, image_width: int, image_height: int) -> List[Dict[str, Any]]:
        """
        Extract items from table section
        Headers: Item Description, Qty, Unit Price, Total
        """
        items = []
        
        if df is None or df.empty:
            return items
        
        # Find table headers
        headers = ['Item Description', 'Qty', 'Unit Price', 'Total']
        header_positions = {}
        
        for header in headers:
            header_rows = df[df['text'].astype(str).str.upper().str.contains(header.upper(), na=False, regex=False)]
            if not header_rows.empty:
                header_positions[header] = {
                    'left': header_rows.iloc[0]['left'],
                    'top': header_rows.iloc[0]['top'],
                    'width': header_rows.iloc[0]['width']
                }
        
        if not header_positions:
            # Fallback: try alternative header names
            alt_headers = {
                'Item Description': ['DESCRIPTION', 'ITEM', 'ITEM DESCRIPTION'],
                'Qty': ['QTY', 'QUANTITY', 'QTY.'],
                'Unit Price': ['UNIT PRICE', 'PRICE', 'RATE', 'UNIT'],
                'Total': ['TOTAL', 'AMOUNT', 'TOTAL PRICE']
            }
            
            for orig_header, alt_list in alt_headers.items():
                for alt in alt_list:
                    header_rows = df[df['text'].astype(str).str.upper().str.contains(alt, na=False, regex=False)]
                    if not header_rows.empty:
                        header_positions[orig_header] = {
                            'left': header_rows.iloc[0]['left'],
                            'top': header_rows.iloc[0]['top'],
                            'width': header_rows.iloc[0]['width']
                        }
                        break
        
        if not header_positions:
            logger.warning("Could not find items table headers")
            return items
        
        # Find the topmost header to determine table start
        table_start_y = min([pos['top'] for pos in header_positions.values()])
        
        # Define bottom threshold to exclude summary section (Subtotal, Tax, Total)
        # Summary section is typically in bottom 30% of image
        bottom_threshold = image_height * 0.7
        
        # Get all text below the headers but above summary section
        table_text = df[
            (df['top'] > table_start_y + 20) &  # 20px below headers
            (df['top'] < bottom_threshold)  # Above summary section
        ].copy()
        
        # Group rows by vertical position
        rows = []
        current_row = []
        last_top = None
        
        for _, row in table_text.iterrows():
            if last_top is None or abs(row['top'] - last_top) < 15:  # Same row
                current_row.append(row)
            else:
                if current_row:
                    rows.append(current_row)
                current_row = [row]
            last_top = row['top']
        
        if current_row:
            rows.append(current_row)
        
        # Extract items from rows
        for row_data in rows:
            item = {
                'description': '',
                'quantity': None,
                'unitPrice': None,
                'totalPrice': None
            }
            
            # Sort row data by left position (left to right)
            row_data_sorted = sorted(row_data, key=lambda x: x['left'])
            
            # Extract description (leftmost text)
            # Exclude summary labels: Subtotal, Tax, VAT, Total, etc.
            summary_keywords = ['SUBTOTAL', 'TAX', 'VAT', 'TOTAL', 'DISCOUNT', 'AMOUNT DUE', 'GRAND TOTAL']
            description_parts = []
            numeric_found = False
            
            for cell in row_data_sorted:
                text = cell['text'].strip()
                text_upper = text.upper()
                
                # Skip summary section labels
                if any(keyword in text_upper for keyword in summary_keywords):
                    break
                
                # Check if it's numeric
                if re.match(r'^[\d,]+\.?\d*$', text):
                    numeric_found = True
                    break
                description_parts.append(text)
            
            if description_parts:
                item['description'] = ' '.join(description_parts).strip()
            
            # Extract numeric values (Qty, Unit Price, Total)
            numeric_values = []
            for cell in row_data_sorted:
                text = cell['text'].strip()
                # Try to parse as number
                try:
                    # Remove currency symbols and commas
                    clean_text = re.sub(r'[^\d.]', '', text.replace(',', ''))
                    if clean_text:
                        num_value = float(clean_text)
                        numeric_values.append(num_value)
                except:
                    pass
            
            # Map numeric values: typically [qty, unit_price, total] or [unit_price, total]
            if len(numeric_values) >= 3:
                item['quantity'] = numeric_values[0]
                item['unitPrice'] = numeric_values[1]
                item['totalPrice'] = numeric_values[2]
            elif len(numeric_values) == 2:
                # Assume: unit_price, total
                item['unitPrice'] = numeric_values[0]
                item['totalPrice'] = numeric_values[1]
                item['quantity'] = 1.0
            elif len(numeric_values) == 1:
                item['totalPrice'] = numeric_values[0]
            
            # Filter out rows that are clearly summary section (not items)
            description_upper = item['description'].upper() if item['description'] else ''
            is_summary_row = any(keyword in description_upper for keyword in [
                'SUBTOTAL', 'TAX', 'VAT', 'TOTAL', 'DISCOUNT', 'AMOUNT DUE', 
                'GRAND TOTAL', 'BALANCE DUE', 'PAYMENT DUE'
            ])
            
            # Only add item if it's not a summary row and has at least description or a price
            if not is_summary_row and (item['description'] or item['totalPrice'] is not None):
                items.append(item)
        
        return items

    @staticmethod
    def _extract_summary_section(df, image_width: int, image_height: int) -> Dict[str, Optional[float]]:
        """
        Extract summary section from bottom right (Subtotal, Tax/VAT, Total)
        """
        summary = {
            'subtotal': None,
            'taxAmount': None,
            'total': None
        }
        
        if df is None or df.empty:
            return summary
        
        # Define bottom right region
        right_threshold = image_width * 0.5
        bottom_threshold = image_height * 0.6
        
        # Find summary labels in bottom right
        summary_text = df[
            (df['left'] >= right_threshold) &
            (df['top'] >= bottom_threshold)
        ]
        
        # Extract Subtotal
        subtotal_value = OCRService._find_text_near_label(summary_text, 'Subtotal', image_width, image_height, 'right')
        if subtotal_value:
            try:
                clean_value = re.sub(r'[^\d.]', '', subtotal_value.replace(',', ''))
                if clean_value:
                    summary['subtotal'] = float(clean_value)
            except:
                pass
        
        # Extract Tax/VAT (both map to taxAmount)
        tax_value = OCRService._find_text_near_label(summary_text, 'Tax', image_width, image_height, 'right')
        if not tax_value:
            tax_value = OCRService._find_text_near_label(summary_text, 'VAT', image_width, image_height, 'right')
        
        if tax_value:
            try:
                # Handle cases like "Tax (10%)" - extract just the number
                clean_value = re.sub(r'[^\d.]', '', tax_value.replace(',', ''))
                if clean_value:
                    summary['taxAmount'] = float(clean_value)
            except:
                pass
        
        # Extract Total
        total_value = OCRService._find_text_near_label(summary_text, 'TOTAL', image_width, image_height, 'right')
        if total_value:
            try:
                clean_value = re.sub(r'[^\d.]', '', total_value.replace(',', ''))
                if clean_value:
                    summary['total'] = float(clean_value)
            except:
                pass
        
        return summary

    @staticmethod
    def extract_structured_data(raw_text: str, image: Optional[Image.Image] = None) -> Dict[str, Any]:
        """
        Extract structured fields from raw OCR text using layout-based extraction
        """
        extracted = {
            "vendor": None,
            "vendor_address": None,
            "vendor_email": None,
            "vendor_phone": None,
            "invoice_number": None,
            "invoice_date": None,
            "due_date": None,
            "bill_to_name": None,
            "bill_to_address": None,
            "items": [],
            "subtotal": None,
            "taxAmount": None,
            "total": None,
            "currency": "USD",
        }
        
        if not raw_text and not image:
            return extracted
        
        # If image is provided, use layout-based extraction
        if image and PANDAS_AVAILABLE:
            try:
                df = OCRService._get_text_with_positions(image)
                if df is not None and not df.empty:
                    image_width = image.width
                    image_height = image.height
                    
                    # Extract invoice meta FIRST (to avoid conflicts)
                    invoice_meta = OCRService._extract_invoice_meta(df, image_width, image_height)
                    extracted.update(invoice_meta)
                    logger.info(f"Extracted invoice meta: invoice_number={invoice_meta.get('invoice_number')}, date={invoice_meta.get('invoice_date')}, due_date={invoice_meta.get('due_date')}")
                    
                    # Extract vendor info from top right (strict order: Name, Address, Email, Phone)
                    vendor_info = OCRService._extract_vendor_info_top_right(df, image_width, image_height)
                    extracted.update(vendor_info)
                    logger.info(f"Extracted vendor info: vendor={vendor_info.get('vendor')}, address={vendor_info.get('vendor_address')}, email={vendor_info.get('vendor_email')}, phone={vendor_info.get('vendor_phone')}")
                    
                    # Extract bill to info from left side
                    bill_to_info = OCRService._extract_bill_to_info(df, image_width, image_height)
                    extracted.update(bill_to_info)
                    
                    # Extract items table
                    items = OCRService._extract_items_table(df, image_width, image_height)
                    extracted['items'] = items
                    
                    # Extract summary section
                    summary = OCRService._extract_summary_section(df, image_width, image_height)
                    extracted.update(summary)
                    
                    logger.info("Layout-based extraction completed")
                    return extracted
            except Exception as e:
                logger.error(f"Error in layout-based extraction: {str(e)}")
                # Fall back to text-based extraction
        
        # Fallback to text-based extraction if layout-based fails
        if not raw_text:
            return extracted

        text_lines = raw_text.split('\n')
        text_upper = raw_text.upper()

        # Extract invoice number - look for "Invoice #:" and get value on same line
        # Pattern: "Invoice #:" followed immediately by the number on same line
        invoice_patterns = [
            r'INVOICE\s*#\s*:?\s*([A-Z0-9\-]+)',  # Invoice #: INV-123
            r'INVOICE\s*#\s*:?\s*([A-Z0-9\-]+)',  # Invoice # INV-123
            r'INV\s*#\s*:?\s*([A-Z0-9\-]+)',      # INV #: INV-123
            r'INVOICE\s+NUMBER\s*:?\s*([A-Z0-9\-]+)',  # Invoice Number: INV-123
        ]
        for pattern in invoice_patterns:
            match = re.search(pattern, text_upper)
            if match:
                extracted["invoice_number"] = match.group(1).strip()
                break

        # Also try to find on same line by looking for "Invoice #" and text after it
        for line in text_lines:
            line_upper = line.upper()
            if 'INVOICE' in line_upper and '#' in line_upper:
                # Try to extract number after "Invoice #:" or "Invoice #"
                match = re.search(r'INVOICE\s*#\s*:?\s*([A-Z0-9\-]+)', line_upper)
                if match:
                    extracted["invoice_number"] = match.group(1).strip()
                    break
        
        # Extract dates
        date_match = re.search(r'DATE\s*:?\s*([\d/\-]+)', text_upper)
        if date_match:
            extracted['invoice_date'] = OCRService._parse_date(date_match.group(1))
        
        due_date_match = re.search(r'DUE\s+DATE\s*:?\s*([\d/\-]+)', text_upper)
        if due_date_match:
            extracted['due_date'] = OCRService._parse_date(due_date_match.group(1))
        
        # Extract totals
        total_match = re.search(r'TOTAL\s*:?\s*\$?\s*([\d,]+\.?\d*)', text_upper)
        if total_match:
            try:
                extracted['total'] = float(total_match.group(1).replace(',', ''))
            except Exception:
                pass

        subtotal_match = re.search(r'SUBTOTAL\s*:?\s*\$?\s*([\d,]+\.?\d*)', text_upper)
        if subtotal_match:
            try:
                extracted['subtotal'] = float(subtotal_match.group(1).replace(',', ''))
            except Exception:
                pass

        # Extract Tax/VAT (both map to taxAmount)
        tax_match = re.search(r'(TAX|VAT)\s*\(?\d*%?\)?\s*:?\s*\$?\s*([\d,]+\.?\d*)', text_upper)
        if tax_match:
            try:
                extracted['taxAmount'] = float(tax_match.group(2).replace(',', ''))
            except Exception:
                pass

        # Extract vendor info (simple fallback) - follow strict order
        # Line 1: Vendor, Line 2: Address, Line 3: Email
        vendor_name_found = False
        address_found = False
        email_found = False

        # Collect first few non-keyword lines
        candidate_lines: list[str] = []
        for ln in text_lines[:10]:
            ln_strip = ln.strip()
            if len(ln_strip) > 2 and not re.search(r'INVOICE|TOTAL|DATE|AMOUNT|TO|FROM|BILL', ln_strip.upper()):
                candidate_lines.append(ln_strip)
                if len(candidate_lines) >= 3:
                    break

        # Apply same vendor/address heuristic as layout-based extraction
        if len(candidate_lines) >= 2:
            first = candidate_lines[0]
            second = candidate_lines[1]
            first_has_digit = bool(re.search(r'\d', first))
            second_has_digit = bool(re.search(r'\d', second))

            if first_has_digit and not second_has_digit:
                # Swap so that vendor is text-like, address is digit-containing line
                candidate_lines[0], candidate_lines[1] = candidate_lines[1], candidate_lines[0]

        if candidate_lines:
            extracted['vendor'] = candidate_lines[0]
            vendor_name_found = True
        if len(candidate_lines) > 1:
            extracted['vendor_address'] = candidate_lines[1]
            address_found = True
        if len(candidate_lines) > 2:
            extracted['vendor_email'] = candidate_lines[2]
            email_found = True

        # Extract email (fallback - only if not already found from line order)
        if not extracted['vendor_email']:
            email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", raw_text)
            if email_match:
                extracted['vendor_email'] = email_match.group(0)
        
        # Extract phone - preserve + sign and normalize leading '9' → '+' if needed
        phone_match = re.search(r"\+?[\d\s().-]{7,}\d", raw_text)
        if phone_match:
            phone_text = phone_match.group(0).strip()
            # Normalize leading '+' that OCR might misrecognize as '9'
            if phone_text.startswith('9') and not phone_text.startswith('+'):
                extracted['vendor_phone'] = '+' + re.sub(r'[^\d]', '', phone_text[1:])
            elif phone_text.startswith('+'):
                extracted['vendor_phone'] = '+' + re.sub(r'[^\d]', '', phone_text[1:])
            else:
                # Check if there's a + nearby (within 3 characters before)
                start_pos = phone_match.start()
                if start_pos > 0:
                    before_text = raw_text[max(0, start_pos-3):start_pos]
                    if '+' in before_text:
                        extracted['vendor_phone'] = '+' + re.sub(r'[^\d]', '', phone_text)
                    else:\n                        extracted['vendor_phone'] = phone_text
                else:
                    extracted['vendor_phone'] = phone_text
        
        # Extract items (simple fallback)
        items = []
        in_items = False
        summary_keywords = ['SUBTOTAL', 'TAX', 'VAT', 'TOTAL', 'DISCOUNT', 'AMOUNT DUE', 'GRAND TOTAL']
        
        for line in text_lines:
            up = line.upper()
            # Check if we've reached summary section
            if any(keyword in up for keyword in summary_keywords):
                in_items = False  # Stop extracting items when we hit summary
                continue
                
            if 'DESCRIPTION' in up and ('QTY' in up or 'UNIT PRICE' in up):
                in_items = True
                continue
            if in_items and line.strip():
                amounts = re.findall(r"[\d,]+\.?\d*", line)
                desc = re.split(r"[\d,]+\.?\d*", line)[0].strip()
                
                # Skip if description contains summary keywords
                if any(keyword in desc.upper() for keyword in summary_keywords):
                    continue
                
                item = {
                    'description': desc,
                    'quantity': None,
                    'unitPrice': None,
                    'totalPrice': None
                }
                
                try:
                    if len(amounts) >= 3:
                        item['quantity'] = float(amounts[0].replace(',', ''))
                        item['unitPrice'] = float(amounts[1].replace(',', ''))
                        item['totalPrice'] = float(amounts[2].replace(',', ''))
                    elif len(amounts) >= 2:
                        item['unitPrice'] = float(amounts[0].replace(',', ''))
                        item['totalPrice'] = float(amounts[1].replace(',', ''))
                        item['quantity'] = 1.0
                    elif len(amounts) >= 1:
                        item['totalPrice'] = float(amounts[0].replace(',', ''))
                except Exception:
                    pass
                
                if item['description'] or item['totalPrice'] is not None:
                    items.append(item)

        extracted['items'] = items
        
        return extracted

    @staticmethod
    def _parse_date(date_str: str) -> Optional[str]:
        """Parse date string to ISO format"""
        if not date_str:
            return None
        
        date_str = date_str.strip()
        candidates = ['%m/%d/%Y', '%m/%d/%y', '%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d', '%m-%d-%Y', '%d-%m-%Y']
        for fmt in candidates:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.date().isoformat()
            except Exception:
                continue
        
        # Try to extract digits and guess format
        digits = re.findall(r"\d+", date_str)
        if len(digits) >= 3:
            try:
                parts = list(map(int, digits[:3]))
                if parts[0] > 31:
                    year = parts[0]
                    month = parts[1] if len(parts) > 1 else 1
                    day = parts[2] if len(parts) > 2 else 1
                else:
                    month = parts[0]
                    day = parts[1] if len(parts) > 1 else 1
                    year = parts[2] if len(parts) > 2 else datetime.now().year
                
                # Normalize year
                if year < 100:
                    year += 2000 if year < 50 else 1900
                
                return datetime(year, month, day).date().isoformat()
            except Exception:
                pass
        
        return None
