/**
 * Notepad.ts
 * Main notepad class that coordinates UI, state, and storage
 */

import { DragHandler } from '../drag/DragHandler';
import { NotepadData, NotepadState, stateManager } from '../state/StateManager';
import { storageService } from '../storage/StorageService';
// Import NotepadUI from barrel file
import { NotepadUI } from './ui';

export interface NotepadOptions {
  id?: string;
  initialContent?: string;
  initialPosition?: { x: number; y: number };
  initialState?: NotepadState;
}

export class Notepad {
  private id: string;
  private data: NotepadData = {} as NotepadData; // Initialize to avoid TypeScript error
  private ui: NotepadUI;
  private dragHandler: DragHandler;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxUndoStackSize = 50;
  private isDestroyed = false;

  constructor(options: NotepadOptions = {}) {
    // Generate a unique ID if not provided
    this.id = options.id || `notepad-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Initialize with basic data first (will be updated if loading from storage)
    this.data = stateManager.getNotepad(this.id) || stateManager.createNotepad(this.id, {
      content: options.initialContent || '',
      position: options.initialPosition || { x: 100, y: 100 },
      state: options.initialState || NotepadState.NORMAL
    });
    
    // Create UI
    this.ui = new NotepadUI(this.id, {
      onContentChange: this.handleContentChange.bind(this),
      onMinimize: this.handleMinimize.bind(this),
      onCollapse: this.handleCollapse.bind(this),
      onClose: this.handleClose.bind(this),
      onUndo: this.handleUndo.bind(this),
      onRedo: this.handleRedo.bind(this),
      onSpeechTranscript: this.handleSpeechTranscript.bind(this)
    });
    
    // Initialize UI with current data
    if (this.data) {
      this.ui.setContent(this.data.content);
      this.ui.setState(this.data.state);
    }
    
    // If we have an existing ID (reopening), try to load from storage
    if (options.id) {
      this.loadFromStorageIfExists(options);
    }
    
    // Initialize drag handler
    this.dragHandler = new DragHandler({
      element: this.ui.getElement(),
      handle: this.ui.getHeaderElement(),
      onDragStart: this.handleDragStart.bind(this),
      onDragEnd: this.handleDragEnd.bind(this)
    });
    
    // Set initial position
    if (this.data) {
      this.dragHandler.setPosition(this.data.position.x, this.data.position.y);
    }
    
    // Initialize undo/redo stack with current content
    if (this.data) {
      this.pushToUndoStack(this.data.content);
    }
    
    // Subscribe to state changes
    stateManager.subscribe(this.id, this.handleStateChange.bind(this));
  }
  
  /**
   * Get the notepad ID
   */
  public getId(): string {
    return this.id;
  }
  
  /**
   * Get the notepad element
   */
  public getElement(): HTMLElement {
    return this.ui.getElement();
  }
  
  /**
   * Handle content changes from the UI
   */
  private async handleContentChange(content: string): Promise<void> {
    console.log('✏️ Notepad content change:', {
      notepadId: this.id,
      oldContent: this.data?.content?.substring(0, 30) + '...',
      newContent: content.substring(0, 30) + '...',
      contentLength: content.length,
      hasData: !!this.data
    });
    
    if (this.data && this.data.content !== content) {
      console.log('🔄 Content changed, updating state and saving...');
      
      // Update state
      const updatedData = stateManager.updateNotepad(this.id, { content });
      
      // Save to storage if update was successful
      if (updatedData) {
        this.data = updatedData;
        console.log('💾 Calling storageService.saveNotepad for:', this.id);
        
        try {
          await storageService.saveNotepad(this.data);
          console.log('✅ Successfully saved notepad to cloud:', this.id);
          this.showSaveStatus('saved');
          
          // Add to undo stack if significantly different
          const lastContent = this.undoStack[this.undoStack.length - 1];
          if (content !== lastContent) {
            this.undoStack.push(content);
            // Clear redo stack since we have a new change
            this.redoStack = [];
            
            // Limit undo stack size
            if (this.undoStack.length > this.maxUndoStackSize) {
              this.undoStack.shift();
            }
          }
        } catch (error) {
          console.error('❌ Failed to save notepad to cloud:', error);
          this.handleSaveError(error as Error);
        }
      } else {
        console.error('❌ Failed to update notepad state for:', this.id);
      }
    } else {
      console.log('⏭️ Content unchanged, skipping save');
    }
  }
  
  /**
   * Handle minimize button click
   */
  private handleMinimize(): void {
    if (this.data) {
      const newState = this.data.state === NotepadState.MINIMIZED 
        ? NotepadState.NORMAL 
        : NotepadState.MINIMIZED;
      
      // Update state
      const updatedData = stateManager.updateNotepad(this.id, { state: newState });
      
      // Save to storage if update was successful
      if (updatedData) {
        this.data = updatedData;
        storageService.saveNotepad(this.data);
      }
    }
  }
  
  /**
   * Handle collapse button click
   */
  private handleCollapse(): void {
    if (this.data) {
      const newState = this.data.state === NotepadState.COLLAPSED 
        ? NotepadState.NORMAL 
        : NotepadState.COLLAPSED;
      
      // Update state
      const updatedData = stateManager.updateNotepad(this.id, { state: newState });
      
      // Save to storage if update was successful
      if (updatedData) {
        this.data = updatedData;
        storageService.saveNotepad(this.data);
      }
    }
  }
  
  /**
   * Load notepad data from storage if it exists (for reopening saved notepads)
   */
  private async loadFromStorageIfExists(options: NotepadOptions): Promise<void> {
    console.log('📂 Loading from storage for notepad:', this.id);
    
    try {
      const allNotepads = await storageService.loadAllNotepads();
      console.log('📋 All notepads from storage:', Object.keys(allNotepads));
      
      const storedData = allNotepads[this.id];
      console.log('💾 Stored data for', this.id, ':', storedData);
      
      if (storedData) {
        console.log('✨ Found stored content:', storedData.content);
        
        // Update the existing data with stored content
        const updatedData = stateManager.updateNotepad(this.id, {
          content: storedData.content,
          position: options.initialPosition || storedData.position,
          state: options.initialState || storedData.state
        });
        
        console.log('🔄 Updated data in StateManager:', updatedData);
        
        if (updatedData) {
          this.data = updatedData;
          
          console.log('🎨 Updating UI with content:', this.data.content);
          
          // Update UI with loaded content
          this.ui.setContent(this.data.content);
          this.ui.setState(this.data.state);
          
          // Update position
          this.dragHandler.setPosition(this.data.position.x, this.data.position.y);
          
          // Initialize undo stack with loaded content
          this.pushToUndoStack(this.data.content);
          
          console.log('✅ Successfully loaded notepad from storage:', this.id, 'Content length:', this.data.content.length);
        } else {
          console.error('❌ Failed to update StateManager with stored data');
        }
      } else {
        console.log('❓ No stored data found for notepad:', this.id);
      }
    } catch (error) {
      console.error('💥 Failed to load notepad from storage:', error);
    }
  }

  /**
   * Handle close button click
   */
  private async handleClose(): Promise<void> {
    // Check if notepad has content before closing
    const content = this.ui.getContent().trim();
    
    if (content) {
      // Save notepad to storage if it has content
      try {
        await storageService.saveNotepad(this.data);
        console.log('Notepad saved to storage on close:', this.id);
        
        // Refresh sidebar to show the saved note
        // We need to access the sidebar from the content script
        const event = new CustomEvent('mindweaver-notepad-saved', {
          detail: { notepadId: this.id }
        });
        document.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to save notepad on close:', error);
      }
    }
    
    this.destroy();
  }
  
  /**
   * Handle drag start
   */
  private handleDragStart(): void {
    this.ui.addDragFeedback();
  }
  
  /**
   * Handle drag end event
   */
  private handleDragEnd(x: number, y: number): void {
    // Update state with new position
    const updatedData = stateManager.updateNotepad(this.id, {
      position: { x, y }
    });
    
    // Save to storage if update was successful
    if (updatedData) {
      this.data = updatedData;
      storageService.saveNotepad(this.data);
    }
  }
  
  /**
   * Handle state changes from StateManager
   */
  private handleStateChange(data: NotepadData | null): void {
    if (data === null) {
      // Notepad was deleted
      this.destroy();
      return;
    }
    
    // Update UI if needed
    if (data.state !== this.ui.getCurrentState()) {
      this.ui.setState(data.state);
    }
    
    if (data.content !== this.ui.getContent()) {
      this.ui.setContent(data.content);
    }
    
    // Update position if needed
    if (this.data && (data.position.x !== this.data.position.x || data.position.y !== this.data.position.y)) {
      this.dragHandler.setPosition(data.position.x, data.position.y);
    }
    
    // Update local data reference
    this.data = data;
  }
  
  /**
   * Push content to undo stack
   */
  private pushToUndoStack(content: string): void {
    // Don't add if content is the same as the last entry
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === content) {
      return;
    }
    
    // Add to undo stack
    this.undoStack.push(content);
    
    // Clear redo stack when new content is added
    this.redoStack = [];
    
    // Limit undo stack size
    if (this.undoStack.length > this.maxUndoStackSize) {
      this.undoStack.shift();
    }
  }
  
  /**
   * Handle undo action
   */
  private handleUndo(): void {
    if (this.undoStack.length <= 1) {
      return; // Nothing to undo
    }
    
    // Move current content to redo stack
    const currentContent = this.undoStack.pop();
    if (currentContent) {
      this.redoStack.push(currentContent);
    }
    
    // Get previous content
    const previousContent = this.undoStack[this.undoStack.length - 1];
    
    // Update UI and state
    this.ui.setContent(previousContent || '');
    const updatedData = stateManager.updateNotepad(this.id, { content: previousContent || '' });
    if (updatedData) {
      this.data = updatedData;
      storageService.saveNotepad(this.data);
    }
  }
  
  /**
   * Handle redo action
   */
  private handleRedo(): void {
    if (this.redoStack.length === 0) {
      return; // Nothing to redo
    }
    
    // Get content from redo stack
    const nextContent = this.redoStack.pop();
    if (!nextContent) return;
    
    // Add current content to undo stack
    this.undoStack.push(nextContent);
    
    // Update UI and state
    this.ui.setContent(nextContent);
    const updatedData = stateManager.updateNotepad(this.id, { content: nextContent });
    if (updatedData) {
      this.data = updatedData;
      storageService.saveNotepad(this.data);
    }
  }

  /**
   * Handle speech-to-text transcript
   */
  private async handleSpeechTranscript(transcript: string): Promise<void> {
    if (!this.data) return;
    
    console.log('🎤 Adding speech transcript to notepad:', {
      notepadId: this.id,
      transcript: transcript.substring(0, 50) + '...',
      currentContentLength: this.data.content.length
    });
    
    // Add transcript to existing content with proper spacing
    const currentContent = this.data.content;
    const separator = currentContent && !currentContent.endsWith(' ') && !currentContent.endsWith('\n') ? ' ' : '';
    const newContent = currentContent + separator + transcript;
    
    // Update UI first to show immediate feedback
    if (this.ui) {
      this.ui.setContent(newContent);
    }
    
    // Update content through the normal change handler (async)
    try {
      await this.handleContentChange(newContent);
      console.log('✅ Speech transcript successfully saved to cloud');
    } catch (error) {
      console.error('❌ Failed to save speech transcript:', error);
      // Show error feedback to user
      this.handleSaveError(error as Error);
    }
  }
  
  /**
   * Show save status feedback to user
   */
  private showSaveStatus(status: 'saving' | 'saved' | 'error'): void {
    // Add visual feedback to the notepad UI by accessing shadow DOM
    if (this.ui) {
      const notepadElement = this.ui.getElement();
      const shadowRoot = notepadElement.shadowRoot;
      if (shadowRoot) {
        let statusElement = shadowRoot.querySelector('.notepad-save-status') as HTMLElement;
        
        // Create status element if it doesn't exist
        if (!statusElement) {
          statusElement = document.createElement('div');
          statusElement.className = 'notepad-save-status';
          const container = shadowRoot.querySelector('.mw-notepad-container');
          if (container) {
            container.appendChild(statusElement);
          }
        }
        
        statusElement.textContent = status === 'saving' ? '☁️ Saving...' : 
                                   status === 'saved' ? '✅ Saved to cloud' : 
                                   '❌ Save failed';
        statusElement.className = `notepad-save-status status-${status}`;
        
        // Auto-hide success message after 2 seconds
        if (status === 'saved') {
          setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'notepad-save-status';
          }, 2000);
        }
      }
    }
  }
  
  /**
   * Handle save errors with user-friendly messaging
   */
  private handleSaveError(error: Error): void {
    console.error('💥 Save error details:', {
      notepadId: this.id,
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    this.showSaveStatus('error');
    
    // Show user-friendly error message based on error type
    let userMessage = 'Failed to save note to cloud.';
    
    if (error.message.includes('Authentication required')) {
      userMessage = 'Please sign in to save your notes to the cloud.';
      this.showAuthenticationPrompt();
    } else if (error.message.includes('connection') || error.message.includes('network')) {
      userMessage = 'Connection error. Your note will be saved when connection is restored.';
    }
    
    // Show error notification (could be enhanced with a proper notification system)
    console.warn('🚨 User notification:', userMessage);
    
    // For now, we'll add the error message to the status element
    if (this.ui) {
      const notepadElement = this.ui.getElement();
      const shadowRoot = notepadElement.shadowRoot;
      if (shadowRoot) {
        let statusElement = shadowRoot.querySelector('.notepad-save-status') as HTMLElement;
        if (!statusElement) {
          statusElement = document.createElement('div');
          statusElement.className = 'notepad-save-status';
          const container = shadowRoot.querySelector('.mw-notepad-container');
          if (container) {
            container.appendChild(statusElement);
          }
        }
        if (statusElement) {
          statusElement.textContent = userMessage;
          statusElement.className = 'notepad-save-status status-error';
        }
      }
    }
  }
  
  /**
   * Show authentication prompt when user needs to sign in
   */
  private showAuthenticationPrompt(): void {
    // This could be enhanced to show a proper modal or redirect to auth
    console.log('🔐 Authentication required for notepad:', this.id);
    
    // For now, we'll add a visual indicator that auth is needed
    if (this.ui) {
      const notepadElement = this.ui.getElement();
      const shadowRoot = notepadElement.shadowRoot;
      if (shadowRoot) {
        const authPrompt = document.createElement('div');
        authPrompt.className = 'notepad-auth-prompt';
        authPrompt.innerHTML = `
          <div class="auth-prompt-content">
            <span>🔐 Sign in required</span>
            <button class="auth-prompt-button">Sign In</button>
          </div>
        `;
        
        // Add click handler for sign in button
        const signInButton = authPrompt.querySelector('.auth-prompt-button') as HTMLButtonElement;
        if (signInButton) {
          signInButton.addEventListener('click', () => {
            // Open extension popup for authentication
            if (chrome.runtime && chrome.runtime.openOptionsPage) {
              chrome.runtime.openOptionsPage();
            }
          });
        }
        
        // Add to notepad container
        const container = shadowRoot.querySelector('.mw-notepad-container');
        if (container) {
          container.appendChild(authPrompt);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (authPrompt.parentNode) {
            authPrompt.parentNode.removeChild(authPrompt);
          }
        }, 5000);
      }
    }
  }
  
  /**
   * Clean up and destroy the notepad
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    
    this.isDestroyed = true;
    
    console.log('🗑️ Destroying notepad:', {
      id: this.id,
      hasContent: this.data?.content?.trim() !== '',
      content: this.data?.content?.substring(0, 20) + '...'
    });
    
    // Clean up UI
    this.ui.destroy();
    
    // Clean up drag handler
    this.dragHandler.destroy();
    
    // Only delete from storage if notepad is empty
    // Notepads with content should persist for later access
    if (!this.data || this.data.content.trim() === '') {
      console.log('🗑️ Deleting empty notepad from storage:', this.id);
      storageService.deleteNotepad(this.id);
    } else {
      console.log('💾 Preserving notepad with content in storage:', this.id);
    }
    
    // Always delete from state manager (in-memory cleanup)
    stateManager.deleteNotepad(this.id);
  }
}
