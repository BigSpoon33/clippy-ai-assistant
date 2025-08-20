/**
 * Jest Test Setup
 * Configure testing environment for CLIPPY AI Assistant
 */

// Mock AudioContext for Web Audio API tests
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn(),
    getByteTimeDomainData: jest.fn(),
    smoothingTimeConstant: 0.8,
    minDecibels: -100,
    maxDecibels: -30,
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    gain: { value: 1.0 },
  }),
  createMediaElementSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  destination: {},
  sampleRate: 44100,
  currentTime: 0,
  state: 'running',
  close: jest.fn(),
  resume: jest.fn(),
  suspend: jest.fn(),
}));

// Mock MediaDevices for getUserMedia tests
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([
        {
          stop: jest.fn(),
          kind: 'audio',
          enabled: true,
        }
      ]),
      getAudioTracks: jest.fn().mockReturnValue([
        {
          stop: jest.fn(),
          kind: 'audio',
          enabled: true,
        }
      ]),
      active: true,
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      {
        deviceId: 'default',
        kind: 'audioinput',
        label: 'Default Microphone',
        groupId: 'default',
      },
      {
        deviceId: 'speakers',
        kind: 'audiooutput', 
        label: 'Default Speakers',
        groupId: 'default',
      },
    ]),
  },
});

// Mock HTMLAudioElement
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: '',
  currentTime: 0,
  duration: 100,
  volume: 1.0,
  muted: false,
  paused: true,
  ended: false,
  readyState: 4,
}));

// Mock Canvas for rendering tests
HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation((contextType) => {
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      arc: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 100 }),
      createLinearGradient: jest.fn().mockReturnValue({
        addColorStop: jest.fn(),
      }),
      createRadialGradient: jest.fn().mockReturnValue({
        addColorStop: jest.fn(),
      }),
      setTransform: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      getImageData: jest.fn().mockReturnValue({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
      }),
      putImageData: jest.fn(),
      drawImage: jest.fn(),
      canvas: {
        width: 800,
        height: 600,
      },
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '12px Arial',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      globalAlpha: 1.0,
      globalCompositeOperation: 'source-over',
    };
  }
  return null;
});

// Mock requestAnimationFrame for animation tests
global.requestAnimationFrame = jest.fn().mockImplementation((callback) => {
  return setTimeout(callback, 16); // 60 FPS simulation
});

global.cancelAnimationFrame = jest.fn().mockImplementation((id) => {
  clearTimeout(id);
});

// Mock performance for timing tests
global.performance = {
  now: jest.fn().mockReturnValue(Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn().mockReturnValue([]),
  getEntriesByType: jest.fn().mockReturnValue([]),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
} as any;

// Mock URL.createObjectURL for blob tests
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock localStorage for settings tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Increase Jest timeout for async tests
jest.setTimeout(30000);

// Console override for test debugging
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Suppress known warnings in tests
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render') ||
     message.includes('Warning: componentWillMount'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Setup cleanup for tests
afterEach(() => {
  jest.clearAllMocks();
  // Reset any global state if needed
});

export {};