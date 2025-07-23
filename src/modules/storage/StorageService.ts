/**
 * StorageService.ts
 * Handles saving and loading notepad data using Firebase (when authenticated) or Chrome storage API (fallback)
 */

import { NotepadData } from '../state/StateManager';
import { FirebaseNotepadService } from '../../services/firebaseNotepadService';
import { authBridge } from '../../services/authBridge';

export class StorageService {
  private static STORAGE_KEY = 'mindweaver-notepads';
  private saveDebounceTimers: Map<string, number> = new Map();
  private debounceDelay = 300; // 300ms debounce for auto-save
  
  /**
   * Save a single notepad to storage
   */
  async saveNotepad(notepad: NotepadData): Promise<void> {
    const user = authBridge.getCurrentUser();
    console.log('🔄 StorageService.saveNotepad called:', {
      notepadId: notepad.id,
      content: notepad.content.substring(0, 50) + '...',
      hasUser: !!user,
      userEmail: user?.email
    });
    
    // Use Firebase if user is authenticated
    if (user) {
      try {
        console.log('☁️ Attempting Firebase save for notepad:', notepad.id);
        await FirebaseNotepadService.saveNotepad(notepad);
        console.log('✅ Firebase save successful for notepad:', notepad.id);
        return;
      } catch (error) {
        console.error('❌ Error saving to Firebase, falling back to local storage:', error);
        // Fall back to local storage
      }
    }
    
    // Use local Chrome storage as fallback
    console.log('💾 Using Chrome storage fallback for notepad:', notepad.id);
    return this.debouncedSave(notepad);
  }
  
  /**
   * Save multiple notepads to storage
   */
  async saveAllNotepads(notepads: NotepadData[]): Promise<void> {
    console.log('🔄 StorageService.saveAllNotepads called with', notepads.length, 'notepads');
    
    // Use Firebase if user is authenticated
    if (authBridge.getCurrentUser()) {
      try {
        console.log('☁️ Attempting Firebase batch save for', notepads.length, 'notepads');
        // Save each notepad individually to Firebase
        await Promise.all(notepads.map(notepad => FirebaseNotepadService.saveNotepad(notepad)));
        console.log('✅ Firebase batch save successful');
        return;
      } catch (error) {
        console.error('❌ Error saving to Firebase, falling back to local storage:', error);
        // Fall back to local storage
      }
    }
    
    // Use local Chrome storage as fallback
    console.log('💾 Using Chrome storage for', notepads.length, 'notepads');
    return new Promise((resolve, reject) => {
      const notepadsMap: Record<string, NotepadData> = {};
      
      notepads.forEach(notepad => {
        notepadsMap[notepad.id] = notepad;
        console.log('📝 Adding to Chrome storage map:', notepad.id, notepad.content.substring(0, 30) + '...');
      });
      
      console.log('🔧 Calling chrome.storage.local.set with key:', StorageService.STORAGE_KEY);
      chrome.storage.local.set({ [StorageService.STORAGE_KEY]: notepadsMap }, () => {
        if (chrome.runtime.lastError) {
          console.error('❌ Chrome storage save failed:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('✅ Chrome storage save successful. Saved', Object.keys(notepadsMap).length, 'notepads');
          resolve();
        }
      });
    });
  }
  
  /**
   * Load all notepads from storage
   */
  async loadAllNotepads(): Promise<Record<string, NotepadData>> {
    const user = authBridge.getCurrentUser();
    console.log('🔄 StorageService.loadAllNotepads called:', {
      hasUser: !!user,
      userEmail: user?.email
    });
    
    // Use Firebase if user is authenticated
    if (user) {
      try {
        console.log('☁️ Attempting Firebase load');
        const firebaseData = await FirebaseNotepadService.getAllNotepads();
        console.log('✅ Firebase load successful. Found', Object.keys(firebaseData).length, 'notepads');
        return firebaseData;
      } catch (error) {
        console.error('❌ Error loading from Firebase, falling back to local storage:', error);
        // Fall back to local storage
      }
    }
    
    // Use local Chrome storage as fallback
    console.log('💾 Using Chrome storage fallback');
    return new Promise((resolve, reject) => {
      console.log('🔧 Calling chrome.storage.local.get with key:', StorageService.STORAGE_KEY);
      chrome.storage.local.get(StorageService.STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Chrome storage load failed:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          const data = result[StorageService.STORAGE_KEY] || {};
          console.log('✅ Chrome storage load successful. Found', Object.keys(data).length, 'notepads:', Object.keys(data));
          resolve(data);
        }
      });
    });
  }
  
  /**
   * Delete a notepad from storage
   */
  async deleteNotepad(notepadId: string): Promise<void> {
    // Use Firebase if user is authenticated
    if (authBridge.getCurrentUser()) {
      try {
        await FirebaseNotepadService.deleteNotepad(notepadId);
        return;
      } catch (error) {
        console.error('Error deleting from Firebase, falling back to local storage:', error);
        // Fall back to local storage
      }
    }
    
    // Use local Chrome storage as fallback
    return new Promise((resolve, reject) => {
      this.loadAllNotepads()
        .then(notepads => {
          if (notepads[notepadId]) {
            delete notepads[notepadId];
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
