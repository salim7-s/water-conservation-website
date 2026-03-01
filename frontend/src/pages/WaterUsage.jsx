// frontend/src/pages/WaterUsage.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getUser } from '../utils/auth';

export default function WaterUsage() {
  const [usageRecords, setUsageRecords] = useState([]);
  const [waterSources, setWaterSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    source_id: '',
    quantity_used: '',
    purpose: 'domestic',
    cost: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [filterPurpose, setFilterPurpose] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const user = getUser();

  const purposes = [
    { value: 'domestic', label: '🏠 Domestic', color: 'blue' },
    { value: 'drinking', label: '💧 Drinking', color: 'cyan' },
    { value: 'cooking', label: '🍳 Cooking', color: 'green' },
    { value: 'bathing', label: '🚿 Bathing', color: 'purple' },
    { value: 'washing', label: '🧺 Washing', color: 'pink' },
    { value: 'gardening', label: '🌱 Gardening', color: 'emerald' },
    { value: 'cleaning', label: '🧹 Cleaning', color: 'orange' },
    { value: 'other', label: '📦 Other', color: 'gray' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usageRes, sourcesRes] = await Promise.all([
        api.get('/water-usage'),
        api.get('/water-sources')
      ]);
      setUsageRecords(usageRes.data);
      setWaterSources(sourcesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.quantity_used || parseFloat(formData.quantity_used) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      const payload = {
        user_id: user.user_id,
        source_id: formData.source_id ? parseInt(formData.source_id) : null,
        quantity_used: parseFloat(formData.quantity_used),
        purpose: formData.purpose,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        date: formData.date,
        notes: formData.notes || null
      };

      if (editingRecord) {
        await api.put(`/water-usage/${editingRecord.usage_id}`, payload);
      } else {
        await api.post('/water-usage', payload);
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save usage record. Please try again.');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      source_id: record.source_id || '',
      quantity_used: record.quantity_used.toString(),
      purpose: record.purpose || 'domestic',
      cost: record.cost ? record.cost.toString() : '',
      date: record.date.split('T')[0],
      notes: record.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
      await api.delete(`/water-usage/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record.');
    }
  };

  const resetForm = () => {
    setFormData({
      source_id: '',
      quantity_used: '',
      purpose: 'domestic',
      cost: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingRecord(null);
    setShowForm(false);
  };

  const calculateTotals = (records) => {
    const total = records.reduce((sum, r) => sum + (parseFloat(r.quantity_used) || 0), 0);
    const totalCost = records.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
    return { total, totalCost };
  };

  const filteredRecords = usageRecords.filter(record => {
    const matchesPurpose = filterPurpose === 'all' || record.purpose === filterPurpose;
    const recordDate = new Date(record.date);
    const matchesDateRange = 
      (!dateRange.start || recordDate >= new Date(dateRange.start)) &&
      (!dateRange.end || recordDate <= new Date(dateRange.end));
    return matchesPurpose && matchesDateRange;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const { total, totalCost } = calculateTotals(filteredRecords);

  const getPurposeInfo = (purpose) => {
    return purposes.find(p => p.value === purpose) || purposes[purposes.length - 1];
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
          <p className="text-water-600 font-semibold">Loading usage data...</p>
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">💧 Water Usage</h1>
            <p className="text-gray-600 mt-1">Track your daily water consumption</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="mt-4 md:mt-0 btn-primary"
          >
            {showForm ? '✕ Cancel' : '+ Add Usage'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Total Records</h3>
                <p className="text-3xl font-bold mt-2">{filteredRecords.length}</p>
              </div>
              <div className="text-4xl opacity-50">📊</div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Total Usage</h3>
                <p className="text-3xl font-bold mt-2">{total.toFixed(1)}L</p>
              </div>
              <div className="text-4xl opacity-50">💧</div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">Total Cost</h3>
                <p className="text-3xl font-bold mt-2">${totalCost.toFixed(2)}</p>
              </div>
              <div className="text-4xl opacity-50">💰</div>
            </div>
          </motion.div>
        </div>

        {/* Form - Collapsed/Expanded */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-4">
                {editingRecord ? 'Edit Usage Record' : 'Add New Usage'}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Water Source (Optional)
                    </label>
                    <select
                      className="input-field"
                      value={formData.source_id}
                      onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                    >
                      <option value="">Select source...</option>
                      {waterSources.map(source => (
                        <option key={source.source_id} value={source.source_id}>
                          {source.source_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity Used (Liters) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g., 50.5"
                      className="input-field"
                      value={formData.quantity_used}
                      onChange={(e) => setFormData({ ...formData, quantity_used: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {purposes.map(purpose => (
                      <button
                        key={purpose.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, purpose: purpose.value })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          formData.purpose === purpose.value
                            ? 'bg-water-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {purpose.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost (Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g., 5.50"
                      className="input-field"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add any additional notes..."
                    className="input-field"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={handleSubmit} className="btn-primary flex-1">
                    {editingRecord ? 'Update Record' : 'Add Record'}
                  </button>
                  {editingRecord && (
                    <button onClick={resetForm} className="btn-secondary">
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <select
                className="input-field"
                value={filterPurpose}
                onChange={(e) => setFilterPurpose(e.target.value)}
              >
                <option value="all">All Purposes</option>
                {purposes.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="input-field"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="input-field"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Usage Records */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Usage History</h2>
          <p className="text-gray-600 mb-4">Showing {filteredRecords.length} records</p>
          
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💧</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Records Yet</h3>
              <p className="text-gray-500 mb-4">Start tracking your water usage!</p>
              <button onClick={() => setShowForm(true)} className="btn-primary">
                Add Your First Record
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => {
                    const purposeInfo = getPurposeInfo(record.purpose);
                    return (
                      <tr key={record.usage_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-water-100 text-water-800">
                            {purposeInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-water-600">
                          {parseFloat(record.quantity_used).toFixed(1)}L
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                          ${parseFloat(record.cost || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {waterSources.find(s => s.source_id === record.source_id)?.source_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {record.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(record)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(record.usage_id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </Layout>
  );
}