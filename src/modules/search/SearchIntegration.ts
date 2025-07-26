/**
 * SearchIntegration.ts
 * Integrates search functionality with the existing notepad system
 */

import { SearchManager } from './SearchManager';
import { SearchUI } from './SearchUI';
import { stateManager, NotepadData } from '../state/StateManager';
import { storageService } from '../storage/StorageService';
import { authBridge } from '../../services/authBridge';
import { Notepad } from '../notepad/Notepad';
import './search.css';

// LocalStorage key for session notes
const SESSION_NOTES_KEY = 'mindweaver-session-notes';

/**
 * LocalStorage utilities for session notes
 */
class SessionNotesStorage {
  static saveNote(noteData: NotepadData): void {
    try {
      const sessionNotes = this.getAllNotes();
      sessionNotes[noteData.id] = noteData;
      localStorage.setItem(SESSION_NOTES_KEY, JSON.stringify(sessionNotes));
      // console.log('📝 Saved note to session storage for search:', noteData.id);
    } catch (error) {
      console.warn('⚠️ Failed to save note to session storage:', error);
    }
  }

  static getAllNotes(): Record<string, NotepadData> {
    try {
      const stored = localStorage.getItem(SESSION_NOTES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('⚠️ Failed to load session notes:', error);
      return {};
    }
  }

  static deleteNote(noteId: string): void {
    try {
      const sessionNotes = this.getAllNotes();
      delete sessionNotes[noteId];
      localStorage.setItem(SESSION_NOTES_KEY, JSON.stringify(sessionNotes));
      // console.log('🗑️ Removed note from session storage:', noteId);
    } catch (error) {
      console.warn('⚠️ Failed to delete note from session storage:', error);
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(SESSION_NOTES_KEY);
      // console.log('🧹 Cleared session notes storage');
    } catch (error) {
      console.warn('⚠️ Failed to clear session storage:', error);
    }
  }
}

export interface SearchIntegrationOptions {
  sidebarContainer: HTMLElement;
  onNoteOpen?: (noteId: string) => void;
  onTagFilter?: (tag: string) => void;
}

export class SearchIntegration {
  private searchManager: SearchManager;
  private searchUI: SearchUI;
  private options: SearchIntegrationOptions;
  private activeNotepads: Map<string, Notepad> = new Map();

  constructor(options: SearchIntegrationOptions) {
    // console.log('🔧 SearchIntegration constructor called at:', new Date().toISOString());
    this.options = options;
    this.searchManager = new SearchManager();
    
    // Set up notepad tracking for real-time updates IMMEDIATELY (before anything else)
    // This ensures that any new notepad creation will be captured
    this.setupNotepadTracking();
    
    // Check if there are already notes in StateManager
    // const existingNotes = stateManager.getAllNotepads();
    // console.log('📊 Existing notes in StateManager at SearchIntegration init:', existingNotes.length);
    
    // Create search UI with correct interface
    this.searchUI = new SearchUI(this.searchManager, {
      container: options.sidebarContainer,
      onNoteSelect: this.handleNoteSelect.bind(this),
      onTagSelect: this.handleTagSelect.bind(this),
      placeholder: 'Search notes and tags...'
    });
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Initialize search index (this will load existing notes)
    this.initializeSearchIndex();
    
    // console.log('✅ SearchIntegration fully initialized at:', new Date().toISOString());
  }

  /**
   * Initialize search index with existing notes from storage
   * Handles authentication timing issues by waiting for auth state
   */
  private async initializeSearchIndex(): Promise<void> {
    // console.log('🔍 Starting search index initialization...');
    
    // Check if user is authenticated
    if (!storageService.isAuthenticated()) {
      // console.log('⏳ User not authenticated yet, waiting for auth state...');
      
      // Set up auth state listener to initialize when user is authenticated
      const handleAuthChange = (user: any) => {
        if (user) {
          // console.log('✅ User authenticated, initializing search index...');
          this.loadNotesIntoSearchIndex();
          // Remove the listener after successful initialization
          if (unsubscribeAuth) {
            unsubscribeAuth();
          }
        } else {
          // console.log('❌ User signed out, clearing search index...');
          this.clearSearchIndex();
        }
      };
      
      const unsubscribeAuth = authBridge.onAuthStateChanged(handleAuthChange);
      
      // Also try to initialize immediately in case auth state is already available
      setTimeout(() => {
        if (storageService.isAuthenticated()) {
          this.loadNotesIntoSearchIndex();
        }
      }, 1000);
      
      return;
    }
    
    // User is already authenticated, proceed with initialization
    await this.loadNotesIntoSearchIndex();
  }

