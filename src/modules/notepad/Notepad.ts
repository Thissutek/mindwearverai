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
  private data: NotepadData;
  private ui: NotepadUI;
  private dragHandler: DragHandler;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxUndoStackSize = 50;
  private isDestroyed = false;

  constructor(options: NotepadOptions = {}) {
    // Generate a unique ID if not provided
    this.id = options.id || `notepad-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Create or retrieve notepad data
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
      onRedo: this.handleRedo.bind(this)
    });
    
    // Initialize UI with current data
    if (this.data) {
      this.ui.setContent(this.data.content);
      this.ui.setState(this.data.state);
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
  private handleContentChange(content: string): void {
    if (this.data && this.data.content !== content) {
      // Update state
      const updatedData = stateManager.updateNotepad(this.id, { content });
      
      // Save to storage if update was successful
      if (updatedData) {
        this.data = updatedData;
        storageService.saveNotepad(this.data);
        
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
      }
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
   * Handle close button click
   */
  private handleClose(): void {
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
   * Clean up and destroy the notepad
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    
    this.isDestroyed = true;
    
    // Clean up UI
    this.ui.destroy();
    
    // Clean up drag handler
    this.dragHandler.destroy();
    
    // Delete from storage
    storageService.deleteNotepad(this.id);
    
    // Delete from state manager
    stateManager.deleteNotepad(this.id);
  }
}
