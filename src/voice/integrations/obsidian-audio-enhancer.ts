/**
 * Obsidian Audio Recorder STT Enhancement
 * Patches existing Obsidian audio recorder to add real-time transcription capability
 */

import { App, Editor, MarkdownView, Notice } from 'obsidian';
import ClippyPlugin from '../../main';
import { STTManager } from '../managers/stt-manager';
import { TranscriptionResult } from '../types/voice-types';

export interface AudioRecorderEnhancementConfig {
  enableSTTOption: boolean;
  autoTranscribe: boolean;
  insertAtCursor: boolean;
  preserveAudioLink: boolean;
  transcriptionPrefix: string;
  realTimeTranscription: boolean;
}

export interface AudioRecorderPatch {
  originalRecorder: any;
  enhancedRecorder: any;
  isPatched: boolean;
}

export class ObsidianAudioRecorderEnhancer {
  private app: App;
  private plugin: ClippyPlugin;
  private sttManager: STTManager | null = null;
  private patches: Map<string, AudioRecorderPatch> = new Map();
  
  private config: AudioRecorderEnhancementConfig = {
    enableSTTOption: true,
    autoTranscribe: false,
    insertAtCursor: true,
    preserveAudioLink: true,
    transcriptionPrefix: '**Transcription:** ',
    realTimeTranscription: true
  };
  
  // Transcription state
  private isTranscribing: boolean = false;
  private transcriptionBuffer: string = '';
  private currentRecording: {
    startTime: Date;
    transcription: string;
    audioFile?: string;
  } | null = null;

  constructor(app: App, plugin: ClippyPlugin) {
    this.app = app;
    this.plugin = plugin;
    this.initialize();
  }

  /**
   * Initialize the audio recorder enhancement system
   */
  private async initialize(): Promise<void> {
    console.log('[AudioRecorderEnhancer] Initializing audio recorder STT enhancement...');
    
    // Get STT manager from plugin
    if (this.plugin.voiceSystemV2) {
      this.sttManager = (this.plugin.voiceSystemV2 as any).sttManager;
    }
    
    if (!this.sttManager) {
      console.warn('[AudioRecorderEnhancer] STT Manager not available - creating fallback');
      // Create fallback STT manager if needed
      try {
        const eventEmitter = new (class {
          on(event: any, callback: any): void {}
          off(event: any, callback: any): void {}
          emit(event: any, data: any): void {}
        })();
        
        // Use existing voice configuration from plugin settings
        const voiceConfig = this.plugin.settings.voice;
        this.sttManager = new STTManager(voiceConfig as any, eventEmitter);
        await this.sttManager.initialize();
      } catch (error) {
        console.error('[AudioRecorderEnhancer] Failed to create STT manager:', error);
      }
    }
    
    // Look for and patch existing audio recorder
    this.findAndPatchAudioRecorder();
  }

  /**
   * Find Obsidian's audio recorder and apply enhancements
   */
  private findAndPatchAudioRecorder(): void {
    try {
      // Obsidian's audio recorder is typically accessible through the app
      const audioRecorder = this.findAudioRecorderInApp();
      
      if (audioRecorder) {
        this.patchAudioRecorder(audioRecorder);
        console.log('[AudioRecorderEnhancer] Successfully patched audio recorder');
      } else {
        console.log('[AudioRecorderEnhancer] Audio recorder not found, setting up fallback monitoring');
        this.setupFallbackMonitoring();
      }
    } catch (error) {
      console.error('[AudioRecorderEnhancer] Failed to patch audio recorder:', error);
    }
  }

  /**
   * Find audio recorder in Obsidian app structure
   */
  private findAudioRecorderInApp(): any {
    try {
      // Common locations for audio recorder in Obsidian
      const app = this.app as any;
      
      // Check workspace for audio recorder
      if (app.workspace?.audioRecorder) {
        return app.workspace.audioRecorder;
      }
      
      // Check plugins for audio recording functionality
      if (app.plugins?.plugins) {
        for (const plugin of Object.values(app.plugins.plugins) as any[]) {
          if (plugin.audioRecorder || plugin.recorder) {
            return plugin.audioRecorder || plugin.recorder;
          }
        }
      }
      
      // Check internal components
      if (app.recorder) {
        return app.recorder;
      }
      
      console.log('[AudioRecorderEnhancer] No built-in audio recorder found');
      return null;
    } catch (error) {
      console.error('[AudioRecorderEnhancer] Error searching for audio recorder:', error);
      return null;
    }
  }

