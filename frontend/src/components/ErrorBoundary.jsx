import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-canvas px-4">
          <div className="max-w-md w-full bg-surface border border-line rounded-xl p-6 shadow-sm text-center space-y-4">
            <h1 className="font-display text-xl font-bold text-ink">Something went wrong</h1>
            <p className="text-sm text-ink-muted">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-ink text-white text-sm font-medium px-4 py-2"
            >
              Reload console
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
