import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isAuthenticated } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Homepage() {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();

  useEffect(() => {
    // Redirect if already logged in
    if (authenticated) {
      navigate('/dashboard');
    }
  }, [authenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-water-50 via-water-100 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-water-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-water-600"
              >
                💧 Water Tracker
              </motion.div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-water-600 hover:text-water-700 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
          >
            Track Your Water Usage
            <span className="block text-water-600 mt-2">Conserve & Save</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
          >
            Monitor your water consumption, set conservation goals, and contribute to a sustainable future. 
            Smart tracking for smarter living.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="btn-primary text-lg px-8 py-3"
            >
              Start Tracking Free
            </Link>
            <Link
              to="/login"
              className="btn-secondary text-lg px-8 py-3"
            >
              Sign In
            </Link>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="card text-center"
          >
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Usage Analytics
            </h3>
            <p className="text-gray-600">
              Track daily, weekly, and monthly water consumption with detailed analytics and insights.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="card text-center"
          >
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Set Goals
            </h3>
            <p className="text-gray-600">
              Create conservation goals and track your progress towards reducing water waste.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="card text-center"
          >
            <div className="text-4xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Smart Alerts
            </h3>
            <p className="text-gray-600">
              Get notified about high usage, leaks, and conservation opportunities.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="card text-center"
          >
            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Conservation Tips
            </h3>
            <p className="text-gray-600">
              Join conservation activities and learn ways to reduce your water footprint.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="card text-center"
          >
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Real-time Monitoring
            </h3>
            <p className="text-gray-600">
              Connect smart meters for live water usage tracking and instant updates.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="card text-center"
          >
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Predictions
            </h3>
            <p className="text-gray-600">
              Get usage predictions to plan ahead and optimize your water consumption.
            </p>
          </motion.div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 card bg-gradient-to-r from-water-500 to-water-600 text-white"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-water-100">Free to Use</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-water-100">Real-time Tracking</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">∞</div>
              <div className="text-water-100">Conservation Impact</div>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-20 text-center"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Conserving Water?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of users tracking their water usage and making a difference.
          </p>
          <Link
            to="/register"
            className="btn-primary text-lg px-10 py-4 inline-block"
          >
            Create Free Account
          </Link>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-water-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="font-semibold text-water-600 mb-2">💧 Water Tracker</p>
            <p className="text-sm">Helping you conserve water, one drop at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


