import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../features/auth/authSlice';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/auth');
  };

  return (
    <nav className="bg-gray-800 dark:bg-gray-900 text-white p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        {isAuthenticated && user && (
          <span className="text-lg font-semibold">{user.email}</span>
        )}
      </div>
      <div className="flex items-center space-x-4">
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        )}
        {/* Dark mode toggle would go here */}
      </div>
    </nav>
  );
};

export default Navbar;

