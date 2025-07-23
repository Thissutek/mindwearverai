import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthService } from './authService';

export interface FirestoreNote {
  id: string;
  content: string;
  timestamp: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
}

export interface NoteInput {
  content: string;
  timestamp: number;
}

export class FirestoreService {
  // Get the current user's notes collection reference
  private static getUserNotesCollection(userId: string) {
    return collection(db, 'users', userId, 'notes');
  }

  // Save a new note to Firestore
  static async saveNote(noteData: NoteInput): Promise<FirestoreNote> {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to save notes');
    }

    try {
      const notesCollection = this.getUserNotesCollection(currentUser.uid);
      const docRef = await addDoc(notesCollection, {
        content: noteData.content,
        timestamp: noteData.timestamp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: currentUser.uid
      });

      // Return the note with the generated ID
      return {
        id: docRef.id,
        content: noteData.content,
        timestamp: noteData.timestamp,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        userId: currentUser.uid
      };
    } catch (error) {
      console.error('Error saving note to Firestore:', error);
      throw new Error('Failed to save note');
    }
  }

  // Get all notes for the current user
  static async getNotes(): Promise<FirestoreNote[]> {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to get notes');
    }

    try {
      const notesCollection = this.getUserNotesCollection(currentUser.uid);
      const q = query(notesCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const notes: FirestoreNote[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          content: data.content,
          timestamp: data.timestamp,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          userId: data.userId
        });
      });

      return notes;
    } catch (error) {
      console.error('Error getting notes from Firestore:', error);
      throw new Error('Failed to get notes');
    }
  }

  // Update an existing note
  static async updateNote(noteId: string, content: string): Promise<void> {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to update notes');
    }

    try {
      const noteDoc = doc(db, 'users', currentUser.uid, 'notes', noteId);
      await updateDoc(noteDoc, {
        content: content,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating note in Firestore:', error);
      throw new Error('Failed to update note');
    }
  }

  // Delete a note
  static async deleteNote(noteId: string): Promise<void> {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to delete notes');
    }

    try {
      const noteDoc = doc(db, 'users', currentUser.uid, 'notes', noteId);
      await deleteDoc(noteDoc);
    } catch (error) {
      console.error('Error deleting note from Firestore:', error);
      throw new Error('Failed to delete note');
    }
  }

  // Create user document (called after successful registration)
  static async createUserDocument(userId: string, email: string): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      await updateDoc(userDoc, {
        email: email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // If document doesn't exist, create it using the same document reference
      const userDocRef = doc(db, 'users', userId);
      await addDoc(collection(db, 'users'), {
        userId: userId,
        email: email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('Created user document:', userDocRef.id);
    }
  }
}
