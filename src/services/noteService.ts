import { FirestoreService, FirestoreNote } from './firestoreService';
import { AuthService } from './authService';

export interface Note {
  id: string;
  content: string;
  timestamp: number;
}

// Convert FirestoreNote to Note interface
function firestoreNoteToNote(firestoreNote: FirestoreNote): Note {
  return {
    id: firestoreNote.id,
    content: firestoreNote.content,
    timestamp: firestoreNote.timestamp
  };
}



// Local storage key
const LOCAL_STORAGE_KEY = 'notes';

/**
 * Service to handle note operations with both local storage and Firebase
 */
export class NoteService {
  /**
   * Get all notes
   * @param useFirebase Whether to use Firebase or local storage (defaults to Firebase if user is authenticated)
   */
  static async getNotes(useFirebase: boolean = true): Promise<Note[]> {
    // Use Firebase if user is authenticated and useFirebase is true
    if (useFirebase && AuthService.getCurrentUser()) {
      try {
        const firestoreNotes = await FirestoreService.getNotes();
        return firestoreNotes.map(firestoreNoteToNote);
      } catch (error) {
        console.error('Error getting notes from Firebase:', error);
        // Fallback to local storage
        return this.getNotes(false);
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
   * @param useFirebase Whether to use Firebase or local storage (defaults to Firebase if user is authenticated)
   */
  static async saveNote(note: Omit<Note, 'id'>, useFirebase: boolean = true): Promise<Note> {
    // Use Firebase if user is authenticated and useFirebase is true
    if (useFirebase && AuthService.getCurrentUser()) {
      try {
        const firestoreNote = await FirestoreService.saveNote(note);
        return firestoreNoteToNote(firestoreNote);
      } catch (error) {
        console.error('Error saving note to Firebase:', error);
        // Fallback to local storage
        return this.saveNote(note, false);
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
   * @param useFirebase Whether to use Firebase or local storage (defaults to Firebase if user is authenticated)
   */
  static async deleteNote(noteId: string, useFirebase: boolean = true): Promise<void> {
    // Use Firebase if user is authenticated and useFirebase is true
    if (useFirebase && AuthService.getCurrentUser()) {
      try {
        await FirestoreService.deleteNote(noteId);
      } catch (error) {
        console.error('Error deleting note from Firebase:', error);
        // Fallback to local storage
        return this.deleteNote(noteId, false);
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
