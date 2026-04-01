"""
Image Processor - Handle image files with simulated OCR
"""
from typing import Dict, Any
import io

from app.worker.processors.base import BaseProcessor
from app.models.document import Document
from app.services.ocr_service import ocr_service


class ImageProcessor(BaseProcessor):
    """
    Processor for image files (PNG, JPG, JPEG, GIF).
    
    Uses RapidOCR when available, with a deterministic fallback so
    image-heavy uploads still complete instead of failing silently.
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
            raw_text = ocr_result["text"] or self._simulate_ocr(filename, width, height, format_type)
            
            return {
                "raw_text": raw_text,
                "width": width,
                "height": height,
                "format": format_type,
                "mode": mode,
                "aspect_ratio": aspect_ratio,
                "exif_data": exif_data,
                "has_content": bool(raw_text.strip()),
                "is_simulated": not bool(ocr_result["text"]),
                "ocr_engine": ocr_result["engine"],
                "ocr_confidence": ocr_result["average_confidence"],
                "ocr_line_count": ocr_result["line_count"],
            }
            
        except Exception as e:
            return {
                "raw_text": f"[Image processing failed: {str(e)}]",
                "width": 0,
                "height": 0,
                "format": None,
                "mode": None,
                "aspect_ratio": 0,
                "exif_data": {},
                "has_content": False,
                "error": str(e)
            }
    
    def _simulate_ocr(self, filename: str, width: int, height: int, format_type: str) -> str:
        """
        Simulate OCR output for demonstration purposes.
        
        In production, this would call actual OCR services.
        """
        # Generate realistic-looking OCR output
        import os
        base_name = os.path.splitext(filename)[0]
        
        simulated_text = f"""[Simulated OCR Output for: {filename}]

Image Analysis:
- Dimensions: {width}x{height} pixels
- Format: {format_type}
- Resolution: {'High' if width > 1000 or height > 1000 else 'Standard'}

Detected Content Regions:
- Text regions: {'Multiple' if width > 500 else 'Limited'}
- Image clarity: {'Clear' if format_type == 'PNG' else 'Standard'}

Extracted Text (Simulated):
{base_name.replace('_', ' ').replace('-', ' ').title()}

Note: This is a simulated OCR output for demonstration purposes.
In production, integrate with Tesseract, Google Vision, or AWS Textract.
"""
        return simulated_text
    
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
        
        if parsed_data.get("is_simulated"):
            summary += "OCR fallback used a generated placeholder because no readable text was detected."
        else:
            summary += "Text extracted directly from the image."

        metadata = {
            "file_type": document.file_type,
            "file_size": document.file_size,
            "width": parsed_data.get("width", 0),
            "height": parsed_data.get("height", 0),
            "format": parsed_data.get("format"),
            "mode": parsed_data.get("mode"),
            "aspect_ratio": parsed_data.get("aspect_ratio", 0),
            "exif_data": parsed_data.get("exif_data", {}),
            "ocr_simulated": parsed_data.get("is_simulated", True),
            "ocr_engine": parsed_data.get("ocr_engine"),
            "ocr_confidence": parsed_data.get("ocr_confidence"),
            "ocr_line_count": parsed_data.get("ocr_line_count", 0),
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
