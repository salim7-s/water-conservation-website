# Frontend Components - Detailed Explanation

## 1. `frontend/src/components/Layout.jsx` - Navigation Layout

**Purpose**: Provides consistent navigation and layout for authenticated pages.

### Code Breakdown

```javascript
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
```

**Hooks**:
- `useNavigate`: Programmatic navigation
- `useLocation`: Current route location
- `getUser`: Gets current user from localStorage

**Functions**:
- `handleLogout`: Clears auth and redirects to login
- `isActive`: Checks if route is currently active

### Navigation Bar

```javascript
<nav className="bg-white/95 backdrop-blur-md shadow-xl border-b border-water-200/50 sticky top-0 z-50">
  <div className="flex justify-between h-18 items-center">
    {/* Logo */}
    <Link to="/" className="flex items-center space-x-2">
      <motion.div whileHover={{ scale: 1.1, rotate: 5 }}>
        💧
      </motion.div>
      <span className="text-2xl font-bold bg-gradient-to-r from-water-600 to-blue-600 bg-clip-text text-transparent">
        Water Tracker
      </span>
    </Link>

    {/* Navigation Links */}
    <div className="flex space-x-1">
      <Link
        to="/dashboard"
        className={`px-4 py-2 rounded-lg ${
          isActive('/dashboard')
            ? 'bg-gradient-to-r from-water-500 to-water-600 text-white shadow-lg'
            : 'text-gray-600 hover:text-water-600 hover:bg-water-50'
        }`}
      >
        Dashboard
      </Link>
      {/* More links... */}
    </div>

    {/* User Info & Logout */}
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-water-500 to-blue-500">
          {user.firstname?.[0]}{user.lastname?.[0]}
        </div>
        <span>{user.firstname} {user.lastname}</span>
      </div>
      <button onClick={handleLogout} className="btn-secondary">
        Logout
      </button>
    </div>
  </div>
</nav>
```

**Features**:
- **Sticky Navigation**: Stays at top when scrolling
- **Active State**: Highlights current route
- **User Avatar**: Shows user initials in gradient circle
- **Responsive**: Hides links on small screens
- **Animations**: Logo has hover animations

### Conditional Navigation

```javascript
{isAdmin() ? (
  <Link to="/admin">Admin Panel</Link>
) : (
  <>
    <Link to="/user">My Panel</Link>
    <Link to="/goals">Goals</Link>
  </>
)}
```

**Logic**:
- Admins see "Admin Panel" link
- Regular users see "My Panel" and "Goals" links

---

## 2. `frontend/src/components/ProtectedRoute.jsx` - Route Guard

**Purpose**: Protects routes that require authentication.

### Code Breakdown

```javascript
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const authenticated = isAuthenticated();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
```

**How it works**:
1. **Check Authentication**: Verifies user is logged in
2. **Check Role**: If `requireAdmin` is true, verifies admin role
3. **Redirect**: Redirects to login or dashboard if not authorized
4. **Render**: Returns children if authorized

**Usage**:
```javascript
// Regular protected route
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Admin-only route
<ProtectedRoute requireAdmin>
  <AdminPanel />
</ProtectedRoute>
```

**Benefits**:
- Centralized authorization logic
- Reusable across all protected routes
- Prevents unauthorized access
- Clean component structure

---

## Key Points

1. **Layout**: Provides consistent navigation and structure
2. **ProtectedRoute**: Guards routes based on authentication/role
3. **Conditional Rendering**: Shows different links based on user role
4. **User Experience**: Smooth navigation with active states
5. **Security**: Prevents unauthorized route access



