import { useState, useEffect } from 'react';
import '../index.css';
import { NoteService, Note } from '../services/noteService';

const Popup = () => {
  const [noteContent, setNoteContent] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);

  // Load notes from storage when component mounts
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const savedNotes = await NoteService.getNotes(false); // false = use local storage for now
        setNotes(savedNotes);
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    };

    loadNotes();
  }, []);

  // We don't need this effect anymore as NoteService handles saving

  const handleSaveNote = async () => {
    if (noteContent.trim()) {
      try {
        const newNote = await NoteService.saveNote({
          content: noteContent,
          timestamp: Date.now(),
        }, false); // false = use local storage for now
        
        setNotes([newNote, ...notes]);
        setNoteContent('');
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await NoteService.deleteNote(id, false); // false = use local storage for now
      setNotes(notes.filter(note => note.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="popup-container">
      <h1 className="text-xl font-bold mb-4">MindWeaver Notes</h1>
      
      <div className="note-input-container mb-4">
        <textarea
          className="w-full p-2 border border-gray-300 rounded-md"
          rows={4}
          placeholder="Type your note here..."
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
        />
        <button
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          onClick={handleSaveNote}
        >
          Save Note
        </button>
      </div>

      <div className="notes-list">
        {notes.length === 0 ? (
          <p className="text-gray-500">No notes yet. Create one!</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="note-item p-3 mb-3 border border-gray-200 rounded-md">
              <p className="note-content">{note.content}</p>
              <div className="note-footer flex justify-between items-center mt-2 text-sm text-gray-500">
                <span>{formatDate(note.timestamp)}</span>
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteNote(note.id)}
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

export default Popup;
