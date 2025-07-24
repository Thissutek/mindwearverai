/**
 * ResizeHandler.ts
 * Handles resizing functionality for notepad elements
 * Provides window-like resize handles on all sides and corners
 */

export interface ResizeOptions {
  element: HTMLElement;
  container?: HTMLElement; // Shadow DOM container for handle placement
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  onResizeStart?: () => void;
  onResize?: (width: number, height: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
}

export interface ResizeState {
  isResizing: boolean;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  resizeType: ResizeType;
}

export enum ResizeType {
  NONE = 'none',
  N = 'n',     // North (top)
  S = 's',     // South (bottom)
  E = 'e',     // East (right)
  W = 'w',     // West (left)
  NE = 'ne',   // North-East (top-right)
  NW = 'nw',   // North-West (top-left)
  SE = 'se',   // South-East (bottom-right)
  SW = 'sw'    // South-West (bottom-left)
}

export class ResizeHandler {
  private element: HTMLElement;
  private container: HTMLElement;
  private options: ResizeOptions;
  private resizeHandles: Map<ResizeType, HTMLElement> = new Map();
  private state: ResizeState;
  private isDestroyed = false;

  // Default constraints
  private minWidth: number;
  private minHeight: number;
  private maxWidth: number;
  private maxHeight: number;

  constructor(options: ResizeOptions) {
    this.options = options;
    this.element = options.element;
    this.container = options.container || options.element;
    
    // Set size constraints
    this.minWidth = options.minWidth || 200;
    this.minHeight = options.minHeight || 150;
    this.maxWidth = options.maxWidth || window.innerWidth * 0.8;
    this.maxHeight = options.maxHeight || window.innerHeight * 0.8;

    // Initialize state
    this.state = {
      isResizing: false,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      resizeType: ResizeType.NONE
    };

    this.init();
  }

  /**
   * Initialize resize functionality
   */
  private init(): void {
    this.createResizeHandles();
    this.attachEventListeners();
    this.setInitialSize();
  }

  /**
   * Create resize handles for all sides and corners
   */
  private createResizeHandles(): void {
    const handleTypes = [
      ResizeType.N, ResizeType.S, ResizeType.E, ResizeType.W,
      ResizeType.NE, ResizeType.NW, ResizeType.SE, ResizeType.SW
    ];

    handleTypes.forEach(type => {
      const handle = this.createResizeHandle(type);
      this.resizeHandles.set(type, handle);
      this.container.appendChild(handle);
    });
  }

  /**
   * Create individual resize handle
   */
  private createResizeHandle(type: ResizeType): HTMLElement {
    const handle = document.createElement('div');
    handle.className = `mw-resize-handle mw-resize-${type}`;
    
    // Add data attribute for easier identification
    handle.dataset.resizeType = type;
    
    return handle;
  }


