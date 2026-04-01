"""
OCR service helpers for images and scanned PDFs.
"""
from __future__ import annotations

import logging
from io import BytesIO
from typing import Any, Dict, List

from PIL import Image, ImageOps

try:
    import fitz
except ImportError:  # pragma: no cover - optional dependency
    fitz = None

try:
    from rapidocr_onnxruntime import RapidOCR
except ImportError:  # pragma: no cover - optional dependency
    RapidOCR = None


logger = logging.getLogger(__name__)


class OCRService:
    """Lazy OCR wrapper with graceful fallbacks."""

    def __init__(self) -> None:
        self._engine = None
        self._engine_unavailable = False

    def _get_engine(self):
        if self._engine_unavailable or RapidOCR is None:
            return None

        if self._engine is None:
            try:
                self._engine = RapidOCR()
            except Exception as exc:  # pragma: no cover - environment-specific
                logger.warning("Failed to initialize OCR engine: %s", exc)
                self._engine_unavailable = True
                return None

        return self._engine

    def _prepare_image(self, content: bytes) -> bytes:
        with Image.open(BytesIO(content)) as image:
            image = ImageOps.exif_transpose(image)

            if min(image.size) < 900:
                scale = max(1.6, 900 / max(min(image.size), 1))
                image = image.resize(
                    (int(image.width * scale), int(image.height * scale)),
                    Image.Resampling.LANCZOS,
                )

            processed = ImageOps.autocontrast(image.convert("L"))
            output = BytesIO()
            processed.save(output, format="PNG")
            return output.getvalue()

    def _parse_result(self, result: List[Any]) -> Dict[str, Any]:
        lines: List[str] = []
        confidences: List[float] = []
        seen = set()

        for item in result or []:
            if len(item) < 3:
                continue

            text = " ".join(str(item[1]).split()).strip()
            if not text or text in seen:
                continue

            seen.add(text)
            lines.append(text)

            try:
                confidences.append(float(item[2]))
            except (TypeError, ValueError):
                continue

        return {
            "text": "\n".join(lines).strip(),
            "line_count": len(lines),
            "average_confidence": round(sum(confidences) / len(confidences), 4) if confidences else None,
        }

    def extract_text_from_image(self, content: bytes) -> Dict[str, Any]:
        engine = self._get_engine()
        if engine is None:
            return {
                "text": "",
                "line_count": 0,
                "average_confidence": None,
                "engine": None,
                "available": False,
            }

        payloads = [self._prepare_image(content), content]
        for payload in payloads:
            try:
                result, timings = engine(payload)
                parsed = self._parse_result(result)
                if parsed["text"]:
                    parsed.update(
                        {
                            "engine": "rapidocr",
                            "available": True,
                            "timings": timings,
                        }
                    )
                    return parsed
            except Exception as exc:  # pragma: no cover - OCR engine variance
                logger.debug("OCR image extraction attempt failed: %s", exc)

        return {
            "text": "",
            "line_count": 0,
            "average_confidence": None,
            "engine": "rapidocr",
            "available": True,
        }

    def extract_text_from_pdf(self, content: bytes, max_pages: int = 3) -> Dict[str, Any]:
        if fitz is None:
            return {
                "text": "",
                "line_count": 0,
                "average_confidence": None,
                "engine": None,
                "available": False,
                "pages_processed": 0,
            }

        try:
            document = fitz.open(stream=content, filetype="pdf")
        except Exception as exc:  # pragma: no cover - malformed PDFs
            logger.debug("Unable to open PDF for OCR fallback: %s", exc)
            return {
                "text": "",
                "line_count": 0,
                "average_confidence": None,
                "engine": None,
                "available": False,
                "pages_processed": 0,
            }

        page_texts: List[str] = []
        confidences: List[float] = []
        processed_pages = 0

        try:
            for page_index in range(min(document.page_count, max_pages)):
                page = document.load_page(page_index)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                image_result = self.extract_text_from_image(pixmap.tobytes("png"))

                if image_result["text"]:
                    page_texts.append(image_result["text"])
                if image_result["average_confidence"] is not None:
                    confidences.append(float(image_result["average_confidence"]))

                processed_pages += 1
        finally:
            document.close()

        return {
            "text": "\n\n".join(page_texts).strip(),
            "line_count": sum(text.count("\n") + 1 for text in page_texts if text),
            "average_confidence": round(sum(confidences) / len(confidences), 4) if confidences else None,
            "engine": "rapidocr" if page_texts else None,
            "available": bool(page_texts),
            "pages_processed": processed_pages,
        }


ocr_service = OCRService()