  /**
   * Load notes from storage into search index (includes both Firebase and session storage)
   */
  private async loadNotesIntoSearchIndex(): Promise<void> {
    try {
      // console.log('📦 Loading notes from storage service and session storage...');
      
      // Get all existing notepads from Firebase
      const notepadMap = await storageService.loadAllNotepads();
      const firebaseNotes = Object.values(notepadMap);
      
      // Get session notes from localStorage
      const sessionNotes = Object.values(SessionNotesStorage.getAllNotes());
      
      // Combine notes (session notes override Firebase if same ID)
      const combinedNotesMap: Record<string, NotepadData> = {};
      
      // Add Firebase notes first
      firebaseNotes.forEach(note => {
        combinedNotesMap[note.id] = note;
      });
      
      // Add/override with session notes
      sessionNotes.forEach(note => {
        combinedNotesMap[note.id] = note;
      });
      
      const allNotepads = Object.values(combinedNotesMap);
      
      // console.log(`📦 Found ${firebaseNotes.length} Firebase notes + ${sessionNotes.length} session notes = ${allNotepads.length} total`);
      
      // Clear existing index first
      this.clearSearchIndex();
      
      // Index each notepad
      allNotepads.forEach(notepad => {
        this.searchManager.indexNote(notepad);
      });

      // console.log(`🔍 Search index initialized with ${allNotepads.length} notes (including session notes)`);
      
      // Also sync with state manager
      allNotepads.forEach(notepad => {
        if (!stateManager.getNotepad(notepad.id)) {
          stateManager.createNotepad(notepad.id, {
            content: notepad.content,
            position: notepad.position,
            state: notepad.state,
            tags: notepad.tags || []
          });
        }
      });
    } catch (error) {
      console.error('❌ Failed to load notes into search index:', error);
      
      // If loading fails, try again after a delay
      setTimeout(() => {
        // console.log('🔄 Retrying search index initialization...');
        this.loadNotesIntoSearchIndex();
      }, 3000);
    }
  }

  /**
   * Clear the search index
   */
  private clearSearchIndex(): void {
    // Clear the search manager's internal state
    (this.searchManager as any).notes.clear();
    (this.searchManager as any).searchIndex.clear();
    (this.searchManager as any).tagIndex.clear();
    // console.log('🧹 Search index cleared');
  }

  /**
   * Handle note selection from search results
   */
  private handleNoteSelect(noteId: string): void {
    // console.log('🔍 Note selected from search:', noteId);
    
    // Check if notepad is already open
    if (this.activeNotepads.has(noteId)) {
      const existingNotepad = this.activeNotepads.get(noteId);
      if (existingNotepad) {
        // Focus existing notepad
        const element = existingNotepad.getElement();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
          element.style.animation = '';
        }, 500);
        return;
      }
    }

