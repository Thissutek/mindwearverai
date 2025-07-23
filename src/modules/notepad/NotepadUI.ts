/**
 * NotepadUI.ts
 * Handles DOM manipulation for notepad elements
 */

import { NotepadState } from '../state/StateManager';
import './notepad.css';

export interface NotepadUICallbacks {
  onContentChange?: (content: string) => void;
  onMinimize?: () => void;
  onCollapse?: () => void;
  onClose?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export class NotepadUI {
  private element: HTMLElement;
  private headerElement: HTMLElement;
  private contentElement: HTMLTextAreaElement;
  private currentState: NotepadState = NotepadState.NORMAL;
  private callbacks: NotepadUICallbacks;
  private contentChangeDebounceTimer: number | null = null;
  private contentDebounceDelay = 300; // 300ms debounce for content changes
  
  constructor(id: string, callbacks: NotepadUICallbacks = {}) {
    this.callbacks = callbacks;
    
    // Create the notepad container with shadow DOM for style isolation
    this.element = document.createElement('div');
    this.element.id = id;
    this.element.className = 'mw-notepad';
    
    // Create shadow DOM
    const shadowRoot = this.element.attachShadow({ mode: 'open' });
    
    // Add styles to shadow DOM
    const styleElement = document.createElement('style');
    styleElement.textContent = this.getStyles();
    shadowRoot.appendChild(styleElement);
    
    // Create notepad container inside shadow DOM
    const container = document.createElement('div');
    container.className = 'mw-notepad-container';
    shadowRoot.appendChild(container);
    
    // Create header
    this.headerElement = this.createHeader();
    container.appendChild(this.headerElement);
    
    // Create content area
    this.contentElement = this.createContentArea();
    container.appendChild(this.contentElement);
    
    // Add to document
    document.body.appendChild(this.element);
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
   * Create the notepad content area
   */
  private createContentArea(): HTMLTextAreaElement {
    const textarea = document.createElement('textarea');
    textarea.className = 'mw-notepad-content';
    textarea.placeholder = 'Type your note here...';
    
    // Add input event listener with debounce
    textarea.addEventListener('input', () => {
      if (this.contentChangeDebounceTimer) {
        window.clearTimeout(this.contentChangeDebounceTimer);
      }
      
      this.contentChangeDebounceTimer = window.setTimeout(() => {
        if (this.callbacks.onContentChange) {
          this.callbacks.onContentChange(textarea.value);
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
   * Get the current content
   */
  public getContent(): string {
    return this.contentElement.value;
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
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        width: 300px;
        height: 250px;
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
    `;
  }
}
