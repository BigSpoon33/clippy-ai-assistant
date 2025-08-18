#!/usr/bin/env python3
"""
Piper TTS Bridge for CLIPPY AI Assistant
High-quality neural TTS using Piper
"""

import sys
import json
import tempfile
import os
from pathlib import Path
import argparse
import subprocess
import urllib.request
import tarfile
import shutil

def get_piper_command():
    """Get the piper command path"""
    # First try the virtual environment path
    venv_piper = "/home/shuma/Documents/voice_assistant/venv/bin/piper"
    if os.path.exists(venv_piper):
        return venv_piper
    
    # Fall back to system piper
    try:
        result = subprocess.run(["which", "piper"], capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        pass
    
    # Last resort - just try "piper"
    return "piper"

# Default voice models and their download URLs
DEFAULT_VOICES = {
    "en_US-lessac-medium": {
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json"
    },
    "en_US-amy-medium": {
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx", 
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx.json"
    },
    "en_US-ryan-high": {
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high/en_US-ryan-high.onnx",
        "config_url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high/en_US-ryan-high.onnx.json"
    }
}

def get_voice_dir():
    """Get the directory for storing Piper voice models"""
    home = Path.home()
    voice_dir = home / ".local" / "share" / "piper" / "voices"
    voice_dir.mkdir(parents=True, exist_ok=True)
    return voice_dir

def download_voice(voice_name):
    """Download a voice model if it doesn't exist"""
    if voice_name not in DEFAULT_VOICES:
        return False, f"Unknown voice: {voice_name}"
    
    voice_dir = get_voice_dir()
    voice_file = voice_dir / f"{voice_name}.onnx"
    config_file = voice_dir / f"{voice_name}.onnx.json"
    
    # Check if voice already exists
    if voice_file.exists() and config_file.exists():
        return True, f"Voice {voice_name} already available"
    
    try:
        voice_info = DEFAULT_VOICES[voice_name]
        
        print(f"Downloading voice model: {voice_name}...")
        
        # Download voice model
        urllib.request.urlretrieve(voice_info["url"], voice_file)
        
        # Download config
        urllib.request.urlretrieve(voice_info["config_url"], config_file)
        
        return True, f"Voice {voice_name} downloaded successfully"
        
    except Exception as e:
        # Clean up partial downloads
        for f in [voice_file, config_file]:
            if f.exists():
                f.unlink()
        return False, f"Failed to download voice {voice_name}: {str(e)}"

def synthesize_speech(text, output_file, voice="en_US-lessac-medium", speed=1.0):
    """
    Synthesize speech using Piper TTS
    
    Args:
        text: Text to synthesize
        output_file: Output audio file path
        voice: Voice model name
        speed: Speech speed multiplier (not directly supported by Piper)
    
    Returns:
        dict: {"success": bool, "audio_file": path, "duration": seconds}
    """
    try:
        # Ensure voice is downloaded
        download_success, download_msg = download_voice(voice)
        if not download_success:
            return {
                "success": False,
                "error": download_msg,
                "audio_file": "",
                "duration": 0
            }
        
        # Get voice file path
        voice_dir = get_voice_dir()
        voice_file = voice_dir / f"{voice}.onnx"
        
        if not voice_file.exists():
            return {
                "success": False,
                "error": f"Voice file not found: {voice_file}",
                "audio_file": "",
                "duration": 0
            }
        
        # Ensure output directory exists
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Run Piper TTS
        piper_cmd = get_piper_command()
        cmd = [
            piper_cmd,
            "--model", str(voice_file),
            "--output_file", output_file
        ]
        
        # Note: Piper doesn't have built-in speed control
        # Speed adjustment would need post-processing with tools like sox
        
        result = subprocess.run(
            cmd,
            input=text,
            text=True,
            capture_output=True,
            timeout=30
        )
        
        if result.returncode == 0 and os.path.exists(output_file):
            # Estimate duration based on text length (rough)
            estimated_duration = len(text.split()) * 0.5  # ~0.5 seconds per word
            
            # Get actual file size for better estimate
            file_size = os.path.getsize(output_file)
            if file_size > 0:
                # WAV file, roughly estimate based on file size
                # Assume 22050 Hz, 16-bit mono = ~44KB per second
                estimated_duration = file_size / 44100
            
            return {
                "success": True,
                "audio_file": str(output_file),
                "duration": estimated_duration,
                "voice": voice,
                "speed": speed,
                "engine": "piper"
            }
        else:
            error_msg = result.stderr if result.stderr else "Unknown Piper error"
            return {
                "success": False,
                "error": f"Piper synthesis failed: {error_msg}",
                "audio_file": "",
                "duration": 0
            }
            
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Piper TTS timeout",
            "audio_file": "",
            "duration": 0
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Piper TTS failed: {str(e)}",
            "audio_file": "",
            "duration": 0
        }

