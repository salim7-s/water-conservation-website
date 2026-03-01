import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import api from '../utils/api';
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

export default function AdminPanel() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [usageData, setUsageData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, statsRes, usersRes, usageRes] = await Promise.all([
        api.get('/admin/alerts'),
        api.get('/admin/stats'),
        api.get('/users'),
        api.get('/water-usage'),
      ]);
      setAlerts(alertsRes.data);
      setStats(statsRes.data);
      setUsers(usersRes.data.filter(u => u.role === 'user'));
      setUsageData(usageRes.data.slice(0, 50)); // Recent 50 usage records
      
      // Create recent activity from alerts and usage
      const activities = [
        ...alertsRes.data.slice(0, 10).map(a => ({
          type: 'alert',
          message: `${a.firstname} ${a.lastname} - ${a.alert_type}`,
          date: a.alert_date,
          status: a.status,
        })),
        ...usageRes.data.slice(0, 10).map(u => ({
          type: 'usage',
          message: `${u.firstname || 'User'} ${u.lastname || ''} - Used ${u.quantity_used?.toFixed(1)}L`,
          date: u.date,
          status: null,
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
      
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      await api.post(`/admin/alerts/${selectedAlert.alert_id}/${action}`, {
        comment: comment || null,
      });
      setShowModal(false);
      setSelectedAlert(null);
      setComment('');
      fetchData();
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Failed to perform action');
    }
  };

  const openModal = (alert, actionType) => {
    setSelectedAlert(alert);
    setAction(actionType);
    setComment('');
    setShowModal(true);
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

  const getSeverityBadge = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[severity] || 'bg-gray-100 text-gray-800'}`}>
        {severity}
      </span>
    );
  };

  // Filter and search alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      `${alert.firstname} ${alert.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.alert_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Prepare chart data for alerts by status
  const alertsByStatus = {
    reported: alerts.filter(a => a.status === 'reported').length,
    approved: alerts.filter(a => a.status === 'approved').length,
    rejected: alerts.filter(a => a.status === 'rejected').length,
    'in-progress': alerts.filter(a => a.status === 'in-progress').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  };

  const statusChartData = {
    labels: Object.keys(alertsByStatus),
    datasets: [{
      label: 'Alerts by Status',
      data: Object.values(alertsByStatus),
      backgroundColor: [
        'rgba(234, 179, 8, 0.8)',   // reported - yellow
        'rgba(59, 130, 246, 0.8)',   // approved - blue
        'rgba(239, 68, 68, 0.8)',    // rejected - red
        'rgba(168, 85, 247, 0.8)',   // in-progress - purple
        'rgba(34, 197, 94, 0.8)',    // resolved - green
      ],
      borderColor: [
        'rgb(234, 179, 8)',
        'rgb(59, 130, 246)',
        'rgb(239, 68, 68)',
        'rgb(168, 85, 247)',
        'rgb(34, 197, 94)',
      ],
      borderWidth: 2,
    }],
  };

  // Alerts by type
  const alertsByType = alerts.reduce((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
    return acc;
  }, {});

  const typeChartData = {
    labels: Object.keys(alertsByType),
    datasets: [{
      label: 'Alerts by Type',
      data: Object.values(alertsByType),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)',
      ],
      borderWidth: 2,
    }],
  };

  // Usage by purpose chart
  const usageByPurpose = usageData.reduce((acc, usage) => {
    const purpose = usage.purpose || 'other';
    acc[purpose] = (acc[purpose] || 0) + (usage.quantity_used || 0);
    return acc;
  }, {});

  const purposeChartData = {
    labels: Object.keys(usageByPurpose).slice(0, 8),
    datasets: [{
      label: 'Usage by Purpose (Liters)',
      data: Object.values(usageByPurpose).slice(0, 8),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2,
    }],
  };

  // Top users by usage
  const userUsage = users.map(user => {
    const userUsageRecords = usageData.filter(u => u.user_id === user.user_id);
    const totalUsage = userUsageRecords.reduce((sum, u) => sum + (u.quantity_used || 0), 0);
    return {
      ...user,
      totalUsage,
      recordCount: userUsageRecords.length,
    };
  }).sort((a, b) => b.totalUsage - a.totalUsage).slice(0, 5);

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
          <p className="text-water-600 font-semibold">Loading admin panel...</p>
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
        <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Total Users</h3>
                  <p className="text-3xl font-bold mt-2">{stats.totalUsers}</p>
                </div>
                <div className="text-4xl opacity-50">👥</div>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Total Alerts</h3>
                  <p className="text-3xl font-bold mt-2">{stats.totalAlerts}</p>
                </div>
                <div className="text-4xl opacity-50">🔔</div>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Pending</h3>
                  <p className="text-3xl font-bold mt-2">{stats.pendingAlerts}</p>
                </div>
                <div className="text-4xl opacity-50">⏳</div>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Active Meters</h3>
                  <p className="text-3xl font-bold mt-2">{stats.activeMeters}</p>
                </div>
                <div className="text-4xl opacity-50">📊</div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Alerts by Status</h2>
            <div className="h-64">
              <Doughnut data={statusChartData} options={chartOptions} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Alerts by Type</h2>
            <div className="h-64">
              <Bar data={typeChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Additional Stats Row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Total Usage</h3>
                  <p className="text-2xl font-bold mt-2">{(stats.totalUsage / 1000).toFixed(1)}k L</p>
                </div>
                <div className="text-4xl opacity-50">💧</div>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Active Goals</h3>
                  <p className="text-2xl font-bold mt-2">{stats.activeGoals || 0}</p>
                </div>
                <div className="text-4xl opacity-50">🎯</div>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Activities</h3>
                  <p className="text-2xl font-bold mt-2">{stats.userActivities || 0}</p>
                </div>
                <div className="text-4xl opacity-50">🌱</div>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Resolved</h3>
                  <p className="text-2xl font-bold mt-2">{stats.resolvedAlerts || 0}</p>
                </div>
                <div className="text-4xl opacity-50">✅</div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Charts Section - Expanded */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Alerts by Status</h2>
            <div className="h-64">
              <Doughnut data={statusChartData} options={chartOptions} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Alerts by Type</h2>
            <div className="h-64">
              <Bar data={typeChartData} options={chartOptions} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Usage by Purpose</h2>
            <div className="h-64">
              <Bar data={purposeChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Top Users and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Users by Usage */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Top Users by Usage</h2>
            <div className="space-y-3">
              {userUsage.length > 0 ? (
                userUsage.map((user, index) => (
                  <motion.div
                    key={user.user_id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-water-500 text-white flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {user.firstname} {user.lastname}
                        </p>
                        <p className="text-xs text-gray-500">{user.recordCount} records</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-water-600">{user.totalUsage.toFixed(1)} L</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No usage data available</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'alert' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.date).toLocaleDateString()} • {activity.type}
                        {activity.status && ` • ${activity.status}`}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* ER Diagram */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Database Schema</h2>
          <img
            src="/assets/schema digram.jpg"
            alt="ER Diagram"
            className="w-full rounded-lg border border-gray-200"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <p className="text-gray-500 text-center mt-2" style={{ display: 'none' }}>
            Schema diagram not found. Please place the ER diagram image in backend/assets/
          </p>
        </div>

        {/* Alerts Table */}
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
            <h2 className="text-xl font-semibold">Alerts Management</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field text-sm"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field text-sm"
              >
                <option value="all">All Status</option>
                <option value="reported">Reported</option>
                <option value="approved">Approved</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      No alerts found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alert) => (
                  <tr key={alert.alert_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{alert.alert_id}</td>
                    <td className="px-4 py-3 text-sm">
                      {alert.firstname} {alert.lastname}
                    </td>
                    <td className="px-4 py-3 text-sm">{alert.alert_type}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{alert.message}</td>
                    <td className="px-4 py-3 text-sm">{getSeverityBadge(alert.severity)}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(alert.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(alert.alert_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {alert.status === 'reported' && (
                          <>
                            <button
                              onClick={() => openModal(alert, 'approve')}
                              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md shadow-sm transition-colors duration-200"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => openModal(alert, 'reject')}
                              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-md shadow-sm transition-colors duration-200"
                            >
                              ✗ Reject
                            </button>
                            <button
                              onClick={() => openModal(alert, 'in-progress')}
                              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-md shadow-sm transition-colors duration-200"
                            >
                              ⏳ In Progress
                            </button>
                          </>
                        )}
                        {alert.status === 'approved' && (
                          <button
                            onClick={() => openModal(alert, 'resolve')}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-md shadow-sm transition-colors duration-200"
                          >
                            ✓ Resolve
                          </button>
                        )}
                        {alert.status === 'in-progress' && (
                          <button
                            onClick={() => openModal(alert, 'resolve')}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-md shadow-sm transition-colors duration-200"
                          >
                            ✓ Resolve
                          </button>
                        )}
                        {(alert.status === 'resolved' || alert.status === 'rejected') && (
                          <span className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-md">
                            No actions
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Modal */}
        {showModal && selectedAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-xl font-semibold mb-4">
                {action.charAt(0).toUpperCase() + action.slice(1)} Alert #{selectedAlert.alert_id}
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">{selectedAlert.message}</p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Comment (Optional)
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedAlert(null);
                    setComment('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  className="btn-primary flex-1"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}


