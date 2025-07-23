/**
 * StorageService.ts
 * Handles saving and loading notepad data using Chrome storage API
 */

import { NotepadData } from '../state/StateManager';

export class StorageService {
  private static STORAGE_KEY = 'mindweaver-notepads';
  private saveDebounceTimers: Map<string, number> = new Map();
  private debounceDelay = 300; // 300ms debounce for auto-save
  
  /**
   * Save a single notepad to storage
   */
  saveNotepad(notepad: NotepadData): Promise<void> {
    return this.debouncedSave(notepad);
  }
  
  /**
   * Save multiple notepads to storage
   */
  saveAllNotepads(notepads: NotepadData[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const notepadsMap: Record<string, NotepadData> = {};
      
      notepads.forEach(notepad => {
        notepadsMap[notepad.id] = notepad;
      });
      
      chrome.storage.local.set({ [StorageService.STORAGE_KEY]: notepadsMap }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
  
  /**
   * Load all notepads from storage
   */
  loadAllNotepads(): Promise<Record<string, NotepadData>> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(StorageService.STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[StorageService.STORAGE_KEY] || {});
        }
      });
    });
  }
  
  /**
   * Delete a notepad from storage
   */
  deleteNotepad(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadAllNotepads()
        .then(notepads => {
          if (notepads[id]) {
            delete notepads[id];
            return this.saveAllNotepads(Object.values(notepads));
          }
          return Promise.resolve();
        })
        .then(resolve)
        .catch(reject);
    });
  }
  
  /**
   * Debounced save to prevent excessive storage operations
   */
  private debouncedSave(notepad: NotepadData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear existing timer for this notepad if it exists
      if (this.saveDebounceTimers.has(notepad.id)) {
        window.clearTimeout(this.saveDebounceTimers.get(notepad.id));
      }
      
      // Set new timer
      const timerId = window.setTimeout(() => {
        this.loadAllNotepads()
          .then(notepads => {
            notepads[notepad.id] = notepad;
            return this.saveAllNotepads(Object.values(notepads));
          })
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.saveDebounceTimers.delete(notepad.id);
          });
      }, this.debounceDelay);
      
      this.saveDebounceTimers.set(notepad.id, timerId);
    });
  }
}

// Export singleton instance
export const storageService = new StorageService();
