/**
 * SearchUI.ts
 * UI component for the search bar and results display
 */

import { SearchManager, SearchResult, SearchOptions } from './SearchManager';
import { stateManager } from '../state/StateManager';

export interface SearchUIOptions {
  container: HTMLElement;
  onNoteSelect?: (noteId: string) => void;
  onTagSelect?: (tag: string) => void;
  placeholder?: string;
}

export class SearchUI {
  private container: HTMLElement;
  private searchManager: SearchManager;
  private options: SearchUIOptions;
  
  private searchInput!: HTMLInputElement;
  private searchOptions!: HTMLElement;
  private resultsContainer!: HTMLElement;
  private tagSuggestions!: HTMLElement;
  
  private currentResults: SearchResult[] = [];
  private searchDebounceTimer: number | null = null;
  private isExpanded = false;

  constructor(searchManager: SearchManager, options: SearchUIOptions) {
    this.searchManager = searchManager;
    this.options = options;
    this.container = options.container;
    
    this.init();
  }

  /**
   * Initialize the search UI
   */
  private init(): void {
    this.createSearchContainer();
    this.createSearchInput();
    this.createSearchOptions();
    this.createResultsContainer();
    this.createTagSuggestions();
    
    // Listen for state changes to update search index
    this.setupStateListeners();
  }

  /**
   * Create the main search container
   */
  private createSearchContainer(): void {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'mw-search-container';
    this.container.appendChild(searchContainer);
    this.container = searchContainer; // Update container reference
  }