    // Use the callback to open the notepad (this prevents duplicate opening)
    // The callback will handle the actual notepad creation through the existing system
    if (this.options.onNoteOpen) {
      this.options.onNoteOpen(noteId);
    } else {
      // Fallback: open notepad directly if no callback provided
      const noteData = stateManager.getNotepad(noteId);
      if (noteData) {
        this.openNotepad(noteData);
      } else {
        console.error('Note not found in state manager:', noteId);
      }
    }
  }

  /**
   * Handle tag selection from search UI
   */
  private handleTagSelect(tag: string): void {
    // console.log('🏷️ Tag selected from search:', tag);
    
    // Find notes with this tag
    const notesWithTag = stateManager.getAllNotepads().filter(notepad => 
      notepad.tags && notepad.tags.includes(tag)
    );
    
    // console.log(`Found ${notesWithTag.length} notes with tag #${tag}`);
    
    // Open the first few notes with this tag (limit to prevent overwhelming)
    const maxNotesToOpen = 3;
    const notesToOpen = notesWithTag.slice(0, maxNotesToOpen);
    
    notesToOpen.forEach(noteData => {
      // Check if notepad is already open
      if (this.activeNotepads.has(noteData.id)) {
        // console.log('Notepad already open:', noteData.id);
        return;
      }
      
      // Use the callback to open the note instead of creating directly
      if (this.options.onNoteOpen) {
        this.options.onNoteOpen(noteData.id);
      }
      
      // console.log('📝 Opened notepad from tag filter:', noteData.id);
    });
    
    if (notesWithTag.length > maxNotesToOpen) {
      // console.log(`Opened ${maxNotesToOpen} of ${notesWithTag.length} notes with tag #${tag}`);
    }
    
    // Call custom handler if provided
    if (this.options.onTagFilter) {
      this.options.onTagFilter(tag);
    }
  }

  /**
   * Open a notepad
   */
  private openNotepad(noteData: NotepadData, positionOverride?: { x: number; y: number }): void {
    const notepad = new Notepad({
      id: noteData.id,
      initialContent: noteData.content,
      initialPosition: positionOverride || noteData.position,
      initialState: noteData.state,
      initialSize: { width: 300, height: 400 }
    });

    // Track the notepad
    this.activeNotepads.set(noteData.id, notepad);

    // Set up cleanup when notepad is destroyed
    const originalDestroy = notepad.destroy.bind(notepad);
    notepad.destroy = () => {
      this.activeNotepads.delete(noteData.id);
      originalDestroy();
    };

    // console.log('📝 Opened notepad from search:', noteData.id);
  }

  /**
   * Set up storage service tracking to refresh search index on every save
   */
  private setupNotepadTracking(): void {
    // console.log('🔗 Setting up search index refresh on note saves...');
    
    // Hook into storage service to refresh search index whenever a note is saved
    this.setupStorageServiceTracking();
    
    // Also hook into StateManager for immediate indexing when notes are created
    this.setupStateManagerTracking();
    
    // console.log('✅ Search index refresh tracking is now active');
  }

  /**
   * Set up StateManager tracking for immediate indexing of new notes
   */
  private setupStateManagerTracking(): void {
    // console.log('🔗 Setting up StateManager hooks for search indexing...');
    
    // Check if hooks are already applied to prevent double-hooking
    if ((stateManager.createNotepad as any).__searchHookApplied) {
      // console.log('⚠️ StateManager hooks already applied, skipping to prevent double-hooking');
      return;
    }
    
    // Hook into createNotepad to immediately index new notes and save to session storage
    const originalCreateNotepad = stateManager.createNotepad.bind(stateManager);
    stateManager.createNotepad = (id: string, initialData: Partial<NotepadData> = {}) => {
      // console.log('🆕 HOOKED StateManager.createNotepad called for:', id, 'data:', initialData);
      const result = originalCreateNotepad(id, initialData);
      if (result) {
        // Immediately index the new note for search
        this.searchManager.indexNote(result);
        // Save to session storage for search availability
        SessionNotesStorage.saveNote(result);
        // console.log('🔍 Immediately indexed new note for search:', id, 'content length:', result.content.length, 'tags:', result.tags);
        // console.log('🔍 Search index now has', (this.searchManager as any).notes.size, 'total notes');
      }
      return result;
    };
    (stateManager.createNotepad as any).__searchHookApplied = true;
    
    // Hook into updateNotepad to re-index when content changes and save to session storage
    const originalUpdateNotepad = stateManager.updateNotepad.bind(stateManager);
    stateManager.updateNotepad = (id: string, updates: Partial<NotepadData>) => {
      // console.log('🔄 HOOKED StateManager.updateNotepad called for:', id, 'updates:', updates);
      const result = originalUpdateNotepad(id, updates);
      if (result) {
        // Re-index the updated note for search
        this.searchManager.indexNote(result);
        // Save to session storage for search availability
        SessionNotesStorage.saveNote(result);
        // console.log('🔍 Re-indexed updated note for search:', id, 'content length:', result.content.length, 'tags:', result.tags);
        // console.log('🔍 Search index now has', (this.searchManager as any).notes.size, 'total notes');
      }
      return result;
    };
    (stateManager.updateNotepad as any).__searchHookApplied = true;
    
    // console.log('✅ StateManager hooks applied successfully');
  }

  /**
   * Set up storage service tracking to refresh search index on saves
   */
  private setupStorageServiceTracking(): void {
    // console.log('🔗 Setting up StorageService hooks for search refresh...');
    
    // Check if hooks are already applied to prevent double-hooking
    if ((storageService.saveNotepad as any).__searchHookApplied) {
      // console.log('⚠️ StorageService hooks already applied, skipping to prevent double-hooking');
      return;
    }
    
    // Hook into storage service to refresh entire search index after every save
    const originalSaveNotepad = storageService.saveNotepad.bind(storageService);
    storageService.saveNotepad = async (notepad: NotepadData) => {
      // console.log('💾 HOOKED StorageService.saveNotepad called for:', notepad.id, 'content length:', notepad.content.length);
      // console.log('💾 Will refresh search index after save...');
      
      // Save the note first
      const result = await originalSaveNotepad(notepad);
      
      // After successful save, reload the entire search index from storage
      await this.reloadSearchIndexFromStorage();
      
      return result;
    };
    (storageService.saveNotepad as any).__searchHookApplied = true;
    
    // console.log('✅ StorageService hooks applied successfully');
  }

  /**
   * Reload the entire search index from storage (includes both Firebase and session storage)
   */
  private async reloadSearchIndexFromStorage(): Promise<void> {
    try {
      // console.log('🔄 Reloading search index from storage and session storage...');
      
      // Clear current search index
      (this.searchManager as any).notes.clear();
      (this.searchManager as any).searchIndex.clear();
      (this.searchManager as any).tagIndex.clear();
      
      // Load fresh data from Firebase
      const notepadMap = await storageService.loadAllNotepads();
      const firebaseNotes = Object.values(notepadMap);
      
      // Get session notes from localStorage
      const sessionNotes = Object.values(SessionNotesStorage.getAllNotes());
      
      // Combine notes (session notes override Firebase if same ID)
      const combinedNotesMap: Record<string, NotepadData> = {};
      
      // Add Firebase notes first
      firebaseNotes.forEach(note => {
        combinedNotesMap[note.id] = note;
      });
      
      // Add/override with session notes
      sessionNotes.forEach(note => {
        combinedNotesMap[note.id] = note;
      });
      
      const allNotepads = Object.values(combinedNotesMap);
      
      // console.log(`📦 Loaded ${firebaseNotes.length} Firebase notes + ${sessionNotes.length} session notes = ${allNotepads.length} total for re-indexing`);
      
      // Re-index all notes
      allNotepads.forEach(notepad => {
        this.searchManager.indexNote(notepad);
        
        // Also ensure StateManager has the latest data
        if (!stateManager.getNotepad(notepad.id)) {
          stateManager.createNotepad(notepad.id, {
            content: notepad.content,
            position: notepad.position,
            state: notepad.state,
            tags: notepad.tags || []
          });
        }
      });
      
      // console.log(`✅ Search index reloaded with ${allNotepads.length} notes (including session notes)`);
      
    } catch (error) {
      console.error('❌ Failed to reload search index from storage:', error);
    }
  }

  /**
   * Manually refresh the search index (public method)
   */
  public async refreshSearchIndex(): Promise<void> {
    await this.reloadSearchIndexFromStorage();
  }

  /**
   * Force refresh search index including localStorage notes (for sidebar opening)
   */
  public async forceRefreshWithLocalStorage(): Promise<void> {
    // console.log('🔄 Force refreshing search index with localStorage notes...');
    
    // Clear current search index
    (this.searchManager as any).notes.clear();
    (this.searchManager as any).searchIndex.clear();
    (this.searchManager as any).tagIndex.clear();
    
    // Load and combine Firebase + localStorage notes
    try {
      const notepadMap = await storageService.loadAllNotepads();
      const firebaseNotes = Object.values(notepadMap);
      const sessionNotes = Object.values(SessionNotesStorage.getAllNotes());
      
      // Combine notes (session notes override Firebase if same ID)
      const combinedNotesMap: Record<string, NotepadData> = {};
      
      firebaseNotes.forEach(note => {
        combinedNotesMap[note.id] = note;
      });
      
      sessionNotes.forEach(note => {
        combinedNotesMap[note.id] = note;
      });
      
      const allNotepads = Object.values(combinedNotesMap);
      
      // console.log(`🔄 Force refresh: ${firebaseNotes.length} Firebase + ${sessionNotes.length} localStorage = ${allNotepads.length} total notes`);
      
      // Re-index all notes
      allNotepads.forEach(notepad => {
        this.searchManager.indexNote(notepad);
      });
      
      // console.log(`✅ Search index force refreshed with ${allNotepads.length} notes`);
      
    } catch (error) {
      console.error('❌ Failed to force refresh search index:', error);
    }
  }

  /**
   * Debug method to check search integration status
   */
  public debugSearchIntegration(): void {
    console.log('🔍 === SEARCH INTEGRATION DEBUG INFO ===');
    console.log('🔍 SearchManager notes count:', (this.searchManager as any).notes.size);
    console.log('🔍 StateManager notes count:', stateManager.getAllNotepads().length);
    console.log('🔍 StateManager createNotepad hook applied:', !!(stateManager.createNotepad as any).__searchHookApplied);
    console.log('🔍 StorageService saveNotepad hook applied:', !!(storageService.saveNotepad as any).__searchHookApplied);
    
    // Check localStorage notes
    const sessionNotes = SessionNotesStorage.getAllNotes();
    console.log('🔍 LocalStorage session notes count:', Object.keys(sessionNotes).length);
    console.log('🔍 LocalStorage session notes:', Object.values(sessionNotes).map((n: any) => ({
      id: n.id,
      contentLength: n.content.length,
      tags: n.tags || []
    })));
    
    const stateNotes = stateManager.getAllNotepads();
    console.log('🔍 StateManager notes:', stateNotes.map(n => ({
      id: n.id,
      contentLength: n.content.length,
      tags: n.tags
    })));
    
    const searchNotes = Array.from((this.searchManager as any).notes.values());
    console.log('🔍 SearchManager notes:', searchNotes.map((n: any) => ({
      id: n.id,
      contentLength: n.content.length,
      tags: n.tags
    })));
    
    console.log('🔍 === END DEBUG INFO ===');
  }


  /**
   * Add keyboard shortcut for search
   */
  public setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        this.focusSearch();
      }
      
      // Ctrl/Cmd + Shift + F for advanced search
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        this.focusSearch();
        // Could expand to show advanced search options
      }
    });
  }

  /**
   * Focus the search input
   */
  public focusSearch(): void {
    this.searchUI.focus();
  }

  /**
   * Get search statistics
   */
  public getSearchStats(): { totalNotes: number; totalTags: number } {
    const allTags = this.searchManager.getAllTags();
    const allNotepads = stateManager.getAllNotepads();
    
    return {
      totalNotes: allNotepads.length,
      totalTags: allTags.length
    };
  }


  /**
   * Export search functionality for external use
   */
  public getSearchManager(): SearchManager {
    return this.searchManager;
  }

  /**
   * Destroy the search integration
   */
  public destroy(): void {
    this.searchUI.destroy();
    
    // Clean up active notepads
    this.activeNotepads.forEach(notepad => {
      notepad.destroy();
    });
    this.activeNotepads.clear();
  }
}

// CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);
