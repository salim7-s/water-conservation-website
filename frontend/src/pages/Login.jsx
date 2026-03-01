import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { setAuth } from '../utils/auth';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      setAuth(response.data.token, response.data.user);
      
      // Redirect based on role
      if (response.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        // Server responded with error
        setError(err.response.data?.error || err.response.data?.message || 'Login failed');
      } else if (err.request) {
        // Request made but no response
        setError('Cannot connect to server. Please check if backend is running. Check your .env file for the correct API URL.');
      } else {
        // Something else happened
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-water-50 via-blue-50 to-cyan-50 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="card shadow-2xl border-2 border-water-100">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-center mb-6"
          >
            <div className="text-6xl mb-4">💧</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-water-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Water Tracker
            </h1>
            <p className="text-gray-600 font-medium">Sign in to your account</p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 text-red-800 px-4 py-3 rounded-xl mb-4 shadow-lg"
            >
              <p className="font-bold flex items-center gap-2">
                <span>⚠️</span> Error
              </p>
              <p className="mt-1">{error}</p>
              {error.includes('connect to server') && (
                <p className="text-sm mt-2">
                  💡 Make sure backend is running: <code className="bg-red-200 px-1 rounded">cd backend && npm run dev</code>
                </p>
              )}
              {error.includes('500') && (
                <p className="text-sm mt-2">
                  💡 This is usually a database issue. Check backend terminal for errors. Make sure MySQL password is correct in <code className="bg-red-200 px-1 rounded">backend/.env</code>
                </p>
              )}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-water-600 hover:text-water-700 font-medium">
              Register
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

