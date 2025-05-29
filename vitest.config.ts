import { defineConfig, type UserConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// vite-tsconfig-paths needs to be imported dynamically
// import tsconfigPaths from 'vite-tsconfig-paths'; 

export default defineConfig(async (): Promise<UserConfig> => {
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');

  return {
    plugins: [
      react(),
      tsconfigPaths(), // Initialize and add the plugin
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/frontend/unit/setupTests.ts', // This might need to be a more general setup file if integration tests need different setup
      css: true,
      include: ['tests/frontend/**/*.test.{ts,tsx}'], // Updated to include all .test.ts/tsx files in tests/frontend
      // reporters: ['verbose', 'html'],
      // coverage: {
      //   reporter: ['text', 'json', 'html'],
      //   provider: 'c8', // or 'istanbul'
      // },
    },
  };
});
