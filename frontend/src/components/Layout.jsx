import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clearAuth, getUser, isAdmin } from '../utils/auth';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  if (!user) return children;

  return (
    <div className="min-h-screen bg-gradient-to-br from-water-50 to-water-100">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md shadow-xl border-b border-water-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-18 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-3xl"
                >
                  💧
                </motion.div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl font-bold bg-gradient-to-r from-water-600 to-blue-600 bg-clip-text text-transparent"
                >
                  Water Tracker
                </motion.span>
              </Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                <Link
                  to="/dashboard"
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    isActive('/dashboard')
                      ? 'bg-gradient-to-r from-water-500 to-water-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-water-600 hover:bg-water-50'
                  }`}
                >
                  Dashboard
                </Link>
                {isAdmin() ? (
                  <Link
                    to="/admin"
                    className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      isActive('/admin')
                        ? 'bg-gradient-to-r from-water-500 to-water-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-water-600 hover:bg-water-50'
                    }`}
                  >
                    Admin Panel
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/user"
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        isActive('/user')
                          ? 'bg-gradient-to-r from-water-500 to-water-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-water-600 hover:bg-water-50'
                      }`}
                    >
                      My Panel
                    </Link>
                    <Link
                      to="/goals"
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        isActive('/goals')
                          ? 'bg-gradient-to-r from-water-500 to-water-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-water-600 hover:bg-water-50'
                      }`}
                    >
                      Goals
                    </Link>
                    
                      <Link
                        to="/usage"
                        className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                          isActive('/usage')
                            ? 'bg-gradient-to-r from-water-500 to-water-600 text-white shadow-lg'
                            : 'text-gray-600 hover:text-water-600 hover:bg-water-50'
                        }`}
                      >
                        💧 Water Usage
                      </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-water-50 to-blue-50 rounded-xl border border-water-200"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-water-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.firstname?.[0]}{user.lastname?.[0]}
                </div>
                <span className="text-sm font-semibold text-gray-700 hidden md:block">
                  {user.firstname} {user.lastname}
                </span>
              </motion.div>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}


