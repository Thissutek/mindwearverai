/**
 * StorageService.ts
 * Cloud-first storage service - requires authentication and saves directly to Firebase
 * No localStorage fallback to ensure reliable cloud synchronization
 */

import { NotepadData } from '../state/StateManager';
import { FirebaseNotepadService } from '../../services/firebaseNotepadService';
import { authBridge } from '../../services/authBridge';

export class StorageService {
  private saveDebounceTimers: Map<string, number> = new Map();
  private debounceDelay = 300; // 300ms debounce for auto-save
  
  /**
   * Save a single notepad to Firebase (cloud-first approach)
   * Requires user authentication - throws error if not authenticated
   */
  async saveNotepad(notepad: NotepadData): Promise<void> {
    const user = authBridge.getCurrentUser();
    // console.log('🔄 StorageService.saveNotepad called:', {
    //   notepadId: notepad.id,
    //   content: notepad.content.substring(0, 50) + '...',
    //   hasUser: !!user,
    //   userEmail: user?.email
    // });
    
    // Require authentication for cloud-first approach
    if (!user) {
      const error = new Error('Authentication required: Please sign in to save your notes to the cloud');
      console.error('❌ Save failed - user not authenticated:', error.message);
      throw error;
    }
    
    try {
      // console.log('☁️ Saving to Firebase for notepad:', notepad.id);
      await FirebaseNotepadService.saveNotepad(notepad);
      // console.log('✅ Firebase save successful for notepad:', notepad.id);
    } catch (error) {
      console.error('❌ Error saving to Firebase:', error);
      throw new Error('Failed to save note to cloud. Please check your connection and try again.');
    }
  }
  
  /**
   * Save multiple notepads to Firebase (cloud-first approach)
   * Requires user authentication - throws error if not authenticated
   */
  async saveAllNotepads(notepads: NotepadData[]): Promise<void> {
    // console.log('🔄 StorageService.saveAllNotepads called with', notepads.length, 'notepads');
    
    const user = authBridge.getCurrentUser();
    if (!user) {
      const error = new Error('Authentication required: Please sign in to save your notes to the cloud');
      console.error('❌ Batch save failed - user not authenticated:', error.message);
      throw error;
    }
    
    try {
      // console.log('☁️ Firebase batch save for', notepads.length, 'notepads');
      // Save each notepad individually to Firebase
      await Promise.all(notepads.map(notepad => FirebaseNotepadService.saveNotepad(notepad)));
      // console.log('✅ Firebase batch save successful');
    } catch (error) {
      console.error('❌ Error saving batch to Firebase:', error);
      throw new Error('Failed to save notes to cloud. Please check your connection and try again.');
    }
  }
  
  /**
   * Load all notepads from Firebase (cloud-first approach)
   * Requires user authentication - returns empty object if not authenticated
   */
  async loadAllNotepads(): Promise<Record<string, NotepadData>> {
    const user = authBridge.getCurrentUser();
    // console.log('🔄 StorageService.loadAllNotepads called:', {
    //   hasUser: !!user,
    //   userEmail: user?.email
    // });
    
    // Require authentication for cloud-first approach
    if (!user) {
      // console.log('⚠️ Load skipped - user not authenticated. Returning empty notes.');
      return {};
    }
    
    try {
      // console.log('☁️ Loading from Firebase');
      const firebaseData = await FirebaseNotepadService.getAllNotepads();
      // console.log('✅ Firebase load successful. Found', Object.keys(firebaseData).length, 'notepads');
      return firebaseData;
    } catch (error) {
      console.error('❌ Error loading from Firebase:', error);
      throw new Error('Failed to load notes from cloud. Please check your connection and try again.');
    }
  }
  
  /**
   * Delete a notepad from Firebase (cloud-first approach)
   * Requires user authentication - throws error if not authenticated
   */
  async deleteNotepad(notepadId: string): Promise<void> {
    const user = authBridge.getCurrentUser();
    if (!user) {
      const error = new Error('Authentication required: Please sign in to delete notes');
      console.error('❌ Delete failed - user not authenticated:', error.message);
      throw error;
    }
    
    try {
      // console.log('🗑️ Deleting notepad from Firebase:', notepadId);
      await FirebaseNotepadService.deleteNotepad(notepadId);
      // console.log('✅ Firebase delete successful for notepad:', notepadId);
    } catch (error) {
      console.error('❌ Error deleting from Firebase:', error);
      throw new Error('Failed to delete note from cloud. Please check your connection and try again.');
    }
  }
  
  /**
   * Debounced save to prevent excessive Firebase operations
   * Used internally to batch rapid saves to the same notepad
   */
  debouncedSave(notepad: NotepadData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear existing timer for this notepad if it exists
      if (this.saveDebounceTimers.has(notepad.id)) {
        window.clearTimeout(this.saveDebounceTimers.get(notepad.id));
      }
      
      // Set new timer
      const timerId = window.setTimeout(() => {
        this.saveNotepad(notepad)
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.saveDebounceTimers.delete(notepad.id);
          });
      }, this.debounceDelay);
      
      this.saveDebounceTimers.set(notepad.id, timerId);
    });
  }
  
  /**
   * Check if user is authenticated and can save/load notes
   */
  isAuthenticated(): boolean {
    return authBridge.getCurrentUser() !== null;
  }
  
  /**
   * Get current authenticated user info
   */
  getCurrentUser() {
    return authBridge.getCurrentUser();
  }
}

// Export singleton instance
export const storageService = new StorageService();
