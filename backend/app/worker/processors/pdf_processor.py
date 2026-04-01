"""
PDF Processor - Handle PDF files
"""
from typing import Dict, Any
import io

from app.worker.processors.base import BaseProcessor
from app.models.document import Document


class PDFProcessor(BaseProcessor):
    """Processor for PDF files."""
    
    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Parse PDF file content."""
        try:
            from pypdf import PdfReader
            
            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            
            # Extract text from all pages
            text_parts = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            
            raw_text = "\n\n".join(text_parts)
            
            # Get metadata
            pdf_metadata = {}
            if reader.metadata:
                pdf_metadata = {
                    "title": reader.metadata.get("/Title"),
                    "author": reader.metadata.get("/Author"),
                    "subject": reader.metadata.get("/Subject"),
                    "creator": reader.metadata.get("/Creator"),
                    "producer": reader.metadata.get("/Producer"),
                }
                # Clean None values
                pdf_metadata = {k: v for k, v in pdf_metadata.items() if v}
            
            return {
                "raw_text": raw_text,
                "page_count": len(reader.pages),
                "pdf_metadata": pdf_metadata,
                "has_content": bool(raw_text.strip())
            }
            
        except Exception as e:
            # If PDF parsing fails, return empty result
            return {
                "raw_text": f"[PDF parsing failed: {str(e)}]",
                "page_count": 0,
                "pdf_metadata": {},
                "has_content": False,
                "error": str(e)
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
