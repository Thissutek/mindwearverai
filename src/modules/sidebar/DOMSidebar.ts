/**
 * DOMSidebar.ts
 * Pure DOM-based sidebar implementation for Chrome extension content script
 * Works with vanilla TypeScript and integrates with notepad storage system
 */

import { storageService } from '../storage/StorageService';
import { NotepadData } from '../state/StateManager';

export class DOMSidebar {
  private sidebarContainer: HTMLElement | null = null;
  private sidebarTab: HTMLElement | null = null;
  private isOpen: boolean = false;
  private notepads: NotepadData[] = [];

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
    await this.loadNotepads();
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
    this.sidebarContainer.style.cssText = `
      position: fixed;
      top: 0;
      right: -300px;
      width: 300px;
      height: 100%;
      background-color: #ffffff;
      border-left: 1px solid #e5e7eb;
      z-index: 9998;
      transition: right 0.3s ease-in-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    `;

    // Create sidebar content
    const sidebarContent = document.createElement('div');
    sidebarContent.style.cssText = `
      padding: 1rem;
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    `;

    // Create header
    const header = document.createElement('h2');
    header.textContent = 'My Notepads';
    header.style.cssText = `
      font-size: 1.25rem;
      font-weight: bold;
      margin: 0 0 1rem 0;
      color: #111827;
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
    this.sidebarTab.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      width: 36px;
      height: 36px;
      border-radius: 6px 0 0 6px;
      background-color: #3b82f6;
      color: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 9999;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease-in-out;
      transform: translateY(-50%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    this.sidebarTab.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"></path>
      </svg>
    `;
    this.sidebarTab.title = 'Toggle notes sidebar';

    // Add elements to DOM
    document.body.appendChild(this.sidebarContainer);
    document.body.appendChild(this.sidebarTab);
  }

  /**
   * Load notepads from storage and render them
   */
  private async loadNotepads(): Promise<void> {
    try {
      const notepadMap = await storageService.loadAllNotepads();
      const allNotepads = Object.values(notepadMap);
      
      console.log('📋 Sidebar loading notepads:', {
        totalFound: allNotepads.length,
        notepadIds: allNotepads.map(n => n.id),
        withContent: allNotepads.filter(n => n.content.trim() !== '').length,
        emptyContent: allNotepads.filter(n => n.content.trim() === '').length,
        contentSamples: allNotepads.map(n => ({ id: n.id, content: n.content.substring(0, 20) + '...' }))
      });
      
      // Show only notepads with content (users typically don't want to see empty ones)
      this.notepads = allNotepads.filter(notepad => notepad.content.trim() !== '');
      
      console.log('📋 Sidebar filtered notepads:', {
        displayCount: this.notepads.length,
        displayedIds: this.notepads.map(n => n.id)
      });
      this.renderNotepads();
    } catch (error) {
      console.error('Error loading notepads:', error);
      this.renderError('Failed to load notes');
    }
  }

  /**
   * Render notepads in the sidebar
   */
  private renderNotepads(): void {
    const notesContainer = document.getElementById('sidebar-notes-container');
    if (!notesContainer) return;

    notesContainer.innerHTML = '';
    
    if (this.notepads.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.cssText = `
        text-align: center;
        color: #6b7280;
        font-size: 0.875rem;
        padding: 2rem 1rem;
      `;
      emptyState.innerHTML = `
        <p style="margin: 0;">No notes yet</p>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.75rem;">Create a notepad and write something!</p>
      `;
      notesContainer.appendChild(emptyState);
      return;
    }

    // Sort notepads by last modified (newest first)
    this.notepads.sort((a, b) => b.lastModified - a.lastModified);

    this.notepads.forEach(notepad => {
      const noteElement = this.createNotepadElement(notepad);
      notesContainer.appendChild(noteElement);
    });
  }

  /**
   * Create a notepad element
   */
  private createNotepadElement(notepad: NotepadData): HTMLElement {
    const noteItem = document.createElement('div');
    noteItem.style.cssText = `
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      padding: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    `;

    const noteContent = document.createElement('p');
    noteContent.style.cssText = `
      margin: 0 0 0.5rem 0;
      color: #374151;
      font-size: 0.875rem;
      line-height: 1.4;
      word-wrap: break-word;
    `;
    noteContent.textContent = notepad.content.length > 100 
      ? notepad.content.substring(0, 100) + '...' 
      : notepad.content;

    // Add tags display if notepad has tags
    let tagsElement: HTMLElement | null = null;
    if (notepad.tags && notepad.tags.length > 0) {
      tagsElement = document.createElement('div');
      tagsElement.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 0.5rem;
      `;
      
      notepad.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.style.cssText = `
          background-color: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 0.7rem;
          font-weight: 500;
        `;
        tagSpan.textContent = `#${tag}`;
        tagsElement!.appendChild(tagSpan);
      });
    }

    const noteFooter = document.createElement('div');
    noteFooter.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    `;

    const timestamp = document.createElement('span');
    timestamp.style.cssText = `
      font-size: 0.75rem;
      color: #6b7280;
    `;
    timestamp.textContent = new Date(notepad.lastModified).toLocaleString();

    const deleteBtn = document.createElement('button');
    deleteBtn.style.cssText = `
      background: transparent;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s ease-in-out;
    `;
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      await this.deleteNotepad(notepad.id);
    };

    // Add hover effects
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

    // Add elements to note item in order
    if (tagsElement) {
      noteItem.appendChild(tagsElement);
    }
    noteItem.appendChild(noteContent);
    noteItem.appendChild(noteFooter);

    // Add click handler to reopen notepad
    noteItem.addEventListener('click', (e) => {
      // Don't trigger if clicking the delete button
      if ((e.target as HTMLElement).closest('button')) {
        return;
      }
      
      // Add loading state
      const originalText = noteContent.textContent;
      noteContent.textContent = 'Opening note...';
      noteItem.style.pointerEvents = 'none';
      noteItem.style.opacity = '0.7';
      
      // Dispatch custom event to reopen notepad
      const event = new CustomEvent('mindweaver-sidebar-note-click', {
        detail: { notepadId: notepad.id }
      });
      document.dispatchEvent(event);
      
      // Reset state after a delay
      setTimeout(() => {
        noteContent.textContent = originalText;
        noteItem.style.pointerEvents = '';
        noteItem.style.opacity = '';
      }, 500);
      
      // Close sidebar after clicking note
      this.toggle();
    });

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
   * Delete a notepad
   */
  private async deleteNotepad(notepadId: string): Promise<void> {
    try {
      await storageService.deleteNotepad(notepadId);
      await this.loadNotepads(); // Reload notepads after deletion
    } catch (error) {
      console.error('Error deleting notepad:', error);
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
        this.sidebarTab.style.right = '300px';
        // Rotate arrow to point left when open
        const svg = this.sidebarTab.querySelector('svg');
        if (svg) {
          svg.style.transform = 'rotate(180deg)';
        }
      } else {
        this.sidebarContainer.style.right = '-300px';
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
    await this.loadNotepads();
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
