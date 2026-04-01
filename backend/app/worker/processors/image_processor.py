"""
Image Processor - Handle image files with OCR-first parsing.
"""
from typing import Dict, Any
import io

from app.worker.processors.base import BaseProcessor
from app.models.document import Document
from app.services.ocr_service import ocr_service


class ImageProcessor(BaseProcessor):
    """
    Processor for image files (PNG, JPG, JPEG, GIF).
    
    Uses RapidOCR when available and falls back to metadata-only indexing
    when no reliable text can be detected.
    """
    
    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Parse image file and extract metadata."""
        try:
            from PIL import Image
            
            image_file = io.BytesIO(content)
            img = Image.open(image_file)
            
            # Get image properties
            width, height = img.size
            format_type = img.format
            mode = img.mode
            
            # Calculate aspect ratio
            aspect_ratio = round(width / height, 2) if height > 0 else 0
            
            # Get EXIF data if available
            exif_data = {}
            try:
                exif = img._getexif()
                if exif:
                    # Extract common EXIF tags
                    exif_tags = {
                        271: "make",
                        272: "model",
                        306: "datetime",
                        36867: "datetime_original",
                    }
                    for tag_id, tag_name in exif_tags.items():
                        if tag_id in exif:
                            exif_data[tag_name] = str(exif[tag_id])
            except Exception:
                pass
            
            ocr_result = ocr_service.extract_text_from_image(content)
            raw_text = ocr_result["text"]
            
            return {
                "raw_text": raw_text,
                "width": width,
                "height": height,
                "format": format_type,
                "mode": mode,
                "aspect_ratio": aspect_ratio,
                "exif_data": exif_data,
                "has_content": bool(raw_text.strip()),
                "ocr_status": "text_extracted" if raw_text.strip() else "no_text_detected",
                "ocr_engine": ocr_result["engine"],
                "ocr_confidence": ocr_result["average_confidence"],
                "ocr_line_count": ocr_result["line_count"],
                "ocr_variant": ocr_result.get("variant"),
            }
            
        except Exception as e:
            return {
                "raw_text": "",
                "width": 0,
                "height": 0,
                "format": None,
                "mode": None,
                "aspect_ratio": 0,
                "exif_data": {},
                "has_content": False,
                "ocr_status": "processing_error",
                "error": str(e)
            }
    
    def extract(self, parsed_data: Dict[str, Any], document: Document) -> Dict[str, Any]:
        """Extract structured data from image content."""
        raw_text = parsed_data.get("raw_text", "")
        
        title = self._extract_title(raw_text, document.original_filename)
        category = "image"
        
        # Generate keywords based on image properties
        keywords = ["image", parsed_data.get("format", "").lower()]
        
        # Add aspect ratio category
        aspect = parsed_data.get("aspect_ratio", 0)
        if aspect > 1.2:
            keywords.append("landscape")
        elif aspect < 0.8:
            keywords.append("portrait")
        else:
            keywords.append("square")
        
        # Add resolution category
        if parsed_data.get("width", 0) > 1920 or parsed_data.get("height", 0) > 1080:
            keywords.append("high-resolution")
        
        # Add any keywords from filename
        keywords.extend(self._extract_keywords(document.original_filename, max_keywords=3))
        keywords = list(set(keywords))  # Remove duplicates
        
        # Generate summary
        summary = f"Image file ({parsed_data.get('format', 'unknown')}) with dimensions " \
                  f"{parsed_data.get('width', 0)}x{parsed_data.get('height', 0)} pixels. "
        
        if parsed_data.get("has_content"):
            summary += "Readable text was extracted from the image and indexed for review."
        else:
            summary += "No reliable text was detected, so the record was indexed from image metadata and filename context."

        metadata = {
            "file_type": document.file_type,
            "file_size": document.file_size,
            "width": parsed_data.get("width", 0),
            "height": parsed_data.get("height", 0),
            "format": parsed_data.get("format"),
            "mode": parsed_data.get("mode"),
            "aspect_ratio": parsed_data.get("aspect_ratio", 0),
            "exif_data": parsed_data.get("exif_data", {}),
            "text_detected": parsed_data.get("has_content", False),
            "ocr_status": parsed_data.get("ocr_status"),
            "ocr_engine": parsed_data.get("ocr_engine"),
            "ocr_confidence": parsed_data.get("ocr_confidence"),
            "ocr_line_count": parsed_data.get("ocr_line_count", 0),
            "ocr_variant": parsed_data.get("ocr_variant"),
        }
        
        return {
            "title": title,
            "category": category,
            "summary": summary,
            "keywords": keywords,
            "metadata": metadata,
            "raw_text": raw_text,
            "structured_data": {
                "type": "image",
                "dimensions": {
                    "width": parsed_data.get("width", 0),
                    "height": parsed_data.get("height", 0)
                },
                "format": parsed_data.get("format"),
                "exif": parsed_data.get("exif_data", {})
            }
        }
