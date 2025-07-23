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
      chrome.runtime.onMessage.addListener((message: AuthMessage, sender, sendResponse) => {
        console.log('🔔 AuthBridge received message:', {
          type: message.type,
          hasUser: !!message.user,
          userEmail: message.user?.email,
          fromTab: sender.tab?.id,
          currentUser: this.currentUser?.email
        });
        
        if (message.type === 'AUTH_STATE_CHANGED' || message.type === 'AUTH_STATE_RESPONSE') {
          console.log('🔄 Updating auth state from message:', message.user?.email || 'null');
          this.updateAuthState(message.user);
          sendResponse({ success: true, received: true });
        } else if (message.type === 'GET_AUTH_STATE') {
          console.log('📤 Responding to auth state request with:', this.currentUser?.email || 'null');
          sendResponse({ user: this.currentUser, success: true });
        }
        return true; // Keep message channel open for async response
      });
    }
  }

  // Request current auth state from popup
  public requestAuthState(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const message: AuthMessage = {
        type: 'GET_AUTH_STATE',
        user: null,
        timestamp: Date.now()
      };

      console.log('📨 Requesting auth state from popup...');
      
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ Failed to get auth state from popup:', chrome.runtime.lastError.message);
          // Retry after a delay
          setTimeout(() => this.requestAuthState(), 1000);
          return;
        }
        
        console.log('📨 Auth state response received:', {
          hasResponse: !!response,
          hasUser: !!(response && response.user),
          userEmail: response?.user?.email || 'null'
        });
        
        if (response && response.user) {
          console.log('✅ Updating auth state from response:', response.user.email);
          this.updateAuthState(response.user);
        } else {
          console.log('ℹ️ No authenticated user found in response');
        }
      });
    }
  }

  // Update authentication state
  private updateAuthState(user: AuthUser | null): void {
    const previousUser = this.currentUser;
    this.currentUser = user;
    
    console.log('🔄 Auth state updated:', {
      previousUser: previousUser?.email || 'null',
      newUser: user?.email || 'null',
      listenersCount: this.listeners.length
    });
    
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
    console.log('📢 Broadcasting auth state change:', user?.email || 'null');
    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const message: AuthMessage = {
        type: 'AUTH_STATE_CHANGED',
        user: user,
        timestamp: Date.now()
      };

      // Send to all tabs
      chrome.tabs.query({}, (tabs) => {
        console.log(`📤 Sending auth state to ${tabs.length} tabs`);
        
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, message)
              .then((response) => {
                console.log(`✅ Auth state sent to tab ${tab.id}:`, response);
              })
              .catch((error) => {
                // Only log if it's not a "no receiving end" error (normal for tabs without content scripts)
                if (!error.message.includes('Could not establish connection')) {
                  console.warn(`⚠️ Failed to send auth state to tab ${tab.id}:`, error.message);
                }
              });
          }
        });
      });
    }
  }
}

// Export singleton instance for content scripts
export const authBridge = AuthBridge.getInstance();
