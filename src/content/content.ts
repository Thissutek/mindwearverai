/**
 * content.ts
 * Entry point for the floating notepad extension (Pure TypeScript - no React/JSX)
 */

import './content.css';
import { Notepad, NotepadOptions } from '../modules/notepad/Notepad';
import { NotepadState, stateManager } from '../modules/state/StateManager';
import { storageService } from '../modules/storage/StorageService';
import { DOMSidebar } from '../modules/sidebar/DOMSidebar';

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
  
  // Refresh sidebar to show updated notes
  if (sidebar) {
    sidebar.refresh();
  }
}

/**
 * Load saved notepads from storage
 */
async function loadSavedNotepads(): Promise<void> {
  try {
    // Get saved notepads from storage
    const savedNotepads = await storageService.loadAllNotepads();
    
    // Create notepad instances for each saved notepad
    Object.values(savedNotepads).forEach(notepadData => {
      if (!activeNotepads.has(notepadData.id)) {
        const notepad = new Notepad({
          id: notepadData.id
        });
        activeNotepads.set(notepadData.id, notepad);
      }
    });
  } catch (error) {
    console.error('Failed to load saved notepads:', error);
  }
}

/**
 * Initialize the extension
 */
function initializeExtension(): void {
  // Create control button
  createControlButton();
  
  // Initialize sidebar
  sidebar = new DOMSidebar();
  
  // Load saved notepads
  loadSavedNotepads();
  
  // Clean up when extension is unloaded
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
}

// Run when content script is loaded
if (document.readyState === 'complete') {
  initializeExtension();
} else {
  window.addEventListener('load', () => {
    initializeExtension();
  });
}
