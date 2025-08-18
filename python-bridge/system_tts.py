#!/usr/bin/env python3
"""
System TTS Bridge for CLIPPY AI Assistant
Uses system TTS commands (espeak, festival, etc.) as fallback when Kokoro is unavailable
"""

import sys
import json
import tempfile
import os
from pathlib import Path
import argparse
import subprocess

def synthesize_speech(text, output_file, voice="default", speed=1.0, system="espeak"):
    """
    Synthesize speech using system TTS tools
    
    Args:
        text: Text to synthesize
        output_file: Output audio file path  
        voice: Voice name (depends on system)
        speed: Speech speed (0.5 - 2.0)
        system: TTS system to use ("espeak", "festival", "pico", "say")
    
    Returns:
        dict: {"success": bool, "audio_file": path, "duration": seconds}
    """
    try:
        # Ensure output directory exists
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        success = False
        
        if system == "espeak" or system == "auto":
            success = _try_espeak(text, output_file, voice, speed)
            
        if not success and (system == "festival" or system == "auto"):
            success = _try_festival(text, output_file, voice, speed)
            
        if not success and (system == "pico" or system == "auto"):
            success = _try_pico(text, output_file, voice, speed)
            
        if not success and (system == "say" or system == "auto"):
            success = _try_say(text, output_file, voice, speed)
            
        if success and os.path.exists(output_file):
            # Estimate duration based on text length (rough estimate)
            duration = len(text.split()) * 0.6  # ~0.6 seconds per word
            
            return {
                "success": True,
                "audio_file": str(output_file),
                "duration": duration,
                "voice": voice,
                "speed": speed,
                "system": system
            }
        else:
            return {
                "success": False,
                "error": f"All TTS systems failed to generate speech",
                "audio_file": "",
                "duration": 0
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"System TTS failed: {str(e)}",
            "audio_file": "",
            "duration": 0
        }

def _try_espeak(text, output_file, voice, speed):
    """Try eSpeak TTS"""
    try:
        # Convert speed (1.0 = normal) to espeak words per minute
        wpm = int(175 * speed)  # Default ~175 wpm
        
        cmd = [
            "espeak",
            "-w", output_file,
            "-s", str(wpm),
            text
        ]
        
        if voice != "default":
            cmd.extend(["-v", voice])
            
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode == 0
        
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False

def _try_festival(text, output_file, voice, speed):
    """Try Festival TTS"""
    try:
        # Create Festival script
        script = f'(begin (voice_{voice} )(rate {speed}) (say_string "{text}") (save_wave "{output_file}"))'
        
        result = subprocess.run(
            ["festival", "--batch"],
            input=script,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0
        
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False

def _try_pico(text, output_file, voice, speed):
    """Try Pico TTS"""
    try:
        cmd = ["pico2wave", "-w", output_file, text]
        
        if voice != "default":
            cmd.extend(["-l", voice])
            
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode == 0
        
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False

def _try_say(text, output_file, voice, speed):
    """Try macOS say command"""
    try:
        cmd = ["say", "-o", output_file, "--data-format=LEF32@22050"]
        
        if voice != "default":
            cmd.extend(["-v", voice])
            
        if speed != 1.0:
            cmd.extend(["-r", str(int(200 * speed))])  # ~200 words per minute default
            
        cmd.append(text)
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode == 0
        
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False

def test_system_tts():
    """Test available TTS systems"""
    systems = []
    
    # Test eSpeak
    try:
        result = subprocess.run(["espeak", "--version"], capture_output=True, timeout=5)
        if result.returncode == 0:
            systems.append("espeak")
    except:
        pass
    
    # Test Festival
    try:
        result = subprocess.run(["festival", "--version"], capture_output=True, timeout=5)
        if result.returncode == 0:
            systems.append("festival")
    except:
        pass
    
    # Test Pico
    try:
        result = subprocess.run(["pico2wave", "-h"], capture_output=True, timeout=5)
        if result.returncode == 0:
            systems.append("pico")
    except:
        pass
    
    # Test Say (macOS)
    try:
        result = subprocess.run(["say", "--version"], capture_output=True, timeout=5)
        if result.returncode == 0:
            systems.append("say")
    except:
        pass
    
    return {
        "success": len(systems) > 0,
        "available_systems": systems,
        "message": f"Found {len(systems)} TTS systems: {', '.join(systems)}" if systems else "No TTS systems found"
    }

def list_voices(system="espeak"):
    """List available voices for a TTS system"""
    try:
        if system == "espeak":
            result = subprocess.run(["espeak", "--voices"], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')[1:]  # Skip header
                voices = []
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 2:
                        voices.append(parts[1])  # Voice name is second column
                return {"success": True, "voices": voices}
        
        elif system == "say":
            result = subprocess.run(["say", "-v", "?"], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                voices = []
                for line in result.stdout.strip().split('\n'):
                    voice_name = line.split()[0]
                    voices.append(voice_name)
                return {"success": True, "voices": voices}
        
        return {"success": False, "error": f"Voice listing not supported for {system}"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="System TTS Bridge")
    parser.add_argument("--text", help="Text to synthesize")
    parser.add_argument("--output", help="Output audio file path")
    parser.add_argument("--voice", default="default", help="Voice name")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed")
    parser.add_argument("--system", default="auto", choices=["auto", "espeak", "festival", "pico", "say"], help="TTS system to use")
    parser.add_argument("--test", action="store_true", help="Test available TTS systems")
    parser.add_argument("--list-voices", help="List voices for TTS system")
    parser.add_argument("--output-json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    if args.test:
        result = test_system_tts()
    elif args.list_voices:
        result = list_voices(args.list_voices)
    elif args.text and args.output:
        result = synthesize_speech(args.text, args.output, args.voice, args.speed, args.system)
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
            elif "available_systems" in result:
                print(result["message"])
            elif "voices" in result:
                print("Available voices:", ", ".join(result["voices"][:10]))  # Show first 10
        else:
            print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()