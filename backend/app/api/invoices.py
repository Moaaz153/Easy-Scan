"""
Invoice API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from datetime import datetime, timedelta
from sqlalchemy import func, extract
import uuid
import os

from app.database.connection import get_db
from app.models.invoice import Invoice
from app.models.user import User
from app.services.data_extractor import DataExtractor
from app.core.dependencies import get_current_active_user
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


# Pydantic models for request/response
class InvoiceCreate(BaseModel):
    invoice_number: Optional[str] = None
    vendor: Optional[str] = None
    vendor_address: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_phone: Optional[str] = None
    bill_to_name: Optional[str] = None
    bill_to_address: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    purchase_order: Optional[str] = None
    subtotal: Optional[float] = 0.0
    tax: Optional[float] = 0.0
    tax_amount: Optional[float] = None  # New field from OCR
    discount: Optional[float] = 0.0
    total: float = 0.0
    currency: Optional[str] = "USD"
    status: Optional[str] = "Pending Review"
    raw_text: Optional[str] = None
    extracted_fields: Optional[dict] = None
    line_items: Optional[List[dict]] = None
    image_path: Optional[str] = None


class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    vendor: Optional[str] = None
    vendor_address: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_phone: Optional[str] = None
    bill_to_name: Optional[str] = None
    bill_to_address: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    purchase_order: Optional[str] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    tax_amount: Optional[float] = None
    discount: Optional[float] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    line_items: Optional[List[dict]] = None


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: Optional[str]
    vendor: Optional[str]
    vendor_address: Optional[str]
    vendor_email: Optional[str]
    vendor_phone: Optional[str]
    bill_to_name: Optional[str]
    bill_to_address: Optional[str]
    invoice_date: Optional[str]
    due_date: Optional[str]
    purchase_order: Optional[str]
    subtotal: float
    tax: float
    tax_amount: Optional[float] = None
    discount: float
    total: float
    currency: str
    status: str
    raw_text: Optional[str]
    extracted_fields: Optional[dict]
    line_items: Optional[List[dict]]
    image_path: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


@router.post("", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new invoice in the database
    """
    try:
        # Parse dates if provided
        invoice_date = None
        due_date = None
        
        if invoice_data.invoice_date:
            try:
                invoice_date = datetime.fromisoformat(invoice_data.invoice_date.replace('Z', '+00:00'))
            except:
                pass
        
        if invoice_data.due_date:
            try:
                due_date = datetime.fromisoformat(invoice_data.due_date.replace('Z', '+00:00'))
            except:
                pass

        # Create invoice object
        db_invoice = Invoice(
            user_id=current_user.id,
            invoice_number=invoice_data.invoice_number,
            vendor=invoice_data.vendor,
            vendor_address=invoice_data.vendor_address,
            vendor_email=invoice_data.vendor_email,
            vendor_phone=invoice_data.vendor_phone,
            bill_to_name=invoice_data.bill_to_name,
            bill_to_address=invoice_data.bill_to_address,
            invoice_date=invoice_date,
            due_date=due_date,
            purchase_order=invoice_data.purchase_order,
            subtotal=invoice_data.subtotal or 0.0,
            tax=invoice_data.tax_amount if invoice_data.tax_amount is not None else (invoice_data.tax or 0.0),
            tax_amount=invoice_data.tax_amount if invoice_data.tax_amount is not None else (invoice_data.tax or 0.0),
            discount=invoice_data.discount or 0.0,
            total=invoice_data.total,
            currency=invoice_data.currency or "USD",
            status=invoice_data.status or "Pending Review",
            raw_text=invoice_data.raw_text,
            extracted_fields=invoice_data.extracted_fields,
            line_items=invoice_data.line_items,
            image_path=invoice_data.image_path,  # Save the image path
        )

        db.add(db_invoice)
        db.commit()
        db.refresh(db_invoice)

        logger.info(f"Created invoice: {db_invoice.id}")

        return InvoiceResponse(**db_invoice.to_dict())

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating invoice: {str(e)}"
        )


@router.get("", response_model=List[InvoiceResponse])
async def get_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of invoices with pagination and filtering
    """
    try:
        # Filter by current user
        query = db.query(Invoice).filter(Invoice.user_id == current_user.id)

        # Filter by status if provided
        if status:
            query = query.filter(Invoice.status == status)

        # Search in invoice number or vendor
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Invoice.invoice_number.ilike(search_filter)) |
                (Invoice.vendor.ilike(search_filter))
            )

        # Order by created_at descending
        query = query.order_by(Invoice.created_at.desc())

        # Apply pagination
        invoices = query.offset(skip).limit(limit).all()

        return [InvoiceResponse(**invoice.to_dict()) for invoice in invoices]

    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching invoices: {str(e)}"
        )


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics for the current user
    Returns: total invoices, pending review count, this month count, total amount
    """
    try:
        # Base query for current user
        base_query = db.query(Invoice).filter(Invoice.user_id == current_user.id)
        
        # Total invoices count
        total_invoices = base_query.count()
        
        # Pending review count
        pending_count = base_query.filter(Invoice.status == "Pending Review").count()
        
        # This month's invoices (current month)
        now = datetime.now()
        start_of_month = datetime(now.year, now.month, 1)
        this_month_count = base_query.filter(Invoice.created_at >= start_of_month).count()
        
        # Total amount for current month
        this_month_total = db.query(func.sum(Invoice.total)).filter(
            Invoice.user_id == current_user.id,
            Invoice.created_at >= start_of_month
        ).scalar() or 0.0
        
        # Calculate percentage change from last month
        last_month_start = (start_of_month - timedelta(days=32)).replace(day=1)
        last_month_end = start_of_month - timedelta(days=1)
        last_month_count = base_query.filter(
            Invoice.created_at >= last_month_start,
            Invoice.created_at <= last_month_end
        ).count()
        
        month_change = 0
        if last_month_count > 0:
            month_change = round(((this_month_count - last_month_count) / last_month_count) * 100, 1)
        
        return {
            "total_invoices": total_invoices,
            "pending_review": pending_count,
            "this_month_count": this_month_count,
            "this_month_total": float(this_month_total),
            "month_change_percent": month_change
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching dashboard statistics: {str(e)}"
        )


