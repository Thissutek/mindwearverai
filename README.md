# MindweaveAI

A browser-based note-taking application with cloud synchronization, speech-to-text capabilities, and a draggable UI.

## Features

- **Draggable Notepad Interface**: Create and position multiple notepads anywhere on your screen
- **Cloud Synchronization**: All notes are saved to Firebase in real-time
- **Speech-to-Text**: Dictate your notes using built-in speech recognition
- **User Authentication**: Secure access to your notes with Firebase authentication
- **Rich UI Experience**:
  - Minimize, collapse, or close notepads
  - Undo/redo functionality
  - Drag-and-drop positioning
  - Visual feedback for saving status
  - Responsive design

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS
- **Backend/Storage**: Firebase (Firestore)
- **Authentication**: Firebase Auth
- **Speech Recognition**: Deepgram SDK

## Project Structure

```
src/
├── assets/         # Static assets
├── components/     # Reusable UI components
├── config/         # Configuration files
├── content/        # Browser extension content scripts
├── modules/
│   ├── drag/       # Drag functionality
│   ├── notepad/    # Core notepad functionality
│   ├── sidebar/    # Sidebar UI components
│   ├── state/      # State management
│   └── storage/    # Storage services
├── popup/          # Browser extension popup
├── services/       # Firebase and other services
└── utils/          # Utility functions
```

## Getting Started

### Prerequisites

- Node.js (latest LTS version)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mindweaveai.git
   cd mindweaveai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
   ```

### Development

Run the development server:
```
npm run dev
```

For browser extension development:
```
npm run dev:popup
```

### Building

Build the application:
```
npm run build
```

This will create:
- Browser extension popup: `npm run build:popup`
- Content scripts: `npm run build:content`

## Usage

1. **Creating a Note**: Click the MindweaveAI icon to create a new notepad
2. **Editing**: Click on the notepad and start typing
3. **Dictating**: Click the microphone icon to start speech-to-text
4. **Moving**: Drag the notepad header to reposition
5. **Minimizing/Collapsing**: Use the respective buttons in the notepad header
6. **Authentication**: Sign in to save your notes to the cloud
