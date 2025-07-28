import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock window.addEventListener and removeEventListener
const addEventListenerMock = jest.fn()
const removeEventListenerMock = jest.fn()

Object.defineProperty(window, 'addEventListener', {
  value: addEventListenerMock,
  writable: true,
})

Object.defineProperty(window, 'removeEventListener', {
  value: removeEventListenerMock,
  writable: true,
})

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  addEventListenerMock.mockClear()
  removeEventListenerMock.mockClear()
})