/**
 * PopupAuthBridge.ts
 * Handles authentication state communication from popup to content scripts
 * This runs in the popup context and responds to auth state requests
 */

import { AuthService, AuthUser } from './authService';
import { AuthMessage } from './authBridge';

export class PopupAuthBridge {
  private static instance: PopupAuthBridge;
  private currentUser: AuthUser | null = null;

  private constructor() {
    this.setupMessageListener();
    this.setupAuthStateListener();
  }

  static getInstance(): PopupAuthBridge {
    if (!PopupAuthBridge.instance) {
      PopupAuthBridge.instance = new PopupAuthBridge();
    }
    return PopupAuthBridge.instance;
  }

  /**
   * Setup message listener to respond to content script requests
   */
  private setupMessageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message: AuthMessage, sender, sendResponse) => {
        console.log('🔔 PopupAuthBridge received message:', {
          type: message.type,
          hasUser: !!message.user,
          userEmail: message.user?.email,
          fromTab: sender.tab?.id,
          currentPopupUser: this.currentUser?.email
        });

        if (message.type === 'GET_AUTH_STATE') {
          console.log('📤 PopupAuthBridge responding with current user:', this.currentUser?.email || 'null');
          sendResponse({ 
            user: this.currentUser, 
            success: true,
            source: 'popup',
            timestamp: Date.now()
          });
          return true; // Keep message channel open
        }

        return false; // Let other listeners handle other message types
      });
    }
  }

  /**
   * Setup listener for Firebase auth state changes
   */
  private setupAuthStateListener(): void {
    // Listen to Firebase auth state changes
    AuthService.onAuthStateChanged((user) => {
      console.log('🔄 PopupAuthBridge: Firebase auth state changed:', user?.email || 'null');
      this.currentUser = user;
      
      // Broadcast to all content scripts
      this.broadcastAuthState(user);
    });

    // Also check current auth state immediately
    const currentFirebaseUser = AuthService.getCurrentUser();
    if (currentFirebaseUser) {
      this.currentUser = {
        uid: currentFirebaseUser.uid,
        email: currentFirebaseUser.email,
        displayName: currentFirebaseUser.displayName
      };
      console.log('🔄 PopupAuthBridge: Initial Firebase user found:', this.currentUser.email);
      this.broadcastAuthState(this.currentUser);
    }
  }

  /**
   * Broadcast auth state to all content scripts
   */
  private broadcastAuthState(user: AuthUser | null): void {
    console.log('📢 PopupAuthBridge broadcasting auth state:', user?.email || 'null');
    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const message: AuthMessage = {
        type: 'AUTH_STATE_CHANGED',
        user: user,
        timestamp: Date.now()
      };

      chrome.tabs.query({}, (tabs) => {
        console.log(`📤 PopupAuthBridge sending auth state to ${tabs.length} tabs`);
        
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, message)
              .then((response) => {
                console.log(`✅ PopupAuthBridge: Auth state sent to tab ${tab.id}:`, response);
              })
              .catch((error) => {
                // Only log if it's not a "no receiving end" error (normal for tabs without content scripts)
                if (!error.message.includes('Could not establish connection')) {
                  console.warn(`⚠️ PopupAuthBridge: Failed to send auth state to tab ${tab.id}:`, error.message);
                }
              });
          }
        });
      });
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Manual trigger to broadcast current auth state
   */
  broadcastCurrentState(): void {
    this.broadcastAuthState(this.currentUser);
  }
}

// Initialize the popup auth bridge when this module is imported
const popupAuthBridge = PopupAuthBridge.getInstance();

// Export for external access
export { popupAuthBridge };
