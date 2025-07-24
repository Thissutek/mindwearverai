/**
 * NotepadUI.ts
 * Handles DOM manipulation for notepad elements
 */

import { NotepadState } from '../state/StateManager';
import { SpeechIntegration } from './SpeechIntegration';
import { TagManager } from '../tags/TagManager';
import './notepad.css';

export interface NotepadUICallbacks {
  onContentChange?: (content: string) => void;
  onMinimize?: () => void;
  onCollapse?: () => void;
  onClose?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSpeechTranscript?: (transcript: string) => void;
  onTagsChange?: (tags: string[]) => void;
}

export class NotepadUI {
  private element: HTMLElement;
  private headerElement: HTMLElement;
  private tagSection: HTMLElement;
  private contentElement: HTMLTextAreaElement;
  private currentState: NotepadState = NotepadState.NORMAL;
  private callbacks: NotepadUICallbacks;
  private contentChangeDebounceTimer: number | null = null;
  private contentDebounceDelay = 300; // 300ms debounce for content changes
  private speechIntegration: SpeechIntegration | null = null;
  private tagManager: TagManager | null = null;
  
  constructor(id: string, callbacks: NotepadUICallbacks = {}) {
    this.callbacks = callbacks;
    
    // Create the notepad container with shadow DOM for style isolation
    this.element = document.createElement('div');
    this.element.id = id;
    this.element.className = 'mw-notepad';
    
    // Create shadow DOM
    const shadowRoot = this.element.attachShadow({ mode: 'open' });
    
    // Initialize speech integration first (before creating header)
    this.initializeSpeechIntegration();
    
    // Add styles to shadow DOM
    const styleElement = document.createElement('style');
    styleElement.textContent = this.getStyles();
    shadowRoot.appendChild(styleElement);
    
    // Create notepad container inside shadow DOM
    const container = document.createElement('div');
    container.className = 'mw-notepad-container';
    shadowRoot.appendChild(container);
    
    // Create header (speech integration is now available)
    this.headerElement = this.createHeader();
    container.appendChild(this.headerElement);
    
    // Create tag section
    this.tagSection = this.createTagSection();
    container.appendChild(this.tagSection);
    
    // Create content area
    this.contentElement = this.createContentArea();
    container.appendChild(this.contentElement);
    
    // Add to document
    document.body.appendChild(this.element);
  }
  
  /**
   * Initialize speech integration
   */
  private initializeSpeechIntegration(): void {
    if (this.callbacks.onSpeechTranscript) {
      this.speechIntegration = new SpeechIntegration({
        onTranscript: (transcript: string) => {
          if (this.callbacks.onSpeechTranscript) {
            this.callbacks.onSpeechTranscript(transcript);
          }
        },
        onError: (error: Error) => {
          console.error('Speech integration error:', error);
        }
      });
    }
  }

