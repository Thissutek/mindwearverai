/**
 * StateManager.ts
 * Manages the state of notepads, including position, content, and display state.
 */

export enum NotepadState {
  NORMAL = 'normal',
  MINIMIZED = 'minimized',
  COLLAPSED = 'collapsed'
}

export interface NotepadData {
  id: string;
  content: string;
  position: {
    x: number;
    y: number;
  };
  state: NotepadState;
  lastModified: number;
}

export class StateManager {
  private notepads: Map<string, NotepadData> = new Map();
  private listeners: Map<string, Set<(data: NotepadData | null) => void>> = new Map();
  
  constructor() {
    // Initialize with empty state
  }

  /**
   * Get a notepad by ID
   */
  getNotepad(id: string): NotepadData | undefined {
    return this.notepads.get(id);
  }

  /**
   * Get all notepads
   */
  getAllNotepads(): NotepadData[] {
    return Array.from(this.notepads.values());
  }

  /**
   * Create a new notepad with default values
   */
  createNotepad(id: string, initialData: Partial<NotepadData> = {}): NotepadData {
    const defaultData: NotepadData = {
      id,
      content: '',
      position: { x: 100, y: 100 },
      state: NotepadState.NORMAL,
      lastModified: Date.now(),
      ...initialData
    };
    
    this.notepads.set(id, defaultData);
    this.notifyListeners(id, defaultData);
    return defaultData;
  }

  /**
   * Update a notepad's data
   */
  updateNotepad(id: string, data: Partial<NotepadData>): NotepadData | null {
    const currentData = this.notepads.get(id);
    
    if (!currentData) {
      return null;
    }
    
    const updatedData: NotepadData = {
      ...currentData,
      ...data,
      lastModified: Date.now()
    };
    
    this.notepads.set(id, updatedData);
    this.notifyListeners(id, updatedData);
    return updatedData;
  }

  /**
   * Delete a notepad
   */
  deleteNotepad(id: string): boolean {
    const result = this.notepads.delete(id);
    if (result) {
      this.notifyListeners(id, null);
    }
    return result;
  }

  /**
   * Subscribe to changes for a specific notepad
   */
  subscribe(id: string, callback: (data: NotepadData | null) => void): () => void {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    
    const listeners = this.listeners.get(id);
    if (listeners) {
      listeners.add(callback);
    }
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(id);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(id);
        }
      }
    };
  }

  /**
   * Notify all listeners of changes to a notepad
   */
  private notifyListeners(id: string, data: NotepadData | null): void {
    const callbacks = this.listeners.get(id);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

// Export singleton instance
export const stateManager = new StateManager();
