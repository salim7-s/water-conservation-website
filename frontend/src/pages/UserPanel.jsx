import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function UserPanel() {
  const [alerts, setAlerts] = useState([]);
  const [waterSources, setWaterSources] = useState([]);
  const [activities, setActivities] = useState([]);
  const [userActivities, setUserActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState([]);
  const [stats, setStats] = useState(null);
  const [showLeakForm, setShowLeakForm] = useState(false);
  const [leakForm, setLeakForm] = useState({
    alert_type: 'leak',
    message: '',
    location: '',
    severity: 'medium',
  });

  const user = getUser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, sourcesRes, activitiesRes, userActivitiesRes, usageRes, statsRes] = await Promise.all([
        api.get('/alerts'),
        api.get('/water-sources'),
        api.get('/conservation-activities'),
        api.get('/user-activities'),
        api.get('/water-usage'),
        api.get('/water-usage/stats'),
      ]);

      setAlerts(alertsRes.data);
      setWaterSources(sourcesRes.data);
      setActivities(activitiesRes.data);
      setUserActivities(userActivitiesRes.data);
      setUsageData(usageRes.data.slice(0, 30));
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeakSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/alerts', {
        ...leakForm,
        user_id: user.user_id,
      });
      setShowLeakForm(false);
      setLeakForm({ alert_type: 'leak', message: '', location: '', severity: 'medium' });
      fetchData();
    } catch (error) {
      console.error('Error submitting leak report:', error);
      alert('Failed to submit leak report');
    }
  };

  const handleJoinActivity = async (activityId) => {
    try {
      await api.post('/user-activities', {
        user_id: user.user_id,
        activity_id: activityId,
      });
      fetchData();
    } catch (error) {
      console.error('Error joining activity:', error);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      reported: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      'in-progress': 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  // Usage by purpose chart
  const usageByPurpose = usageData.reduce((acc, usage) => {
    const purpose = usage.purpose || 'other';
    acc[purpose] = (acc[purpose] || 0) + (usage.quantity_used || 0);
    return acc;
  }, {});

  const purposeChartData = {
    labels: Object.keys(usageByPurpose).slice(0, 6),
    datasets: [{
      label: 'Usage by Purpose (Liters)',
      data: Object.values(usageByPurpose).slice(0, 6),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ],
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
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
          <p className="text-water-600 font-semibold">Loading panel...</p>
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
          <h1 className="text-3xl font-bold text-gray-800">My Panel</h1>
          <button
            onClick={() => setShowLeakForm(!showLeakForm)}
            className="btn-primary shadow-lg"
          >
            {showLeakForm ? 'Cancel' : 'Report Leak'}
          </button>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-water-500 to-water-600 text-white shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">This Week</h3>
                  <p className="text-2xl font-bold mt-2">{stats?.weekly?.total?.toFixed(1) || '0'} L</p>
                </div>
                <div className="text-4xl opacity-50">📊</div>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Activities Joined</h3>
                  <p className="text-2xl font-bold mt-2">{userActivities.length}</p>
                </div>
                <div className="text-4xl opacity-50">🌱</div>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Active Alerts</h3>
                  <p className="text-2xl font-bold mt-2">{alerts.filter(a => a.status !== 'resolved').length}</p>
                </div>
                <div className="text-4xl opacity-50">🔔</div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Usage Chart */}
        {Object.keys(usageByPurpose).length > 0 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">My Usage by Purpose</h2>
            <div className="h-64">
              <Bar data={purposeChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Leak Report Form */}
        {showLeakForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-xl font-semibold mb-4">Report Water Leak</h2>
            <form onSubmit={handleLeakSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  required
                  className="input-field"
                  rows={3}
                  value={leakForm.message}
                  onChange={(e) => setLeakForm({ ...leakForm, message: e.target.value })}
                  placeholder="Describe the leak location and severity..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={leakForm.location}
                  onChange={(e) => setLeakForm({ ...leakForm, location: e.target.value })}
                  placeholder="e.g., Kitchen sink, Bathroom faucet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  className="input-field"
                  value={leakForm.severity}
                  onChange={(e) => setLeakForm({ ...leakForm, severity: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">
                Submit Report
              </button>
            </form>
          </motion.div>
        )}

        {/* My Alerts */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">My Alerts</h2>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <motion.div
                  key={alert.alert_id}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{alert.alert_type}</p>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      {alert.location && (
                        <p className="text-xs text-gray-500 mt-1">📍 {alert.location}</p>
                      )}
                      {alert.admin_comment && (
                        <p className="text-sm text-blue-600 mt-2">
                          Admin: {alert.admin_comment}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {getStatusBadge(alert.status)}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.alert_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No alerts yet</p>
          )}
        </div>

        {/* Conservation Activities */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Conservation Activities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((activity) => {
              const isJoined = userActivities.some(
                (ua) => ua.activity_id === activity.activity_id
              );
              return (
                <motion.div
                  key={activity.activity_id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-water-50 rounded-lg border border-water-200"
                >
                  <h3 className="font-semibold text-water-700">{activity.activity_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-water-200 text-water-800 text-xs rounded">
                    {activity.category}
                  </span>
                  {!isJoined ? (
                    <button
                      onClick={() => handleJoinActivity(activity.activity_id)}
                      className="mt-3 btn-primary text-sm"
                    >
                      Join Activity
                    </button>
                  ) : (
                    <span className="mt-3 inline-block text-sm text-green-600 font-medium">
                      ✓ Joined
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}


