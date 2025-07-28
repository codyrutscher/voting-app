import { useState, useEffect, useCallback } from 'react';
import { UseResponsiveReturn } from '../types/hooks';

// Breakpoint definitions (matching Tailwind CSS defaults)
const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * Custom hook for responsive design and breakpoint detection
 * Provides current screen size information and breakpoint states
 * 
 * @returns Object containing responsive state and screen information
 */
export function useResponsive(): UseResponsiveReturn {
  // Initialize state with default values (mobile-first)
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  
  // Calculate screen size based on width
  const calculateScreenSize = useCallback((windowWidth: number): 'mobile' | 'tablet' | 'desktop' => {
    if (windowWidth >= BREAKPOINTS.desktop) {
      return 'desktop';
    } else if (windowWidth >= BREAKPOINTS.tablet) {
      return 'tablet';
    } else {
      return 'mobile';
    }
  }, []);
  
  // Update dimensions and screen size
  const updateDimensions = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const newScreenSize = calculateScreenSize(windowWidth);
    
    setWidth(windowWidth);
    setHeight(windowHeight);
    setScreenSize(newScreenSize);
  }, [calculateScreenSize]);
  
  // Initialize dimensions on mount
  useEffect(() => {
    updateDimensions();
  }, [updateDimensions]);
  
  // Listen for window resize events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Debounce resize events to improve performance
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateDimensions]);
  
  // Derived boolean states for convenience
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isDesktop = screenSize === 'desktop';
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    screenSize,
    width,
    height,
  };
}