/**
 * DOMSidebar.ts
 * Pure DOM-based sidebar implementation for Chrome extension content script
 * Works with vanilla TypeScript (no React dependencies)
 */

import { NoteService, Note } from '../../services/noteService';

export class DOMSidebar {
  private sidebarContainer: HTMLElement | null = null;
  private sidebarTab: HTMLElement | null = null;
  private isOpen: boolean = false;
  private notes: Note[] = [];

  private static readonly SIDEBAR_CONTAINER_ID = 'mindweaver-sidebar-container';
  private static readonly SIDEBAR_TAB_ID = 'mindweaver-sidebar-tab';

  constructor() {
    this.init();
  }

  /**
   * Initialize the sidebar
   */
  private async init(): Promise<void> {
    await this.createSidebarElements();
    await this.loadNotes();
    this.attachEventListeners();
  }

  /**
   * Create the sidebar DOM elements
   */
  private async createSidebarElements(): Promise<void> {
    // Remove existing sidebar if it exists
    this.cleanup();

    // Create sidebar container
    this.sidebarContainer = document.createElement('div');
    this.sidebarContainer.id = DOMSidebar.SIDEBAR_CONTAINER_ID;
    this.sidebarContainer.className = 'mindweaver-sidebar-container';
    this.sidebarContainer.style.cssText = `
      position: fixed;
      top: 0;
      right: -300px;
      width: 300px;
      height: 100%;
      background-color: var(--sidebar-bg, #ffffff);
      border-left: 1px solid var(--sidebar-border, #e5e7eb);
      z-index: 9998;
      transition: right 0.3s ease-in-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    `;

    // Create sidebar content
    const sidebarContent = document.createElement('div');
    sidebarContent.className = 'mindweaver-sidebar-content';
    sidebarContent.style.cssText = `
      padding: 1rem;
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    `;

    // Create header
    const header = document.createElement('h2');
    header.textContent = 'My Notes';
    header.style.cssText = `
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 1rem;
      color: var(--sidebar-header-color, #111827);
      margin-top: 0;
    `;

    // Create notes container
    const notesContainer = document.createElement('div');
    notesContainer.id = 'sidebar-notes-container';
    notesContainer.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    `;

    sidebarContent.appendChild(header);
    sidebarContent.appendChild(notesContainer);
    this.sidebarContainer.appendChild(sidebarContent);

    // Create sidebar tab
    this.sidebarTab = document.createElement('div');
    this.sidebarTab.id = DOMSidebar.SIDEBAR_TAB_ID;
    this.sidebarTab.className = 'mindweaver-sidebar-tab';
    this.sidebarTab.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      width: 36px;
      height: 36px;
      border-radius: 6px 0 0 6px;
      background-color: var(--tab-bg, #3b82f6);
      color: var(--tab-color, #ffffff);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 9999;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease-in-out;
      transform: translateY(-50%);
      border-right: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    `;
    this.sidebarTab.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18l6-6-6-6"></path>
      </svg>
    `;
    this.sidebarTab.title = 'Toggle notes sidebar';

    // Add hover effects
    this.sidebarTab.addEventListener('mouseenter', () => {
      this.sidebarTab!.style.backgroundColor = 'var(--tab-hover-bg, #2563eb)';
      this.sidebarTab!.style.transform = 'translateY(-50%) scale(1.05)';
    });

    this.sidebarTab.addEventListener('mouseleave', () => {
      this.sidebarTab!.style.backgroundColor = 'var(--tab-bg, #3b82f6)';
      this.sidebarTab!.style.transform = 'translateY(-50%) scale(1)';
    });

    // Add elements to document
    document.body.appendChild(this.sidebarContainer);
    document.body.appendChild(this.sidebarTab);
  }

  /**
   * Load notes from storage and render them
   */
  private async loadNotes(): Promise<void> {
    try {
      this.notes = await NoteService.getNotes(false);
      this.renderNotes();
    } catch (error) {
      console.error('Error loading notes:', error);
      this.renderError('Failed to load notes');
    }
  }

  /**
   * Render notes in the sidebar
   */
  private renderNotes(): void {
    const notesContainer = document.getElementById('sidebar-notes-container');
    if (!notesContainer) return;

    // Clear existing content
    notesContainer.innerHTML = '';

    if (this.notes.length === 0) {
      // Show empty state
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.style.cssText = `
        background-color: #f3f4f6;
        padding: 1rem;
        border-radius: 0.375rem;
        color: #6b7280;
        text-align: center;
        border: 1px dashed #d1d5db;
      `;
      emptyState.innerHTML = `
        <p style="margin: 0; font-size: 0.875rem;">No notes found.</p>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.75rem;">Create floating notepads to save your thoughts!</p>
      `;
      notesContainer.appendChild(emptyState);
    } else {
      // Render notes
      this.notes.forEach(note => {
        const noteElement = this.createNoteElement(note);
        notesContainer.appendChild(noteElement);
      });
    }
  }

  /**
   * Create a note element
   */
  private createNoteElement(note: Note): HTMLElement {
    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';
    noteItem.style.cssText = `
      background-color: #ffffff;
      border-radius: 0.375rem;
      padding: 1rem;
      border: 1px solid var(--sidebar-border, #e5e7eb);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    `;

    // Note content
    const noteContent = document.createElement('div');
    noteContent.className = 'note-content';
    noteContent.style.cssText = `
      margin-bottom: 0.5rem;
      line-height: 1.5;
      color: var(--sidebar-text, #1f2937);
      font-size: 0.875rem;
      word-wrap: break-word;
    `;
    noteContent.textContent = note.content;

    // Note footer
    const noteFooter = document.createElement('div');
    noteFooter.className = 'note-footer';
    noteFooter.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--sidebar-text-secondary, #6b7280);
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--sidebar-border, #e5e7eb);
    `;

    // Timestamp
    const timestamp = document.createElement('span');
    timestamp.textContent = new Date(note.timestamp).toLocaleString();

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-note-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.cssText = `
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: background-color 0.2s ease;
      font-size: 0.75rem;
      font-weight: 500;
    `;
    deleteBtn.onclick = () => this.deleteNote(note.id);

    // Add hover effect to delete button
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.backgroundColor = '#fee2e2';
      deleteBtn.style.color = '#b91c1c';
    });

    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.backgroundColor = 'transparent';
      deleteBtn.style.color = '#ef4444';
    });

    noteFooter.appendChild(timestamp);
    noteFooter.appendChild(deleteBtn);

    noteItem.appendChild(noteContent);
    noteItem.appendChild(noteFooter);

    // Add hover effect to note item
    noteItem.addEventListener('mouseenter', () => {
      noteItem.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    });

    noteItem.addEventListener('mouseleave', () => {
      noteItem.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
    });

    return noteItem;
  }

  /**
   * Render error state
   */
  private renderError(message: string): void {
    const notesContainer = document.getElementById('sidebar-notes-container');
    if (!notesContainer) return;

    notesContainer.innerHTML = '';
    
    const errorState = document.createElement('div');
    errorState.style.cssText = `
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
      color: #b91c1c;
      padding: 1rem;
      border-radius: 0.25rem;
    `;
    errorState.innerHTML = `<p style="margin: 0; font-size: 0.875rem;">Error: ${message}</p>`;
    
    notesContainer.appendChild(errorState);
  }

  /**
   * Delete a note
   */
  private async deleteNote(noteId: string): Promise<void> {
    try {
      await NoteService.deleteNote(noteId, false);
      await this.loadNotes(); // Reload notes after deletion
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }

  /**
   * Toggle sidebar open/closed
   */
  public toggle(): void {
    this.isOpen = !this.isOpen;
    
    if (this.sidebarContainer && this.sidebarTab) {
      if (this.isOpen) {
        this.sidebarContainer.style.right = '0px';
        this.sidebarContainer.classList.add('open');
        this.sidebarTab.style.right = '300px';
        // Rotate arrow to point left when open
        const svg = this.sidebarTab.querySelector('svg');
        if (svg) {
          svg.style.transform = 'rotate(180deg)';
        }
      } else {
        this.sidebarContainer.style.right = '-300px';
        this.sidebarContainer.classList.remove('open');
        this.sidebarTab.style.right = '0px';
        // Reset arrow rotation when closed
        const svg = this.sidebarTab.querySelector('svg');
        if (svg) {
          svg.style.transform = 'rotate(0deg)';
        }
      }
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (this.sidebarTab) {
      this.sidebarTab.addEventListener('click', () => this.toggle());
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', (event) => {
      if (this.isOpen && this.sidebarContainer && this.sidebarTab) {
        const target = event.target as HTMLElement;
        if (!this.sidebarContainer.contains(target) && !this.sidebarTab.contains(target)) {
          this.toggle();
        }
      }
    });

    // Close sidebar on escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        this.toggle();
      }
    });
  }

  /**
   * Refresh notes (useful when new notes are added from notepads)
   */
  public async refresh(): Promise<void> {
    await this.loadNotes();
  }

  /**
   * Clean up sidebar elements
   */
  public cleanup(): void {
    const existingContainer = document.getElementById(DOMSidebar.SIDEBAR_CONTAINER_ID);
    const existingTab = document.getElementById(DOMSidebar.SIDEBAR_TAB_ID);
    
    if (existingContainer) {
      existingContainer.remove();
    }
    
    if (existingTab) {
      existingTab.remove();
    }
    
    this.sidebarContainer = null;
    this.sidebarTab = null;
    this.isOpen = false;
  }

  /**
   * Check if sidebar is open
   */
  public isOpened(): boolean {
    return this.isOpen;
  }
}
