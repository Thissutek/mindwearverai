/**
 * Migration Helper
 * Utility to manually migrate localStorage notes to Firebase for existing users
 */

import { storageService } from '../modules/storage/StorageService';
import { authBridge } from '../services/authBridge';

export class MigrationHelper {
  /**
   * Manually migrate localStorage notes to Firebase
   * This can be called from the browser console or triggered by user action
   */
  static async migrateLocalStorageToFirebase(): Promise<{
    success: boolean;
    migratedCount: number;
    totalFound: number;
    errors: string[];
  }> {
    console.log('🔄 Starting manual migration of localStorage notes to Firebase...');
    
    const result = {
      success: false,
      migratedCount: 0,
      totalFound: 0,
      errors: [] as string[]
    };

    try {
      // Check if user is authenticated
      const user = authBridge.getCurrentUser();
      if (!user) {
        const error = 'User must be authenticated to migrate notes to Firebase';
        console.error('❌', error);
        result.errors.push(error);
        return result;
      }

      console.log('✅ User authenticated:', user.email);

      // Get notes from Chrome localStorage
      const localNotes = await new Promise<Record<string, any>>((resolve, reject) => {
        chrome.storage.local.get('mindweaver-notepads', (chromeResult) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(chromeResult['mindweaver-notepads'] || {});
          }
        });
      });

      const notepadIds = Object.keys(localNotes);
      result.totalFound = notepadIds.length;
      
      console.log(`📦 Found ${notepadIds.length} notes in localStorage:`, notepadIds);

      if (notepadIds.length === 0) {
        console.log('✅ No localStorage notes to migrate');
        result.success = true;
        return result;
      }

      // Migrate each note to Firebase
      for (const [notepadId, notepadData] of Object.entries(localNotes)) {
        try {
          console.log(`🔄 Migrating notepad ${notepadId} to Firebase...`);
          
          // Validate notepad data structure
          if (!notepadData || typeof notepadData !== 'object') {
            throw new Error(`Invalid notepad data structure for ${notepadId}`);
          }

          // Ensure required fields exist
          const validatedData = {
            id: notepadId,
            content: notepadData.content || '',
            position: notepadData.position || { x: 100, y: 100 },
            state: notepadData.state || 'normal',
            lastModified: notepadData.lastModified || Date.now()
          };

          await storageService.saveNotepad(validatedData);
          result.migratedCount++;
          console.log(`✅ Successfully migrated notepad ${notepadId}`);
          
        } catch (error) {
          const errorMsg = `Failed to migrate notepad ${notepadId}: ${error}`;
          console.error('❌', errorMsg);
          result.errors.push(errorMsg);
        }
      }

      console.log(`🎉 Migration completed: ${result.migratedCount}/${result.totalFound} notes migrated to Firebase`);

      // Clear localStorage after successful migration (optional)
      if (result.migratedCount > 0) {
        console.log('🧹 Clearing localStorage after successful migration...');
        chrome.storage.local.remove('mindweaver-notepads', () => {
          if (chrome.runtime.lastError) {
            console.warn('⚠️ Failed to clear localStorage after migration:', chrome.runtime.lastError);
            result.errors.push('Failed to clear localStorage after migration');
          } else {
            console.log('✅ localStorage cleared after migration');
          }
        });
      }

      result.success = result.migratedCount > 0 || result.totalFound === 0;
      return result;

    } catch (error) {
      const errorMsg = `Migration failed: ${error}`;
      console.error('❌', errorMsg);
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Check if there are localStorage notes that need migration
   */
  static async hasLocalStorageNotes(): Promise<boolean> {
    try {
      const localNotes = await new Promise<Record<string, any>>((resolve, reject) => {
        chrome.storage.local.get('mindweaver-notepads', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result['mindweaver-notepads'] || {});
          }
        });
      });

      return Object.keys(localNotes).length > 0;
    } catch (error) {
      console.error('Error checking localStorage notes:', error);
      return false;
    }
  }

  /**
   * Get count of localStorage notes
   */
  static async getLocalStorageNotesCount(): Promise<number> {
    try {
      const localNotes = await new Promise<Record<string, any>>((resolve, reject) => {
        chrome.storage.local.get('mindweaver-notepads', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result['mindweaver-notepads'] || {});
          }
        });
      });

      return Object.keys(localNotes).length;
    } catch (error) {
      console.error('Error counting localStorage notes:', error);
      return 0;
    }
  }
}

// Export for global access in browser console
(window as any).MigrationHelper = MigrationHelper;

// Auto-run migration on import if user is authenticated and has localStorage notes
setTimeout(async () => {
  if (authBridge.getCurrentUser() && await MigrationHelper.hasLocalStorageNotes()) {
    console.log('🔄 Auto-running migration for authenticated user with localStorage notes...');
    const result = await MigrationHelper.migrateLocalStorageToFirebase();
    if (result.success) {
      console.log('✅ Auto-migration completed successfully');
    } else {
      console.log('❌ Auto-migration failed, manual migration may be required');
    }
  }
}, 2000); // Wait 2 seconds for auth state to be established
