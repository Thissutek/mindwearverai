# MindWeaver Chrome Extension

A Chrome browser extension for creating floating, draggable notepads with cloud synchronization, speech-to-text capabilities, and real-time search functionality.

## Features

- **Floating Notepad Interface**: Create multiple draggable notepads on any webpage
- **Cloud Synchronization**: Real-time saving to Firebase with offline session support
- **Speech-to-Text**: Dictate notes using Deepgram's advanced speech recognition
- **Intelligent Search**: Full-text search across all notes with tag support and session-aware indexing
- **Sidebar Management**: View, search, and reopen saved notes from the sidebar
- **User Authentication**: Secure Firebase authentication with extension-specific bridge
- **Rich UX Features**:
  - Drag, resize, minimize, and collapse notepads
  - Undo/redo functionality with keyboard shortcuts
  - Tag system for note organization
  - Visual feedback for save status
  - Cross-session note persistence

## Architecture Overview

### Chrome Extension Structure
- **Manifest v3** with content script injection on all URLs
- **Popup Interface**: React-based authentication and dashboard
- **Content Script**: Vanilla TypeScript notepad management injected into web pages
- **Background Services**: Firebase integration and authentication bridges

### Core Architecture Pattern
```
UI Layer (NotepadUI, SearchUI, DOMSidebar)
    ↓
Business Logic (Notepad, SearchIntegration, StateManager)
    ↓
Storage Layer (StorageService, FirebaseNotepadService)
    ↓
External Services (Firebase, Deepgram, Chrome APIs)
```

## Project Structure

```
src/
├── content/
│   ├── content.ts          # Main content script entry point
│   └── content.css         # Global extension styles
├── popup/                  # React popup interface
│   ├── components/         # Authentication components
│   ├── App.tsx            # Main popup app
│   └── index.html         # Popup HTML template
├── modules/
│   ├── notepad/           # Core notepad functionality
│   │   ├── Notepad.ts     # Main notepad coordinator class
│   │   └── ui.ts          # Shadow DOM-based UI layer
│   ├── search/            # Search system
│   │   ├── SearchIntegration.ts  # Search orchestration with localStorage support
│   │   ├── SearchManager.ts      # Core search indexing and querying
│   │   └── SearchUI.ts           # Search interface components
│   ├── sidebar/           # Sidebar management
│   │   └── DOMSidebar.ts  # Pure DOM sidebar implementation
│   ├── state/             # In-memory state management
│   │   └── StateManager.ts       # Reactive state manager for active notepads
│   ├── storage/           # Data persistence layer
│   │   └── StorageService.ts     # Storage abstraction (local/cloud)
│   ├── drag/              # Drag functionality
│   │   └── DragHandler.ts        # Drag interaction management
│   └── resize/            # Resize functionality
│       └── ResizeHandler.ts      # Resize interaction management
├── services/              # External service integrations
│   ├── firebaseNotepadService.ts # Firestore operations
│   ├── authBridge.ts             # Content script auth interface
│   └── popupAuthBridge.ts        # Popup auth interface
└── config/
    └── firebase.ts        # Firebase configuration
```

## Data Flow

### Note Creation & Management
1. **User Action** → Create/edit notepad via UI
2. **State Update** → StateManager updates in-memory state
3. **Auto-save** → StorageService persists to Firebase (debounced 300ms)
4. **Search Indexing** → SearchIntegration indexes for immediate searchability
5. **Session Storage** → Temporary localStorage for search until page refresh

### Search System
- **Dual Data Sources**: Searches both Firebase (persistent) + localStorage (session)
- **Real-time Indexing**: New notes immediately searchable via StateManager hooks
- **Auto-cleanup**: localStorage clears on page refresh, syncs back to Firebase

### Authentication Flow
- **Extension Context Separation**: Popup and content script use separate auth bridges
- **Secure Token Handling**: Firebase auth tokens managed across extension contexts
- **Graceful Degradation**: Local functionality works without authentication

## Development Setup

### Prerequisites
- Node.js (latest LTS)
- Chrome browser for testing
- Firebase project with Firestore enabled
- Deepgram API account

### Installation

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd mindweaverai
   npm install
   ```

2. **Environment Configuration**:
   Create `.env` file with:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
   ```

3. **Firebase Setup**:
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login and initialize
   firebase login
   firebase init firestore
   ```

### Development Commands

```bash
# Build all components
npm run build

# Build popup only
npm run build:popup

# Build content script only  
npm run build:content

# Development servers
npm run dev              # Main app development
npm run dev:popup        # Popup development

# Linting
npm run lint
```

### Chrome Extension Testing

1. **Build the extension**:
   ```bash
   npm run build
   ```

2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

3. **Testing Features**:
   - Navigate to any webpage
   - Click the extension icon to create notepads
   - Test drag, resize, save, and search functionality

## Firebase Data Structure

```
users/
  {userId}/
    notepads/
      {notepadId}/
        content: string
        position: {x: number, y: number}
        state: 'normal' | 'minimized' | 'collapsed'
        tags: string[]
        userId: string
        createdAt: Timestamp
        updatedAt: Timestamp
        lastModified: number
```

## Key Technical Decisions

### Shadow DOM Usage
- **Rationale**: Complete style isolation from host page CSS
- **Implementation**: All notepad UI rendered in Shadow DOM
- **Trade-off**: Increased complexity but bulletproof styling

### Dual Storage Architecture
- **Primary**: Firebase Firestore for persistent cloud storage
- **Session**: localStorage for immediate search availability
- **Auto-sync**: localStorage clears on refresh, maintains data consistency

### Event-Driven Communication
- **Custom Events**: Communication between content script components
- **Auth Bridges**: Secure authentication across extension contexts
- **State Reactivity**: StateManager with listener pattern for UI updates

## Development Guidelines

### Code Organization
- **Single Responsibility**: Each class handles one core responsibility
- **Composition over Inheritance**: Favor composition patterns
- **Interface Contracts**: Use TypeScript interfaces for contracts
- **Error Boundaries**: Comprehensive error handling with user feedback

### Performance Considerations
- **Debounced Operations**: Auto-save and search operations debounced
- **Memory Management**: Proper cleanup in destroy() methods
- **Lazy Loading**: Components initialized only when needed
- **Efficient DOM**: Minimal DOM manipulation, batch updates

### Security
- **Content Security Policy**: Strict CSP in manifest.json
- **Auth Token Management**: Secure token storage and rotation
- **Input Sanitization**: XSS protection for user content
- **Permission Minimization**: Minimal extension permissions

## Debugging

### Console Commands
- `debugSearchIntegration()` - Shows search index status
- `forceRefreshSearch()` - Manually refresh search index
- `mindweaverReopenNotepad(id)` - Reopen specific notepad

### Common Issues
- **Notes not searchable**: Check localStorage vs Firebase sync
- **Auth issues**: Verify Firebase config and popup permissions
- **Drag/resize problems**: Check z-index conflicts with host page
- **Save failures**: Check network connectivity and auth status

## Contributing

### Before Contributing
1. Read the architecture overview
2. Set up development environment
3. Run existing tests
4. Check code style with `npm run lint`

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes with appropriate tests
3. Update documentation if needed
4. Ensure all builds pass
5. Submit PR with detailed description

## Known Limitations

- **Browser Support**: Chrome/Chromium only (Manifest v3)
- **Offline Mode**: Limited offline functionality without Firebase
- **Host Page Conflicts**: Potential z-index conflicts with complex sites
- **Storage Limits**: Firestore quota limits for heavy usage

## License

[Add your license information here]

## Support

[Add support contact information here]