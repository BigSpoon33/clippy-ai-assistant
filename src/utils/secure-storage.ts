/**
 * Secure Storage Utility for CLIPPY AI Assistant
 * Provides encryption/decryption for sensitive data like API keys
 */

/**
 * Simple encryption/decryption utility using browser's built-in crypto
 * Note: This provides basic obfuscation. For production, consider using 
 * platform-specific secure storage (Keychain on macOS, Credential Manager on Windows)
 */
export class SecureStorage {
  private static readonly ENCRYPTION_KEY = 'clippy-ai-secure-key';
  private static readonly ENCRYPTED_PREFIX = 'enc:';

  /**
   * Encrypt sensitive data (basic XOR encryption for obfuscation)
   * In production, this should use proper encryption libraries
   */
  static encrypt(plaintext: string): string {
    if (!plaintext || plaintext.trim() === '') {
      return plaintext;
    }

    try {
      // Simple XOR encryption for basic obfuscation
      const key = this.ENCRYPTION_KEY;
      let encrypted = '';
      
      for (let i = 0; i < plaintext.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const plaintextChar = plaintext.charCodeAt(i);
        encrypted += String.fromCharCode(plaintextChar ^ keyChar);
      }
      
      // Base64 encode and add prefix
      const base64 = btoa(encrypted);
      return this.ENCRYPTED_PREFIX + base64;
    } catch (error) {
      console.warn('[SecureStorage] Encryption failed, storing as plaintext:', error);
      return plaintext;
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(ciphertext: string): string {
    if (!ciphertext || ciphertext.trim() === '') {
      return ciphertext;
    }

    // Check if data is encrypted
    if (!ciphertext.startsWith(this.ENCRYPTED_PREFIX)) {
      return ciphertext; // Not encrypted, return as-is
    }

    try {
      // Remove prefix and decode
      const base64 = ciphertext.substring(this.ENCRYPTED_PREFIX.length);
      const encrypted = atob(base64);
      
      // XOR decrypt
      const key = this.ENCRYPTION_KEY;
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      
      return decrypted;
    } catch (error) {
      console.warn('[SecureStorage] Decryption failed, returning as-is:', error);
      return ciphertext;
    }
  }

  /**
   * Check if a string is encrypted
   */
  static isEncrypted(data: string): boolean {
    return !!(data && data.startsWith(this.ENCRYPTED_PREFIX));
  }

  /**
   * Encrypt API keys in settings object
   */
  static encryptSettings(settings: any): any {
    const encrypted = JSON.parse(JSON.stringify(settings)); // Deep clone

    // Encrypt provider API keys
    if (encrypted.providers) {
      Object.keys(encrypted.providers).forEach(provider => {
        if (encrypted.providers[provider].apiKey) {
          encrypted.providers[provider].apiKey = this.encrypt(encrypted.providers[provider].apiKey);
        }
      });
    }

    // Encrypt research API keys
    if (encrypted.research?.searchEngine) {
      const searchEngine = encrypted.research.searchEngine;
      const apiKeyFields = ['tavilyApiKey', 'braveApiKey', 'serpApiKey', 'serperApiKey'];
      
      apiKeyFields.forEach(field => {
        if (searchEngine[field]) {
          searchEngine[field] = this.encrypt(searchEngine[field]);
        }
      });
    }

    // Encrypt voice API keys
    if (encrypted.voice) {
      if (encrypted.voice.elevenlabsApiKey) {
        encrypted.voice.elevenlabsApiKey = this.encrypt(encrypted.voice.elevenlabsApiKey);
      }
      if (encrypted.voice.openaiTts?.apiKey) {
        encrypted.voice.openaiTts.apiKey = this.encrypt(encrypted.voice.openaiTts.apiKey);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt API keys in settings object
   */
  static decryptSettings(settings: any): any {
    const decrypted = JSON.parse(JSON.stringify(settings)); // Deep clone

    // Decrypt provider API keys
    if (decrypted.providers) {
      Object.keys(decrypted.providers).forEach(provider => {
        if (decrypted.providers[provider].apiKey) {
          decrypted.providers[provider].apiKey = this.decrypt(decrypted.providers[provider].apiKey);
        }
      });
    }

    // Decrypt research API keys
    if (decrypted.research?.searchEngine) {
      const searchEngine = decrypted.research.searchEngine;
      const apiKeyFields = ['tavilyApiKey', 'braveApiKey', 'serpApiKey', 'serperApiKey'];
      
      apiKeyFields.forEach(field => {
        if (searchEngine[field]) {
          searchEngine[field] = this.decrypt(searchEngine[field]);
        }
      });
    }

    // Decrypt voice API keys
    if (decrypted.voice) {
      if (decrypted.voice.elevenlabsApiKey) {
        decrypted.voice.elevenlabsApiKey = this.decrypt(decrypted.voice.elevenlabsApiKey);
      }
      if (decrypted.voice.openaiTts?.apiKey) {
        decrypted.voice.openaiTts.apiKey = this.decrypt(decrypted.voice.openaiTts.apiKey);
      }
    }

    return decrypted;
  }

  /**
   * Sanitize sensitive data for logging
   */
  static sanitizeForLogging(data: string): string {
    if (!data || data.trim() === '') {
      return data;
    }

    // Hide most of the content, show only first and last few characters
    if (data.length <= 8) {
      return '••••••••';
    }

    return data.substring(0, 4) + '••••••••' + data.substring(data.length - 4);
  }

  /**
   * Validate API key format
   */
  static validateApiKeyFormat(apiKey: string, expectedPrefix?: string): boolean {
    if (!apiKey || apiKey.trim() === '') {
      return false;
    }

    // Basic validation - at least 20 characters
    if (apiKey.length < 20) {
      return false;
    }

    // Check prefix if provided
    if (expectedPrefix && !apiKey.startsWith(expectedPrefix)) {
      return false;
    }

    // Check for common test/placeholder values
    const invalidValues = ['test', 'placeholder', 'your-api-key', 'sk-...', 'tvly-...'];
    if (invalidValues.some(invalid => apiKey.toLowerCase().includes(invalid))) {
      return false;
    }

    return true;
  }
}

/**
 * Content sanitization utilities
 */
export class ContentSanitizer {
  // Enhanced API key patterns for detection
  private static readonly API_KEY_PATTERNS = [
    /\bsk-[A-Za-z0-9]{40,}\b/g,           // OpenAI keys
    /\bsk-ant-[A-Za-z0-9_-]{95,}\b/g,     // Anthropic keys
    /\btvly-[A-Za-z0-9_-]{20,}\b/g,       // Tavily keys
    /\bxai-[A-Za-z0-9_-]{20,}\b/g,        // xAI keys
    /\b[A-Za-z0-9_-]{32,}\b/g,            // Generic long tokens
    /api[_-]?key["\s]*[:=]["\s]*[A-Za-z0-9_-]{20,}/gi, // API key assignments
  ];

  /**
   * Remove potential API keys from content
   */
  static sanitizeContent(content: string): string {
    if (!content || typeof content !== 'string') return String(content || '');

    let sanitized = content;
    
    try {
      this.API_KEY_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REDACTED_API_KEY]');
      });
    } catch (e) {
      console.warn('Error sanitizing content:', e);
      return '[SANITIZATION_ERROR]';
    }

    return sanitized;
  }

  /**
   * Check if content contains potential API keys
   */
  static containsApiKeys(content: string): boolean {
    if (!content) return false;

    return this.API_KEY_PATTERNS.some(pattern => pattern.test(content));
  }

  /**
   * Sanitize error messages
   */
  static sanitizeError(error: any): string {
    if (!error) return '';

    let message: string;
    try {
      if (typeof error === 'string') {
        message = error;
      } else if (error.message) {
        message = String(error.message);
      } else {
        message = String(error);
      }
    } catch (e) {
      message = 'Unknown error';
    }

    return this.sanitizeContent(message);
  }
}