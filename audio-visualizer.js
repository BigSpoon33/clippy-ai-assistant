/**
 * Audio Visualizer Demo - Multiple Visualization Styles
 * Inspired by OpenWebUI and modern web audio applications
 */

class AudioVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.frequencyData = null;
        this.bufferLength = 0;
        this.isRecording = false;
        this.animationId = null;
        this.testOscillator = null;
        this.colorScheme = 'neon';
        
        // Canvas references
        this.canvases = {
            waveform: document.getElementById('waveformCanvas'),
            frequency: document.getElementById('frequencyCanvas'),
            circular: document.getElementById('circularCanvas'),
            radial: document.getElementById('radialCanvas'),
            waterfall: document.getElementById('waterfallCanvas'),
            particle: document.getElementById('particleCanvas')
        };
        
        // Canvas contexts
        this.contexts = {};
        Object.keys(this.canvases).forEach(key => {
            this.contexts[key] = this.canvases[key].getContext('2d');
        });
        
        // Particle system for particle visualizer
        this.particles = [];
        this.waterfallHistory = [];
        
        this.setupCanvases();
        this.setupEventListeners();
        this.setupColorSchemes();
    }

    setupCanvases() {
        Object.values(this.canvases).forEach(canvas => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            const ctx = canvas.getContext('2d');
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        });
    }

    setupColorSchemes() {
        this.colorSchemes = {
            neon: {
                bg: 'rgba(0, 0, 0, 0.1)',
                primary: '#00ff88',
                secondary: '#ff0088',
                accent: '#0088ff'
            },
            fire: {
                bg: 'rgba(20, 0, 0, 0.1)',
                primary: '#ff4500',
                secondary: '#ff6347',
                accent: '#ffd700'
            },
            ocean: {
                bg: 'rgba(0, 10, 20, 0.1)',
                primary: '#00bfff',
                secondary: '#1e90ff',
                accent: '#87ceeb'
            },
            rainbow: {
                bg: 'rgba(0, 0, 0, 0.1)',
                primary: '#ff0000',
                secondary: '#00ff00',
                accent: '#0000ff'
            },
            matrix: {
                bg: 'rgba(0, 0, 0, 0.1)',
                primary: '#00ff00',
                secondary: '#008000',
                accent: '#90ee90'
            }
        };
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startRecording());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopRecording());
        document.getElementById('playTestTone').addEventListener('click', () => this.playTestTone());
        document.getElementById('colorScheme').addEventListener('change', (e) => {
            this.colorScheme = e.target.value;
        });
    }

    async startRecording() {
        try {
            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            // Create analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.bufferLength = this.analyser.frequencyBinCount;
            
            // Create data arrays
            this.dataArray = new Uint8Array(this.bufferLength);
            this.frequencyData = new Uint8Array(this.bufferLength);
            
            // Connect audio nodes
            this.microphone.connect(this.analyser);
            
            // Update UI
            this.isRecording = true;
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            document.getElementById('recordingIndicator').classList.add('active');
            
            // Start visualization
            this.draw();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Error accessing microphone. Please ensure you have granted permission.');
        }
    }

    stopRecording() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.microphone) {
            this.microphone.disconnect();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.isRecording = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('recordingIndicator').classList.remove('active');
        
        // Clear canvases
        this.clearAllCanvases();
    }

    async playTestTone() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Stop any existing test tone
        if (this.testOscillator) {
            this.testOscillator.stop();
        }
        
        // Create analyser if not exists
        if (!this.analyser) {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            this.frequencyData = new Uint8Array(this.bufferLength);
        }
        
        // Create oscillator for test tone
        this.testOscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        this.testOscillator.type = 'sine';
        this.testOscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        // Connect nodes
        this.testOscillator.connect(gainNode);
        gainNode.connect(this.analyser);
        gainNode.connect(this.audioContext.destination);
        
        // Start oscillator
        this.testOscillator.start();
        
        // Stop after 3 seconds
        setTimeout(() => {
            if (this.testOscillator) {
                this.testOscillator.stop();
                this.testOscillator = null;
            }
        }, 3000);
        
        // Start visualization if not already running
        if (!this.isRecording) {
            this.draw();
        }
    }

    draw() {
        this.animationId = requestAnimationFrame(() => this.draw());
        
        if (!this.analyser) return;
        
        // Get audio data
        this.analyser.getByteTimeDomainData(this.dataArray);
        this.analyser.getByteFrequencyData(this.frequencyData);
        
        // Draw all visualizations
        this.drawWaveform();
        this.drawFrequencyBars();
        this.drawCircularFrequency();
        this.drawRadialWaveform();
        this.drawWaterfall();
        this.drawParticles();
    }

    drawWaveform() {
        const canvas = this.canvases.waveform;
        const ctx = this.contexts.waveform;
        const colors = this.colorSchemes[this.colorScheme];
        
        // Clear canvas with fade effect
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = colors.primary;
        ctx.beginPath();
        
        const sliceWidth = canvas.width / this.bufferLength;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }

    drawFrequencyBars() {
        const canvas = this.canvases.frequency;
        const ctx = this.contexts.frequency;
        const colors = this.colorSchemes[this.colorScheme];
        
        // Clear canvas
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / this.bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.frequencyData[i] / 255) * canvas.height;
            
            // Create gradient for bars
            const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
            gradient.addColorStop(0, colors.primary);
            gradient.addColorStop(1, colors.secondary);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }

    drawCircularFrequency() {
        const canvas = this.canvases.circular;
        const ctx = this.contexts.circular;
        const colors = this.colorSchemes[this.colorScheme];
        
        // Clear canvas
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        
        // Draw frequency data as circular bars
        for (let i = 0; i < this.bufferLength; i++) {
            const angle = (i / this.bufferLength) * Math.PI * 2;
            const barHeight = (this.frequencyData[i] / 255) * radius * 0.8;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = colors.accent;
        ctx.fill();
    }

    drawRadialWaveform() {
        const canvas = this.canvases.radial;
        const ctx = this.contexts.radial;
        const colors = this.colorSchemes[this.colorScheme];
        
        // Clear canvas
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(centerX, centerY) - 40;
        
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        for (let i = 0; i < this.bufferLength; i++) {
            const angle = (i / this.bufferLength) * Math.PI * 2;
            const amplitude = (this.dataArray[i] - 128) / 128;
            const radius = baseRadius + amplitude * 30;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.stroke();
    }

    drawWaterfall() {
        const canvas = this.canvases.waterfall;
        const ctx = this.contexts.waterfall;
        
        // Add current frequency data to history
        this.waterfallHistory.push([...this.frequencyData]);
        
        // Keep only recent history
        if (this.waterfallHistory.length > canvas.height) {
            this.waterfallHistory.shift();
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw waterfall
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        
        for (let y = 0; y < this.waterfallHistory.length; y++) {
            const row = this.waterfallHistory[y];
            for (let x = 0; x < Math.min(row.length, canvas.width); x++) {
                const value = row[x];
                const pixelIndex = (y * canvas.width + x) * 4;
                
                // Convert to RGB based on color scheme
                const colors = this.getWaterfallColor(value);
                imageData.data[pixelIndex] = colors.r;     // Red
                imageData.data[pixelIndex + 1] = colors.g; // Green
                imageData.data[pixelIndex + 2] = colors.b; // Blue
                imageData.data[pixelIndex + 3] = 255;      // Alpha
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    getWaterfallColor(value) {
        const intensity = value / 255;
        const colors = this.colorSchemes[this.colorScheme];
        
        switch (this.colorScheme) {
            case 'fire':
                return {
                    r: Math.floor(intensity * 255),
                    g: Math.floor(intensity * intensity * 255),
                    b: 0
                };
            case 'ocean':
                return {
                    r: 0,
                    g: Math.floor(intensity * 200),
                    b: Math.floor(intensity * 255)
                };
            case 'rainbow':
                const hue = intensity * 360;
                return this.hslToRgb(hue, 100, 50);
            default:
                return {
                    r: Math.floor(intensity * 100),
                    g: Math.floor(intensity * 255),
                    b: Math.floor(intensity * 100)
                };
        }
    }

    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        return {
            r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
            g: Math.round(hue2rgb(p, q, h) * 255),
            b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
        };
    }

    drawParticles() {
        const canvas = this.canvases.particle;
        const ctx = this.contexts.particle;
        const colors = this.colorSchemes[this.colorScheme];
        
        // Clear canvas with fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add new particles based on audio data
        const avgFrequency = this.frequencyData.reduce((a, b) => a + b, 0) / this.frequencyData.length;
        
        if (avgFrequency > 50) {
            for (let i = 0; i < 3; i++) {
                this.particles.push({
                    x: Math.random() * canvas.width,
                    y: canvas.height,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -Math.random() * 8 - 2,
                    life: 100,
                    maxLife: 100,
                    size: Math.random() * 4 + 2,
                    color: colors.primary
                });
            }
        }
        
        // Update and draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // Gravity
            particle.life--;
            
            // Remove dead particles
            if (particle.life <= 0 || particle.y > canvas.height) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Draw particle
            const alpha = particle.life / particle.maxLife;
            ctx.fillStyle = colors.primary.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    clearAllCanvases() {
        Object.values(this.contexts).forEach(ctx => {
            const canvas = ctx.canvas;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
        
        // Clear particle system
        this.particles = [];
        this.waterfallHistory = [];
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioVisualizer();
});