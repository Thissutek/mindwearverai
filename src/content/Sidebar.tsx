import React, { useState, useEffect } from 'react';
import { NoteService, Note } from '../services/noteService';

const Sidebar: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoading(true);
        const savedNotes = await NoteService.getNotes(false); // false = use local storage for now
        setNotes(savedNotes);
        setError(null);
      } catch (err) {
        console.error('Error loading notes:', err);
        setError('Failed to load notes');
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, []);

  return (
    <div className="mindweaver-sidebar" style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>My Notes</h2>
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '8rem' }}>
          <div style={{ 
            animation: 'spin 1s linear infinite', 
            borderRadius: '9999px', 
            height: '2rem', 
            width: '2rem', 
            border: '2px solid #3b82f6', 
            borderTopColor: 'transparent' 
          }}></div>
        </div>
      ) : error ? (
        <div style={{ backgroundColor: '#fee2e2', borderLeftWidth: '4px', borderLeftColor: '#ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '0.25rem' }}>
          <p>Error loading notes: {error}</p>
        </div>
      ) : notes.length === 0 ? (
        <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.25rem', color: '#4b5563' }}>
          <p>No notes found. Create your first note!</p>
        </div>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notes.map((note) => (
            <li key={note.id} style={{ 
              backgroundColor: '#ffffff', 
              padding: '0.75rem', 
              borderRadius: '0.25rem', 
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              transition: 'box-shadow 0.2s ease-in-out'
            }}>
              <p style={{ color: '#4b5563' }}>{note.content}</p>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                {new Date(note.timestamp).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Sidebar;
