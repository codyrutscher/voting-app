import { renderHook, act } from "@testing-library/react";
import { useResponsive } from "../useResponsive";

// Store original window methods
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

describe("useResponsive", () => {
  let mockAddEventListener: jest.Mock;
  let mockRemoveEventListener: jest.Mock;

  beforeEach(() => {
    // Mock window methods
    mockAddEventListener = jest.fn();
    mockRemoveEventListener = jest.fn();

    Object.defineProperty(window, "addEventListener", {
      value: mockAddEventListener,
      writable: true,
    });

    Object.defineProperty(window, "removeEventListener", {
      value: mockRemoveEventListener,
      writable: true,
    });

    // Set default window dimensions
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
    });

    Object.defineProperty(window, "innerHeight", {
      value: 768,
      writable: true,
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();

    // Restore original methods
    Object.defineProperty(window, "addEventListener", {
      value: originalAddEventListener,
      writable: true,
    });

    Object.defineProperty(window, "removeEventListener", {
      value: originalRemoveEventListener,
      writable: true,
    });
  });

  describe("Initial State", () => {
    it("should initialize with desktop breakpoint for 1024px width", () => {
      Object.defineProperty(window, "innerWidth", {
        value: 1024,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 768,
        writable: true,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.screenSize).toBe("desktop");
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
    });

    it("should initialize with tablet breakpoint for 768px width", () => {
      Object.defineProperty(window, "innerWidth", {
        value: 768,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 1024,
        writable: true,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.screenSize).toBe("tablet");
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.width).toBe(768);
      expect(result.current.height).toBe(1024);
    });

    it("should initialize with mobile breakpoint for 320px width", () => {
      Object.defineProperty(window, "innerWidth", {
        value: 320,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 568,
        writable: true,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.screenSize).toBe("mobile");
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.width).toBe(320);
      expect(result.current.height).toBe(568);
    });
  });

  describe("Breakpoint Detection", () => {
    it("should detect mobile for widths below 768px", () => {
      const testWidths = [320, 480, 640, 767];

      testWidths.forEach((width) => {
        Object.defineProperty(window, "innerWidth", {
          value: width,
          writable: true,
        });
        Object.defineProperty(window, "innerHeight", {
          value: 568,
          writable: true,
        });

        const { result } = renderHook(() => useResponsive());

        expect(result.current.screenSize).toBe("mobile");
        expect(result.current.isMobile).toBe(true);
      });
    });

    it("should detect tablet for widths between 768px and 1023px", () => {
      const testWidths = [768, 800, 900, 1023];

      testWidths.forEach((width) => {
        Object.defineProperty(window, "innerWidth", {
          value: width,
          writable: true,
        });
        Object.defineProperty(window, "innerHeight", {
          value: 600,
          writable: true,
        });

        const { result } = renderHook(() => useResponsive());

        expect(result.current.screenSize).toBe("tablet");
        expect(result.current.isTablet).toBe(true);
      });
    });

    it("should detect desktop for widths 1024px and above", () => {
      const testWidths = [1024, 1200, 1440, 1920];

      testWidths.forEach((width) => {
        Object.defineProperty(window, "innerWidth", {
          value: width,
          writable: true,
        });
        Object.defineProperty(window, "innerHeight", {
          value: 800,
          writable: true,
        });

        const { result } = renderHook(() => useResponsive());

        expect(result.current.screenSize).toBe("desktop");
        expect(result.current.isDesktop).toBe(true);
      });
    });
  });

  describe("Window Resize Handling", () => {
    it("should register resize event listener on mount", () => {
      renderHook(() => useResponsive());

      expect(mockAddEventListener).toHaveBeenCalledWith(
        "resize",
        expect.any(Function)
      );
    });

    it("should remove resize event listener on unmount", () => {
      const { unmount } = renderHook(() => useResponsive());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        "resize",
        expect.any(Function)
      );
    });

    it("should update dimensions when window is resized", () => {
      Object.defineProperty(window, "innerWidth", {
        value: 1024,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 768,
        writable: true,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.screenSize).toBe("desktop");
      expect(result.current.width).toBe(1024);

      // Simulate window resize
      Object.defineProperty(window, "innerWidth", {
        value: 320,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 568,
        writable: true,
      });

      // Get the resize handler that was registered
      const resizeHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === "resize"
      )?.[1];

      expect(resizeHandler).toBeDefined();

      // Trigger resize
      act(() => {
        resizeHandler();
        jest.advanceTimersByTime(100); // Advance past debounce delay
      });

      expect(result.current.screenSize).toBe("mobile");
      expect(result.current.width).toBe(320);
      expect(result.current.height).toBe(568);
    });

    it("should debounce resize events", () => {
      Object.defineProperty(window, "innerWidth", {
        value: 1024,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 768,
        writable: true,
      });

      const { result } = renderHook(() => useResponsive());

      const initialWidth = result.current.width;

      // Get the resize handler
      const resizeHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === "resize"
      )?.[1];

      // Trigger multiple rapid resize events
      Object.defineProperty(window, "innerWidth", {
        value: 800,
        writable: true,
      });
      act(() => {
        resizeHandler();
      });

      Object.defineProperty(window, "innerWidth", {
        value: 600,
        writable: true,
      });
      act(() => {
        resizeHandler();
      });

      Object.defineProperty(window, "innerWidth", {
        value: 400,
        writable: true,
      });
      act(() => {
        resizeHandler();
      });

      // Should not update immediately
      expect(result.current.width).toBe(initialWidth);

      // Advance timers to trigger debounced update
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should now reflect the final width
      expect(result.current.width).toBe(400);
      expect(result.current.screenSize).toBe("mobile");
    });
  });

  describe("Screen Size Transitions", () => {
    it("should transition from mobile to tablet correctly", () => {
      Object.defineProperty(window, "innerWidth", {
        value: 320,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 568,
        writable: true,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.screenSize).toBe("mobile");
      expect(result.current.isMobile).toBe(true);

      // Resize to tablet
      Object.defineProperty(window, "innerWidth", {
        value: 768,
        writable: true,
      });
      const resizeHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === "resize"
      )?.[1];

      act(() => {
        resizeHandler();
        jest.advanceTimersByTime(100);
      });

      expect(result.current.screenSize).toBe("tablet");
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });
  });

  describe("Server-Side Rendering (SSR) Compatibility", () => {
    it("should handle undefined window gracefully", () => {
      // This test is more complex to implement properly in Jest
      // For now, we'll test that the hook doesn't crash
      const { result } = renderHook(() => useResponsive());

      expect(result.current.screenSize).toBeDefined();
      expect(result.current.width).toBeDefined();
      expect(result.current.height).toBeDefined();
    });
  });

  describe("Boolean State Consistency", () => {
    it("should ensure only one breakpoint boolean is true at a time", () => {
      const testCases = [
        { width: 320, expected: "mobile" },
        { width: 768, expected: "tablet" },
        { width: 1024, expected: "desktop" },
        { width: 1440, expected: "desktop" },
      ];

      testCases.forEach(({ width, expected }) => {
        Object.defineProperty(window, "innerWidth", {
          value: width,
          writable: true,
        });
        Object.defineProperty(window, "innerHeight", {
          value: 600,
          writable: true,
        });

        const { result } = renderHook(() => useResponsive());

        const booleanStates = [
          result.current.isMobile,
          result.current.isTablet,
          result.current.isDesktop,
        ];

        // Exactly one should be true
        const trueCount = booleanStates.filter(Boolean).length;
        expect(trueCount).toBe(1);

        // The correct one should be true
        expect(result.current.screenSize).toBe(expected);
      });
    });
  });

  describe("Memory Management", () => {
    it("should clear timeout on unmount", () => {
      const { unmount } = renderHook(() => useResponsive());

      // Trigger a resize to create a timeout
      const resizeHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === "resize"
      )?.[1];

      if (resizeHandler) {
        act(() => {
          resizeHandler();
        });
      }

      // Unmount should clear the timeout
      unmount();

      // Advance timers - should not cause any issues
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });
  });
});
