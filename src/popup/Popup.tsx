import { useState, useEffect } from 'react';
import '../index.css';
import { AuthService, AuthUser } from '../services/authService';
import AuthForm from '../components/AuthForm';
import Dashboard from '../components/Dashboard';
// Initialize popup auth bridge for content script communication
import '../services/popupAuthBridge';

const Popup = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = AuthService.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (authUser: AuthUser) => {
    setUser(authUser);
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
      {user ? (
        <Dashboard user={user} />
      ) : (
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
};

export default Popup;
