# Frontend Overview - Architecture & Structure

## Frontend Architecture

The frontend is a React Single Page Application (SPA) that provides:
- User interface for water tracking
- Real-time data visualization
- Admin dashboard
- User management features

---

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Chart.js + react-chartjs-2
- **HTTP Client**: Axios
- **Real-time**: Server-Sent Events (SSE)

---

## Project Structure

```
frontend/
├── src/
│   ├── main.jsx              # Application entry point
│   ├── App.jsx                # Main app component (routes)
│   ├── index.css              # Global styles
│   ├── pages/
│   │   ├── Homepage.jsx       # Landing page
│   │   ├── Login.jsx          # Login page
│   │   ├── Register.jsx       # Registration page
│   │   ├── Dashboard.jsx       # User dashboard
│   │   ├── UserPanel.jsx      # User panel
│   │   ├── AdminPanel.jsx     # Admin dashboard
│   │   └── Goals.jsx          # Goals management
│   ├── components/
│   │   ├── Layout.jsx         # Navigation layout
│   │   └── ProtectedRoute.jsx # Route guard
│   ├── hooks/
│   │   └── useSSE.js          # SSE hook
│   └── utils/
│       ├── api.js             # API client
│       └── auth.js            # Auth utilities
├── index.html                 # HTML template
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
└── package.json               # Dependencies
```

---

## Key Concepts

### 1. Component-Based Architecture
- Each page is a React component
- Reusable components (Layout, ProtectedRoute)
- Props for data passing
- Hooks for state management

### 2. Client-Side Routing
- React Router handles navigation
- No page reloads
- URL-based routing
- Protected routes

### 3. State Management
- React hooks (useState, useEffect)
- Local component state
- localStorage for persistence
- No global state library (can add Redux if needed)

### 4. API Communication
- Axios for HTTP requests
- Automatic token injection
- Error handling
- Response interceptors

### 5. Real-time Updates
- Server-Sent Events (SSE)
- Custom hook (useSSE)
- Automatic reconnection
- Live data updates

---

## Component Hierarchy

```
App
├── Homepage (public)
├── Login (public)
├── Register (public)
└── Layout (authenticated)
    ├── Dashboard
    ├── UserPanel
    ├── Goals
    └── AdminPanel (admin only)
```

---

## Routing Flow

1. **User navigates** → React Router matches URL
2. **Route check** → Is route protected?
3. **Auth check** → Is user authenticated?
4. **Role check** → Does user have required role?
5. **Render component** → Display page
6. **Data fetch** → Load data from API
7. **Render UI** → Display data

---

## Styling System

### Tailwind CSS
- Utility-first CSS framework
- Responsive design
- Custom color palette (water theme)
- Component classes

### Custom Classes
- `.btn-primary`: Primary button
- `.btn-secondary`: Secondary button
- `.card`: Card container
- `.input-field`: Form input
- `.badge`: Status badge

### Design System
- **Colors**: Water-themed (blues, cyans)
- **Spacing**: Consistent padding/margins
- **Typography**: Modern font stack
- **Shadows**: Layered shadows for depth
- **Animations**: Smooth transitions

---

## Data Flow

### Fetching Data
```javascript
// Component mounts
useEffect(() => {
  fetchData();
}, []);

// Fetch from API
const fetchData = async () => {
  const response = await api.get('/endpoint');
  setData(response.data);
};
```

### Updating Data
```javascript
// User action
const handleSubmit = async (e) => {
  e.preventDefault();
  await api.post('/endpoint', formData);
  fetchData(); // Refresh
};
```

### Real-time Data
```javascript
// SSE hook
const { data, connected } = useSSE('/api/stream/meters');

// Use data
{connected && <MeterDisplay data={data} />}
```

---

## Authentication Flow

1. **User logs in** → POST `/api/auth/login`
2. **Receive token** → Store in localStorage
3. **Store user data** → Save to localStorage
4. **Redirect** → Navigate to dashboard
5. **API calls** → Token automatically added to headers
6. **Token expires** → Auto-redirect to login

---

## Error Handling

### API Errors
```javascript
try {
  const response = await api.get('/endpoint');
} catch (error) {
  if (error.response) {
    // Server responded with error
    setError(error.response.data.error);
  } else if (error.request) {
    // No response (network error)
    setError('Cannot connect to server');
  } else {
    // Other error
    setError(error.message);
  }
}
```

### Form Validation
- HTML5 validation
- Custom validation
- Error messages displayed
- Prevents invalid submissions

---

## Performance Optimizations

1. **Code Splitting**: Vite automatically splits code
2. **Lazy Loading**: Can add React.lazy for routes
3. **Memoization**: Can use useMemo/useCallback
4. **Image Optimization**: Vite optimizes images
5. **Tree Shaking**: Removes unused code

---

## Responsive Design

- **Mobile First**: Designed for mobile, enhanced for desktop
- **Breakpoints**: sm, md, lg, xl
- **Flexible Layouts**: Grid and flexbox
- **Touch Friendly**: Large buttons, easy navigation

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features
- CSS Grid and Flexbox
- Fetch API
- EventSource (for SSE)

---

## Build Process

### Development
```bash
npm run dev
```
- Fast HMR (Hot Module Replacement)
- Source maps
- Development server

### Production
```bash
npm run build
```
- Minified code
- Optimized assets
- Tree shaking
- Code splitting

---

## Key Files Explained

- **main.jsx**: Entry point, React initialization
- **App.jsx**: Route definitions
- **index.css**: Global styles, Tailwind
- **pages/**: All page components
- **components/**: Reusable components
- **hooks/**: Custom React hooks
- **utils/**: Helper functions

For detailed explanations, see:
- `07_Frontend_Core_Files.md` - Core files
- `08_Frontend_Components.md` - Components
- `09_Frontend_Pages.md` - All pages
- `10_Frontend_Utils_Hooks.md` - Utilities & hooks



