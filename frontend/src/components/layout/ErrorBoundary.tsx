import { Component, type ReactNode } from 'react';
import { ErrorState, Glass } from '../ui';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('UI error', error);
  }
  render() {
    if (this.state.error) {
      const chunk = /dynamically imported module|Loading chunk/i.test(this.state.error.message);
      return (
        <div className="mx-auto max-w-lg pt-10">
          <Glass>
            <ErrorState
              title={chunk ? 'Part of the app could not load' : 'This screen hit a problem'}
              error={chunk ? new Error('You may be offline and this page has not been cached yet.') : this.state.error}
              onRetry={() => (chunk ? location.reload() : this.setState({ error: null }))}
            />
          </Glass>
        </div>
      );
    }
    return this.props.children;
  }
}
