/**
 * SpeechIntegration.ts
 * Integrates speech-to-text functionality with notepad UI
 */

import { createSpeechService, SpeechService, TranscriptionResult } from '../../services/speechService';

export interface SpeechIntegrationOptions {
  onTranscript: (transcript: string) => void;
  onError?: (error: Error) => void;
}

export class SpeechIntegration {
  private speechService: SpeechService | null = null;
  private isRecording = false;
  private status: 'idle' | 'listening' | 'processing' | 'error' = 'idle';
  private options: SpeechIntegrationOptions;
  private buttonElement: HTMLElement | null = null;
  private interimElement: HTMLElement | null = null;

  constructor(options: SpeechIntegrationOptions) {
    this.options = options;
    this.initializeSpeechService();
    this.injectGlobalStyles();
  }

  private initializeSpeechService() {
    try {
      this.speechService = createSpeechService({
        onTranscript: (result: TranscriptionResult) => {
          if (result.is_final) {
            // Final transcript - add to notepad
            if (result.transcript.trim()) {
              this.options.onTranscript(result.transcript);
            }
            this.hideInterimTranscript();
          } else {
            // Interim transcript - show as preview
            this.showInterimTranscript(result.transcript);
          }
        },
        onError: (error: Error) => {
          console.error('Speech service error:', error);
          this.setStatus('error');
          this.isRecording = false;
          this.updateButtonState();
          if (this.options.onError) {
            this.options.onError(error);
          }
        },
        onStatusChange: (newStatus) => {
          this.setStatus(newStatus);
          if (newStatus === 'idle') {
            this.isRecording = false;
            this.hideInterimTranscript();
          }
          this.updateButtonState();
        }
      });
    } catch (error) {
      console.error('Failed to initialize speech service:', error);
      this.setStatus('error');
    }
  }

  private setStatus(status: 'idle' | 'listening' | 'processing' | 'error') {
    this.status = status;
  }

  private injectGlobalStyles() {
    // Check if styles are already injected
    if (document.getElementById('mw-speech-global-styles')) {
      return;
    }

    // Create and inject global styles for interim transcript
    const styleElement = document.createElement('style');
    styleElement.id = 'mw-speech-global-styles';
    styleElement.textContent = `
      .mw-interim-transcript {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        white-space: nowrap;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
        opacity: 0.9;
        z-index: 10000;
        position: absolute;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(styleElement);
  }

  public createSpeechButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'mw-notepad-control mw-speech-button';
    button.title = 'Voice input';
    button.type = 'button';
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleRecording();
    });

    this.buttonElement = button;
    this.updateButtonState();
    
    return button;
  }

  private updateButtonState() {
    if (!this.buttonElement) return;

    // Remove all status classes
    this.buttonElement.classList.remove(
      'mw-speech-idle',
      'mw-speech-listening', 
      'mw-speech-processing',
      'mw-speech-error'
    );

    // Add current status class
    this.buttonElement.classList.add(`mw-speech-${this.status}`);

    // Update button content
    this.buttonElement.innerHTML = this.getButtonIcon();

    // Update tooltip
    this.buttonElement.title = this.getTooltipText();

    // Update disabled state
    (this.buttonElement as HTMLButtonElement).disabled = this.status === 'processing';
  }

  private getButtonIcon(): string {
    switch (this.status) {
      case 'listening':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <path d="M12 19v4"/>
          <path d="M8 23h8"/>
          <circle cx="12" cy="12" r="2" fill="white"/>
        </svg>`;
      case 'processing':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.56 1.23"/>
        </svg>`;
      case 'error':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>`;
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <path d="M12 19v4"/>
          <path d="M8 23h8"/>
        </svg>`;
    }
  }

  private getTooltipText(): string {
    switch (this.status) {
      case 'listening':
        return 'Click to stop recording';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Speech-to-text error occurred';
      default:
        return 'Click to start voice recording';
    }
  }

  private async toggleRecording() {
    if (!this.speechService) {
      console.error('Speech service not available');
      return;
    }

    if (this.isRecording) {
      await this.speechService.stopRecording();
    } else {
      this.isRecording = true;
      await this.speechService.startRecording({
        language: 'en-US',
        punctuate: true,
        interim_results: true,
      });
    }
  }

  private showInterimTranscript(transcript: string) {
    if (!this.buttonElement || !transcript.trim()) return;

    // Remove existing interim element
    this.hideInterimTranscript();

    // Create interim transcript element
    this.interimElement = document.createElement('div');
    this.interimElement.className = 'mw-interim-transcript';
    this.interimElement.textContent = transcript;

    // Position it relative to the button
    const buttonRect = this.buttonElement.getBoundingClientRect();
    this.interimElement.style.position = 'absolute';
    this.interimElement.style.top = `${buttonRect.bottom + 4}px`;
    this.interimElement.style.left = `${buttonRect.left}px`;
    this.interimElement.style.transform = 'translateX(-50%)';
    this.interimElement.style.zIndex = '10000';

    // Add to document body (since it needs to be outside shadow DOM)
    document.body.appendChild(this.interimElement);
  }

  private hideInterimTranscript() {
    if (this.interimElement) {
      if (this.interimElement.parentNode) {
        this.interimElement.parentNode.removeChild(this.interimElement);
      }
      this.interimElement = null;
    }
  }

  public getAdditionalStyles(): string {
    return `
      /* Speech button styles */
      .mw-speech-button.mw-speech-listening {
        background-color: #ef4444;
        color: white;
        animation: mw-speech-pulse 1.5s infinite;
      }
      
      .mw-speech-button.mw-speech-listening:hover {
        background-color: #dc2626;
      }
      
      .mw-speech-button.mw-speech-processing {
        background-color: #f59e0b;
        color: white;
      }
      
      .mw-speech-button.mw-speech-error {
        background-color: #fef2f2;
        color: #ef4444;
        border: 1px solid #fecaca;
      }
      
      @keyframes mw-speech-pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }
      
      /* Global interim transcript styles (outside shadow DOM) */
      .mw-interim-transcript {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        white-space: nowrap;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
        opacity: 0.9;
      }
    `;
  }

  public destroy() {
    this.hideInterimTranscript();
    
    if (this.speechService) {
      this.speechService.destroy();
      this.speechService = null;
    }
    
    this.buttonElement = null;
  }
}
