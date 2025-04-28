import React from 'react';
import { createRoot } from 'react-dom/client';        
import WorkoutPlayer from './WorkoutPlayer';
import './index.css';

// Log environment details
console.log('React version:', React.version);
console.log('NODE_ENV:', process.env.NODE_ENV);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);                   

// Add error boundary
try {
  root.render(
    <React.StrictMode>
      <WorkoutPlayer />
    </React.StrictMode>
  );
  console.log('[index] React Root render() called');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to load application. Check console for details.</div>';
}
