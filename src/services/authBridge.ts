/**
 * AuthBridge.ts
 * Handles communication between popup and content script for authentication state
 */

import { AuthUser } from './authService';

export interface AuthMessage {
  type: 'AUTH_STATE_CHANGED' | 'GET_AUTH_STATE' | 'AUTH_STATE_RESPONSE';
  user: AuthUser | null;
  timestamp: number;
}

export class AuthBridge {
  private static instance: AuthBridge;
  private currentUser: AuthUser | null = null;
  private listeners: ((user: AuthUser | null) => void)[] = [];

  private constructor() {
    this.setupMessageListener();
    this.requestAuthState();
  }

  static getInstance(): AuthBridge {
    if (!AuthBridge.instance) {
      AuthBridge.instance = new AuthBridge();
    }
    return AuthBridge.instance;
  }

  // Setup message listener for Chrome extension messaging
  private setupMessageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message: AuthMessage, _sender, sendResponse) => {
        if (message.type === 'AUTH_STATE_CHANGED' || message.type === 'AUTH_STATE_RESPONSE') {
          this.updateAuthState(message.user);
          sendResponse({ success: true });
        } else if (message.type === 'GET_AUTH_STATE') {
          sendResponse({ user: this.currentUser });
        }
        return true;
      });
    }
  }

  // Request current auth state from popup
  private requestAuthState(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const message: AuthMessage = {
        type: 'GET_AUTH_STATE',
        user: null,
        timestamp: Date.now()
      };

      chrome.runtime.sendMessage(message, (response) => {
        if (response && response.user) {
          this.updateAuthState(response.user);
        }
      });
    }
  }

  // Update authentication state
  private updateAuthState(user: AuthUser | null): void {
    this.currentUser = user;
    this.notifyListeners(user);
  }

  // Notify all listeners of auth state change
  private notifyListeners(user: AuthUser | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(user);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Add listener for auth state changes
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    
    // Immediately call with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Send auth state change to content scripts (called from popup)
  static notifyAuthStateChange(user: AuthUser | null): void {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const message: AuthMessage = {
        type: 'AUTH_STATE_CHANGED',
        user: user,
        timestamp: Date.now()
      };

      // Send to all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, message).catch(() => {
              // Ignore errors for tabs that don't have content scripts
            });
          }
        });
      });
    }
  }
}

// Export singleton instance for content scripts
export const authBridge = AuthBridge.getInstance();
