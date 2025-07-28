// Core data types
export * from './contestant';
export * from './voting';
export * from './api';
export * from './errors';

// Component and hook types
export * from './components';
export * from './hooks';

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Common callback types
export type VoidCallback = () => void;
export type AsyncVoidCallback = () => Promise<void>;
export type ErrorCallback = (error: Error) => void;