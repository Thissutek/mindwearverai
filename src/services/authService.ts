import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  AuthError
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { FirestoreService } from './firestoreService';
import { AuthBridge } from './authBridge';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      try {
        await FirestoreService.createUserDocument(user.uid, email);
      } catch (firestoreError) {
        console.error('Error creating user document:', firestoreError);
        // Don't throw error here as authentication was successful
      }
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      };
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(this.getErrorMessage(authError.code));
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const authUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      };
      
      // Trigger migration of localStorage notes to Firebase after successful sign-in
      try {
        await this.migrateLocalStorageToFirebase();
      } catch (migrationError) {
        console.warn('Failed to migrate localStorage notes to Firebase:', migrationError);
        // Don't fail the sign-in process if migration fails
      }
      
      return authUser;
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(this.getErrorMessage(authError.code));
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error('Failed to sign out');
    }
  }

  // Get current user
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Listen to auth state changes
  static onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      const authUser = user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      } : null;
      
      // Notify content scripts of auth state change
      AuthBridge.notifyAuthStateChange(authUser);
      
      // Call the callback
      callback(authUser);
    });
  }

  // Migrate localStorage notes to Firebase after sign-in
  private static async migrateLocalStorageToFirebase(): Promise<void> {
    console.log('🔄 Starting migration of localStorage notes to Firebase...');
    
    try {
      // Get notes from Chrome localStorage
      const localNotes = await new Promise<Record<string, any>>((resolve, reject) => {
        chrome.storage.local.get('mindweaver-notepads', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result['mindweaver-notepads'] || {});
          }
        });
      });
      
      const notepadIds = Object.keys(localNotes);
      console.log(`📦 Found ${notepadIds.length} notes in localStorage:`, notepadIds);
      
      if (notepadIds.length === 0) {
        console.log('✅ No localStorage notes to migrate');
        return;
      }
      
      // Import StorageService dynamically to avoid circular dependency
      const { storageService } = await import('../modules/storage/StorageService');
      
      // Save each note to Firebase (StorageService will handle Firebase vs localStorage logic)
      let migratedCount = 0;
      for (const [notepadId, notepadData] of Object.entries(localNotes)) {
        try {
          console.log(`🔄 Migrating notepad ${notepadId} to Firebase...`);
          await storageService.saveNotepad(notepadData as any);
          migratedCount++;
          console.log(`✅ Successfully migrated notepad ${notepadId}`);
        } catch (error) {
          console.error(`❌ Failed to migrate notepad ${notepadId}:`, error);
        }
      }
      
      console.log(`🎉 Migration completed: ${migratedCount}/${notepadIds.length} notes migrated to Firebase`);
      
      // Optionally clear localStorage after successful migration
      if (migratedCount > 0) {
        console.log('🧹 Clearing localStorage after successful migration...');
        chrome.storage.local.remove('mindweaver-notepads', () => {
          if (chrome.runtime.lastError) {
            console.warn('⚠️ Failed to clear localStorage after migration:', chrome.runtime.lastError);
          } else {
            console.log('✅ localStorage cleared after migration');
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  // Convert Firebase auth error codes to user-friendly messages
  private static getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}
