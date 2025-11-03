// Browser polyfills for Node.js process
// This ensures process is available in browser environment

// Create minimal process object if it doesn't exist
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = {
    env: {},
    cwd: () => '/',
    platform: 'win32',
    browser: true
  };
}

export {};