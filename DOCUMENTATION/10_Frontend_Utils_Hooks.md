# Frontend Utilities & Hooks - Detailed Explanation

## 1. `frontend/src/utils/api.js` - API Client

**Purpose**: Axios instance configured for API calls with authentication.

### Code Breakdown

```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Configuration**:
- Base URL from environment variable
- Default JSON content type
- Reusable axios instance

### Request Interceptor

```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**What it does**:
- Automatically adds JWT token to all requests
- Gets token from localStorage
- Adds `Authorization: Bearer <token>` header

**Benefits**:
- No need to manually add token to each request
- Centralized authentication logic
- Automatic token inclusion

### Response Interceptor

```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**What it does**:
- Handles 401 (Unauthorized) errors
- Clears authentication data
- Redirects to login page
- Rejects promise for other errors

**Benefits**:
- Automatic logout on token expiration
- Handles authentication errors globally
- Better user experience

### Usage Example

```javascript
import api from './utils/api';

// GET request
const response = await api.get('/water-usage');
const data = response.data;

// POST request
const response = await api.post('/alerts', {
  alert_type: 'leak',
  message: 'Water leak detected',
});

// Token is automatically added to headers
```

---

## 2. `frontend/src/utils/auth.js` - Authentication Utilities

**Purpose**: Helper functions for managing authentication state.

### Code Breakdown

```javascript
export const getToken = () => localStorage.getItem('token');

export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const isAdmin = () => {
  const user = getUser();
  return user?.role === 'admin';
};
```

### Functions

1. **`getToken()`**: Gets JWT token from localStorage
2. **`getUser()`**: Gets user object from localStorage (parsed JSON)
3. **`setAuth(token, user)`**: Saves token and user to localStorage
4. **`clearAuth()`**: Removes token and user from localStorage
5. **`isAuthenticated()`**: Checks if user is logged in
6. **`isAdmin()`**: Checks if user has admin role

### Usage Example

```javascript
import { setAuth, getUser, isAdmin } from './utils/auth';

// After login
setAuth(token, user);

// Check authentication
if (isAuthenticated()) {
  const user = getUser();
  console.log('Logged in as:', user.email);
}

// Check role
if (isAdmin()) {
  // Show admin features
}
```

---

## 3. `frontend/src/hooks/useSSE.js` - Server-Sent Events Hook

**Purpose**: Custom React hook for consuming SSE streams.

### Code Breakdown

```javascript
export function useSSE(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const fullUrl = `${apiUrl}${url}?token=${token}`;
    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setError('Connection error');
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [url]);

  return { data, error, connected };
}
```

### How it Works

1. **State Management**:
   - `data`: Latest SSE message data
   - `error`: Connection errors
   - `connected`: Connection status

2. **Connection Setup**:
   - Gets JWT token
   - Creates EventSource with token in query param
   - Sets up event handlers

3. **Event Handlers**:
   - `onopen`: Sets connected to true
   - `onmessage`: Parses and updates data
   - `onerror`: Handles connection errors

4. **Cleanup**:
   - Closes EventSource on unmount
   - Prevents memory leaks

### Usage Example

```javascript
import { useSSE } from '../hooks/useSSE';

function Dashboard() {
  const { data: meterData, connected } = useSSE('/api/stream/meters');

  return (
    <div>
      {connected ? (
        <div>Connected: {meterData?.meters.length} meters</div>
      ) : (
        <div>Connecting...</div>
      )}
    </div>
  );
}
```

**Benefits**:
- Reusable hook for SSE
- Automatic connection management
- Clean component code
- Handles errors gracefully

---

## Key Points

1. **API Client**: Centralized axios configuration with auth
2. **Auth Utils**: Simple functions for auth state management
3. **SSE Hook**: Custom hook for real-time data streaming
4. **Automatic**: Handles tokens, errors, cleanup automatically
5. **Reusable**: Can be used across all components



