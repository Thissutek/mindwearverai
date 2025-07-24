/**
 * TagManager.ts
 * Handles tag input, display, and management for notepads
 */

export interface TagManagerOptions {
  container: HTMLElement;
  initialTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  placeholder?: string;
}

export class TagManager {
  private container: HTMLElement;
  private tagContainer!: HTMLElement;
  private tagInput!: HTMLInputElement;
  private tags: string[] = [];
  private options: TagManagerOptions;

  constructor(options: TagManagerOptions) {
    this.options = options;
    this.container = options.container;
    this.tags = options.initialTags || [];
    
    this.init();
  }

  /**
   * Initialize the tag manager UI
   */
  private init(): void {
    this.createTagContainer();
    this.createTagInput();
    this.renderTags();
  }

  /**
   * Create the main tag container
   */
  private createTagContainer(): void {
    this.tagContainer = document.createElement('div');
    this.tagContainer.className = 'mw-tag-container';
    this.container.appendChild(this.tagContainer);
  }

  /**
   * Create the tag input field
   */
  private createTagInput(): void {
    this.tagInput = document.createElement('input');
    this.tagInput.type = 'text';
    this.tagInput.className = 'mw-tag-input';
    this.tagInput.placeholder = this.options.placeholder || 'Add tags... (press Enter)';
    
    // Event listeners
    this.tagInput.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.tagInput.addEventListener('blur', this.handleBlur.bind(this));
    
    this.tagContainer.appendChild(this.tagInput);
  }

  /**
   * Handle keydown events in tag input
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTagFromInput();
    } else if (event.key === 'Backspace' && this.tagInput.value === '' && this.tags.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      this.removeTag(this.tags.length - 1);
    }
  }

  /**
   * Handle blur event on tag input
   */
  private handleBlur(): void {
    if (this.tagInput.value.trim()) {
      this.addTagFromInput();
    }
  }

  /**
   * Add tag from input field
   */
  private addTagFromInput(): void {
    const tagText = this.tagInput.value.trim();
    if (tagText) {
      this.addTag(tagText);
      this.tagInput.value = '';
    }
  }

  /**
   * Add a tag
   */
  private addTag(tagText: string): void {
    // Clean tag text (remove # if present, normalize)
    const cleanTag = tagText.replace(/^#+/, '').trim().toLowerCase();
    
    if (cleanTag && !this.tags.includes(cleanTag)) {
      this.tags.push(cleanTag);
      this.renderTags();
      this.notifyTagsChange();
    }
  }

  /**
   * Remove a tag by index
   */
  private removeTag(index: number): void {
    if (index >= 0 && index < this.tags.length) {
      this.tags.splice(index, 1);
      this.renderTags();
      this.notifyTagsChange();
    }
  }

  /**
   * Render all tags
   */
  private renderTags(): void {
    // Clear existing tags (except input)
    const existingTags = this.tagContainer.querySelectorAll('.mw-tag');
    existingTags.forEach(tag => tag.remove());

    // Render tags before the input
    this.tags.forEach((tag, index) => {
      const tagElement = this.createTagElement(tag, index);
      this.tagContainer.insertBefore(tagElement, this.tagInput);
    });
  }

  /**
   * Create a tag element
   */
  private createTagElement(tag: string, index: number): HTMLElement {
    const tagElement = document.createElement('span');
    tagElement.className = 'mw-tag';
    
    const tagText = document.createElement('span');
    tagText.className = 'mw-tag-text';
    tagText.textContent = `#${tag}`;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'mw-tag-remove';
    removeButton.innerHTML = '×';
    removeButton.title = `Remove tag: ${tag}`;
    removeButton.addEventListener('click', () => this.removeTag(index));
    
    tagElement.appendChild(tagText);
    tagElement.appendChild(removeButton);
    
    return tagElement;
  }

  /**
   * Notify parent component of tag changes
   */
  private notifyTagsChange(): void {
    if (this.options.onTagsChange) {
      this.options.onTagsChange([...this.tags]);
    }
  }

  /**
   * Get current tags
   */
  public getTags(): string[] {
    return [...this.tags];
  }

  /**
   * Set tags programmatically
   */
  public setTags(tags: string[]): void {
    this.tags = [...tags];
    this.renderTags();
  }

  /**
   * Add multiple tags
   */
  public addTags(tags: string[]): void {
    tags.forEach(tag => this.addTag(tag));
  }

  /**
   * Clear all tags
   */
  public clearTags(): void {
    this.tags = [];
    this.renderTags();
    this.notifyTagsChange();
  }

  /**
   * Focus the tag input
   */
  public focus(): void {
    this.tagInput.focus();
  }

  /**
   * Destroy the tag manager
   */
  public destroy(): void {
    if (this.tagContainer.parentNode) {
      this.tagContainer.parentNode.removeChild(this.tagContainer);
    }
  }
}