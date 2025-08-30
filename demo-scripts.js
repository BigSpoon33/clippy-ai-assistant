/**
 * Demo Scripts for Clippy AI Assistant GUI Components
 * Interactive demonstration of all visual enhancements
 */

// Import our components (in a real plugin, these would be properly imported)
import { GUIEnhancementManager } from './src/ui/components/gui-enhancement-manager.js';
import { ClippyMascot } from './src/ui/components/mascot/clippy-mascot.js';
import { ParticleSystem } from './src/ui/components/particles/particle-system.js';
import { GeometricPatternGenerator } from './src/ui/components/visualizers/geometric-pattern-generator.js';
import { EnhancedAudioVisualizer } from './src/ui/components/visualizers/enhanced-audio-visualizer.js';
import { AdaptiveThemeManager } from './src/ui/components/themes/adaptive-theme-manager.js';

// Global demo state
let demoState = {
    mascot: null,
    particles: {},
    patterns: {},
    audioVisualizers: {},
    themeManager: null,
    guiManager: null,
    isDarkMode: false,
    isPerformanceMode: false,
    mascotPersonalities: ['enthusiastic', 'calm', 'professional', 'quirky'],
    currentPersonality: 0
};

// Logging utility
function log(message, type = 'info') {
    const logOutput = document.getElementById('logOutput');
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '🔧';
    
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${timestamp}] ${emoji} ${message}`;
    logOutput.appendChild(logEntry);
    
    // Auto-scroll to bottom
    logOutput.scrollTop = logOutput.scrollHeight;
    
    // Keep only last 50 entries
    while (logOutput.children.length > 50) {
        logOutput.removeChild(logOutput.firstChild);
    }
}

// Initialize demo when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        log('Initializing Clippy AI GUI Components Demo...');
        
        // Initialize theme manager first
        demoState.themeManager = new AdaptiveThemeManager();
        log('✅ Theme manager initialized');
        
        // Initialize mascot
        await initializeMascot();
        
        // Initialize particle systems for each demo card
        await initializeParticleSystems();
        
        // Initialize geometric patterns
        await initializeGeometricPatterns();
        
        // Initialize audio visualizers
        await initializeAudioVisualizers();
        
        // Set up event listeners
        setupEventListeners();
        
        log('🎉 All GUI components initialized successfully!', 'success');
        
    } catch (error) {
        log(`Failed to initialize demo: ${error.message}`, 'error');
        console.error('Demo initialization error:', error);
    }
});

// Initialize mascot system
async function initializeMascot() {
    const container = document.getElementById('mascotContainer');
    
    demoState.mascot = new ClippyMascot(container, {
        position: 'relative',
        size: 'medium',
        personality: 'enthusiastic',
        reactToActivity: true,
        showTooltips: true
    });
    
    log('🤖 Mascot system initialized');
}

// Initialize particle systems
async function initializeParticleSystems() {
    const particleCards = ['particleDemo1', 'particleDemo2', 'particleDemo3', 'particleDemo4'];
    
    for (const cardId of particleCards) {
        const container = document.getElementById(cardId);
        if (container) {
            demoState.particles[cardId] = new ParticleSystem(container, {
                maxParticles: 30,
                enabled: false
            });
        }
    }
    
    log('✨ Particle systems initialized');
}

// Initialize geometric patterns
async function initializeGeometricPatterns() {
    const patternCards = ['patternDemo1', 'patternDemo2', 'patternDemo3', 'patternDemo4'];
    
    for (const cardId of patternCards) {
        const container = document.getElementById(cardId);
        if (container) {
            demoState.patterns[cardId] = new GeometricPatternGenerator(container, {
                width: 280,
                height: 160,
                centerX: 140,
                centerY: 80,
                animated: true,
                opacity: 0.7
            });
        }
    }
    
    log('🔮 Geometric patterns initialized');
}

// Initialize audio visualizers
async function initializeAudioVisualizers() {
    const audioCards = ['audioDemo1', 'audioDemo2', 'audioDemo3', 'audioDemo4'];
    const types = ['waveform', 'frequency', 'circular', 'compact'];
    
    for (let i = 0; i < audioCards.length; i++) {
        const container = document.getElementById(audioCards[i]);
        const canvas = container.querySelector('canvas') || container.appendChild(document.createElement('canvas'));
        
        canvas.style.width = '100%';
        canvas.style.height = '140px';
        canvas.style.marginTop = '10px';
        
        demoState.audioVisualizers[audioCards[i]] = new EnhancedAudioVisualizer({
            canvas: canvas,
            type: types[i],
            colorScheme: 'adaptive',
            showVAD: true
        });
    }
    
    log('🎵 Audio visualizers initialized');
}

// Set up event listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('toggleTheme').addEventListener('click', () => {
        demoState.isDarkMode = !demoState.isDarkMode;
        document.body.classList.toggle('theme-dark', demoState.isDarkMode);
        log(`Switched to ${demoState.isDarkMode ? 'dark' : 'light'} mode`);
    });
    
    // Clear log
    document.getElementById('clearLog').addEventListener('click', () => {
        document.getElementById('logOutput').innerHTML = '<div>🧹 Log cleared</div>';
    });
    
    // Performance mode toggle
    document.getElementById('enablePerformanceMode').addEventListener('change', (e) => {
        demoState.isPerformanceMode = e.target.checked;
        document.body.classList.toggle('clippy-performance-low', demoState.isPerformanceMode);
        log(`Performance mode: ${demoState.isPerformanceMode ? 'LOW' : 'HIGH'}`);
    });
    
    log('🔧 Event listeners set up');
}

// Mascot functions
window.triggerMascotExpression = function(expression) {
    if (demoState.mascot) {
        demoState.mascot.queueExpression(expression);
        log(`Mascot expression: ${expression}`);
    }
};

window.changeMascotPersonality = function() {
    if (demoState.mascot) {
        demoState.currentPersonality = (demoState.currentPersonality + 1) % demoState.mascotPersonalities.length;
        const newPersonality = demoState.mascotPersonalities[demoState.currentPersonality];
        
        demoState.mascot.updateConfig({ personality: newPersonality });
        log(`Mascot personality changed to: ${newPersonality}`);
    }
};

// Particle functions
window.startParticleEffect = function(effectType) {
    Object.values(demoState.particles).forEach(particleSystem => {
        particleSystem.start(effectType);
    });
    log(`Started particle effect: ${effectType}`);
};

window.triggerParticleBurst = function() {
    Object.values(demoState.particles).forEach(particleSystem => {
        particleSystem.burst(140, 80, 20);
    });
    log('Triggered particle burst');
};

window.stopAllParticles = function() {
    Object.values(demoState.particles).forEach(particleSystem => {
        particleSystem.stop();
    });
    log('Stopped all particles');
};

// Pattern functions
window.generatePattern = function(patternType) {
    const patternFunctions = {
        'flowerOfLife': 'generateFlowerOfLife',
        'goldenSpiral': 'generateGoldenSpiral',
        'fractalTree': 'generateFractalTree',
        'mandala': 'generateMandala',
        'metatron': 'generateMetatronsCube'
    };
    
    const functionName = patternFunctions[patternType];
    if (functionName) {
        Object.values(demoState.patterns).forEach(pattern => {
            pattern[functionName](60);
        });
        log(`Generated pattern: ${patternType}`);
    }
};

window.clearPatterns = function() {
    Object.values(demoState.patterns).forEach(pattern => {
        pattern.clearPattern();
    });
    log('Cleared all patterns');
};

// Audio functions
window.startAudioDemo = async function() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        Object.values(demoState.audioVisualizers).forEach(visualizer => {
            visualizer.connectToStream(stream);
        });
        
        log('Audio visualizers connected to microphone', 'success');
    } catch (error) {
        log(`Audio access denied: ${error.message}`, 'error');
    }
};

window.playTestTone = function() {
    Object.values(demoState.audioVisualizers).forEach(visualizer => {
        if (visualizer.playTestTone) {
            visualizer.playTestTone();
        }
    });
    log('Playing test tone');
};

window.stopAudioDemo = function() {
    Object.values(demoState.audioVisualizers).forEach(visualizer => {
        visualizer.stop();
    });
    log('Audio visualizers stopped');
};

window.toggleVAD = function() {
    Object.values(demoState.audioVisualizers).forEach(visualizer => {
        visualizer.updateConfig({ showVAD: !visualizer.config.showVAD });
    });
    log('Toggled Voice Activity Detection');
};

// Theme functions
window.switchTheme = function(themeName) {
    if (demoState.themeManager) {
        demoState.themeManager.switchToTheme(themeName);
        log(`Switched to theme: ${themeName}`);
    }
};

// Activity simulation
window.simulateActivity = function(activityType) {
    const activities = {
        'typing': () => {
            if (demoState.mascot) demoState.mascot.reactToActivity('typing', 0.8);
            if (demoState.themeManager) demoState.themeManager.updateActivityLevel(0.8);
            startParticleEffect('thinking');
        },
        'research': () => {
            if (demoState.mascot) demoState.mascot.reactToActivity('researching', 1);
            if (demoState.themeManager) demoState.themeManager.switchToContext('research');
            startParticleEffect('research');
            generatePattern('flowerOfLife');
        },
        'voice': () => {
            if (demoState.mascot) demoState.mascot.reactToActivity('voice_listening', 1);
            if (demoState.themeManager) demoState.themeManager.switchToContext('communication');
            startParticleEffect('voice');
        },
        'success': () => {
            if (demoState.mascot) demoState.mascot.reactToActivity('celebrating', 1);
            if (demoState.themeManager) demoState.themeManager.switchToContext('celebration');
            triggerParticleBurst();
            generatePattern('mandala');
        },
        'error': () => {
            if (demoState.mascot) demoState.mascot.reactToActivity('thinking', 0.3);
            if (demoState.themeManager) demoState.themeManager.switchToContext('error');
            startParticleEffect('error');
        }
    };
    
    if (activities[activityType]) {
        activities[activityType]();
        log(`Simulated activity: ${activityType}`);
    }
};

// Typing demo
let typingTimer;
window.handleTypingDemo = function(event) {
    clearTimeout(typingTimer);
    
    // Simulate typing activity
    simulateActivity('typing');
    
    // Return to idle after 2 seconds of no typing
    typingTimer = setTimeout(() => {
        if (demoState.mascot) {
            demoState.mascot.reactToActivity('idle');
        }
    }, 2000);
};

// Integration demonstrations
window.demonstrateIntegration = async function(flowType) {
    const flows = {
        'research-flow': async () => {
            log('🔬 Starting research workflow demonstration...');
            
            // 1. Switch to research theme
            switchTheme('research-mode');
            await wait(500);
            
            // 2. Show research pattern
            generatePattern('goldenSpiral');
            await wait(500);
            
            // 3. Start research particles
            startParticleEffect('research');
            await wait(500);
            
            // 4. Mascot starts thinking
            triggerMascotExpression('thinking');
            await wait(2000);
            
            // 5. Research complete - celebration
            triggerMascotExpression('celebrating');
            startParticleEffect('celebration');
            switchTheme('celebration');
            await wait(1000);
            
            // 6. Return to default
            switchTheme('adaptive-default');
            
            log('✅ Research workflow demonstration complete', 'success');
        },
        
        'chat-session': async () => {
            log('💬 Starting chat session demonstration...');
            
            // 1. Switch to communication mode
            switchTheme('communication-mode');
            await wait(500);
            
            // 2. Mascot listens
            triggerMascotExpression('listening');
            startParticleEffect('voice');
            await wait(1500);
            
            // 3. Mascot thinks
            triggerMascotExpression('thinking');
            await wait(1000);
            
            // 4. Mascot responds
            triggerMascotExpression('excited');
            await wait(1500);
            
            // 5. Return to default
            switchTheme('adaptive-default');
            
            log('✅ Chat session demonstration complete', 'success');
        },
        
        'success-celebration': async () => {
            log('🎉 Starting success celebration...');
            
            // 1. Build up anticipation
            triggerMascotExpression('working');
            startParticleEffect('processing');
            await wait(1000);
            
            // 2. Success moment!
            switchTheme('celebration');
            triggerMascotExpression('celebrating');
            triggerParticleBurst();
            generatePattern('mandala');
            await wait(2000);
            
            // 3. Calm down
            switchTheme('adaptive-default');
            
            log('✅ Success celebration complete', 'success');
        },
        
        'problem-solving': async () => {
            log('🚨 Starting problem-solving demonstration...');
            
            // 1. Problem detected
            switchTheme('problem-solving');
            triggerMascotExpression('thinking');
            startParticleEffect('error');
            await wait(1500);
            
            // 2. Working on solution
            generatePattern('fractalTree');
            await wait(1000);
            
            // 3. Solution found
            triggerMascotExpression('excited');
            switchTheme('adaptive-default');
            startParticleEffect('celebration');
            await wait(1000);
            
            log('✅ Problem-solving demonstration complete', 'success');
        }
    };
    
    if (flows[flowType]) {
        await flows[flowType]();
    }
};

// Utility function for delays
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Performance monitoring
setInterval(() => {
    const particleCount = Object.values(demoState.particles)
        .reduce((total, system) => total + (system.getParticleCount ? system.getParticleCount() : 0), 0);
    
    if (particleCount > 200 && !demoState.isPerformanceMode) {
        log('⚠️ High particle count detected, consider enabling performance mode', 'warning');
    }
}, 5000);

// Export for console access
window.demoState = demoState;
window.log = log;

log('🚀 Demo scripts loaded and ready!', 'success');