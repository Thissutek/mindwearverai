import { useState, useEffect } from 'react';
import { AuthService, AuthUser } from '../services/authService';

interface DashboardProps {
  user: AuthUser;
}

const Dashboard = ({ user }: DashboardProps) => {
  const [cloudConnected, setCloudConnected] = useState(false);

  // Check cloud connection status when component mounts
  useEffect(() => {
    setCloudConnected(AuthService.getCurrentUser() !== null);
  }, [user]);

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="popup-container">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">MindWeaver Notes</h1>
        
        {/* User Info Section */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-gray-500">
                  {cloudConnected ? 'Cloud Synced' : 'Local Storage'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