  /**
   * Create the notepad header with controls
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'mw-notepad-header';
    
    // Add title
    const title = document.createElement('div');
    title.className = 'mw-notepad-title';
    title.textContent = 'Note';
    header.appendChild(title);
    
    // Add controls container
    const controls = document.createElement('div');
    controls.className = 'mw-notepad-controls';
    
    // Add undo button
    const undoButton = document.createElement('button');
    undoButton.className = 'mw-notepad-control mw-notepad-undo';
    undoButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>';
    undoButton.title = 'Undo';
    undoButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.callbacks.onUndo) {
        this.callbacks.onUndo();
      }
    });
    controls.appendChild(undoButton);
    
    // Add redo button
    const redoButton = document.createElement('button');
    redoButton.className = 'mw-notepad-control mw-notepad-redo';
    redoButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path></svg>';
    redoButton.title = 'Redo';
    redoButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.callbacks.onRedo) {
        this.callbacks.onRedo();
      }
    });
    controls.appendChild(redoButton);
    
    // Add speech button if speech integration is available
    if (this.speechIntegration) {
      const speechButton = this.speechIntegration.createSpeechButton();
      controls.appendChild(speechButton);
    }
    
    // Add collapse button
    const collapseButton = document.createElement('button');
    collapseButton.className = 'mw-notepad-control mw-notepad-collapse';
    collapseButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 10H3"></path><path d="M21 6H3"></path><path d="M21 14H3"></path><path d="M17 18H3"></path></svg>';
    collapseButton.title = 'Collapse';
    collapseButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.callbacks.onCollapse) {
        this.callbacks.onCollapse();
      }
    });
    controls.appendChild(collapseButton);
    
    // Add minimize button
    const minimizeButton = document.createElement('button');
    minimizeButton.className = 'mw-notepad-control mw-notepad-minimize';
    minimizeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path></svg>';
    minimizeButton.title = 'Minimize';
    minimizeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.callbacks.onMinimize) {
        this.callbacks.onMinimize();
      }
    });
    controls.appendChild(minimizeButton);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'mw-notepad-control mw-notepad-close';
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
    closeButton.title = 'Close';
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.callbacks.onClose) {
        this.callbacks.onClose();
      }
    });
    controls.appendChild(closeButton);
    
    header.appendChild(controls);
    return header;
  }

  /**
   * Create the tag section between header and content
   */
  private createTagSection(): HTMLElement {
    const tagSection = document.createElement('div');
    tagSection.className = 'mw-notepad-tag-section';
    
    // Initialize tag manager
    this.tagManager = new TagManager({
      container: tagSection,
      initialTags: [],
      placeholder: 'Add tags (e.g. #work, #personal)...',
      onTagsChange: (tags: string[]) => {
        if (this.callbacks.onTagsChange) {
          this.callbacks.onTagsChange(tags);
        }
      }
    });
    
    return tagSection;
  }
  
  /**
   * Create the notepad content area
   */
  private createContentArea(): HTMLTextAreaElement {
    const textarea = document.createElement('textarea');
    textarea.className = 'mw-notepad-content';
    textarea.placeholder = 'Type your note here...';
    
    // Add input event listener with debounce
    textarea.addEventListener('input', () => {
      console.log('⌨️ UI input event detected:', {
        value: textarea.value,
        length: textarea.value.length,
        hasCallback: !!this.callbacks.onContentChange,
        debounceDelay: this.contentDebounceDelay
      });
      
      if (this.contentChangeDebounceTimer) {
        console.log('⏰ Clearing existing debounce timer');
        window.clearTimeout(this.contentChangeDebounceTimer);
      }
      
      this.contentChangeDebounceTimer = window.setTimeout(() => {
        console.log('⏰ Debounce timer fired, calling onContentChange with:', textarea.value);
        if (this.callbacks.onContentChange) {
          this.callbacks.onContentChange(textarea.value);
        } else {
          console.error('❌ No onContentChange callback available!');
        }
        this.contentChangeDebounceTimer = null;
      }, this.contentDebounceDelay);
    });
    
    return textarea;
  }
  
  /**
   * Get the notepad element
   */
  public getElement(): HTMLElement {
    return this.element;
  }
  
  /**
   * Get the header element (for drag handle)
   */
  public getHeaderElement(): HTMLElement {
    return this.headerElement;
  }

  /**
   * Get the shadow DOM container (for resize handles)
   */
  public getShadowContainer(): HTMLElement | null {
    const shadowRoot = this.element.shadowRoot;
    if (shadowRoot) {
      return shadowRoot.querySelector('.mw-notepad-container') as HTMLElement;
    }
    return null;
  }
  
  /**
   * Get the current content
   */
  public getContent(): string {
    return this.contentElement.value;
  }

  /**
   * Get current tags
   */
  public getTags(): string[] {
    return this.tagManager ? this.tagManager.getTags() : [];
  }

  /**
   * Set tags
   */
  public setTags(tags: string[]): void {
    if (this.tagManager) {
      this.tagManager.setTags(tags);
    }
  }
  
  /**
   * Set the notepad content
   */
  public setContent(content: string): void {
    if (this.contentElement.value !== content) {
      this.contentElement.value = content;
    }
  }
  
  /**
   * Get the current state
   */
  public getCurrentState(): NotepadState {
    return this.currentState;
  }
  
