"""
Document Processors Package
"""
from app.worker.processors.base import BaseProcessor
from app.worker.processors.text_processor import TextProcessor
from app.worker.processors.pdf_processor import PDFProcessor
from app.worker.processors.docx_processor import DocxProcessor
from app.worker.processors.csv_processor import CSVProcessor
from app.worker.processors.image_processor import ImageProcessor


# Processor registry
PROCESSORS = {
    "txt": TextProcessor(),
    "pdf": PDFProcessor(),
    "docx": DocxProcessor(),
    "doc": DocxProcessor(),
    "csv": CSVProcessor(),
    "png": ImageProcessor(),
    "jpg": ImageProcessor(),
    "jpeg": ImageProcessor(),
    "gif": ImageProcessor(),
}


def get_processor(file_type: str) -> BaseProcessor:
    """
    Get the appropriate processor for a file type.
    
    Args:
        file_type: File extension (e.g., 'pdf', 'txt')
        
    Returns:
        Processor instance
    """
    file_type = file_type.lower()
    
    if file_type in PROCESSORS:
        return PROCESSORS[file_type]
    
    # Default to text processor for unknown types
    return TextProcessor()


__all__ = [
    "BaseProcessor",
    "TextProcessor",
    "PDFProcessor",
    "DocxProcessor",
    "CSVProcessor",
    "ImageProcessor",
    "get_processor",
    "PROCESSORS"
]
