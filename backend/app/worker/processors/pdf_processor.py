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

    @staticmethod
    def _merge_text_blocks(*blocks: str) -> str:
        unique_blocks = []
        seen = set()

        for block in blocks:
            normalized = (block or "").strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            unique_blocks.append(normalized)

        return "\n\n".join(unique_blocks).strip()
    
    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Parse PDF file content."""
        ocr_result = {
            "text": "",
            "available": False,
            "engine": None,
            "average_confidence": None,
            "pages_processed": 0,
        }
        text_layer_result = {
            "text": "",
            "available": False,
            "engine": None,
            "pages_processed": 0,
        }

        try:
            from pypdf import PdfReader
            
            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            page_count = len(reader.pages)
            
            # Extract text from all pages
            text_parts = []
            for page in reader.pages:
                try:
                    page_text = page.extract_text()
                except Exception:
                    page_text = ""
                if page_text:
                    text_parts.append(page_text.strip())
            
            raw_text = self._merge_text_blocks(*text_parts)
            
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

            text_layer_result = ocr_service.extract_text_layer_from_pdf(content, max_pages=min(page_count or 6, 6))
            raw_text = self._merge_text_blocks(raw_text, text_layer_result["text"])

            if len(raw_text.split()) < 40:
                ocr_result = ocr_service.extract_text_from_pdf(
                    content,
                    max_pages=5 if page_count <= 10 else 3,
                )
                raw_text = self._merge_text_blocks(raw_text, ocr_result["text"])

            text_sources = []
            if text_parts:
                text_sources.append("pypdf")
            if text_layer_result["text"]:
                text_sources.append("pymupdf")
            if ocr_result["text"]:
                text_sources.append("ocr")
            
            return {
                "raw_text": raw_text,
                "page_count": page_count,
                "pdf_metadata": pdf_metadata,
                "has_content": bool(raw_text.strip()),
                "ocr_used": bool(ocr_result["text"]),
                "ocr_engine": ocr_result["engine"],
                "ocr_confidence": ocr_result["average_confidence"],
                "ocr_pages_processed": ocr_result["pages_processed"],
                "text_layer_used": bool(text_layer_result["text"]),
                "text_layer_pages_processed": text_layer_result["pages_processed"],
                "text_sources": text_sources,
            }
            
        except Exception as e:
            text_layer_result = ocr_service.extract_text_layer_from_pdf(content, max_pages=4)
            ocr_result = ocr_service.extract_text_from_pdf(content)
            raw_text = self._merge_text_blocks(text_layer_result["text"], ocr_result["text"])
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
                "text_layer_used": bool(text_layer_result["text"]),
                "text_layer_pages_processed": text_layer_result["pages_processed"],
                "text_sources": [source for source, present in [("pymupdf", bool(text_layer_result["text"])), ("ocr", bool(ocr_result["text"]))] if present],
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
            "text_layer_used": parsed_data.get("text_layer_used", False),
            "text_layer_pages_processed": parsed_data.get("text_layer_pages_processed", 0),
            "text_sources": parsed_data.get("text_sources", []),
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