  /**
   * Create the search input field
   */
  private createSearchInput(): void {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'mw-search-input-container';

    // Search icon
    const searchIcon = document.createElement('div');
    searchIcon.className = 'mw-search-icon';
    searchIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
    `;

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.className = 'mw-search-input';
    this.searchInput.placeholder = this.options.placeholder || 'Search notes and tags...';

    // Clear button
    const clearButton = document.createElement('button');
    clearButton.className = 'mw-search-clear';
    clearButton.innerHTML = '×';
    clearButton.title = 'Clear search';
    clearButton.style.display = 'none';

    // Event listeners
    this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
    this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
    this.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));
    this.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
    
    clearButton.addEventListener('click', this.clearSearch.bind(this));

    inputContainer.appendChild(searchIcon);
    inputContainer.appendChild(this.searchInput);
    inputContainer.appendChild(clearButton);
    this.container.appendChild(inputContainer);
  }

  /**
   * Create search options (filters)
   */
  private createSearchOptions(): void {
    this.searchOptions = document.createElement('div');
    this.searchOptions.className = 'mw-search-options';
    this.searchOptions.style.display = 'none';

    // Content search toggle
    const contentToggle = this.createToggle('content', 'Search in content', true);
    this.searchOptions.appendChild(contentToggle);

    // Tag search toggle
    const tagToggle = this.createToggle('tags', 'Search in tags', true);
    this.searchOptions.appendChild(tagToggle);

    // Case sensitive toggle
    const caseToggle = this.createToggle('case', 'Case sensitive', false);
    this.searchOptions.appendChild(caseToggle);

    // Exact match toggle
    const exactToggle = this.createToggle('exact', 'Exact match', false);
    this.searchOptions.appendChild(exactToggle);

    this.container.appendChild(this.searchOptions);
  }

  /**
   * Create a toggle switch
   */
  private createToggle(id: string, label: string, defaultChecked: boolean): HTMLElement {
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'mw-search-toggle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `search-${id}`;
    checkbox.checked = defaultChecked;
    checkbox.addEventListener('change', this.handleOptionsChange.bind(this));

    const labelElement = document.createElement('label');
    labelElement.htmlFor = `search-${id}`;
    labelElement.textContent = label;

    toggleContainer.appendChild(checkbox);
    toggleContainer.appendChild(labelElement);

    return toggleContainer;
  }

  /**
   * Create results container
   */
  private createResultsContainer(): void {
    this.resultsContainer = document.createElement('div');
    this.resultsContainer.className = 'mw-search-results';
    this.resultsContainer.style.display = 'none';
    this.container.appendChild(this.resultsContainer);
  }

  /**
   * Create tag suggestions
   */
  private createTagSuggestions(): void {
    this.tagSuggestions = document.createElement('div');
    this.tagSuggestions.className = 'mw-search-tag-suggestions';
    this.tagSuggestions.style.display = 'none';
    
    const title = document.createElement('div');
    title.className = 'mw-search-suggestions-title';
    title.textContent = 'Popular Tags';
    this.tagSuggestions.appendChild(title);

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'mw-search-tags-container';
    this.tagSuggestions.appendChild(tagsContainer);

    this.container.appendChild(this.tagSuggestions);
    this.updateTagSuggestions();
  }

  /**
   * Handle search input changes
   */
  private handleSearchInput(): void {
    const query = this.searchInput.value;
    const clearButton = this.container.querySelector('.mw-search-clear') as HTMLElement;
    
    // Show/hide clear button
    clearButton.style.display = query ? 'block' : 'none';

    // Debounce search
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = window.setTimeout(() => {
      this.performSearch();
    }, 300);
  }

  /**
   * Handle search focus
   */
  private handleSearchFocus(): void {
    this.expandSearch();
  }

  /**
   * Handle search blur (with delay to allow clicking on results)
   */
  private handleSearchBlur(): void {
    setTimeout(() => {
      if (!this.container.contains(document.activeElement)) {
        this.collapseSearch();
      }
    }, 150);
  }

  /**
   * Handle search keydown for navigation
   */
  private handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.clearSearch();
      this.searchInput.blur();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateResults('down');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateResults('up');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectCurrentResult();
    }
  }

  /**
   * Handle options change
   */
  private handleOptionsChange(): void {
    this.performSearch();
  }

  /**
   * Expand search interface
   */
  private expandSearch(): void {
    if (!this.isExpanded) {
      this.isExpanded = true;
      this.searchOptions.style.display = 'block';
      
      if (this.searchInput.value.trim()) {
        this.resultsContainer.style.display = 'block';
      } else {
        this.tagSuggestions.style.display = 'block';
      }
      
      this.container.classList.add('expanded');
    }
  }

  /**
   * Collapse search interface
   */
  private collapseSearch(): void {
    if (this.isExpanded && !this.searchInput.value.trim()) {
      this.isExpanded = false;
      this.searchOptions.style.display = 'none';
      this.resultsContainer.style.display = 'none';
      this.tagSuggestions.style.display = 'none';
      this.container.classList.remove('expanded');
    }
  }

  /**
   * Clear search
   */
  private clearSearch(): void {
    this.searchInput.value = '';
    this.currentResults = [];
    this.renderResults();
    
    const clearButton = this.container.querySelector('.mw-search-clear') as HTMLElement;
    clearButton.style.display = 'none';
    
    this.collapseSearch();
  }

  /**
   * Perform search with current options
   */
  private performSearch(): void {
    const query = this.searchInput.value.trim();
    
    if (!query) {
      this.currentResults = [];
      this.renderResults();
      this.tagSuggestions.style.display = this.isExpanded ? 'block' : 'none';
      this.resultsContainer.style.display = 'none';
      return;
    }

    const options: SearchOptions = {
      query,
      searchContent: (this.container.querySelector('#search-content') as HTMLInputElement)?.checked ?? true,
      searchTags: (this.container.querySelector('#search-tags') as HTMLInputElement)?.checked ?? true,
      caseSensitive: (this.container.querySelector('#search-case') as HTMLInputElement)?.checked ?? false,
      exactMatch: (this.container.querySelector('#search-exact') as HTMLInputElement)?.checked ?? false
    };

    console.log('🔍 Performing search with options:', options);
    this.currentResults = this.searchManager.search(options);
    console.log('🔍 Search results:', this.currentResults.length, 'results found');
    this.renderResults();
    
    this.tagSuggestions.style.display = 'none';
    this.resultsContainer.style.display = 'block';
  }

  /**
   * Render search results
   */
  private renderResults(): void {
    console.log('🎨 Rendering', this.currentResults.length, 'search results');
    this.resultsContainer.innerHTML = '';

    if (this.currentResults.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'mw-search-no-results';
      noResults.textContent = this.searchInput.value.trim() ? 'No results found' : '';
      console.log('📭 No results to display');
      this.resultsContainer.appendChild(noResults);
      return;
    }

    this.currentResults.forEach((result, index) => {
      const resultElement = this.createResultElement(result, index);
      this.resultsContainer.appendChild(resultElement);
    });
  }

  /**
   * Create a result element
   */
  private createResultElement(result: SearchResult, index: number): HTMLElement {
    const resultElement = document.createElement('div');
    resultElement.className = 'mw-search-result';
    resultElement.dataset.index = index.toString();

    // Title
    const title = document.createElement('div');
    title.className = 'mw-search-result-title';
    title.textContent = result.title;

    // Content preview
    const content = document.createElement('div');
    content.className = 'mw-search-result-content';
    content.textContent = this.getContentPreview(result.content, this.searchInput.value);

    // Tags
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'mw-search-result-tags';
    result.tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'mw-search-result-tag';
      tagElement.textContent = `#${tag}`;
      tagsContainer.appendChild(tagElement);
    });

    // Match type indicator
    const matchType = document.createElement('div');
    matchType.className = `mw-search-match-type match-${result.matchType}`;
    matchType.textContent = result.matchType === 'both' ? 'content + tag' : result.matchType;

    resultElement.appendChild(title);
    resultElement.appendChild(content);
    if (result.tags.length > 0) {
      resultElement.appendChild(tagsContainer);
    }
    resultElement.appendChild(matchType);

    // Click handler
    resultElement.addEventListener('click', () => {
      if (this.options.onNoteSelect) {
        this.options.onNoteSelect(result.id);
      }
      this.collapseSearch();
    });

    return resultElement;
  }

  /**
   * Get content preview with search term highlighted
   */
  private getContentPreview(content: string, searchTerm: string): string {
    const maxLength = 120;
    
    if (!searchTerm.trim()) {
      return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
    }

    const lowerContent = content.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    const index = lowerContent.indexOf(lowerTerm);

    if (index === -1) {
      return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
    }

    // Try to center the search term in the preview
    const start = Math.max(0, index - Math.floor((maxLength - searchTerm.length) / 2));
    const end = Math.min(content.length, start + maxLength);
    
    let preview = content.substring(start, end);
    if (start > 0) preview = '...' + preview;
    if (end < content.length) preview = preview + '...';

    return preview;
  }

  /**
   * Update tag suggestions
   */
  private updateTagSuggestions(): void {
    const tagsContainer = this.tagSuggestions.querySelector('.mw-search-tags-container') as HTMLElement;
    if (!tagsContainer) return;

    tagsContainer.innerHTML = '';
    
    const allTags = this.searchManager.getAllTags();
    const popularTags = allTags.slice(0, 10); // Show top 10 tags

    popularTags.forEach(tag => {
      const tagElement = document.createElement('button');
      tagElement.className = 'mw-search-suggestion-tag';
      tagElement.textContent = `#${tag}`;
      tagElement.addEventListener('click', () => {
        this.searchInput.value = `#${tag}`;
        this.performSearch();
        this.searchInput.focus();
      });
      tagsContainer.appendChild(tagElement);
    });
  }

  /**
   * Navigate results with keyboard
   */
  private navigateResults(direction: 'up' | 'down'): void {
    const results = this.resultsContainer.querySelectorAll('.mw-search-result');
    if (results.length === 0) return;

    const current = this.resultsContainer.querySelector('.mw-search-result.selected');
    let newIndex = 0;

    if (current) {
      const currentIndex = parseInt(current.getAttribute('data-index') || '0');
      newIndex = direction === 'down' 
        ? Math.min(results.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
      current.classList.remove('selected');
    }

    results[newIndex].classList.add('selected');
    results[newIndex].scrollIntoView({ block: 'nearest' });
  }

  /**
   * Select current result
   */
  private selectCurrentResult(): void {
    const selected = this.resultsContainer.querySelector('.mw-search-result.selected');
    if (selected) {
      (selected as HTMLElement).click();
    } else if (this.currentResults.length > 0) {
      // Select first result if none selected
      const firstResult = this.resultsContainer.querySelector('.mw-search-result') as HTMLElement;
      if (firstResult) {
        firstResult.click();
      }
    }
  }

  /**
   * Setup state listeners to keep search index updated
   */
  private setupStateListeners(): void {
    // Listen for notepad changes to update search index
    const originalUpdateNotepad = stateManager.updateNotepad.bind(stateManager);
    stateManager.updateNotepad = (id: string, updates: any) => {
      const result = originalUpdateNotepad(id, updates);
      if (result) {
        this.searchManager.indexNote(result);
        this.updateTagSuggestions();
      }
      return result;
    };

    const originalDeleteNotepad = stateManager.deleteNotepad.bind(stateManager);
    stateManager.deleteNotepad = (id: string) => {
      this.searchManager.removeNote(id);
      this.updateTagSuggestions();
      return originalDeleteNotepad(id);
    };
  }

  /**
   * Focus the search input
   */
  public focus(): void {
    this.searchInput.focus();
  }

  /**
   * Destroy the search UI
   */
  public destroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
