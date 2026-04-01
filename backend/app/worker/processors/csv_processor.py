"""
CSV Processor - Handle CSV files
"""
from typing import Dict, Any, List
import io
import csv

from app.worker.processors.base import BaseProcessor
from app.models.document import Document


class CSVProcessor(BaseProcessor):
    """Processor for CSV files."""
    
    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Parse CSV file content."""
        try:
            # Try different encodings
            text = None
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    text = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if text is None:
                text = content.decode('utf-8', errors='replace')
            
            # Parse CSV
            csv_file = io.StringIO(text)
            
            # Detect dialect
            try:
                dialect = csv.Sniffer().sniff(csv_file.read(1024))
                csv_file.seek(0)
            except csv.Error:
                dialect = csv.excel
            
            reader = csv.reader(csv_file, dialect)
            rows = list(reader)
            
            if not rows:
                return {
                    "raw_text": text,
                    "headers": [],
                    "row_count": 0,
                    "column_count": 0,
                    "data_preview": [],
                    "has_content": False
                }
            
            # Assume first row is header
            headers = rows[0] if rows else []
            data_rows = rows[1:] if len(rows) > 1 else []
            
            # Get preview (first 10 rows)
            data_preview = data_rows[:10]
            
            # Convert to text representation for summary
            raw_text = f"Headers: {', '.join(headers)}\n\n"
            for i, row in enumerate(data_rows[:20], 1):
                raw_text += f"Row {i}: {', '.join(row)}\n"
            if len(data_rows) > 20:
                raw_text += f"\n... and {len(data_rows) - 20} more rows"
            
            return {
                "raw_text": raw_text,
                "headers": headers,
                "row_count": len(data_rows),
                "column_count": len(headers),
                "data_preview": data_preview,
                "has_content": bool(data_rows)
            }
            
        except Exception as e:
            return {
                "raw_text": f"[CSV parsing failed: {str(e)}]",
                "headers": [],
                "row_count": 0,
                "column_count": 0,
                "data_preview": [],
                "has_content": False,
                "error": str(e)
            }
    
    def extract(self, parsed_data: Dict[str, Any], document: Document) -> Dict[str, Any]:
        """Extract structured data from CSV content."""
        raw_text = parsed_data.get("raw_text", "")
        headers = parsed_data.get("headers", [])
        
        # Create title from filename or headers
        title = self._extract_title(raw_text, document.original_filename)
        
        # CSV files are always data
        category = "data"
        
        # Use column headers as keywords
        keywords = [h.lower().replace('_', ' ').replace('-', ' ') for h in headers[:10]]
        keywords = list(set(keywords))  # Remove duplicates
        
        # Generate summary
        summary = f"CSV data with {parsed_data.get('row_count', 0)} rows and {parsed_data.get('column_count', 0)} columns. "
        if headers:
            summary += f"Columns: {', '.join(headers[:5])}"
            if len(headers) > 5:
                summary += f" and {len(headers) - 5} more."
        
        metadata = {
            "file_type": document.file_type,
            "file_size": document.file_size,
            "row_count": parsed_data.get("row_count", 0),
            "column_count": parsed_data.get("column_count", 0),
            "has_content": parsed_data.get("has_content", False),
            "headers": headers
        }
        
        return {
            "title": title,
            "category": category,
            "summary": summary,
            "keywords": keywords,
            "metadata": metadata,
            "raw_text": raw_text,
            "structured_data": {
                "type": "csv",
                "headers": headers,
                "row_count": parsed_data.get("row_count", 0),
                "column_count": parsed_data.get("column_count", 0),
                "preview": parsed_data.get("data_preview", [])
            }
        }
