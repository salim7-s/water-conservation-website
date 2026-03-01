import { useEffect, useState, useRef } from 'react';
import { getToken } from '../utils/auth';

/**
 * Custom hook for Server-Sent Events
 * @param {string} url - SSE endpoint URL
 */
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

    // Create EventSource with token in query param (since SSE doesn't support custom headers)
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

