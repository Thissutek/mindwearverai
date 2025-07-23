/**
 * DragHandler.ts
 * Provides drag functionality for notepad elements with viewport constraints
 */

export interface DragOptions {
  // Element to be dragged
  element: HTMLElement;
  
  // Element that triggers the drag (handle)
  handle?: HTMLElement;
  
  // Callback when drag starts
  onDragStart?: (x: number, y: number) => void;
  
  // Callback during drag
  onDrag?: (x: number, y: number) => void;
  
  // Callback when drag ends
  onDragEnd?: (x: number, y: number) => void;
}

export class DragHandler {
  private element: HTMLElement;
  private handle: HTMLElement;
  private isDragging = false;
  private initialX = 0;
  private initialY = 0;
  private initialElementX = 0;
  private initialElementY = 0;
  
  // Viewport constraints
  private minX = 0;
  private minY = 0;
  private maxX = 0;
  private maxY = 0;
  
  // Callbacks
  private onDragStart?: (x: number, y: number) => void;
  private onDrag?: (x: number, y: number) => void;
  private onDragEnd?: (x: number, y: number) => void;
  
  // Bound event handlers for proper cleanup
  private boundMouseDownHandler: (e: MouseEvent) => void;
  private boundMouseMoveHandler: (e: MouseEvent) => void;
  private boundMouseUpHandler: (e: MouseEvent) => void;
  
  constructor(options: DragOptions) {
    this.element = options.element;
    this.handle = options.handle || options.element;
    this.onDragStart = options.onDragStart;
    this.onDrag = options.onDrag;
    this.onDragEnd = options.onDragEnd;
    
    // Create bound event handlers for proper cleanup
    this.boundMouseDownHandler = this.handleMouseDown.bind(this);
    this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
    this.boundMouseUpHandler = this.handleMouseUp.bind(this);
    
    // Initialize drag handlers
    this.init();
  }
  
  /**
   * Initialize drag functionality
   */
  private init(): void {
    this.handle.addEventListener('mousedown', this.boundMouseDownHandler);
    
    // Add a visual indicator that the element is draggable
    this.handle.style.cursor = 'move';
  }
  
  /**
   * Clean up event listeners
   */
  public destroy(): void {
    this.handle.removeEventListener('mousedown', this.boundMouseDownHandler);
    document.removeEventListener('mousemove', this.boundMouseMoveHandler);
    document.removeEventListener('mouseup', this.boundMouseUpHandler);
  }
  
  /**
   * Handle mouse down event to start dragging
   */
  private handleMouseDown(e: MouseEvent): void {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    // Prevent default behavior (e.g., text selection)
    e.preventDefault();
    
    this.isDragging = true;
    
    // Store initial positions
    this.initialX = e.clientX;
    this.initialY = e.clientY;
    
    // Get current element position
    const rect = this.element.getBoundingClientRect();
    this.initialElementX = rect.left;
    this.initialElementY = rect.top;
    
    // Calculate viewport constraints
    this.updateViewportConstraints();
    
    // Add move and up event listeners
    document.addEventListener('mousemove', this.boundMouseMoveHandler);
    document.addEventListener('mouseup', this.boundMouseUpHandler);
    
    // Add visual feedback
    this.element.classList.add('dragging');
    
    // Call drag start callback
    if (this.onDragStart) {
      this.onDragStart(this.initialElementX, this.initialElementY);
    }
  }
  
  /**
   * Handle mouse move event during dragging
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    
    // Calculate new position
    const deltaX = e.clientX - this.initialX;
    const deltaY = e.clientY - this.initialY;
    
    let newX = this.initialElementX + deltaX;
    let newY = this.initialElementY + deltaY;
    
    // Apply viewport constraints
    newX = Math.max(this.minX, Math.min(this.maxX, newX));
    newY = Math.max(this.minY, Math.min(this.maxY, newY));
    
    // Update element position using transform for better performance
    this.element.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
    
    // Call drag callback
    if (this.onDrag) {
      this.onDrag(newX, newY);
    }
  }
  
  /**
   * Handle mouse up event to end dragging
   */
  private handleMouseUp(): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.boundMouseMoveHandler);
    document.removeEventListener('mouseup', this.boundMouseUpHandler);
    
    // Remove visual feedback
    this.element.classList.remove('dragging');
    
    // Get final position
    const rect = this.element.getBoundingClientRect();
    const finalX = rect.left;
    const finalY = rect.top;
    
    // Call drag end callback
    if (this.onDragEnd) {
      this.onDragEnd(finalX, finalY);
    }
  }
  
  /**
   * Update viewport constraints based on element and window dimensions
   */
  private updateViewportConstraints(): void {
    const elementRect = this.element.getBoundingClientRect();
    
    // Minimum positions (keep at least 10px within viewport)
    this.minX = 10 - elementRect.width;
    this.minY = 10;
    
    // Maximum positions (keep at least 10px within viewport)
    this.maxX = window.innerWidth - 10;
    this.maxY = window.innerHeight - 10;
  }
  
  /**
   * Set the position of the draggable element
   */
  public setPosition(x: number, y: number): void {
    this.updateViewportConstraints();
    
    // Apply viewport constraints
    const constrainedX = Math.max(this.minX, Math.min(this.maxX, x));
    const constrainedY = Math.max(this.minY, Math.min(this.maxY, y));
    
    // Update element position
    this.element.style.transform = `translate3d(${constrainedX}px, ${constrainedY}px, 0)`;
  }
}
