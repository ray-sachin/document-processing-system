"""
Text Processor - Handle plain text files
"""
from typing import Dict, Any

from app.worker.processors.base import BaseProcessor
from app.models.document import Document


class TextProcessor(BaseProcessor):
    """Processor for plain text files (.txt)."""
    
    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Parse text file content."""
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'ascii']
        
        text = None
        for encoding in encodings:
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if text is None:
            text = content.decode('utf-8', errors='replace')
        
        return {
            "raw_text": text,
            "encoding": encoding if text else "unknown",
            "line_count": len(text.split('\n')) if text else 0,
            "char_count": len(text) if text else 0
        }
    
    def extract(self, parsed_data: Dict[str, Any], document: Document) -> Dict[str, Any]:
        """Extract structured data from text content."""
        raw_text = parsed_data.get("raw_text", "")
        
        title = self._extract_title(raw_text, document.original_filename)
        category = self._categorize(raw_text, document.original_filename)
        keywords = self._extract_keywords(raw_text)
        summary = self._generate_summary(raw_text)
        
        metadata = {
            "file_type": document.file_type,
            "file_size": document.file_size,
            "encoding": parsed_data.get("encoding"),
            "line_count": parsed_data.get("line_count"),
            "char_count": parsed_data.get("char_count"),
            "word_count": len(raw_text.split()) if raw_text else 0
        }
        
        return {
            "title": title,
            "category": category,
            "summary": summary,
            "keywords": keywords,
            "metadata": metadata,
            "raw_text": raw_text,
            "structured_data": {
                "type": "text",
                "lines": parsed_data.get("line_count"),
                "words": metadata["word_count"]
            }
        }
