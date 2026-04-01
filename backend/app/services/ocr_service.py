"""
OCR service helpers for images and scanned PDFs.
"""
from __future__ import annotations

import hashlib
import logging
import re
from io import BytesIO
from typing import Any, Dict, List, Tuple

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

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

    def _upscale_image(self, image: Image.Image, min_edge: int = 1200) -> Image.Image:
        if min(image.size) >= min_edge:
            return image

        scale = max(1.5, min_edge / max(min(image.size), 1))
        return image.resize(
            (int(image.width * scale), int(image.height * scale)),
            Image.Resampling.LANCZOS,
        )

    def _image_to_png(self, image: Image.Image) -> bytes:
        output = BytesIO()
        image.save(output, format="PNG")
        return output.getvalue()

    def _prepare_image_variants(self, content: bytes) -> List[Tuple[str, bytes]]:
        with Image.open(BytesIO(content)) as original:
            base = ImageOps.exif_transpose(original).convert("RGB")
            base = self._upscale_image(base)

            grayscale = ImageOps.autocontrast(base.convert("L"))
            high_contrast = ImageEnhance.Contrast(grayscale).enhance(1.9)
            sharpened = high_contrast.filter(ImageFilter.SHARPEN)
            threshold = high_contrast.point(lambda pixel: 255 if pixel > 172 else 0)

            rotated_left = ImageEnhance.Contrast(
                ImageOps.autocontrast(base.rotate(90, expand=True).convert("L"))
            ).enhance(1.6)
            rotated_right = ImageEnhance.Contrast(
                ImageOps.autocontrast(base.rotate(270, expand=True).convert("L"))
            ).enhance(1.6)

            variants = [
                ("original", self._image_to_png(base)),
                ("grayscale", self._image_to_png(grayscale)),
                ("high-contrast", self._image_to_png(high_contrast)),
                ("sharpened", self._image_to_png(sharpened)),
                ("threshold", self._image_to_png(threshold)),
                ("rotated-left", self._image_to_png(rotated_left)),
                ("rotated-right", self._image_to_png(rotated_right)),
                ("raw", content),
            ]

        deduped: List[Tuple[str, bytes]] = []
        seen_hashes = set()
        for label, payload in variants:
            payload_hash = hashlib.sha1(payload).hexdigest()
            if payload_hash in seen_hashes:
                continue
            seen_hashes.add(payload_hash)
            deduped.append((label, payload))

        return deduped

    def _clean_text(self, value: str) -> str:
        value = value.replace("\x0c", "\n")
        value = re.sub(r"[^\S\r\n]+", " ", value)
        value = re.sub(r"\n{3,}", "\n\n", value)
        return value.strip()

    def _parse_result(self, result: List[Any]) -> Dict[str, Any]:
        lines: List[str] = []
        confidences: List[float] = []
        seen = set()

        for item in result or []:
            if len(item) < 3:
                continue

            text = self._clean_text(str(item[1]))
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

    def _candidate_score(self, parsed: Dict[str, Any]) -> float:
        text = parsed.get("text", "")
        tokens = re.findall(r"\b[\w@%:/.-]{2,}\b", text)
        unique_tokens = len(set(token.lower() for token in tokens))
        confidence_bonus = (parsed.get("average_confidence") or 0) * 12
        return (len(tokens) * 3) + unique_tokens + (parsed.get("line_count", 0) * 1.5) + confidence_bonus

    def _is_useful_text(self, parsed: Dict[str, Any]) -> bool:
        text = parsed.get("text", "")
        tokens = re.findall(r"\b[\w@%:/.-]{2,}\b", text)
        return len(tokens) >= 4 or len(text) >= 32

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

        best_match = {
            "text": "",
            "line_count": 0,
            "average_confidence": None,
            "engine": "rapidocr",
            "available": True,
            "variant": None,
        }

        for variant_name, payload in self._prepare_image_variants(content):
            try:
                result, timings = engine(payload)
                parsed = self._parse_result(result)
                if not parsed["text"]:
                    continue

                candidate = {
                    **parsed,
                    "engine": "rapidocr",
                    "available": True,
                    "timings": timings,
                    "variant": variant_name,
                }

                if self._candidate_score(candidate) > self._candidate_score(best_match):
                    best_match = candidate

                if self._is_useful_text(candidate):
                    return candidate
            except Exception as exc:  # pragma: no cover - OCR engine variance
                logger.debug("OCR image extraction attempt failed for %s: %s", variant_name, exc)

        return best_match

    def extract_text_layer_from_pdf(self, content: bytes, max_pages: int = 6) -> Dict[str, Any]:
        if fitz is None:
            return {
                "text": "",
                "line_count": 0,
                "engine": None,
                "available": False,
                "pages_processed": 0,
            }

        try:
            document = fitz.open(stream=content, filetype="pdf")
        except Exception as exc:  # pragma: no cover - malformed PDFs
            logger.debug("Unable to open PDF for embedded-text extraction: %s", exc)
            return {
                "text": "",
                "line_count": 0,
                "engine": None,
                "available": False,
                "pages_processed": 0,
            }

        page_texts: List[str] = []
        processed_pages = 0

        try:
            for page_index in range(min(document.page_count, max_pages)):
                page = document.load_page(page_index)
                text = self._clean_text(page.get_text("text", sort=True))
                if text:
                    page_texts.append(text)
                processed_pages += 1
        finally:
            document.close()

        merged_text = "\n\n".join(page_texts).strip()
        return {
            "text": merged_text,
            "line_count": len([line for line in merged_text.splitlines() if line.strip()]),
            "engine": "pymupdf-text" if merged_text else None,
            "available": bool(merged_text),
            "pages_processed": processed_pages,
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

        merged_text = "\n\n".join(page_texts).strip()
        return {
            "text": merged_text,
            "line_count": len([line for line in merged_text.splitlines() if line.strip()]),
            "average_confidence": round(sum(confidences) / len(confidences), 4) if confidences else None,
            "engine": "rapidocr" if merged_text else None,
            "available": bool(merged_text),
            "pages_processed": processed_pages,
        }


ocr_service = OCRService()
