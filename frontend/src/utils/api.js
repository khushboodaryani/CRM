// src/utils/api.js

import axios from 'axios';
import { getDeviceId } from './device';
// With direct console usage:
const logger = console;
const apiUrl = process.env.REACT_APP_API_URL;

const api = axios.create({
    baseURL: apiUrl
});

let isLoggingOut = false;

// Function to handle logout
export const handleLogoutApi = async (message, force = false) => {
    if (isLoggingOut) return; // Prevent multiple logouts
    isLoggingOut = true;

    logger.info('Handling logout:', { message, force });

    try {
        const token = localStorage.getItem('token');
        if (token && !force) {
            await api.post('/logout', null, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-device-id': getDeviceId()
                }
            });
        }
    } catch (error) {
        logger.error('Error during logout:', error);
    } finally {
        const deviceId = getDeviceId(); // Save device ID before clearing
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('deviceId', deviceId); // Restore device ID
        
        if (message) {
            alert(message);
        }
        window.location.href = '/login';
        isLoggingOut = false;
    }
};

// Function to check session status
const checkSession = async () => {
    const token = localStorage.getItem('token');
    const currentPath = window.location.pathname;
    
    // Don't check session on login page or if logging out or no token
    if (!token || isLoggingOut || currentPath === '/login') return;
    
    try {
        await api.get('/check-session', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-device-id': getDeviceId()
            }
        });
    } catch (error) {
        // Only force logout on 401 unauthorized
        if (error.response?.status === 401) {
            const forceLogout = error.response?.data?.forceLogout;
            const message = error.response?.data?.message;
            handleLogoutApi(message, forceLogout);
        }
        // Ignore connection errors
        if (!error.response) {
            console.warn('Session check failed - server unreachable');
        }
    }
};

// Debounce the session check to prevent rapid-fire API calls
let sessionCheckTimeout;
const debouncedCheckSession = () => {
    if (sessionCheckTimeout) {
        clearTimeout(sessionCheckTimeout);
    }
    sessionCheckTimeout = setTimeout(checkSession, 1000); // 1 second delay
};

// Add device ID and token to all requests
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['x-device-id'] = getDeviceId();
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    response => response,
    async error => {
        logger.error('API Error:', error.response?.data);

        if (error.response?.status === 401) {
            const forceLogout = error.response?.data?.forceLogout;
            const message = error.response?.data?.message;
            
            if (forceLogout) {
                // Use the handleLogoutApi function to ensure proper logout
                handleLogoutApi(message, true);
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
);

// Check session status at a reasonable interval (60 seconds)
const sessionCheckInterval = setInterval(checkSession, 60000);

// Check session on visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        debouncedCheckSession();
    }
});

// Check session on window focus
window.addEventListener('focus', debouncedCheckSession);

// Check session on network reconnection
window.addEventListener('online', debouncedCheckSession);

// Cleanup intervals when page unloads
window.addEventListener('beforeunload', () => {
    clearInterval(sessionCheckInterval);
    const token = localStorage.getItem('token');
    if (token && !isLoggingOut) {
        // Use navigator.sendBeacon for reliable cleanup during page unload
        const apiUrl = process.env.REACT_APP_API_URL ;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'x-device-id': getDeviceId()
        };
        const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
        navigator.sendBeacon(`${apiUrl}/logout`, blob);
    }
});

// Export the api instance and the apiUrl for use in other components
export { apiUrl };
export default api;