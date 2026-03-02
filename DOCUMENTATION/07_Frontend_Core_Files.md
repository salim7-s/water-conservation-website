# Frontend Core Files - Detailed Explanation

## 1. `frontend/src/main.jsx` - Application Entry Point

**Purpose**: Initializes React application and sets up routing.

### Code Breakdown

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
```

**Imports**:
- `React`: React library
- `ReactDOM`: For rendering React components
- `BrowserRouter`: Enables client-side routing
- `App`: Main application component
- `index.css`: Global styles

```javascript
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

**What it does**:
1. **Creates Root**: Uses React 18's new root API
2. **StrictMode**: Enables additional checks in development
3. **BrowserRouter**: Enables routing with clean URLs (no #)
4. **Renders App**: Mounts App component to DOM

**BrowserRouter**:
- Uses HTML5 history API
- Enables routes like `/dashboard` instead of `/#/dashboard`
- Handles browser back/forward buttons

---

## 2. `frontend/src/App.jsx` - Main Application Component

**Purpose**: Defines all application routes.

### Code Breakdown

```javascript
import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './utils/auth';
import ProtectedRoute from './components/ProtectedRoute';
```

**Imports**:
- `Routes, Route`: Define route paths
- `Navigate`: Programmatic navigation
- `isAuthenticated`: Checks if user is logged in
- `ProtectedRoute`: Wrapper for protected pages

```javascript
function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      
      <Route
        path="/login"
        element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

### Route Types

1. **Public Routes** (`/`, `/login`, `/register`):
   - Accessible to everyone
   - Login/Register redirect if already authenticated

2. **Protected Routes** (`/dashboard`, `/user`, `/goals`):
   - Requires authentication
   - Wrapped in `<ProtectedRoute>`
   - Redirects to login if not authenticated

3. **Admin Routes** (`/admin`):
   - Requires authentication + admin role
   - Uses `<ProtectedRoute requireAdmin>`
   - Redirects to dashboard if not admin

### Route Structure

```
/                    → Homepage (public)
/login               → Login page (redirects if authenticated)
/register            → Registration page (redirects if authenticated)
/dashboard           → User dashboard (protected)
/user                → User panel (protected)
/goals               → Goals management (protected)
/admin               → Admin panel (protected, admin only)
```

---

## 3. `frontend/src/index.css` - Global Styles

**Purpose**: Defines global CSS and utility classes.

### Code Breakdown

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Tailwind Directives**:
- `@tailwind base`: Tailwind's base styles
- `@tailwind components`: Component classes
- `@tailwind utilities`: Utility classes

```css
@layer base {
  body {
    @apply bg-gradient-to-br from-water-50 to-water-100 min-h-screen;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
}
```

**Base Styles**:
- Gradient background
- Full height
- Modern font stack

```css
@layer components {
  .btn-primary {
    @apply bg-gradient-to-r from-water-600 to-water-700 
           hover:from-water-700 hover:to-water-800 
           text-white font-semibold py-2.5 px-6 rounded-xl 
           transition-all duration-300 
           shadow-lg hover:shadow-xl 
           transform hover:scale-105 active:scale-95;
  }
  
  .card {
    @apply bg-white rounded-2xl shadow-xl p-6 border border-gray-100 
           hover:shadow-2xl transition-all duration-300 backdrop-blur-sm;
  }
  
  .input-field {
    @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
           focus:ring-4 focus:ring-water-300 focus:border-water-500 
           outline-none transition-all duration-300 bg-white;
  }
}
```

**Component Classes**:
- **`.btn-primary`**: Primary button with gradient, hover effects, animations
- **`.card`**: Card container with shadow, rounded corners, hover effects
- **`.input-field`**: Form input with focus states, transitions

**Benefits**:
- Consistent styling across app
- Reusable classes
- Easy to maintain
- Modern design system

---

## Key Points

1. **Entry Point**: `main.jsx` initializes React app
2. **Routing**: `App.jsx` defines all routes
3. **Styling**: `index.css` provides global styles and utilities
4. **Protection**: Routes are protected based on authentication/role
5. **Modern Design**: Uses Tailwind CSS with custom components



