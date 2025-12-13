"""
Invoice database model
"""
from sqlalchemy import Column, String, Float, DateTime, Integer, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database.connection import Base


class Invoice(Base):
    __tablename__ = "invoices"

    # Use string-based UUIDs to remain compatible with SQLite and other DBs
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    invoice_number = Column(String(100), nullable=True, index=True)
    vendor = Column(String(255), nullable=True)
    vendor_address = Column(Text, nullable=True)
    vendor_email = Column(String(255), nullable=True)
    vendor_phone = Column(String(50), nullable=True)
    invoice_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    purchase_order = Column(String(100), nullable=True)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), default="USD")
    status = Column(String(50), default="Pending Review", index=True)
    raw_text = Column(Text, nullable=True)
    extracted_fields = Column(JSON, nullable=True)  # Store structured extracted data
    line_items = Column(JSON, nullable=True)  # Store line items as JSON
    image_path = Column(String(500), nullable=True)  # Path to uploaded image
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "invoice_number": self.invoice_number,
            "vendor": self.vendor,
            "vendor_address": self.vendor_address,
            "vendor_email": self.vendor_email,
            "vendor_phone": self.vendor_phone,
            "invoice_date": self.invoice_date.isoformat() if self.invoice_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "purchase_order": self.purchase_order,
            "subtotal": self.subtotal,
            "tax": self.tax,
            "discount": self.discount,
            "total": self.total,
            "currency": self.currency,
            "status": self.status,
            "raw_text": self.raw_text,
            "extracted_fields": self.extracted_fields,
            "line_items": self.line_items,
            "image_path": self.image_path,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

