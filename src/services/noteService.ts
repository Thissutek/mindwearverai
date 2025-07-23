// Firebase imports will be used when Firebase integration is implemented
// import { db } from './firebase';

// Placeholder types for Firebase functionality - uncomment when implementing Firebase
/*
type FirestoreDoc = {
  id: string;
  data: () => any;
};

type FirestoreQuerySnapshot = {
  docs: FirestoreDoc[];
};

type FirestoreDocRef = {
  id: string;
};
*/

export interface Note {
  id: string;
  content: string;
  timestamp: number;
}

// Collection name in Firestore - uncomment when implementing Firebase
// const NOTES_COLLECTION = 'notes';

// Local storage key
const LOCAL_STORAGE_KEY = 'notes';

/**
 * Service to handle note operations with both local storage and Firebase
 */
export class NoteService {
  /**
   * Get all notes
   * @param useFirebase Whether to use Firebase or local storage
   */
  static async getNotes(useFirebase: boolean = false): Promise<Note[]> {
    if (useFirebase) {
      try {
        console.log('Firebase integration not yet available');
        // Fallback to local storage when Firebase is not available
        return this.getNotes(false);
      } catch (error) {
        console.error('Error getting notes from Firebase:', error);
        return [];
      }
    } else {
      // Use local storage or Chrome storage
      if (chrome?.storage?.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([LOCAL_STORAGE_KEY], (result) => {
            resolve(result[LOCAL_STORAGE_KEY] || []);
          });
        });
      } else {
        const notes = localStorage.getItem(LOCAL_STORAGE_KEY);
        return notes ? JSON.parse(notes) : [];
      }
    }
  }

  /**
   * Save a new note
   * @param note Note to save
   * @param useFirebase Whether to use Firebase or local storage
   */
  static async saveNote(note: Omit<Note, 'id'>, useFirebase: boolean = false): Promise<Note> {
    if (useFirebase) {
      try {
        console.log('Firebase integration not yet available');
        // Fallback to local storage when Firebase is not available
        return this.saveNote(note, false);
      } catch (error) {
        console.error('Error saving note to Firebase:', error);
        throw error;
      }
    } else {
      // Use local storage or Chrome storage
      const newNote = {
        id: Date.now().toString(),
        ...note
      };

      const notes = await this.getNotes(false);
      const updatedNotes = [newNote, ...notes];

      if (chrome?.storage?.local) {
        chrome.storage.local.set({ [LOCAL_STORAGE_KEY]: updatedNotes });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedNotes));
      }

      return newNote;
    }
  }

  /**
   * Delete a note
   * @param noteId ID of the note to delete
   * @param useFirebase Whether to use Firebase or local storage
   */
  static async deleteNote(noteId: string, useFirebase: boolean = false): Promise<void> {
    if (useFirebase) {
      try {
        console.log('Firebase integration not yet available');
        // Fallback to local storage when Firebase is not available
        return this.deleteNote(noteId, false);
      } catch (error) {
        console.error('Error deleting note from Firebase:', error);
        throw error;
      }
    } else {
      // Use local storage or Chrome storage
      const notes = await this.getNotes(false);
      const updatedNotes = notes.filter((note: Note) => note.id !== noteId);

      if (chrome?.storage?.local) {
        chrome.storage.local.set({ [LOCAL_STORAGE_KEY]: updatedNotes });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedNotes));
      }
    }
  }
}
