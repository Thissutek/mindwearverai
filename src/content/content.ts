/**
 * content.ts
 * Entry point for the floating notepad extension (Pure TypeScript - no React/JSX)
 */

import './content.css';
import { Notepad, NotepadOptions } from '../modules/notepad/Notepad';
import { NotepadState, stateManager } from '../modules/state/StateManager';
import { storageService } from '../modules/storage/StorageService';
import { DOMSidebar } from '../modules/sidebar/DOMSidebar';
import { authBridge } from '../services/authBridge';

// Constants
const CONTROL_BUTTON_ID = 'mindweaver-control-button';

// Track active notepads and sidebar
const activeNotepads: Map<string, Notepad> = new Map();
let sidebar: DOMSidebar | null = null;

/**
 * Create a floating control button for creating new notepads
 */
function createControlButton(): HTMLElement {
  // Check if button already exists
  let controlButton = document.getElementById(CONTROL_BUTTON_ID);
  
  if (!controlButton) {
    // Create button
    controlButton = document.createElement('div');
    controlButton.id = CONTROL_BUTTON_ID;
    controlButton.className = 'mw-control-button';
    controlButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14"></path>
        <path d="M5 12h14"></path>
      </svg>
    `;
    controlButton.title = 'Create new notepad';
    
    // Add click event to create new notepad
    controlButton.addEventListener('click', createNewNotepad);
    
    // Add to document
    document.body.appendChild(controlButton);
  }
  
  return controlButton;
}



/**
 * Create a new notepad
 */
function createNewNotepad(): void {
  // Calculate position for new notepad
  // Offset each new notepad slightly to avoid perfect stacking
  const offset = activeNotepads.size * 20;
  
  const notepadOptions: NotepadOptions = {
    initialPosition: {
      x: 100 + offset,
      y: 100 + offset
    },
    initialState: NotepadState.NORMAL,
    initialContent: ''
  };
  
  // Create notepad
  const notepad = new Notepad(notepadOptions);
  
  // Add to active notepads
  activeNotepads.set(notepad.getId(), notepad);
  
  // Set up cleanup handler for when notepad is destroyed
  const cleanup = () => {
    activeNotepads.delete(notepad.getId());
    console.log('🗑️ Removed notepad from active list:', notepad.getId(), 'Remaining:', activeNotepads.size);
  };
  
  // Store cleanup function for potential use
  (notepad as any).__cleanup = cleanup;
  
  // Refresh sidebar to show updated notes
  if (sidebar) {
    sidebar.refresh();
  }
}

/**
 * Reopen a notepad from existing data (called when clicking sidebar notes)
 */
async function reopenNotepad(notepadId: string): Promise<void> {
  console.log('🔄 Attempting to reopen notepad:', notepadId);
  
  // Check if notepad is already open
  if (activeNotepads.has(notepadId)) {
    console.log('⚠️ Notepad already open:', notepadId);
    // Focus the existing notepad by bringing it to front
    const existingNotepad = activeNotepads.get(notepadId);
    if (existingNotepad) {
      const element = existingNotepad.getElement();
      element.style.zIndex = (9999 + activeNotepads.size).toString();
    }
    return;
  }
  
  try {
    // First verify the notepad exists in storage
    console.log('📦 Verifying notepad exists in storage:', notepadId);
    const allNotepads = await storageService.loadAllNotepads();
    const notepadData = allNotepads[notepadId];
    
    if (!notepadData) {
      console.error('❌ Notepad not found in storage:', notepadId);
      // Refresh sidebar to remove stale entries
      if (sidebar) {
        sidebar.refresh();
      }
      return;
    }
    
    console.log('✅ Found notepad data:', {
      id: notepadData.id,
      contentLength: notepadData.content.length,
      tags: notepadData.tags || [],
      lastModified: notepadData.lastModified
    });
    
    // Calculate position for reopened notepad
    const offset = activeNotepads.size * 20;
    
    const notepadOptions: NotepadOptions = {
      id: notepadId, // Use existing ID to load saved data
      initialPosition: {
        x: 100 + offset,
        y: 100 + offset
      },
      initialState: NotepadState.NORMAL
    };
    
    console.log('🔧 Creating notepad with options:', notepadOptions);
    
    // Create notepad with existing ID (will load saved content)
    const notepad = new Notepad(notepadOptions);
    
    // Add to active notepads
    activeNotepads.set(notepad.getId(), notepad);
    
    // Set up cleanup handler for when notepad is destroyed
    const cleanup = () => {
      activeNotepads.delete(notepadId);
      console.log('🗑️ Removed notepad from active list:', notepadId, 'Remaining:', activeNotepads.size);
    };
    
    // Store cleanup function for potential use
    (notepad as any).__cleanup = cleanup;
    
    console.log('✅ Successfully reopened notepad:', notepadId, 'Total active:', activeNotepads.size);
    
  } catch (error) {
    console.error('❌ Failed to reopen notepad:', notepadId, error);
    
    // Show user-friendly error
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #fee2e2;
      border: 1px solid #fca5a5;
      color: #b91c1c;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    errorMessage.textContent = 'Failed to open note. Please try again.';
    document.body.appendChild(errorMessage);
    
    // Auto-remove error message after 3 seconds
    setTimeout(() => {
      if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 3000);
  }
}

/**
 * Initialize the extension with authentication state monitoring
 */
function initializeExtension(): void {
  console.log('🚀 MindWeaver extension initializing...');
  
  // Initialize authentication state monitoring
  initializeAuthState();
  
  // Create control button
  createControlButton();
  
  // Create sidebar
  sidebar = new DOMSidebar();
  
  console.log('✅ MindWeaver extension initialized successfully');
  
  // Set up cleanup handler
  const cleanupHandler = () => {
    // Clean up notepads
    activeNotepads.forEach(notepad => notepad.destroy());
    activeNotepads.clear();
    
    // Clean up sidebar
    if (sidebar) {
      sidebar.cleanup();
      sidebar = null;
    }
    
    // Remove control button
    const controlButton = document.getElementById(CONTROL_BUTTON_ID);
    if (controlButton) {
      controlButton.removeEventListener('click', createNewNotepad);
      controlButton.remove();
    }
    
    // Remove event listeners
    window.removeEventListener('unload', cleanupHandler);
    window.removeEventListener('beforeunload', cleanupHandler);
  };
  
  // Add event listeners for both unload and beforeunload for better cleanup coverage
  window.addEventListener('unload', cleanupHandler);
  window.addEventListener('beforeunload', cleanupHandler);
  
  // Handle visibility change to save state when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Force save all notepads when tab becomes hidden
      activeNotepads.forEach(notepad => {
        const id = notepad.getId();
        const data = stateManager.getNotepad(id);
        if (data) {
          storageService.saveNotepad(data);
        }
      });
    }
  });
  
  // Listen for notepad save events to refresh sidebar
  document.addEventListener('mindweaver-notepad-saved', () => {
    if (sidebar) {
      sidebar.refresh();
    }
  });
  
  // Listen for sidebar note click events to reopen notepads
  document.addEventListener('mindweaver-sidebar-note-click', async (event: Event) => {
    const customEvent = event as CustomEvent;
    const notepadId = customEvent.detail?.notepadId;
    if (notepadId) {
      await reopenNotepad(notepadId);
    }
  });
  
  // Expose reopenNotepad function globally for sidebar access
  (window as any).mindweaverReopenNotepad = reopenNotepad;
}

/**
 * Initialize authentication state monitoring
 */
function initializeAuthState(): void {
  console.log('🔐 Initializing authentication state monitoring...');
  
  // Listen for auth state changes
  authBridge.onAuthStateChanged((user) => {
    console.log('🔄 Content script received auth state change:', {
      hasUser: !!user,
      userEmail: user?.email || 'null',
      timestamp: new Date().toISOString()
    });
    
    // Update sidebar with new auth state
    if (sidebar) {
      console.log('🔄 Refreshing sidebar with new auth state');
      sidebar.refresh();
    }
    
    // Notify all active notepads of auth state change
    activeNotepads.forEach((_, notepadId) => {
      console.log(`🔄 Notifying notepad ${notepadId} of auth state change`);
      // The notepad will handle auth state through StorageService when it tries to save
    });
    
    // Log current storage service auth state for debugging
    console.log('🔍 StorageService auth check:', {
      isAuthenticated: storageService.isAuthenticated(),
      currentUser: storageService.getCurrentUser()?.email || 'null'
    });
  });
  
  // Force initial auth state request with retry logic
  let retryCount = 0;
  const maxRetries = 5;
  const retryDelay = 1000; // 1 second
  
  const requestAuthWithRetry = () => {
    console.log(`📨 Requesting auth state (attempt ${retryCount + 1}/${maxRetries})...`);
    
    // Check if we already have auth state
    const currentUser = authBridge.getCurrentUser();
    if (currentUser) {
      console.log('✅ Auth state already available:', currentUser.email);
      return;
    }
    
    // Force auth bridge to request state from popup
    authBridge.requestAuthState();
    
    retryCount++;
    if (retryCount < maxRetries) {
      setTimeout(requestAuthWithRetry, retryDelay);
    } else {
      console.warn('⚠️ Failed to get auth state after', maxRetries, 'attempts');
    }
  };
  
  // Start auth state request after a short delay to ensure popup is ready
  setTimeout(requestAuthWithRetry, 500);
  
  // Also try to get auth state immediately
  console.log('📨 Immediate auth state request...');
  authBridge.requestAuthState();
}

// Run when content script is loaded
if (document.readyState === 'complete') {
  initializeExtension();
} else {
  window.addEventListener('load', () => {
    initializeExtension();
  });
}
