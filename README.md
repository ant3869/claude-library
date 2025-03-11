# Claude Utility Library
A comprehensive TypeScript utility library providing robust tools for system monitoring, networking, DOM manipulation, server-side operations, benchmarking, LLM management, and logging.

## Features
- **System Monitoring** - Track CPU, memory, GPU, and network performance in browser environments
- **Networking** - Robust fetch operations with retries, cancellation, and debouncing
- **Browser & DOM Utilities** - Type-safe DOM manipulation, cookie management, and browser detection
- **Math & Number Operations** - Statistical functions, number formatting, and mathematical operations
- **Async Utilities** - Tools for working with promises, including debouncing, throttling, and concurrency control
- **Security & Encryption** - Cryptographic operations for secure data handling
- **Error Handling** - Comprehensive error management and logging
- **Backend Utilities** - Express-like server utilities, CRUD operations, and database helpers
- **Benchmarking** - System performance measurement tools
- **LLM Management** - Clients for working with OpenAI and Anthropic APIs
- **Logging** - Extensive logging system with multiple transports and formatting options

## Installation
```bash
npm install claude-utility-library
# or
yarn add claude-utility-library
```

## Usage Examples
### System Monitoring
```typescript
import { BrowserPerformanceMonitor, PerformanceAnalyzer } from 'claude-utility-library/monitoring';

// Create a performance monitor
const monitor = new BrowserPerformanceMonitor({
  updateIntervalMs: 1000,
  maxDataPoints: 60,
  onUpdate: (metrics) => console.log('New metrics:', metrics)
});

// Start monitoring
monitor.start();

// Generate a performance report
const analyzer = new PerformanceAnalyzer();
const report = analyzer.generateReport(monitor.getMetrics());
console.log(report);

// Stop monitoring when done
monitor.stop();
```

### Networking
```typescript
import { fetchWithRetry, cancellableFetch, debouncedFetch } from 'claude-utility-library/networking';

// Fetch with automatic retry
const data = await fetchWithRetry('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
}, 3, 1000);

// Cancellable fetch
const { promise, cancel } = cancellableFetch('https://api.example.com/data');
// Later if needed:
cancel();

// Debounced fetch to prevent API spam
const debouncedFetchFn = debouncedFetch(fetch, 300);
const response = await debouncedFetchFn('https://api.example.com/search?q=term');
```

### Browser & DOM Utilities
```typescript
import { 
  getElementById, 
  addEventListener, 
  createElement, 
  isInViewport,
  cookie
} from 'claude-utility-library/utilities';

// Type-safe getElementById
const button = getElementById<HTMLButtonElement>('submit-button');

// Easy event handling with automatic cleanup
const removeListener = addEventListener(window, 'resize', () => {
  console.log('Window resized');
});

// Create element with attributes
const div = createElement('div', { 
  class: 'container', 
  'data-id': '123' 
}, [
  createElement('h1', {}, ['Hello World']),
  createElement('p', {}, ['Content goes here'])
]);

// Check if element is in viewport
if (isInViewport(button)) {
  console.log('Button is visible');
}

// Cookie management
cookie.set('theme', 'dark', { maxAge: 86400, path: '/' });
const theme = cookie.get('theme');
```

### LLM Integration
```typescript
import { 
  createLLMClient, 
  ChatContext, 
  ChatManager 
} from 'claude-utility-library/llm';

// Create a client for OpenAI
const client = createLLMClient({
  modelId: 'gpt-4',
  provider: 'openai',
  apiKey: 'your-api-key',
  maxTokens: 1000
});

// Create a chat manager
const context = new ChatContext();
const chatManager = new ChatManager(client, context, {
  modelId: 'gpt-4',
  provider: 'openai',
  apiKey: 'your-api-key'
});

// Send a message with streaming
const response = await chatManager.sendMessage('Hello, can you help me with something?', {
  streamingCallback: (event) => {
    if (event.type === 'text') {
      console.log('Received:', event.text);
    }
  }
});
```

### Logging
```typescript
import { 
  createLogger, 
  ConsoleTransport, 
  LocalStorageTransport, 
  LogLevel 
} from 'claude-utility-library/logging';

// Create a logger with multiple transports
const logger = createLogger({
  transports: [
    new ConsoleTransport(),
    new LocalStorageTransport('app_logs', 100)
  ],
  minLevel: LogLevel.INFO,
  defaultTags: ['app']
});

// Log at different levels
logger.info('Application started', { version: '1.0.0' });
logger.warn('Resource usage high', { cpuUsage: '85%' });
logger.error('Operation failed', { operation: 'data-sync' });

// Time an operation
logger.time('database-query', () => {
  // Do something expensive
  return result;
});

// Create a child logger for a component
const authLogger = logger.child({
  tags: ['auth'],
  contextProvider: () => ({ userId: getCurrentUserId() })
});
```

## API Documentation
### Monitoring
The monitoring module provides tools for tracking system performance:

- `BrowserPerformanceMonitor` - Collects performance metrics in browser environments
- `PerformanceAnalyzer` - Analyzes performance data and generates reports
- `NodeSystemMonitor` - System monitoring for Node.js environments
- `createMonitoringDashboard` - Creates a visual performance dashboard

### Networking
Utilities for network operations:

- `fetchJson` - Type-safe JSON fetching with error handling
- `cancellableFetch` - Fetch requests that can be cancelled
- `fetchWithRetry` - Automatic retry logic for failed requests
- `debouncedFetch` - Debounced fetch to prevent API spam
- `serializeFormData` - Form data serialization
- `parseQueryParams` - URL query parameter parsing
- `createUrlWithParams` - URL creation with query parameters

### Utilities
General utility functions:

- DOM manipulation utilities (getElementById, createElement, etc.)
- Browser detection (detectBrowser, detectDeviceType)
- Math operations (clamp, randomInt, percentage, etc.)
- Statistical functions (average, median, variance, etc.)
- Async utilities (delay, timeout, limitConcurrency, etc.)
- Security functions (generateSecureToken, sha256, encrypt/decrypt)

### Backend
Server-side utilities:

- `ServerUtils` - Express-like server utilities
- `DatabaseUtils` - Database query and connection helpers
- `JobUtils` - Background job scheduling
- `AuthUtils` - Authentication and security utilities
- API integration (ApiClient, GraphQLClient, OAuthClient)

### Benchmarking
Performance measurement tools:

- `CpuBenchmark` - CPU performance testing
- `GpuBenchmark` - GPU performance testing
- `MemoryBenchmark` - Memory performance testing
- `BenchmarkSuite` - Complete benchmarking suite

### LLM (Large Language Models)
Tools for working with AI language models:

- OpenAI and Anthropic API clients
- Chat context management
- Streaming support
- Performance tracking
- Training data utilities

### Logging
Comprehensive logging system:

- Multiple transport types (Console, LocalStorage, HTTP, IndexedDB)
- Log levels and filtering
- Context and tagging
- Timing operations
- Child loggers for components

## Browser Compatibility
This library is compatible with modern browsers (Chrome, Firefox, Safari, Edge) and Node.js environments.

## TypeScript Support
The library is written in TypeScript and provides comprehensive type definitions for all functionality.

## License
MIT License

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.