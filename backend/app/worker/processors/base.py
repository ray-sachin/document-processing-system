"""
Base Processor - Abstract Base Class for Document Processors
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
import re
from collections import Counter

from app.models.document import Document


class BaseProcessor(ABC):
    """
    Abstract base class for document processors.
    
    Each processor handles a specific file type and implements:
    1. parse() - Extract raw text/content from the file
    2. extract() - Extract structured data from parsed content
    """
    
    @abstractmethod
    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Parse the raw file content.
        
        Args:
            content: Raw file bytes
            filename: Original filename
            
        Returns:
            Dict containing parsed data (at minimum: raw_text)
        """
        pass
    
    @abstractmethod
    def extract(self, parsed_data: Dict[str, Any], document: Document) -> Dict[str, Any]:
        """
        Extract structured data from parsed content.
        
        Args:
            parsed_data: Output from parse()
            document: Document model instance
            
        Returns:
            Dict with extracted fields:
            - title: str
            - category: str
            - summary: str
            - keywords: List[str]
            - metadata: Dict
            - raw_text: str
            - structured_data: Dict
        """
        pass
    
    def _extract_title(self, text: str, filename: str) -> str:
        """
        Extract or generate a title from text content.
        
        Strategy:
        1. Try to find first significant line
        2. Fall back to filename without extension
        """
        lines = text.strip().split('\n')
        
        for line in lines[:5]:  # Check first 5 lines
            line = line.strip()
            # Skip empty lines and very short ones
            if len(line) > 10 and len(line) < 200:
                # Remove common artifacts
                if not line.startswith(('#', '-', '*', '•')):
                    return line
        
        # Fall back to filename
        import os
        return os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ').title()
    
    def _extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """
        Extract keywords from text using simple frequency analysis.
        
        In production, you'd use NLP libraries like spaCy, NLTK, or RAKE.
        """
        # Common stopwords
        stopwords = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
            'before', 'after', 'above', 'below', 'between', 'under', 'again',
            'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
            'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
            'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
            'can', 'will', 'just', 'should', 'now', 'is', 'are', 'was', 'were',
            'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
            'did', 'doing', 'would', 'could', 'ought', 'i', 'me', 'my', 'myself',
            'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
            'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it',
            'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
            'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
            'am', 'as', 'if'
        }
        
        # Extract words
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Filter and count
        filtered_words = [w for w in words if w not in stopwords]
        word_counts = Counter(filtered_words)
        
        # Get top keywords
        keywords = [word for word, _ in word_counts.most_common(max_keywords)]
        
        return keywords
    
    def _generate_summary(self, text: str, max_length: int = 300) -> str:
        """
        Generate a simple summary from text.
        
        Strategy: Take first few sentences that fit within max_length.
        """
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        summary = ""
        for sentence in sentences[:5]:  # Max 5 sentences
            if len(summary) + len(sentence) + 2 <= max_length:
                summary += sentence + ". "
            else:
                break
        
        return summary.strip() or text[:max_length] + "..."
    
    def _categorize(self, text: str, filename: str) -> str:
        """
        Attempt to categorize the document based on content.
        
        This is a simple keyword-based categorization.
        In production, you'd use ML classification.
        """
        text_lower = text.lower()
        filename_lower = filename.lower()
        
        categories = {
            "financial": ["invoice", "budget", "expense", "revenue", "profit", "loss", "payment", "finance"],
            "legal": ["contract", "agreement", "terms", "conditions", "liability", "legal", "law"],
            "technical": ["api", "code", "function", "database", "system", "technical", "specification"],
            "report": ["report", "analysis", "summary", "findings", "conclusion", "research"],
            "correspondence": ["dear", "sincerely", "regards", "letter", "email", "memo"],
            "data": ["csv", "data", "table", "column", "row", "record", "dataset"],
            "documentation": ["guide", "manual", "documentation", "instruction", "tutorial"],
            "image": ["photo", "picture", "image", "screenshot", "diagram"],
        }
        
        # Score each category
        scores = {}
        for category, keywords in categories.items():
            score = sum(1 for kw in keywords if kw in text_lower or kw in filename_lower)
            if score > 0:
                scores[category] = score
        
        if scores:
            return max(scores, key=scores.get)
        
        return "general"
