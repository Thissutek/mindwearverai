import { 
  collection, 
  doc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  setDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { authBridge } from './authBridge';
import { NotepadData } from '../modules/state/StateManager';

export interface FirebaseNotepadData extends Omit<NotepadData, 'id'> {
  id?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class FirebaseNotepadService {
  // Get the current user's notepads collection reference
  private static getUserNotepadsCollection(userId: string) {
    return collection(db, 'users', userId, 'notepads');
  }

  // Save a notepad to Firestore
  static async saveNotepad(notepadData: NotepadData): Promise<NotepadData> {
    const currentUser = authBridge.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to save notepads');
    }

    console.log('🔐 Firebase save - User context:', {
      uid: currentUser.uid,
      email: currentUser.email,
      notepadId: notepadData.id,
      firestorePath: `users/${currentUser.uid}/notepads/${notepadData.id}`
    });

    try {
      const notepadDoc = doc(db, 'users', currentUser.uid, 'notepads', notepadData.id);
      
      const firebaseData = {
        content: notepadData.content,
        position: notepadData.position,
        state: notepadData.state,
        lastModified: notepadData.lastModified,
        userId: currentUser.uid,
        createdAt: notepadData.lastModified ? Timestamp.fromMillis(notepadData.lastModified) : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(notepadDoc, firebaseData);

      return notepadData;
    } catch (error) {
      console.error('Error saving notepad to Firestore:', error);
      throw new Error('Failed to save notepad');
    }
  }

  // Get all notepads for the current user
  static async getAllNotepads(): Promise<Record<string, NotepadData>> {
    const currentUser = authBridge.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to get notepads');
    }

    console.log('🔐 Firebase load - User context:', {
      uid: currentUser.uid,
      email: currentUser.email,
      firestorePath: `users/${currentUser.uid}/notepads`
    });

    try {
      const notepadsCollection = this.getUserNotepadsCollection(currentUser.uid);
      const q = query(notepadsCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const notepads: Record<string, NotepadData> = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notepads[doc.id] = {
          id: doc.id,
          content: data.content,
          position: data.position,
          state: data.state,
          lastModified: data.lastModified
        };
      });

      return notepads;
    } catch (error) {
      console.error('Error getting notepads from Firestore:', error);
      throw new Error('Failed to get notepads');
    }
  }

  // Delete a notepad
  static async deleteNotepad(notepadId: string): Promise<void> {
    const currentUser = authBridge.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to delete notepads');
    }

    try {
      const notepadDoc = doc(db, 'users', currentUser.uid, 'notepads', notepadId);
      await deleteDoc(notepadDoc);
    } catch (error) {
      console.error('Error deleting notepad from Firestore:', error);
      throw new Error('Failed to delete notepad');
    }
  }

  // Update a notepad
  static async updateNotepad(notepadId: string, updates: Partial<NotepadData>): Promise<void> {
    const currentUser = authBridge.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to update notepads');
    }

    try {
      const notepadDoc = doc(db, 'users', currentUser.uid, 'notepads', notepadId);
      await updateDoc(notepadDoc, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating notepad in Firestore:', error);
      throw new Error('Failed to update notepad');
    }
  }

  // Check if user is authenticated
  static isUserAuthenticated(): boolean {
    return authBridge.getCurrentUser() !== null;
  }
}
