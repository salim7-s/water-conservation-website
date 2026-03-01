import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getUser } from '../utils/auth';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    goal_type: 'reduce_consumption',
    target_quantity: '',
    deadline: '',
    progress: '0%',
  });

  const user = getUser();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/goals', {
        ...formData,
        user_id: user.user_id,
        target_quantity: parseFloat(formData.target_quantity),
      });
      setShowForm(false);
      setFormData({
        goal_type: 'reduce_consumption',
        target_quantity: '',
        deadline: '',
        progress: '0%',
      });
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-water-200 border-t-water-600 rounded-full mb-4"
          />
          <p className="text-water-600 font-semibold">Loading goals...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">My Goals</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancel' : '+ New Goal'}
          </button>
        </div>

        {/* Goal Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-xl font-semibold mb-4">Create New Goal</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Type
                </label>
                <select
                  required
                  className="input-field"
                  value={formData.goal_type}
                  onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                >
                  <option value="reduce_consumption">Reduce Consumption</option>
                  <option value="save_money">Save Money</option>
                  <option value="conserve_water">Conserve Water</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Quantity (Liters)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={formData.target_quantity}
                  onChange={(e) => setFormData({ ...formData, target_quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-primary">
                Create Goal
              </button>
            </form>
          </motion.div>
        )}

        {/* Goals List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <motion.div
              key={goal.goal_id}
              whileHover={{ scale: 1.02 }}
              className="card"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-water-700 capitalize">
                    {goal.goal_type.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Target: {goal.target_quantity} L
                  </p>
                </div>
                {getStatusBadge(goal.status)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">{goal.progress}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Deadline:</span>
                  <span className="font-medium">
                    {new Date(goal.deadline).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: goal.progress }}
                      transition={{ duration: 1 }}
                      className="bg-gradient-to-r from-water-500 to-blue-500 h-2.5 rounded-full"
                    />
                  </div>
                  <button
                    onClick={() => handleDelete(goal.goal_id)}
                    className="ml-4 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {goals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card text-center py-16 bg-gradient-to-br from-water-50 to-blue-50 border-2 border-dashed border-water-300"
          >
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No Goals Yet</h3>
            <p className="text-gray-500 mb-6">Start your water conservation journey by creating your first goal!</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Create Your First Goal
            </button>
          </motion.div>
        )}
      </motion.div>
    </Layout>
  );
}


