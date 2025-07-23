import { useState, useEffect } from 'react';
import { AuthService, AuthUser } from '../services/authService';
import { storageService } from '../modules/storage/StorageService';
import { NotepadData } from '../modules/state/StateManager';

interface DashboardProps {
  user: AuthUser;
}

const Dashboard = ({ user }: DashboardProps) => {
  const [notepads, setNotepads] = useState<NotepadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudConnected, setCloudConnected] = useState(false);

  // Load notepads from storage when component mounts
  useEffect(() => {
    const loadNotepads = async () => {
      try {
        // Check if user is authenticated to determine cloud connection
        setCloudConnected(AuthService.getCurrentUser() !== null);
        
        const savedNotepads = await storageService.loadAllNotepads();
        const notepadArray = Object.values(savedNotepads).filter(notepad => notepad.content.trim() !== '');
        setNotepads(notepadArray);
      } catch (error) {
        console.error('Error loading notepads:', error);
        setCloudConnected(false);
      } finally {
        setLoading(false);
      }
    };

    loadNotepads();
  }, [user]);

  const refreshNotepads = async () => {
    try {
      const savedNotepads = await storageService.loadAllNotepads();
      const notepadArray = Object.values(savedNotepads);
      
      console.log('📊 Dashboard loading notepads:', {
        totalFound: notepadArray.length,
        notepadIds: notepadArray.map(n => n.id),
        withContent: notepadArray.filter(n => n.content.trim() !== '').length,
        emptyContent: notepadArray.filter(n => n.content.trim() === '').length,
        contentSamples: notepadArray.map(n => ({ id: n.id, content: n.content.substring(0, 20) + '...' }))
      });
      
      // Show only notepads with content (users typically don't want to see empty ones)
      const filteredNotepads = notepadArray.filter(notepad => notepad.content.trim() !== '');
      
      console.log('📊 Dashboard filtered notepads:', {
        displayCount: filteredNotepads.length,
        displayedIds: filteredNotepads.map(n => n.id)
      });
      
      setNotepads(filteredNotepads);
    } catch (error) {
      console.error('Error refreshing notepads:', error);
    }
  };

  const handleDeleteNotepad = async (id: string) => {
    try {
      await storageService.deleteNotepad(id);
      setNotepads(notepads.filter(notepad => notepad.id !== id));
    } catch (error) {
      console.error('Error deleting notepad:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  if (loading) {
    return (
      <div className="popup-container">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">MindWeaver Notes</h1>
        <div className="flex items-center space-x-2">
          {/* Cloud connection indicator */}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-gray-500">
              {cloudConnected ? 'Cloud' : 'Local'}
            </span>
          </div>
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
      
      <div className="info-section mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h2 className="text-sm font-semibold text-blue-800 mb-1">Your Floating Notes</h2>
        <p className="text-xs text-blue-600">
          Create floating notes on any webpage using the + button. All your notes are {cloudConnected ? 'synced to the cloud' : 'stored locally'}.
        </p>
        <button
          onClick={refreshNotepads}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Refresh Notes
        </button>
      </div>

      <div className="notes-list">
        {notepads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No floating notes yet!</p>
            <p className="text-xs text-gray-400">
              Visit any webpage and click the + button to create your first floating note.
            </p>
          </div>
        ) : (
          notepads.map((notepad) => (
            <div key={notepad.id} className="note-item p-3 mb-3 border border-gray-200 rounded-md hover:shadow-sm transition-shadow">
              <p className="note-content text-sm">{truncateContent(notepad.content)}</p>
              <div className="note-footer flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>{formatDate(notepad.lastModified)}</span>
                <button
                  className="text-red-500 hover:text-red-700 text-xs"
                  onClick={() => handleDeleteNotepad(notepad.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