  /**
   * Set the notepad state
   */
  public setState(state: NotepadState): void {
    this.currentState = state;
    
    // Remove all state classes
    this.element.classList.remove('mw-notepad-normal', 'mw-notepad-minimized', 'mw-notepad-collapsed');
    
    // Add appropriate class based on state
    switch (state) {
      case NotepadState.NORMAL:
        this.element.classList.add('mw-notepad-normal');
        break;
      case NotepadState.MINIMIZED:
        this.element.classList.add('mw-notepad-minimized');
        break;
      case NotepadState.COLLAPSED:
        this.element.classList.add('mw-notepad-collapsed');
        break;
    }
  }
  
  /**
   * Add visual feedback during drag
   */
  public addDragFeedback(): void {
    this.element.classList.add('mw-notepad-dragging');
  }
  
  /**
   * Remove visual feedback after drag
   */
  public removeDragFeedback(): void {
    this.element.classList.remove('mw-notepad-dragging');
  }
  
  /**
   * Clean up event listeners
   */
  public destroy(): void {
    // Clean up speech integration
    if (this.speechIntegration) {
      this.speechIntegration.destroy();
      this.speechIntegration = null;
    }
    
    // Clean up tag manager
    if (this.tagManager) {
      this.tagManager.destroy();
      this.tagManager = null;
    }
    
    // Remove from DOM
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
  
  /**
   * Get CSS styles for the notepad
   * This will be injected into the shadow DOM
   */
  private getStyles(): string {
    return `
      /* These styles are isolated within the shadow DOM */
      .mw-notepad-container {
        position: relative;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        min-width: 250px;
        min-height: 200px;
        overflow: hidden;
        transition: all 0.2s ease;
        border: 1px solid #e2e8f0;
      }
      
      .mw-notepad-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background-color: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        cursor: move;
        user-select: none;
      }
      
      .mw-notepad-title {
        font-weight: 500;
        font-size: 14px;
        color: #334155;
      }
      
      .mw-notepad-controls {
        display: flex;
        gap: 4px;
      }
      
      .mw-notepad-control {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        color: #64748b;
        padding: 0;
      }
      
      .mw-notepad-control:hover {
        background-color: #e2e8f0;
        color: #334155;
      }
      
      .mw-notepad-close:hover {
        background-color: #ef4444;
        color: white;
      }
      
      .mw-notepad-tag-section {
        padding: 8px 12px;
        border-bottom: 1px solid #f1f5f9;
        background-color: #fafbfc;
      }
      
      .mw-tag-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        min-height: 24px;
      }
      
      .mw-tag {
        display: inline-flex;
        align-items: center;
        background-color: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 500;
        gap: 4px;
      }
      
      .mw-tag-text {
        line-height: 1;
      }
      
      .mw-tag-remove {
        background: none;
        border: none;
        color: #0369a1;
        cursor: pointer;
        padding: 0;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        line-height: 1;
      }
      
      .mw-tag-remove:hover {
        background-color: #0369a1;
        color: white;
      }
      
      .mw-tag-input {
        border: none;
        outline: none;
        background: transparent;
        font-size: 12px;
        color: #374151;
        min-width: 120px;
        flex: 1;
      }
      
      .mw-tag-input::placeholder {
        color: #9ca3af;
      }
      
      .mw-notepad-content {
        flex: 1;
        resize: none;
        padding: 12px;
        font-size: 14px;
        line-height: 1.5;
        border: none;
        outline: none;
        color: #1f2937;
        background-color: #ffffff;
      }
      
      .mw-notepad-content::placeholder {
        color: #94a3b8;
      }
      
      /* State: Normal */
      .mw-notepad-normal .mw-notepad-container {
        width: 300px;
        height: 250px;
      }
      
      /* State: Minimized */
      .mw-notepad-minimized .mw-notepad-container {
        width: 200px;
        height: 40px;
      }
      
      .mw-notepad-minimized .mw-notepad-content {
        display: none;
      }
      
      /* State: Collapsed */
      .mw-notepad-collapsed .mw-notepad-container {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
      }
      
      .mw-notepad-collapsed .mw-notepad-title,
      .mw-notepad-collapsed .mw-notepad-content,
      .mw-notepad-collapsed .mw-notepad-control:not(.mw-notepad-close) {
        display: none;
      }
      
      .mw-notepad-collapsed .mw-notepad-header {
        padding: 8px;
        justify-content: center;
        height: 100%;
        border-bottom: none;
      }
      
      /* Dragging state */
      .mw-notepad-dragging .mw-notepad-container {
        opacity: 0.8;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }
      
      /* Save status indicator */
      .notepad-save-status {
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        background-color: #f1f5f9;
        color: #64748b;
        border: 1px solid #e2e8f0;
        z-index: 10;
        transition: all 0.2s ease;
      }
      
      .notepad-save-status.status-saving {
        background-color: #fef3c7;
        color: #92400e;
        border-color: #fcd34d;
      }
      
      .notepad-save-status.status-saved {
        background-color: #dcfce7;
        color: #166534;
        border-color: #86efac;
      }
      
      .notepad-save-status.status-error {
        background-color: #fee2e2;
        color: #dc2626;
        border-color: #fca5a5;
      }
      
      /* Authentication prompt */
      .notepad-auth-prompt {
        position: absolute;
        bottom: 8px;
        left: 8px;
        right: 8px;
        background-color: #fef3c7;
        border: 1px solid #fcd34d;
        border-radius: 6px;
        padding: 8px;
        z-index: 20;
        animation: slideUp 0.3s ease;
      }
      
      .auth-prompt-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: #92400e;
      }
      
      .auth-prompt-button {
        background-color: #f59e0b;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      .auth-prompt-button:hover {
        background-color: #d97706;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      /* Resize handle styles */
      .mw-resize-handle {
        position: absolute;
        background: transparent;
        z-index: 1000;
        transition: background-color 0.2s ease;
      }

      .mw-resize-handle:hover {
        background: rgba(59, 130, 246, 0.1);
      }

      .mw-resize-n {
        top: -5px;
        left: 10px;
        right: 10px;
        height: 10px;
        cursor: n-resize;
      }

      .mw-resize-s {
        bottom: -5px;
        left: 10px;
        right: 10px;
        height: 10px;
        cursor: s-resize;
      }

      .mw-resize-e {
        top: 10px;
        bottom: 10px;
        right: -5px;
        width: 10px;
        cursor: e-resize;
      }

      .mw-resize-w {
        top: 10px;
        bottom: 10px;
        left: -5px;
        width: 10px;
        cursor: w-resize;
      }

      .mw-resize-ne {
        top: -5px;
        right: -5px;
        width: 15px;
        height: 15px;
        cursor: ne-resize;
      }

      .mw-resize-nw {
        top: -5px;
        left: -5px;
        width: 15px;
        height: 15px;
        cursor: nw-resize;
      }

      .mw-resize-se {
        bottom: -5px;
        right: -5px;
        width: 15px;
        height: 15px;
        cursor: se-resize;
      }

      .mw-resize-sw {
        bottom: -5px;
        left: -5px;
        width: 15px;
        height: 15px;
        cursor: sw-resize;
      }
      
      ${this.speechIntegration ? this.speechIntegration.getAdditionalStyles() : ''}
    `;
  }

  /**
   * Add visual feedback during resize
   */
  public addResizeFeedback(): void {
    const shadowRoot = this.element.shadowRoot;
    if (shadowRoot) {
      const container = shadowRoot.querySelector('.mw-notepad-container') as HTMLElement;
      if (container) {
        container.style.border = '2px solid #3b82f6';
        container.style.boxShadow = '0 0 0 1px rgba(59, 130, 246, 0.2)';
      }
    }
  }

  /**
   * Remove resize feedback
   */
  public removeResizeFeedback(): void {
    const shadowRoot = this.element.shadowRoot;
    if (shadowRoot) {
      const container = shadowRoot.querySelector('.mw-notepad-container') as HTMLElement;
      if (container) {
        container.style.border = '';
        container.style.boxShadow = '';
      }
    }
  }
}
