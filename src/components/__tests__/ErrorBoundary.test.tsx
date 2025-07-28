import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary, useErrorBoundary } from '../ErrorBoundary';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = true, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

// Test component that uses the error boundary hook
const ComponentWithHook: React.FC<{ triggerError?: boolean }> = ({ triggerError }) => {
  const { showBoundary } = useErrorBoundary();
  
  React.useEffect(() => {
    if (triggerError) {
      showBoundary(new Error('Hook triggered error'));
    }
  }, [triggerError, showBoundary]);
  
  return <div>Component with hook</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Catching', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    });

    it('should render children normally when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="Custom error message" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error message'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state when retry button is clicked', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click retry button
      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

      // Wait for the timeout to complete
      await waitFor(() => {
        // Re-render with a component that doesn't throw
        rerender(
          <ErrorBoundary>
            <ThrowError shouldThrow={false} />
          </ErrorBoundary>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
      });
    });

    it('should have reset button that can be clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      const resetButton = screen.getByRole('button', { name: 'Reset' });
      
      // Should not throw when clicked
      expect(() => {
        fireEvent.click(resetButton);
      }).not.toThrow();
    });
  });

  describe('Custom Fallback', () => {
    const CustomFallback: React.FC<unknown> = ({ error, retry }) => (
      <div>
        <h1>Custom Error UI</h1>
        <p>Error: {error.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    it('should render custom fallback component when provided', () => {
      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError message="Custom error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.getByText('Error: Custom error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Custom Retry' })).toBeInTheDocument();
    });
  });

  describe('Development Mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError message="Development error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
    });

    it('should not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError message="Production error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowError);

      render(<WrappedComponent />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should pass through props to wrapped component', () => {
      const TestComponent: React.FC<{ message: string }> = ({ message }) => (
        <div>{message}</div>
      );
      
      const WrappedComponent = withErrorBoundary(TestComponent);

      render(<WrappedComponent message="Test message" shouldThrow={false} />);

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should set correct display name', () => {
      const TestComponent: React.FC = () => <div>Test</div>;
      TestComponent.displayName = 'TestComponent';
      
      const WrappedComponent = withErrorBoundary(TestComponent);

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
    });
  });

  describe('useErrorBoundary Hook', () => {
    it('should trigger error boundary when showBoundary is called', () => {
      render(
        <ErrorBoundary>
          <ComponentWithHook triggerError={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not trigger error boundary when showBoundary is not called', () => {
      render(
        <ErrorBoundary>
          <ComponentWithHook triggerError={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component with hook')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle errors in onError callback gracefully', () => {
      const faultyOnError = jest.fn(() => {
        throw new Error('Error in error handler');
      });

      render(
        <ErrorBoundary onError={faultyOnError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(faultyOnError).toHaveBeenCalled();
      // Should not crash the app
    });

    it('should cleanup timeout on unmount', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Click retry to create a timeout
      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

      // Unmount should not cause any issues
      unmount();

      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have focusable buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: 'Try Again' });
      const resetButton = screen.getByRole('button', { name: 'Reset' });

      // Test keyboard navigation
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);

      resetButton.focus();
      expect(document.activeElement).toBe(resetButton);

      // Test that buttons are focusable (don't have tabindex -1)
      expect(retryButton).not.toHaveAttribute('tabindex', '-1');
      expect(resetButton).not.toHaveAttribute('tabindex', '-1');
    });
  });
});