@router.get("/dashboard/charts")
async def get_dashboard_charts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get chart data for dashboard (monthly volume and spend trend for last 12 months)
    """
    try:
        # Get data for last 12 months
        now = datetime.now()
        chart_data = []
        
        for i in range(11, -1, -1):  # Last 12 months (11 months ago to current month)
            month_date = (now - timedelta(days=30*i)).replace(day=1)
            next_month = (month_date + timedelta(days=32)).replace(day=1)
            
            month_name = month_date.strftime('%b')
            
            # Count invoices for this month
            invoice_count = db.query(func.count(Invoice.id)).filter(
                Invoice.user_id == current_user.id,
                Invoice.created_at >= month_date,
                Invoice.created_at < next_month
            ).scalar() or 0
            
            # Sum total amount for this month
            total_amount = db.query(func.sum(Invoice.total)).filter(
                Invoice.user_id == current_user.id,
                Invoice.created_at >= month_date,
                Invoice.created_at < next_month
            ).scalar() or 0.0
            
            chart_data.append({
                "month": month_name,
                "volume": invoice_count,
                "amount": float(total_amount) / 1000.0  # Convert to thousands for display
            })
        
        return {
            "monthly_volume": chart_data,
            "monthly_spend": chart_data
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard charts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching dashboard charts: {str(e)}"
        )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a single invoice by ID
    """
    try:
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=404,
                detail=f"Invoice with id {invoice_id} not found"
            )

        return InvoiceResponse(**invoice.to_dict())

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid invoice ID format"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invoice: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching invoice: {str(e)}"
        )


@router.get("/{invoice_id}/image")
async def get_invoice_image(
    invoice_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get invoice image file
    """
    try:
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=404,
                detail=f"Invoice with id {invoice_id} not found"
            )
        
        if not invoice.image_path:
            raise HTTPException(
                status_code=404,
                detail="Invoice image not found"
            )
        
        # Check if file exists
        if not os.path.exists(invoice.image_path):
            logger.warning(f"Image file not found at path: {invoice.image_path}")
            raise HTTPException(
                status_code=404,
                detail="Invoice image file not found"
            )
        
        # Determine media type
        image_path_lower = invoice.image_path.lower()
        if image_path_lower.endswith(('.jpg', '.jpeg')):
            media_type = "image/jpeg"
        elif image_path_lower.endswith('.png'):
            media_type = "image/png"
        elif image_path_lower.endswith('.pdf'):
            media_type = "application/pdf"
        else:
            media_type = "image/jpeg"  # default
        
        return FileResponse(
            invoice.image_path,
            media_type=media_type,
            filename=os.path.basename(invoice.image_path)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invoice image: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching invoice image: {str(e)}"
        )


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing invoice
    """
    try:
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=404,
                detail=f"Invoice with id {invoice_id} not found"
            )

        # Update fields
        update_data = invoice_data.dict(exclude_unset=True)
        
        # Convert empty strings to None for all fields
        for key, value in list(update_data.items()):
            if value == '' or value is None:
                update_data[key] = None
        
        # Handle tax_amount - map to both tax and tax_amount for backward compatibility
        if 'tax_amount' in update_data:
            if update_data['tax_amount'] is not None:
                update_data['tax'] = update_data['tax_amount']
            else:
                update_data['tax'] = None
        
        # Handle date fields - convert string to datetime or None
        if 'invoice_date' in update_data:
            if update_data['invoice_date']:
                try:
                    # Try to parse the date string
                    date_str = update_data['invoice_date'].replace('Z', '+00:00')
                    update_data['invoice_date'] = datetime.fromisoformat(date_str)
                except (ValueError, AttributeError, TypeError):
                    # If parsing fails, set to None
                    update_data['invoice_date'] = None
            else:
                # Empty string or None - set to None
                update_data['invoice_date'] = None
        
        if 'due_date' in update_data:
            if update_data['due_date']:
                try:
                    # Try to parse the date string
                    date_str = update_data['due_date'].replace('Z', '+00:00')
                    update_data['due_date'] = datetime.fromisoformat(date_str)
                except (ValueError, AttributeError, TypeError):
                    # If parsing fails, set to None
                    update_data['due_date'] = None
            else:
                # Empty string or None - set to None
                update_data['due_date'] = None

        # Update all fields - None is valid for nullable fields
        for key, value in update_data.items():
            setattr(invoice, key, value)

        db.commit()
        db.refresh(invoice)

        logger.info(f"Updated invoice: {invoice_id}")

        return InvoiceResponse(**invoice.to_dict())

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid invoice ID format"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating invoice: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating invoice: {str(e)}"
        )


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete an invoice
    """
    try:
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=404,
                detail=f"Invoice with id {invoice_id} not found"
            )

        # Delete associated image if exists
        if invoice.image_path and os.path.exists(invoice.image_path):
            try:
                os.remove(invoice.image_path)
            except:
                pass

        db.delete(invoice)
        db.commit()

        logger.info(f"Deleted invoice: {invoice_id}")

        return None

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid invoice ID format"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting invoice: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting invoice: {str(e)}"
        )

