/**
 * NotepadUI.d.ts
 * Type declarations for NotepadUI
 */

import { NotepadState } from '../state/StateManager';

export interface NotepadUICallbacks {
  onContentChange?: (content: string) => void;
  onMinimize?: () => void;
  onCollapse?: () => void;
  onClose?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export declare class NotepadUI {
  constructor(id: string, callbacks?: NotepadUICallbacks);
  
  getElement(): HTMLElement;
  getHeaderElement(): HTMLElement;
  getContent(): string;
  setContent(content: string): void;
  getCurrentState(): NotepadState;
  setState(state: NotepadState): void;
  addDragFeedback(): void;
  removeDragFeedback(): void;
  destroy(): void;
}
