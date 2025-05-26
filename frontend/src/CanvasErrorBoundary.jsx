// src/components/CanvasErrorBoundary.jsx
import React from 'react';

export default class CanvasErrorBoundary extends React.Component {
  state = { error: null, info: null };

  componentDidCatch(error, info) {
    console.error('Canvas render error:', error);
    console.error('Component stack:', info.componentStack);
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      return <div style={{ color: 'red' }}>
        <strong>Canvas Error:</strong> check console for component stack.
      </div>;
    }
    return this.props.children;
  }
}
