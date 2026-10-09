import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@testing-library/react': path.resolve(__dirname, '../../node_modules/@testing-library/react'),
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
    },
  },
});
