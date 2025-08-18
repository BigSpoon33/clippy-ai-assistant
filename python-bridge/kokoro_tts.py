#!/usr/bin/env python3
"""
Kokoro TTS Bridge for CLIPPY AI Assistant
Standalone script that can be called from TypeScript/Node.js
"""

import sys
import json
import tempfile
import os
from pathlib import Path
import argparse
import subprocess

def synthesize_speech(text, output_file, voice="af_bella", speed=1.0, device="auto"):
    """
    Synthesize speech using Kokoro TTS (matching existing voice_assistant implementation)
    
    Args:
        text: Text to synthesize
        output_file: Output audio file path
        voice: Voice model to use
        speed: Speech speed (0.1 - 3.0)
        device: Device to use ("auto", "cpu", "cuda")
    
    Returns:
        dict: {"success": bool, "audio_file": path, "duration": seconds}
    """
    try:
        # Suppress Python version warnings
        import warnings
        warnings.filterwarnings("ignore", message=".*different Python.*")
        
        # Add the local kokoro path to sys.path
        import sys
        import os
        
        # Use the installed kokoro in the current environment
        kokoro_path = "/home/shuma/Documents/voice_assistant/kokoro"
        if kokoro_path not in sys.path:
            sys.path.insert(0, kokoro_path)
        
        # Try to import Kokoro
        from kokoro import KPipeline
        import torch
        import torchaudio
        
        # Determine device
        if device == "auto":
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        # Initialize pipeline for American English
        pipeline = KPipeline('a', device=device)
        
        # Generate speech
        audio_chunks = []
        for result in pipeline(text, voice=voice, speed=speed):
            if result.audio is not None:
                audio_chunks.append(result.audio)
        
        if not audio_chunks:
            raise Exception("No audio generated")
        
        # Concatenate all audio chunks
        full_audio = torch.cat(audio_chunks, dim=0)
        
        # Ensure output directory exists
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save to file (Kokoro uses 24000 Hz sample rate)
        sample_rate = 24000
        torchaudio.save(output_file, full_audio.unsqueeze(0), sample_rate)
        
        # Calculate duration
        duration = len(full_audio) / sample_rate
        
        return {
            "success": True,
            "audio_file": str(output_file),
            "duration": duration,
            "voice": voice,
            "speed": speed,
            "device": device,
            "sample_rate": sample_rate
        }
        
    except ImportError as e:
        # Try to install kokoro if missing
        try:
            import subprocess
            subprocess.run([sys.executable, "-m", "pip", "install", "--force-reinstall", "/home/shuma/Documents/voice_assistant/kokoro/"], 
                         capture_output=True, check=True)
            
            # Retry import after installation
            from kokoro import KPipeline
            import torch
            import torchaudio
            
            if device == "auto":
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
            
            pipeline = KPipeline('a', device=device)
            
            audio_chunks = []
            for result in pipeline(text, voice=voice, speed=speed):
                if result.audio is not None:
                    audio_chunks.append(result.audio)
            
            if not audio_chunks:
                raise Exception("No audio generated")
            
            full_audio = torch.cat(audio_chunks, dim=0)
            
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            sample_rate = 24000
            torchaudio.save(output_file, full_audio.unsqueeze(0), sample_rate)
            
            duration = len(full_audio) / sample_rate
            
            return {
                "success": True,
                "audio_file": str(output_file),
                "duration": duration,
                "voice": voice,
                "speed": speed,
                "device": device,
                "sample_rate": sample_rate
            }
            
        except Exception as install_e:
            return {
                "success": False,
                "error": f"Kokoro not available and installation failed: {str(install_e)}. Original error: {str(e)}",
                "audio_file": "",
                "duration": 0
            }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Kokoro TTS failed: {str(e)}",
            "audio_file": "",
            "duration": 0
        }

def test_kokoro():
    """Test if Kokoro is working"""
    try:
        import sys
        import os
        
        # Add the local kokoro path to sys.path
        kokoro_path = "/home/shuma/Documents/voice_assistant/kokoro"
        if kokoro_path not in sys.path:
            sys.path.insert(0, kokoro_path)
        
        from kokoro import KPipeline
        import torch
        
        # Test pipeline initialization
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        pipeline = KPipeline('a', device=device)
        
        return {
            "success": True, 
            "message": f"Kokoro TTS available on {device}",
            "device": device,
            "cuda_available": torch.cuda.is_available()
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def list_voices():
    """List available voices"""
    try:
        import kokoro
        tts = kokoro.TTS()
        voices = getattr(tts, 'voices', ['af_bella', 'af_sky', 'am_adam', 'am_michael'])
        return {"success": True, "voices": voices}
    except Exception as e:
        # Default voices if we can't query
        default_voices = ['af_bella', 'af_sky', 'am_adam', 'am_michael']
        return {"success": True, "voices": default_voices, "note": "Using default voice list"}

def main():
    parser = argparse.ArgumentParser(description="Kokoro TTS Bridge")
    parser.add_argument("--text", help="Text to synthesize")
    parser.add_argument("--output", help="Output audio file path")
    parser.add_argument("--voice", default="af_bella", help="Voice model")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed")
    parser.add_argument("--test", action="store_true", help="Test Kokoro availability")
    parser.add_argument("--list-voices", action="store_true", help="List available voices")
    parser.add_argument("--output-json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    if args.test:
        result = test_kokoro()
    elif args.list_voices:
        result = list_voices()
    elif args.text and args.output:
        result = synthesize_speech(args.text, args.output, args.voice, args.speed)
    else:
        result = {
            "success": False,
            "error": "Missing required arguments: --text and --output"
        }
    
    if args.output_json:
        print(json.dumps(result))
    else:
        if result["success"]:
            if "audio_file" in result:
                print(f"Audio saved to: {result['audio_file']}")
            elif "voices" in result:
                print("Available voices:", ", ".join(result["voices"]))
            elif "message" in result:
                print(result["message"])
        else:
            print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()