def test_piper():
    """Test if Piper TTS is working"""
    try:
        # Test piper command availability
        piper_cmd = get_piper_command()
        result = subprocess.run([piper_cmd, "--help"], capture_output=True, timeout=5)
        if result.returncode != 0:
            return {"success": False, "error": "Piper command not found"}
        
        # Test voice download
        download_success, download_msg = download_voice("en_US-lessac-medium")
        
        return {
            "success": download_success,
            "message": f"Piper TTS available. {download_msg}",
            "available_voices": list(DEFAULT_VOICES.keys())
        }
        
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Piper test timeout"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def list_voices():
    """List available and downloadable voices"""
    voice_dir = get_voice_dir()
    
    available = []
    downloadable = []
    
    for voice_name in DEFAULT_VOICES.keys():
        voice_file = voice_dir / f"{voice_name}.onnx"
        if voice_file.exists():
            available.append(voice_name)
        else:
            downloadable.append(voice_name)
    
    return {
        "success": True,
        "available_voices": available,
        "downloadable_voices": downloadable,
        "total_voices": len(DEFAULT_VOICES)
    }

def download_all_voices():
    """Download all default voice models"""
    results = {}
    for voice_name in DEFAULT_VOICES.keys():
        success, msg = download_voice(voice_name)
        results[voice_name] = {"success": success, "message": msg}
    
    total_success = sum(1 for r in results.values() if r["success"])
    
    return {
        "success": total_success > 0,
        "downloaded": total_success,
        "total": len(DEFAULT_VOICES),
        "results": results
    }

def main():
    parser = argparse.ArgumentParser(description="Piper TTS Bridge")
    parser.add_argument("--text", help="Text to synthesize")
    parser.add_argument("--output", help="Output audio file path")
    parser.add_argument("--voice", default="en_US-lessac-medium", help="Voice model name")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed (note: limited support)")
    parser.add_argument("--test", action="store_true", help="Test Piper availability")
    parser.add_argument("--list-voices", action="store_true", help="List available voices")
    parser.add_argument("--download-all", action="store_true", help="Download all voice models")
    parser.add_argument("--download-voice", help="Download specific voice model")
    parser.add_argument("--output-json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    if args.test:
        result = test_piper()
    elif args.list_voices:
        result = list_voices()
    elif args.download_all:
        result = download_all_voices()
    elif args.download_voice:
        success, msg = download_voice(args.download_voice)
        result = {"success": success, "message": msg}
    elif args.text and args.output:
        result = synthesize_speech(args.text, args.output, args.voice, args.speed)
    else:
        result = {
            "success": False,
            "error": "Missing required arguments: --text and --output, or use --test/--list-voices"
        }
    
    if args.output_json:
        print(json.dumps(result))
    else:
        if result["success"]:
            if "audio_file" in result:
                print(f"Audio saved to: {result['audio_file']}")
            elif "message" in result:
                print(result["message"])
            elif "available_voices" in result:
                print("Available voices:", ", ".join(result["available_voices"]))
                if result.get("downloadable_voices"):
                    print("Downloadable voices:", ", ".join(result["downloadable_voices"]))
        else:
            print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()