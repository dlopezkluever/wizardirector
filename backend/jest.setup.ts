/**
 * Jest Setup File
 * Runs before all tests to configure the test environment
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '.env') });

// Set test environment variables if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Increase test timeout for integration tests
jest.setTimeout(30000); // 30 seconds

// Mock console methods to reduce noise in test output (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests:
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