  /**
   * Attach event listeners for resize functionality
   */
  private attachEventListeners(): void {
    this.resizeHandles.forEach((handle, type) => {
      handle.addEventListener('mousedown', (e) => this.handleMouseDown(e, type));
    });

    // Global event listeners for mouse move and up
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  /**
   * Handle mouse down on resize handle
   */
  private handleMouseDown(event: MouseEvent, resizeType: ResizeType): void {
    if (this.isDestroyed) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = this.element.getBoundingClientRect();

    this.state = {
      isResizing: true,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      resizeType
    };

    // Add visual feedback
    this.element.style.userSelect = 'none';
    document.body.style.cursor = this.getCursorForResizeType(resizeType);

    // Callback for resize start
    if (this.options.onResizeStart) {
      this.options.onResizeStart();
    }
  }

  /**
   * Handle mouse move during resize
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.state.isResizing || this.isDestroyed) return;

    event.preventDefault();

    const deltaX = event.clientX - this.state.startX;
    const deltaY = event.clientY - this.state.startY;

    const newDimensions = this.calculateNewDimensions(deltaX, deltaY);
    
    if (newDimensions) {
      this.applyResize(newDimensions.width, newDimensions.height);
      
      // Callback for resize in progress
      if (this.options.onResize) {
        this.options.onResize(newDimensions.width, newDimensions.height);
      }
    }
  }

  /**
   * Handle mouse up to end resize
   */
  private handleMouseUp(): void {
    if (!this.state.isResizing || this.isDestroyed) return;

    // Remove visual feedback
    this.element.style.userSelect = '';
    document.body.style.cursor = '';

    const rect = this.element.getBoundingClientRect();

    // Callback for resize end
    if (this.options.onResizeEnd) {
      this.options.onResizeEnd(rect.width, rect.height);
    }

    // Reset state
    this.state.isResizing = false;
    this.state.resizeType = ResizeType.NONE;
  }

  /**
   * Calculate new dimensions based on resize type and deltas
   */
  private calculateNewDimensions(deltaX: number, deltaY: number): { width: number; height: number } | null {
    const { resizeType, startWidth, startHeight } = this.state;
    let newWidth = startWidth;
    let newHeight = startHeight;

    switch (resizeType) {
      case ResizeType.E:
        newWidth = startWidth + deltaX;
        break;
      case ResizeType.W:
        newWidth = startWidth - deltaX;
        break;
      case ResizeType.S:
        newHeight = startHeight + deltaY;
        break;
      case ResizeType.N:
        newHeight = startHeight - deltaY;
        break;
      case ResizeType.SE:
        newWidth = startWidth + deltaX;
        newHeight = startHeight + deltaY;
        break;
      case ResizeType.SW:
        newWidth = startWidth - deltaX;
        newHeight = startHeight + deltaY;
        break;
      case ResizeType.NE:
        newWidth = startWidth + deltaX;
        newHeight = startHeight - deltaY;
        break;
      case ResizeType.NW:
        newWidth = startWidth - deltaX;
        newHeight = startHeight - deltaY;
        break;
      default:
        return null;
    }

    // Apply constraints
    newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
    newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));

    return { width: newWidth, height: newHeight };
  }

  /**
   * Apply resize to element
   */
  private applyResize(width: number, height: number): void {
    // Resize the container (visual element)
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;
    
    // Also resize the host element to maintain proper bounds
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
  }

  /**
   * Get cursor style for resize type
   */
  private getCursorForResizeType(resizeType: ResizeType): string {
    switch (resizeType) {
      case ResizeType.N:
      case ResizeType.S:
        return 'ns-resize';
      case ResizeType.E:
      case ResizeType.W:
        return 'ew-resize';
      case ResizeType.NE:
      case ResizeType.SW:
        return 'nesw-resize';
      case ResizeType.NW:
      case ResizeType.SE:
        return 'nwse-resize';
      default:
        return 'default';
    }
  }

  /**
   * Set initial size for the element
   */
  private setInitialSize(): void {
    const currentWidth = this.container.offsetWidth || 300; // Default to 300px if not set
    const currentHeight = this.container.offsetHeight || 250; // Default to 250px if not set

    // Set minimum size if element is smaller than constraints
    const width = Math.max(this.minWidth, currentWidth);
    const height = Math.max(this.minHeight, currentHeight);

    this.applyResize(width, height);
  }

  /**
   * Update size constraints
   */
  public updateConstraints(options: Partial<Pick<ResizeOptions, 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight'>>): void {
    if (options.minWidth !== undefined) this.minWidth = options.minWidth;
    if (options.minHeight !== undefined) this.minHeight = options.minHeight;
    if (options.maxWidth !== undefined) this.maxWidth = options.maxWidth;
    if (options.maxHeight !== undefined) this.maxHeight = options.maxHeight;
  }

  /**
   * Get current dimensions
   */
  public getDimensions(): { width: number; height: number } {
    const rect = this.container.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height
    };
  }

  /**
   * Set dimensions programmatically
   */
  public setDimensions(width: number, height: number): void {
    // Apply constraints
    width = Math.max(this.minWidth, Math.min(this.maxWidth, width));
    height = Math.max(this.minHeight, Math.min(this.maxHeight, height));
    
    this.applyResize(width, height);
  }

  /**
   * Check if currently resizing
   */
  public isResizing(): boolean {
    return this.state.isResizing;
  }

  /**
   * Clean up and destroy resize handler
   */
  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Remove resize handles
    this.resizeHandles.forEach(handle => {
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    });
    this.resizeHandles.clear();

    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));

    // Reset element styles
    this.element.style.userSelect = '';
    document.body.style.cursor = '';
  }
}