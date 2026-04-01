"""
PDF Processor - Handle PDF files
"""
from typing import Dict, Any
import io

from app.worker.processors.base import BaseProcessor
from app.models.document import Document
from app.services.ocr_service import ocr_service


class PDFProcessor(BaseProcessor):
    """Processor for PDF files."""
    
    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Parse PDF file content."""
        ocr_result = {
            "text": "",
            "available": False,
            "engine": None,
            "average_confidence": None,
            "pages_processed": 0,
        }

        try:
            from pypdf import PdfReader
            
            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            
            # Extract text from all pages
            text_parts = []
            for page in reader.pages:
                try:
                    page_text = page.extract_text()
                except Exception:
                    page_text = ""
                if page_text:
                    text_parts.append(page_text.strip())
            
            raw_text = "\n\n".join(part for part in text_parts if part)
            
            # Get metadata
            pdf_metadata = {}
            if reader.metadata:
                pdf_metadata = {
                    "title": str(reader.metadata.get("/Title")) if reader.metadata.get("/Title") else None,
                    "author": str(reader.metadata.get("/Author")) if reader.metadata.get("/Author") else None,
                    "subject": str(reader.metadata.get("/Subject")) if reader.metadata.get("/Subject") else None,
                    "creator": str(reader.metadata.get("/Creator")) if reader.metadata.get("/Creator") else None,
                    "producer": str(reader.metadata.get("/Producer")) if reader.metadata.get("/Producer") else None,
                }
                # Clean None values
                pdf_metadata = {k: v for k, v in pdf_metadata.items() if v}

            if len(raw_text.split()) < 30:
                ocr_result = ocr_service.extract_text_from_pdf(content)
                if ocr_result["text"]:
                    raw_text = "\n\n".join(
                        part
                        for part in [raw_text.strip(), "[OCR Fallback]", ocr_result["text"].strip()]
                        if part
                    )
            
            return {
                "raw_text": raw_text,
                "page_count": len(reader.pages),
                "pdf_metadata": pdf_metadata,
                "has_content": bool(raw_text.strip()),
                "ocr_used": bool(ocr_result["text"]),
                "ocr_engine": ocr_result["engine"],
                "ocr_confidence": ocr_result["average_confidence"],
                "ocr_pages_processed": ocr_result["pages_processed"],
            }
            
        except Exception as e:
            ocr_result = ocr_service.extract_text_from_pdf(content)
            raw_text = ocr_result["text"] or f"[PDF parsing failed: {str(e)}]"
            # If PDF parsing fails, return empty result
            return {
                "raw_text": raw_text,
                "page_count": 0,
                "pdf_metadata": {},
                "has_content": bool(raw_text.strip()),
                "error": str(e),
                "ocr_used": bool(ocr_result["text"]),
                "ocr_engine": ocr_result["engine"],
                "ocr_confidence": ocr_result["average_confidence"],
                "ocr_pages_processed": ocr_result["pages_processed"],
            }
    
    def extract(self, parsed_data: Dict[str, Any], document: Document) -> Dict[str, Any]:
        """Extract structured data from PDF content."""
        raw_text = parsed_data.get("raw_text", "")
        pdf_metadata = parsed_data.get("pdf_metadata", {})
        
        # Use PDF metadata for title if available
        title = pdf_metadata.get("title") or self._extract_title(raw_text, document.original_filename)
        
        category = self._categorize(raw_text, document.original_filename)
        keywords = self._extract_keywords(raw_text)
        summary = self._generate_summary(raw_text)
        
        metadata = {
            "file_type": document.file_type,
            "file_size": document.file_size,
            "page_count": parsed_data.get("page_count", 0),
            "has_content": parsed_data.get("has_content", False),
            "word_count": len(raw_text.split()) if raw_text else 0,
            "pdf_author": pdf_metadata.get("author"),
            "pdf_creator": pdf_metadata.get("creator"),
            "ocr_used": parsed_data.get("ocr_used", False),
            "ocr_engine": parsed_data.get("ocr_engine"),
            "ocr_confidence": parsed_data.get("ocr_confidence"),
            "ocr_pages_processed": parsed_data.get("ocr_pages_processed", 0),
        }
        
        return {
            "title": title,
            "category": category,
            "summary": summary,
            "keywords": keywords,
            "metadata": metadata,
            "raw_text": raw_text,
            "structured_data": {
                "type": "pdf",
                "pages": parsed_data.get("page_count", 0),
                "pdf_metadata": pdf_metadata
            }
        }
