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

// Browser bridge for --serve mode (when Wails runtime is unavailable)
if (typeof window !== 'undefined' && !(window as any).go) {
  const call = async (method: string, args: unknown[]) => {
    const response = await fetch('/__bridge/call', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({method, args}),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = await response.json();
    return payload.result;
  };

  (window as any).go = {main: {App: new Proxy({}, {get: (_, prop) => (...args: unknown[]) => call(String(prop), args)})}};
}

if (typeof window !== 'undefined' && !(window as any).runtime) {
  const handlers = new Map<string, Set<(event: unknown) => void>>();
  const eventSource = new EventSource('/__bridge/events');
  eventSource.addEventListener('server-event', (evt: MessageEvent) => {
    const data = JSON.parse(evt.data);
    handlers.get('server-event')?.forEach((cb) => cb(data));
  });

  (window as any).runtime = {
    EventsOnMultiple: (eventName: string, callback: (event: unknown) => void) => {
      if (!handlers.has(eventName)) handlers.set(eventName, new Set());
      handlers.get(eventName)!.add(callback);
      return () => handlers.get(eventName)?.delete(callback);
    },
    EventsOff: (eventName: string) => handlers.delete(eventName),
    EventsOffAll: () => handlers.clear(),
  };
}

export {};
