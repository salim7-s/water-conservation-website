# Frontend Pages - Detailed Explanation

## Overview
All page components are in `frontend/src/pages/`. Each page handles a specific route.

---

## 1. `Homepage.jsx` - Landing Page

**Route**: `/`
**Access**: Public (redirects to dashboard if authenticated)

### Features
- Hero section with call-to-action
- Features grid (Usage Analytics, Goals, Alerts, etc.)
- Stats section
- Footer

### Key Code
```javascript
// Redirects if already logged in
useEffect(() => {
  if (authenticated) {
    navigate('/dashboard');
  }
}, [authenticated]);
```

---

## 2. `Login.jsx` - Login Page

**Route**: `/login`
**Access**: Public (redirects if authenticated)

### Features
- Email/password form
- Error handling
- Link to registration
- Redirects based on role after login

### Key Code
```javascript
const handleSubmit = async (e) => {
  const response = await api.post('/auth/login', formData);
  setAuth(response.data.token, response.data.user);
  
  // Redirect based on role
  if (response.data.user.role === 'admin') {
    navigate('/admin');
  } else {
    navigate('/dashboard');
  }
};
```

---

## 3. `Register.jsx` - Registration Page

**Route**: `/register`
**Access**: Public (redirects if authenticated)

### Features
- Registration form (name, email, password, contact, address)
- Validation
- Error handling
- Link to login

### Form Fields
- First Name, Last Name
- Email
- Password (min 6 characters)
- Contact Number (optional)
- Address (optional)

---

## 4. `Dashboard.jsx` - User Dashboard

**Route**: `/dashboard`
**Access**: Protected (requires authentication)

### Features
- **Stats Cards**: Daily, Weekly, Monthly usage
- **Usage Trend Chart**: Line chart showing usage over time
- **Usage by Purpose Chart**: Doughnut chart
- **Predictions**: Next week/month usage predictions
- **Smart Meters**: Real-time meter readings via SSE
- **Active Goals**: Progress bars for active goals
- **Recent Alerts**: Last 5 alerts

### Key Code
```javascript
const { data: meterData, connected } = useSSE('/api/stream/meters');

useEffect(() => {
  fetchStats();
  fetchUsageData();
  fetchGoals();
  fetchAlerts();
}, []);
```

**Data Fetching**:
- Fetches stats, usage data, goals, alerts on mount
- Uses SSE for real-time meter data

---

## 5. `UserPanel.jsx` - User Panel

**Route**: `/user`
**Access**: Protected (requires authentication)

### Features
- **Quick Stats**: This week usage, activities joined, active alerts
- **Leak Report Form**: Report water leaks
- **My Alerts**: List of user's alerts with status
- **Conservation Activities**: Grid of activities with join buttons
- **Usage by Purpose Chart**: Bar chart

### Key Functionality
```javascript
const handleLeakSubmit = async (e) => {
  await api.post('/alerts', {
    ...leakForm,
    user_id: user.user_id,
  });
  // Refresh alerts list
};

const handleJoinActivity = async (activityId) => {
  await api.post('/user-activities', {
    user_id: user.user_id,
    activity_id: activityId,
  });
};
```

---

## 6. `AdminPanel.jsx` - Admin Dashboard

**Route**: `/admin`
**Access**: Protected (requires admin role)

### Features
- **Stats Cards**: Total users, alerts, pending, meters, usage, goals, activities
- **Charts**:
  - Alerts by Status (Doughnut)
  - Alerts by Type (Bar)
  - Usage by Purpose (Bar)
- **Top Users**: Users ranked by usage
- **Recent Activity**: Timeline of recent alerts and usage
- **Alerts Management Table**: Full alerts table with:
  - Search functionality
  - Status filter
  - Action buttons (Approve, Reject, In Progress, Resolve)
- **Database Schema**: ER diagram display

### Key Functionality
```javascript
const handleAction = async () => {
  await api.post(`/admin/alerts/${selectedAlert.alert_id}/${action}`, {
    comment: comment || null,
  });
  fetchData(); // Refresh
};
```

**Alert Workflow**:
1. User reports → Status: "reported"
2. Admin can: Approve, Reject, or set In Progress
3. Approved/In Progress → Admin can Resolve

---

## 7. `Goals.jsx` - Goals Management

**Route**: `/goals`
**Access**: Protected (requires authentication)

### Features
- **Create Goal Form**: Goal type, target quantity, deadline
- **Goals List**: Grid of goal cards with:
  - Progress bars
  - Status badges
  - Delete functionality
- **Empty State**: Encourages creating first goal

### Key Code
```javascript
const handleSubmit = async (e) => {
  await api.post('/goals', {
    ...formData,
    user_id: user.user_id,
    target_quantity: parseFloat(formData.target_quantity),
  });
  fetchGoals();
};
```

**Goal Types**:
- `reduce_consumption`: Reduce water consumption
- `save_money`: Save money on water bills
- `conserve_water`: General water conservation

---

## Common Patterns

### 1. Loading States
```javascript
if (loading) {
  return (
    <Layout>
      <div className="flex flex-col justify-center items-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-12 h-12 border-4 border-water-200 border-t-water-600 rounded-full"
        />
        <p>Loading...</p>
      </div>
    </Layout>
  );
}
```

### 2. Error Handling
```javascript
try {
  const response = await api.get('/endpoint');
  setData(response.data);
} catch (error) {
  console.error('Error:', error);
  setError(error.response?.data?.error || 'Something went wrong');
}
```

### 3. Data Fetching
```javascript
useEffect(() => {
  fetchData();
}, []); // Run once on mount

const fetchData = async () => {
  try {
    const response = await api.get('/endpoint');
    setData(response.data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## Key Points

1. **Protected Routes**: All pages except Homepage, Login, Register require authentication
2. **Role-Based**: AdminPanel requires admin role
3. **Real-time**: Dashboard uses SSE for live meter data
4. **Charts**: Multiple pages use Chart.js for data visualization
5. **Forms**: Login, Register, Goals, Leak Report all have form handling
6. **Error Handling**: All pages handle errors gracefully
7. **Loading States**: All pages show loading indicators



