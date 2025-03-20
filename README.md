# Claude Library
A comprehensive TypeScript utility library providing robust tools for system monitoring, networking, DOM manipulation, server-side operations, benchmarking, LLM management, logging, text formatting, UI components, theming, and search algorithms.

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
- **Text Formatting** - Colorized text, JSON/CSV parsing, and text manipulation utilities
- **UI Components** - Modal dialogs, toast notifications, banners, and loading indicators
- **Theme Management** - Flexible theming system with light/dark modes and customization options
- **Search Algorithms** - Advanced text search with TF-IDF ranking, fuzzy matching, and knowledge base tools

## Installation
```bash
npm install claude-library
# or
yarn add claude-library
```

## Usage Examples
### System Monitoring
```typescript
import { BrowserPerformanceMonitor, PerformanceAnalyzer } from 'claude-library/monitoring';

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

### Text Formatting and Colorizing
```typescript
import { colorize, parseCSV, csvToJSON } from 'claude-library/formatting';

// Colorize console output
console.log(...colorize.browserSuccess('Operation successful!'));
console.log(...colorize.browserError('Something went wrong!'));

// Parse CSV data
const csvData = `id,name,age\n1,Alice,30\n2,Bob,25`;
const parsedData = parseCSV(csvData, { hasHeader: true });
console.log(parsedData);

// Convert CSV to JSON
const jsonData = csvToJSON(csvData);
console.log(jsonData);
```

### UI Components (Modals, Toasts)
```typescript
import { Modal, alert, confirm, toast } from 'claude-library/modals';

// Show a simple alert
await alert('Operation completed successfully!', 'Success');

// Show a confirmation dialog
const confirmed = await confirm('Are you sure you want to delete this item?');
if (confirmed) {
  // User clicked OK
  toast({
    message: 'Item deleted successfully',
    type: 'success',
    duration: 3000
  });
} else {
  // User clicked Cancel
}

// Create a custom modal
const modal = new Modal({
  title: 'Custom Form',
  content: `
    <form id="my-form">
      <div>
        <label for="name">Name:</label>
        <input type="text" id="name" name="name">
      </div>
      <div>
        <label for="email">Email:</label>
        <input type="email" id="email" name="email">
      </div>
    </form>
  `,
  actions: [
    {
      label: 'Cancel',
      callback: () => modal.close()
    },
    {
      label: 'Submit',
      primary: true,
      callback: () => {
        const form = document.getElementById('my-form') as HTMLFormElement;
        const formData = new FormData(form);
        console.log(Object.fromEntries(formData));
        modal.close();
      }
    }
  ]
});

modal.open();
```

### Theme Management
```typescript
import { createThemeManager, defaultLightTheme, defaultDarkTheme } from 'claude-library/themes';

// Create a theme manager with default themes
const themeManager = createThemeManager({
  defaultTheme: 'system', // 'light', 'dark', or 'system'
  storageKey: 'my-app-theme'
});

// Create a custom theme
themeManager.registerTheme({
  id: 'custom-blue',
  name: 'Custom Blue',
  isDark: false,
  colors: {
    ...defaultLightTheme.colors,
    primary: '#1976d2',
    secondary: '#42a5f5'
  },
  fonts: defaultLightTheme.fonts,
  spacing: defaultLightTheme.spacing,
  borders: defaultLightTheme.borders,
  breakpoints: defaultLightTheme.breakpoints,
  animation: defaultLightTheme.animation,
  shadows: defaultLightTheme.shadows
});

// Apply a theme
themeManager.applyTheme('custom-blue');

// Toggle between light and dark mode
document.getElementById('theme-toggle').addEventListener('click', () => {
  themeManager.toggleDarkMode();
});

// Listen for theme changes
themeManager.addThemeChangeListener((theme) => {
  console.log(`Theme changed to: ${theme.name}`);
});
```

### Search Algorithms
```typescript
import { SearchIndex, KnowledgeBaseFinder } from 'claude-library/search';

// Create and populate a search index
const searchIndex = new SearchIndex({
  fieldWeights: {
    title: 3.0,
    content: 1.0,
    tags: 2.0
  }
});

searchIndex.addDocuments([
  {
    id: '1',
    title: 'Setting up a MacBook for Development',
    content: 'This guide covers how to set up a new MacBook for software development...',
    tags: ['macbook', 'setup', 'development']
  },
  {
    id: '2',
    title: 'Troubleshooting Windows Network Issues',
    content: 'Common Windows networking problems and how to fix them...',
    tags: ['windows', 'network', 'troubleshooting']
  }
]);

// Search for documents
const results = searchIndex.search('macbook development setup', { limit: 5 });
console.log(results);

// Process user notes to find matching knowledge base articles
const knowledgeBase = new KnowledgeBaseFinder({
  documents: searchIndex.getAllDocuments(),
  categoryWeights: {
    hardware: 1.2,
    software: 1.0
  }
});

// Find matches based on user notes
const matches = knowledgeBase.findMatchesForUserNotes(
  "Customer's MacBook won't connect to WiFi after recent OS update"
);

console.log(matches.processedInfo); // Extracted categories, tags, and key terms
console.log(matches.results); // Ranked matching documents
```

## API Documentation
### Formatting
Text formatting and colorizing utilities:

- `colorize` - Utility for colorizing text in terminal and browser console
- `parseJSON` - Type-safe JSON parsing with error handling
- `parseCSV` - Parse CSV data with various options
- `csvToJSON` - Convert CSV to JSON objects
- `jsonToCSV` - Convert JSON objects to CSV
- `formatFileSize` - Format byte size to human-readable string
- `formatDate` - Format dates with custom patterns
- `truncateText` - Truncate text with ellipsis
- `toTitleCase` - Convert text to title case

### Modals and UI
UI components for interactive interfaces:

- `Modal` - Custom modal dialog component
- `alert` - Show an alert dialog
- `confirm` - Show a confirmation dialog
- `prompt` - Show a prompt dialog for user input
- `toast` - Show toast notifications
- `banner` - Show banner notifications
- `showLoading` - Show a loading indicator

### Themes
Theme management system:

- `ThemeManager` - Manage multiple themes with CSS variables
- `createThemeManager` - Create a theme manager with defaults
- `defaultLightTheme` - Standard light theme
- `defaultDarkTheme` - Standard dark theme
- `generateThemeFromColor` - Generate a theme from a base color
- `themePresets` - Pre-defined theme variants

### Search
Text search and knowledge base matching:

- `SearchIndex` - Fast text search with TF-IDF ranking
- `KnowledgeBaseFinder` - Find matches in knowledge base articles
- `tokenizeText` - Split text into meaningful tokens
- `levenshteinDistance` - Calculate string edit distance
- `stringSimilarity` - Calculate similarity between strings
- `findBestMatch` - Find best fuzzy match in a list
- `findAutocompleteSuggestions` - Generate autocomplete suggestions
- `filterAndRankDocuments` - Filter and rank documents by relevance

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
ISC License

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.