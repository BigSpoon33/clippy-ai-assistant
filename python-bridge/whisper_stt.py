#!/usr/bin/env python3
"""
Whisper STT Bridge for CLIPPY AI Assistant
Standalone script that can be called from TypeScript/Node.js
"""

import sys
import json
import tempfile
import os
from pathlib import Path
import argparse
import whisper

def transcribe_audio(audio_file_path, model_size="base", language="en"):
    """
    Transcribe audio file using Whisper
    
    Args:
        audio_file_path: Path to audio file
        model_size: Whisper model size (tiny, base, small, medium, large)
        language: Language code (en, es, fr, etc.)
    
    Returns:
        dict: {"text": transcribed_text, "confidence": confidence_score}
    """
    try:
        # Load Whisper model
        model = whisper.load_model(model_size)
        
        # Transcribe
        result = model.transcribe(
            audio_file_path,
            language=language,
            fp16=False,  # Better compatibility
            verbose=False
        )
        
        # Extract text and confidence
        text = result["text"].strip()
        
        # Calculate average confidence from segments
        confidence = 0.0
        if "segments" in result and result["segments"]:
            confidences = []
            for segment in result["segments"]:
                if "avg_logprob" in segment:
                    # Convert log probability to confidence (0-1)
                    conf = max(0.0, min(1.0, (segment["avg_logprob"] + 1.0)))
                    confidences.append(conf)
            if confidences:
                confidence = sum(confidences) / len(confidences)
        else:
            confidence = 0.8  # Default confidence if no segments
        
        return {
            "success": True,
            "text": text,
            "confidence": confidence,
            "language": result.get("language", language)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "confidence": 0.0
        }

def main():
    parser = argparse.ArgumentParser(description="Whisper STT Bridge")
    parser.add_argument("audio_file", help="Path to audio file")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large"], 
                       help="Whisper model size")
    parser.add_argument("--language", default="en", help="Language code")
    parser.add_argument("--output-json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    # Check if audio file exists
    if not os.path.exists(args.audio_file):
        result = {
            "success": False,
            "error": f"Audio file not found: {args.audio_file}",
            "text": "",
            "confidence": 0.0
        }
    else:
        result = transcribe_audio(args.audio_file, args.model, args.language)
    
    if args.output_json:
        print(json.dumps(result))
    else:
        if result["success"]:
            print(result["text"])
        else:
            print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()