  /**
   * Patch the found audio recorder with STT capabilities
   */
  private patchAudioRecorder(audioRecorder: any): void {
    try {
      const originalStart = audioRecorder.startRecording?.bind(audioRecorder);
      const originalStop = audioRecorder.stopRecording?.bind(audioRecorder);
      
      if (originalStart) {
        audioRecorder.startRecording = async (options?: any) => {
          console.log('[AudioRecorderEnhancer] Enhanced recording started');
          
          // Start original recording
          const recordingResult = await originalStart(options);
          
          // Start parallel STT if enabled
          if (this.config.enableSTTOption && this.sttManager) {
            await this.startParallelSTT();
          }
          
          return recordingResult;
        };
      }
      
      if (originalStop) {
        audioRecorder.stopRecording = async () => {
          console.log('[AudioRecorderEnhancer] Enhanced recording stopped');
          
          // Stop STT first
          await this.stopParallelSTT();
          
          // Stop original recording
          const result = await originalStop();
          
          // Process and insert transcription
          await this.processRecordingCompletion(result);
          
          return result;
        };
      }
      
      // Store patch information
      this.patches.set('main', {
        originalRecorder: { startRecording: originalStart, stopRecording: originalStop },
        enhancedRecorder: audioRecorder,
        isPatched: true
      });
      
    } catch (error) {
      console.error('[AudioRecorderEnhancer] Error patching audio recorder:', error);
    }
  }

  /**
   * Set up fallback monitoring for audio files
   */
  private setupFallbackMonitoring(): void {
    console.log('[AudioRecorderEnhancer] Setting up fallback file monitoring...');
    
    // Monitor for new audio files in the vault
    this.app.vault.on('create', async (file) => {
      if (this.isAudioFile(file.name)) {
        console.log('[AudioRecorderEnhancer] New audio file detected:', file.name);
        
        // Add small delay to ensure file is fully written
        setTimeout(() => {
          this.offerTranscriptionForFile(file.path);
        }, 2000);
      }
    });
  }

  /**
   * Start parallel STT during recording
   */
  private async startParallelSTT(): Promise<void> {
    if (!this.sttManager || this.isTranscribing) {
      return;
    }
    
    try {
      this.isTranscribing = true;
      this.transcriptionBuffer = '';
      this.currentRecording = {
        startTime: new Date(),
        transcription: ''
      };
      
      // Start continuous transcription
      const success = await this.sttManager.startContinuousListening(
        (result: TranscriptionResult) => {
          this.handleTranscriptionResult(result);
        }
      );
      
      if (success) {
        console.log('[AudioRecorderEnhancer] Parallel STT started');
        if (this.config.realTimeTranscription) {
          new Notice('🎤 Recording with real-time transcription...', 3000);
        }
      }
      
    } catch (error) {
      console.error('[AudioRecorderEnhancer] Failed to start parallel STT:', error);
      this.isTranscribing = false;
    }
  }

  /**
   * Stop parallel STT
   */
  private async stopParallelSTT(): Promise<void> {
    if (!this.sttManager || !this.isTranscribing) {
      return;
    }
    
    try {
      await this.sttManager.stopContinuousListening();
      this.isTranscribing = false;
      
      // Finalize transcription
      if (this.currentRecording) {
        this.currentRecording.transcription = this.transcriptionBuffer.trim();
      }
      
      console.log('[AudioRecorderEnhancer] Parallel STT stopped');
    } catch (error) {
      console.error('[AudioRecorderEnhancer] Error stopping parallel STT:', error);
    }
  }

  /**
   * Handle transcription results during recording
   */
  private handleTranscriptionResult(result: TranscriptionResult): void {
    if (result.text && result.text.trim()) {
      // Update buffer with new text
      if (result.isFinal) {
        this.transcriptionBuffer += result.text + ' ';
        console.log('[AudioRecorderEnhancer] Final transcription:', result.text);
      } else if (this.config.realTimeTranscription) {
        // Show interim results if real-time is enabled
        console.log('[AudioRecorderEnhancer] Interim transcription:', result.text);
      }
    }
  }

  /**
   * Process recording completion and insert transcription
   */
  private async processRecordingCompletion(recordingResult: any): Promise<void> {
    if (!this.currentRecording || !this.transcriptionBuffer.trim()) {
      this.currentRecording = null;
      return;
    }
    
    try {
      const transcription = this.transcriptionBuffer.trim();
      console.log('[AudioRecorderEnhancer] Processing transcription:', transcription.substring(0, 100) + '...');
      
      // Get active editor
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      
      if (activeView?.editor && this.config.insertAtCursor) {
        await this.insertTranscriptionIntoEditor(activeView.editor, transcription, recordingResult);
      } else {
        // Offer to insert transcription later
        this.offerTranscriptionInsertion(transcription, recordingResult);
      }
      
    } catch (error) {
      console.error('[AudioRecorderEnhancer] Error processing recording completion:', error);
    } finally {
      this.currentRecording = null;
      this.transcriptionBuffer = '';
    }
  }

