import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useSSE } from '../hooks/useSSE';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const { data: meterData, connected } = useSSE('/api/stream/meters');

  useEffect(() => {
    fetchStats();
    fetchUsageData();
    fetchGoals();
    fetchAlerts();

    // Auto-refresh every 30 seconds to keep data current
    const refreshInterval = setInterval(() => {
      fetchStats();
      fetchUsageData();
      fetchGoals();
      fetchAlerts();
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/water-usage/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageData = async () => {
    try {
      const response = await api.get('/water-usage');
      setUsageData(response.data.slice(0, 30)); // Last 30 records
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/alerts');
      setAlerts(response.data.slice(0, 5)); // Recent 5 alerts
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  // Prepare chart data
  const chartData = {
    labels: usageData.map((u) => new Date(u.date).toLocaleDateString()).reverse(),
    datasets: [
      {
        label: 'Water Usage (Liters)',
        data: usageData.map((u) => u.quantity_used).reverse(),
        borderColor: 'rgb(24, 144, 255)',
        backgroundColor: 'rgba(24, 144, 255, 0.1)',
        tension: 0.4,
      },
    ],
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

  // Active goals progress
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  // Manual refresh function
  const refreshAll = () => {
    setLoading(true);
    Promise.all([
      fetchStats(),
      fetchUsageData(),
      fetchGoals(),
      fetchAlerts()
    ]).finally(() => setLoading(false));
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
          <p className="text-water-600 font-semibold">Loading dashboard...</p>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={refreshAll}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card bg-gradient-to-br from-water-500 to-water-600 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Daily Usage</h3>
                <p className="text-3xl font-bold mt-2">
                  {stats?.daily?.total?.toFixed(1) || '0'} L
                </p>
                <p className="text-sm opacity-75 mt-1">
                  ${stats?.daily?.total_cost?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-4xl opacity-50">📅</div>
            </div>
          </motion.div>
          {stats?.daily?.total === 0 && stats?.weekly?.total === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card bg-water-50 border-2 border-water-200 text-center py-12"
            >
              <div className="text-6xl mb-4">💧</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Water Tracker!</h3>
              <p className="text-gray-600 mb-6">Start tracking your water usage to see analytics and insights.</p>
              <Link to="/usage" className="btn-primary inline-block">
                Add Your First Usage Record
              </Link>
            </motion.div>
          )}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card bg-gradient-to-br from-water-400 to-water-500 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Weekly Usage</h3>
                <p className="text-3xl font-bold mt-2">
                  {stats?.weekly?.total?.toFixed(1) || '0'} L
                </p>
                <p className="text-sm opacity-75 mt-1">
                  ${stats?.weekly?.total_cost?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-4xl opacity-50">📊</div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card bg-gradient-to-br from-water-600 to-water-700 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Monthly Usage</h3>
                <p className="text-3xl font-bold mt-2">
                  {stats?.monthly?.total?.toFixed(1) || '0'} L
                </p>
                <p className="text-sm opacity-75 mt-1">
                  ${stats?.monthly?.total_cost?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-4xl opacity-50">📈</div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Active Goals</h3>
                <p className="text-3xl font-bold mt-2">{activeGoals.length}</p>
                <p className="text-sm opacity-75 mt-1">
                  {completedGoals.length} completed
                </p>
              </div>
              <div className="text-4xl opacity-50">🎯</div>
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Usage Trend</h3>
            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Usage by Purpose</h3>
            <div className="h-64">
              <Doughnut data={purposeChartData} options={chartOptions} />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Predictions</h3>
            <div className="space-y-4">
              <div className="p-4 bg-water-50 rounded-lg border border-water-200">
                <p className="text-sm text-gray-600">Next Week</p>
                <p className="text-2xl font-bold text-water-600">
                  {stats?.predictions?.nextWeek?.toFixed(1) || '0'} L
                </p>
              </div>
              <div className="p-4 bg-water-50 rounded-lg border border-water-200">
                <p className="text-sm text-gray-600">Next Month</p>
                <p className="text-2xl font-bold text-water-600">
                  {stats?.predictions?.nextMonth?.toFixed(1) || '0'} L
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Avg Daily</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.monthly?.total ? (stats.monthly.total / 30).toFixed(1) : '0'} L
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Goals and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Goals */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Active Goals</h3>
            {activeGoals.length > 0 ? (
              <div className="space-y-3">
                {activeGoals.slice(0, 3).map((goal) => {
                  const progress = parseInt(goal.progress) || 0;
                  return (
                    <motion.div
                      key={goal.goal_id}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 bg-water-50 rounded-lg border border-water-200"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-water-700 capitalize">
                          {goal.goal_type.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-bold text-water-600">{goal.progress}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-water-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">
                        Target: {goal.target_quantity}L • Deadline: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No active goals</p>
            )}
          </div>

          {/* Recent Alerts */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.alert_id}
                    whileHover={{ scale: 1.01 }}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{alert.alert_type}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{alert.message}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${alert.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        alert.status === 'reported' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(alert.alert_date).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent alerts</p>
            )}
          </div>
        </div>

        {/* Smart Meters */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Smart Meters</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm ${connected
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}
            >
              {connected ? '● Connected' : '○ Disconnected'}
            </span>
          </div>
          {meterData?.meters && meterData.meters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {meterData.meters.map((meter) => (
                <motion.div
                  key={meter.meter_id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-water-50 rounded-lg border border-water-200"
                >
                  <p className="text-sm text-gray-600">Meter #{meter.meter_id}</p>
                  <p className="text-2xl font-bold text-water-600">
                    {meter.total_usage.toFixed(2)} L
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Status: {meter.status}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No active meters</p>
          )}
        </div>
      </motion.div>
    </Layout>
  );
}