  /**
   * Insert transcription into active editor
   */
  private async insertTranscriptionIntoEditor(
    editor: Editor, 
    transcription: string, 
    recordingResult?: any
  ): Promise<void> {
    try {
      const cursor = editor.getCursor();
      let insertText = '';
      
      // Add audio link if preserving and available
      if (this.config.preserveAudioLink && recordingResult?.fileName) {
        insertText += `![[${recordingResult.fileName}]]\n`;
      }
      
      // Add transcription with prefix
      insertText += `${this.config.transcriptionPrefix}${transcription}\n\n`;
      
      // Insert at cursor position
      editor.replaceRange(insertText, cursor);
      
      // Move cursor to end of inserted text
      const lines = insertText.split('\n');
      const newCursor = {
        line: cursor.line + lines.length - 1,
        ch: lines[lines.length - 1].length
      };
      editor.setCursor(newCursor);
      
      new Notice(`✅ Audio transcription inserted (${transcription.length} characters)`);
      console.log('[AudioRecorderEnhancer] Transcription inserted into editor');
      
    } catch (error) {
      console.error('[AudioRecorderEnhancer] Error inserting transcription:', error);
      new Notice('❌ Failed to insert transcription');
    }
  }

  /**
   * Offer transcription insertion when no active editor
   */
  private offerTranscriptionInsertion(transcription: string, recordingResult?: any): void {
    const message = `Audio recorded with transcription (${transcription.length} chars). Open a note to insert it?`;
    
    new Notice(message, 8000);
    
    // Store transcription for later insertion
    (window as any).clippyPendingTranscription = {
      text: transcription,
      recording: recordingResult,
      timestamp: Date.now()
    };
    
    console.log('[AudioRecorderEnhancer] Transcription stored for later insertion');
  }

  /**
   * Offer transcription for existing audio file
   */
  private async offerTranscriptionForFile(filePath: string): Promise<void> {
    if (!this.sttManager) {
      return;
    }
    
    try {
      // Note: Web Speech API doesn't support file transcription
      // This would require a different STT engine like Whisper
      console.log('[AudioRecorderEnhancer] File transcription not available with current STT engine');
      
      // Could potentially offer to play the file and transcribe in real-time
      new Notice(`📄 New audio file: ${filePath}. Real-time transcription available during next recording.`, 5000);
      
    } catch (error) {
      console.error('[AudioRecorderEnhancer] Error offering file transcription:', error);
    }
  }

  /**
   * Check if file is an audio file
   */
  private isAudioFile(fileName: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.mp4'];
    return audioExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioRecorderEnhancementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[AudioRecorderEnhancer] Configuration updated:', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioRecorderEnhancementConfig {
    return { ...this.config };
  }

  /**
   * Check if enhancement is available
   */
  isAvailable(): boolean {
    return !!this.sttManager;
  }

  /**
   * Get enhancement status
   */
  getStatus(): {
    sttAvailable: boolean;
    isTranscribing: boolean;
    patchedRecorders: number;
    currentRecording: any;
  } {
    return {
      sttAvailable: !!this.sttManager,
      isTranscribing: this.isTranscribing,
      patchedRecorders: this.patches.size,
      currentRecording: this.currentRecording
    };
  }

  /**
   * Manually start transcription (for testing or fallback)
   */
  async startManualTranscription(): Promise<void> {
    if (this.isTranscribing) {
      new Notice('⚠️ Transcription already in progress');
      return;
    }
    
    await this.startParallelSTT();
    new Notice('🎤 Manual transcription started - speak now');
  }

  /**
   * Manually stop transcription
   */
  async stopManualTranscription(): Promise<void> {
    if (!this.isTranscribing) {
      new Notice('⚠️ No transcription in progress');
      return;
    }
    
    await this.stopParallelSTT();
    await this.processRecordingCompletion(null);
    new Notice('⏹️ Manual transcription stopped');
  }

  /**
   * Insert pending transcription if available
   */
  async insertPendingTranscription(): Promise<void> {
    const pending = (window as any).clippyPendingTranscription;
    
    if (!pending) {
      new Notice('ℹ️ No pending transcription available');
      return;
    }
    
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    
    if (activeView?.editor) {
      await this.insertTranscriptionIntoEditor(activeView.editor, pending.text, pending.recording);
      delete (window as any).clippyPendingTranscription;
    } else {
      new Notice('⚠️ Please open a note to insert the transcription');
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      // Stop any active transcription
      if (this.isTranscribing) {
        await this.stopParallelSTT();
      }
      
      // Restore original recorder methods
      for (const patch of this.patches.values()) {
        if (patch.isPatched && patch.originalRecorder) {
          Object.assign(patch.enhancedRecorder, patch.originalRecorder);
        }
      }
      
      this.patches.clear();
      
      console.log('[AudioRecorderEnhancer] Cleanup completed');
    } catch (error) {
      console.error('[AudioRecorderEnhancer] Error during cleanup:', error);
    }
  }
}