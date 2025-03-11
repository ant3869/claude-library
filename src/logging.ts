// ===================================================
// ROBUST LOGGING SYSTEM
// ===================================================

/**
 * [Logging] Log level enum
 */
export enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5,
    OFF = 6
  }
  
  /**
   * [Logging] Log entry interface
   */
  export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    tags?: string[];
    source?: string;
  }
  
  /**
   * [Logging] Transport interface for log outputs
   */
  export interface LogTransport {
    log(entry: LogEntry): void;
  }
  
  /**
   * [Logging] Console transport implementation
   */
  export class ConsoleTransport implements LogTransport {
    private readonly colors: Record<LogLevel, string> = {
      [LogLevel.TRACE]: '#6C757D', // gray
      [LogLevel.DEBUG]: '#0dcaf0', // cyan
      [LogLevel.INFO]: '#0d6efd',  // blue
      [LogLevel.WARN]: '#ffc107',  // yellow
      [LogLevel.ERROR]: '#dc3545', // red
      [LogLevel.FATAL]: '#7F00FF', // purple
      [LogLevel.OFF]: '',
    };
  
    log(entry: LogEntry): void {
      const color = this.colors[entry.level];
      const levelName = LogLevel[entry.level].padEnd(5);
      const prefix = `[${entry.timestamp}] [${levelName}]`;
  
      // Basic output with color
      const style = `color: ${color}; font-weight: bold`;
      
      if (entry.context || entry.tags) {
        // If we have context or tags, use console group
        console.groupCollapsed(`%c${prefix} ${entry.message}`, style);
        
        if (entry.tags && entry.tags.length > 0) {
          console.log('%cTags:', 'font-weight: bold', entry.tags);
        }
        
        if (entry.context) {
          console.log('%cContext:', 'font-weight: bold', entry.context);
        }
        
        if (entry.source) {
          console.log('%cSource:', 'font-weight: bold', entry.source);
        }
        
        console.groupEnd();
      } else {
        // Simple log without grouping
        console.log(`%c${prefix} ${entry.message}`, style);
      }
    }
  }
  
  /**
   * [Logging] Local storage transport implementation
   */
  export class LocalStorageTransport implements LogTransport {
    private readonly key: string;
    private readonly maxEntries: number;
    
    constructor(key: string = 'app_logs', maxEntries: number = 100) {
      this.key = key;
      this.maxEntries = maxEntries;
    }
    
    log(entry: LogEntry): void {
      try {
        // Get existing logs
        const logsJson = localStorage.getItem(this.key) || '[]';
        const logs = JSON.parse(logsJson) as LogEntry[];
        
        // Add new entry and limit size
        logs.push(entry);
        if (logs.length > this.maxEntries) {
          logs.shift(); // Remove oldest entry
        }
        
        // Save back to storage
        localStorage.setItem(this.key, JSON.stringify(logs));
      } catch (error) {
        console.error('Failed to write to localStorage:', error);
      }
    }
    
    getLogs(): LogEntry[] {
      try {
        const logsJson = localStorage.getItem(this.key) || '[]';
        return JSON.parse(logsJson) as LogEntry[];
      } catch (error) {
        console.error('Failed to read from localStorage:', error);
        return [];
      }
    }
    
    clearLogs(): void {
      try {
        localStorage.removeItem(this.key);
      } catch (error) {
        console.error('Failed to clear localStorage logs:', error);
      }
    }
  }
  
  /**
   * [Logging] HTTP transport implementation for remote logging
   */
  export class HttpTransport implements LogTransport {
    private readonly endpoint: string;
    private readonly headers: Record<string, string>;
    private readonly batchSize: number;
    private readonly flushInterval: number;
    private queue: LogEntry[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    
    constructor(options: {
      endpoint: string;
      headers?: Record<string, string>;
      batchSize?: number;
      flushIntervalMs?: number;
    }) {
      this.endpoint = options.endpoint;
      this.headers = options.headers || {
        'Content-Type': 'application/json'
      };
      this.batchSize = options.batchSize || 10;
      this.flushInterval = options.flushIntervalMs || 5000;
      
      // Set up periodic flush
      this.setupFlushInterval();
    }
    
    log(entry: LogEntry): void {
      this.queue.push(entry);
      
      if (this.queue.length >= this.batchSize) {
        this.flush();
      }
    }
    
    private setupFlushInterval(): void {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      
      this.flushTimer = setInterval(() => {
        if (this.queue.length > 0) {
          this.flush();
        }
      }, this.flushInterval);
    }
    
    async flush(): Promise<void> {
      if (this.queue.length === 0) return;
      
      const entries = [...this.queue];
      this.queue = [];
      
      try {
        await fetch(this.endpoint, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(entries),
        });
      } catch (error) {
        console.error('Failed to send logs to remote endpoint:', error);
        // Put entries back in queue for retry
        this.queue = [...entries, ...this.queue];
      }
    }
    
    dispose(): void {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
      
      // Attempt one final flush
      if (this.queue.length > 0) {
        this.flush().catch(() => {
          // If final flush fails, log to console as a last resort
          console.warn('Failed to flush remaining logs during transport disposal');
        });
      }
    }
  }
  
  /**
   * [Logging] Database transport using IndexedDB
   */
  export class IndexedDBTransport implements LogTransport {
    private readonly dbName: string;
    private readonly storeName: string;
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void>;
    private queue: LogEntry[] = [];
    
    constructor(dbName: string = 'app_logs_db', storeName: string = 'logs') {
      this.dbName = dbName;
      this.storeName = storeName;
      this.initPromise = this.initDb();
    }
    
    private async initDb(): Promise<void> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1);
        
        request.onerror = (event) => {
          console.error('Failed to open IndexedDB:', event);
          reject(new Error('Failed to open IndexedDB'));
        };
        
        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          
          // Process queued logs
          if (this.queue.length > 0) {
            const queue = [...this.queue];
            this.queue = [];
            queue.forEach(entry => this.log(entry));
          }
          
          resolve();
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object store with timestamp as key path
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { 
              keyPath: 'id',
              autoIncrement: true
            });
          }
        };
      });
    }
    
    async log(entry: LogEntry): Promise<void> {
      // If DB is not ready, queue the log
      if (!this.db) {
        this.queue.push(entry);
        await this.initPromise;
        return;
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(this.storeName, 'readwrite');
          const store = transaction.objectStore(this.storeName);
          
          const request = store.add(entry);
          
          request.onsuccess = () => resolve();
          request.onerror = (event) => {
            console.error('Failed to add log to IndexedDB:', event);
            reject(new Error('Failed to add log to IndexedDB'));
          };
        } catch (error) {
          console.error('Error accessing IndexedDB:', error);
          reject(error);
        }
      });
    }
    
    async getLogs(limit: number = 100, offset: number = 0): Promise<LogEntry[]> {
      if (!this.db) {
        await this.initPromise;
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(this.storeName, 'readonly');
          const store = transaction.objectStore(this.storeName);
          
          const logs: LogEntry[] = [];
          let cursorIndex = 0;
          
          const request = store.openCursor();
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
            
            if (cursor) {
              if (cursorIndex >= offset && cursorIndex < offset + limit) {
                logs.push(cursor.value as LogEntry);
              }
              
              cursorIndex++;
              if (cursorIndex < offset + limit) {
                cursor.continue();
              } else {
                resolve(logs);
              }
            } else {
              resolve(logs);
            }
          };
          
          request.onerror = (event) => {
            console.error('Failed to retrieve logs from IndexedDB:', event);
            reject(new Error('Failed to retrieve logs from IndexedDB'));
          };
        } catch (error) {
          console.error('Error accessing IndexedDB:', error);
          reject(error);
        }
      });
    }
    
    async clearLogs(): Promise<void> {
      if (!this.db) {
        await this.initPromise;
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(this.storeName, 'readwrite');
          const store = transaction.objectStore(this.storeName);
          
          const request = store.clear();
          
          request.onsuccess = () => resolve();
          request.onerror = (event) => {
            console.error('Failed to clear logs from IndexedDB:', event);
            reject(new Error('Failed to clear logs from IndexedDB'));
          };
        } catch (error) {
          console.error('Error accessing IndexedDB:', error);
          reject(error);
        }
      });
    }
  }
  
  /**
   * [Logging] Main logger class
   */
  export class Logger {
    private readonly transports: LogTransport[] = [];
    private minLevel: LogLevel;
    private defaultTags: string[] = [];
    private contextProvider?: () => Record<string, any>;
    private sourceProvider?: () => string;
    
    constructor(options: {
      transports?: LogTransport[];
      minLevel?: LogLevel;
      defaultTags?: string[];
      contextProvider?: () => Record<string, any>;
      sourceProvider?: () => string;
    } = {}) {
      this.transports = options.transports || [new ConsoleTransport()];
      this.minLevel = options.minLevel !== undefined ? options.minLevel : LogLevel.INFO;
      this.defaultTags = options.defaultTags || [];
      this.contextProvider = options.contextProvider;
      this.sourceProvider = options.sourceProvider;
    }
    
    /**
     * Add a transport to the logger
     */
    addTransport(transport: LogTransport): void {
      this.transports.push(transport);
    }
    
    /**
     * Remove a transport from the logger
     */
    removeTransport(transport: LogTransport): void {
      const index = this.transports.indexOf(transport);
      if (index !== -1) {
        this.transports.splice(index, 1);
      }
    }
    
    /**
     * Set the minimum log level
     */
    setMinLevel(level: LogLevel): void {
      this.minLevel = level;
    }
    
    /**
     * Get the current minimum log level
     */
    getMinLevel(): LogLevel {
      return this.minLevel;
    }
    
    /**
     * Set default tags for all log entries
     */
    setDefaultTags(tags: string[]): void {
      this.defaultTags = tags;
    }
    
    /**
     * Set a context provider function
     */
    setContextProvider(provider: () => Record<string, any>): void {
      this.contextProvider = provider;
    }
    
    /**
     * Set a source provider function
     */
    setSourceProvider(provider: () => string): void {
      this.sourceProvider = provider;
    }
    
    /**
     * Create a child logger with additional default tags
     */
    child(options: {
      tags?: string[];
      contextProvider?: () => Record<string, any>;
      sourceProvider?: () => string;
    } = {}): Logger {
      const childLogger = new Logger({
        transports: this.transports,
        minLevel: this.minLevel,
        defaultTags: [...this.defaultTags, ...(options.tags || [])],
        contextProvider: options.contextProvider || this.contextProvider,
        sourceProvider: options.sourceProvider || this.sourceProvider,
      });
      
      return childLogger;
    }
    
    /**
     * Internal log method
     */
    public _log(
      level: LogLevel,
      message: string,
      context?: Record<string, any>,
      tags?: string[]
    ): void {
      if (level < this.minLevel) {
        return;
      }
      
      const timestamp = new Date().toISOString();
      let combinedContext = context || {};
      
      // Add context from provider if available
      if (this.contextProvider) {
        combinedContext = {
          ...this.contextProvider(),
          ...combinedContext,
        };
      }
      
      // Combine tags
      const combinedTags = [
        ...this.defaultTags,
        ...(tags || []),
      ];
      
      // Get source if provider is available
      const source = this.sourceProvider ? this.sourceProvider() : undefined;
      
      const entry: LogEntry = {
        timestamp,
        level,
        message,
        context: Object.keys(combinedContext).length > 0 ? combinedContext : undefined,
        tags: combinedTags.length > 0 ? combinedTags : undefined,
        source,
      };
      
      // Send to all transports
      for (const transport of this.transports) {
        try {
          transport.log(entry);
        } catch (error) {
          console.error('Transport error:', error);
        }
      }
    }
    
    /**
     * Log methods for each level
     */
    trace(message: string, context?: Record<string, any>, tags?: string[]): void {
      this._log(LogLevel.TRACE, message, context, tags);
    }
    
    debug(message: string, context?: Record<string, any>, tags?: string[]): void {
      this._log(LogLevel.DEBUG, message, context, tags);
    }
    
    info(message: string, context?: Record<string, any>, tags?: string[]): void {
      this._log(LogLevel.INFO, message, context, tags);
    }
    
    warn(message: string, context?: Record<string, any>, tags?: string[]): void {
      this._log(LogLevel.WARN, message, context, tags);
    }
    
    error(message: string, context?: Record<string, any>, tags?: string[]): void {
      this._log(LogLevel.ERROR, message, context, tags);
    }
    
    fatal(message: string, context?: Record<string, any>, tags?: string[]): void {
      this._log(LogLevel.FATAL, message, context, tags);
    }
    
    /**
     * Log an error object with stack trace
     */
    logError(error: Error, message?: string, context?: Record<string, any>, tags?: string[]): void {
      const errorContext = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...(context || {}),
      };
      
      this._log(LogLevel.ERROR, message || error.message, errorContext, tags);
    }
    
    /**
     * Time a function execution and log the result
     */
    time<T>(
      name: string,
      fn: () => T,
      level: LogLevel = LogLevel.DEBUG,
      context?: Record<string, any>,
      tags?: string[]
    ): T {
      const start = performance.now();
      try {
        const result = fn();
        const duration = performance.now() - start;
        
        this._log(
          level,
          `${name} completed in ${duration.toFixed(2)}ms`,
          { ...context, duration },
          [...(tags || []), 'timer']
        );
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        
        this._log(
          LogLevel.ERROR,
          `${name} failed after ${duration.toFixed(2)}ms`,
          {
            ...context,
            duration,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            } : String(error),
          },
          [...(tags || []), 'timer', 'error']
        );
        
        throw error;
      }
    }
    
    /**
     * Time an async function execution and log the result
     */
    async timeAsync<T>(
      name: string,
      fn: () => Promise<T>,
      level: LogLevel = LogLevel.DEBUG,
      context?: Record<string, any>,
      tags?: string[]
    ): Promise<T> {
      const start = performance.now();
      try {
        const result = await fn();
        const duration = performance.now() - start;
        
        this._log(
          level,
          `${name} completed in ${duration.toFixed(2)}ms`,
          { ...context, duration },
          [...(tags || []), 'timer']
        );
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        
        this._log(
          LogLevel.ERROR,
          `${name} failed after ${duration.toFixed(2)}ms`,
          {
            ...context,
            duration,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            } : String(error),
          },
          [...(tags || []), 'timer', 'error']
        );
        
        throw error;
      }
    }
    
    /**
     * Group related log messages
     */
    group<T>(
      name: string,
      fn: (logger: Logger) => T,
      level: LogLevel = LogLevel.DEBUG,
      context?: Record<string, any>,
      tags?: string[]
    ): T {
      // Create a tag for the group
      const groupTag = `group:${name}`;
      
      // Create a child logger with the group tag
      const groupLogger = this.child({
        tags: [...(tags || []), groupTag],
      });
      
      // Log group start
      this._log(level, `Group start: ${name}`, context, [...(tags || []), groupTag, 'start']);
      
      try {
        // Execute function with the group logger
        const result = fn(groupLogger);
        
        // Log group end
        this._log(level, `Group end: ${name}`, context, [...(tags || []), groupTag, 'end']);
        
        return result;
      } catch (error) {
        // Log group error
        this._log(
          LogLevel.ERROR,
          `Group error: ${name}`,
          {
            ...context,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            } : String(error),
          },
          [...(tags || []), groupTag, 'error']
        );
        
        throw error;
      }
    }
    
    /**
     * Group related async log messages
     */
    async groupAsync<T>(
      name: string,
      fn: (logger: Logger) => Promise<T>,
      level: LogLevel = LogLevel.DEBUG,
      context?: Record<string, any>,
      tags?: string[]
    ): Promise<T> {
      // Create a tag for the group
      const groupTag = `group:${name}`;
      
      // Create a child logger with the group tag
      const groupLogger = this.child({
        tags: [...(tags || []), groupTag],
      });
      
      // Log group start
      this._log(level, `Group start: ${name}`, context, [...(tags || []), groupTag, 'start']);
      
      try {
        // Execute function with the group logger
        const result = await fn(groupLogger);
        
        // Log group end
        this._log(level, `Group end: ${name}`, context, [...(tags || []), groupTag, 'end']);
        
        return result;
      } catch (error) {
        // Log group error
        this._log(
          LogLevel.ERROR,
          `Group error: ${name}`,
          {
            ...context,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            } : String(error),
          },
          [...(tags || []), groupTag, 'error']
        );
        
        throw error;
      }
    }
  }
  
  /**
   * [Logging] Create a default logger
   */
  export const createLogger = (options: {
    transports?: LogTransport[];
    minLevel?: LogLevel;
    defaultTags?: string[];
    contextProvider?: () => Record<string, any>;
    sourceProvider?: () => string;
  } = {}): Logger => {
    return new Logger(options);
  };
  
  /**
   * [Logging] Default logger instance
   */
  export const defaultLogger = createLogger();
  
  /**
   * [Logging] Log middleware for Express applications
   */
  export const createExpressLogMiddleware = (logger: Logger, options: {
    level?: LogLevel;
    includeBodies?: boolean;
    includeHeaders?: boolean;
    excludePaths?: string[];
    excludeMethods?: string[];
    requestIdHeader?: string;
  } = {}) => {
    const {
      level = LogLevel.INFO,
      includeBodies = false,
      includeHeaders = false,
      excludePaths = [],
      excludeMethods = [],
      requestIdHeader = 'x-request-id',
    } = options;
    
    return (req: any, res: any, next: () => void) => {
      // Skip excluded paths and methods
      const path = req.path || req.url;
      if (
        excludePaths.some(pattern => path.includes(pattern)) ||
        excludeMethods.includes(req.method)
      ) {
        return next();
      }
      
      // Get or generate request ID
      const requestId = req.headers[requestIdHeader] || 
        req.headers[requestIdHeader.toLowerCase()] || 
        `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add request ID to response headers
      res.setHeader(requestIdHeader, requestId);
      
      // Capture start time
      const startTime = Date.now();
      
      // Prepare context
      const logContext: Record<string, any> = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      };
      
      // Add headers if requested
      if (includeHeaders) {
        logContext.headers = { ...req.headers };
        
        // Remove sensitive headers
        if (logContext.headers.authorization) {
          logContext.headers.authorization = '[REDACTED]';
        }
        if (logContext.headers.cookie) {
          logContext.headers.cookie = '[REDACTED]';
        }
      }
      
      // Add request body if requested and available
      if (includeBodies && req.body) {
        logContext.body = { ...req.body };
        
        // Redact sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
        sensitiveFields.forEach(field => {
          if (logContext.body[field]) {
            logContext.body[field] = '[REDACTED]';
          }
        });
      }
      
      // Log request
      logger.info(`${req.method} ${path}`, logContext, ['http', 'request']);
      
      // Capture response
      const originalEnd = res.end;
      res.end = function(chunk: any, ...args: any[]) {
        // Restore original end method
        res.end = originalEnd;
        
        // Calculate duration
        const duration = Date.now() - startTime;
        
        // Prepare response context
        let responseContext: any = {
          ...logContext,
          statusCode: res.statusCode,
          duration,
        };
        
        // Add response headers if requested
        if (includeHeaders) {
          responseContext.responseHeaders = res.getHeaders ? res.getHeaders() : {};
        }
        
        // Add response body if requested and available
        if (includeBodies && chunk) {
          try {
            const body = chunk.toString();
            if (body && (
              res.getHeader('Content-Type')?.toString().includes('application/json') ||
              typeof body === 'string' && body.startsWith('{') && body.endsWith('}')
            )) {
              responseContext.responseBody = JSON.parse(body);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        // Determine log level based on status code
        let responseLevel = level;
        if (res.statusCode >= 500) {
          responseLevel = LogLevel.ERROR;
        } else if (res.statusCode >= 400) {
          responseLevel = LogLevel.WARN;
        }
        
        // Log response
        logger._log(
          responseLevel,
          `${req.method} ${path} ${res.statusCode} - ${duration}ms`,
          responseContext,
          ['http', 'response']
        );
        
        // Call original end method
        return originalEnd.call(this, chunk, ...args);
      };
      
      next();
    };
  };
  
  /**
   * [Logging] Create a rotating file transport (for Node.js)
   */
  export class RotatingFileTransport implements LogTransport {
    private readonly maxSize: number;
    private readonly maxFiles: number;
    private readonly filename: string;
    private fs: any; // FileSystem module
    private path: any; // Path module
    private currentSize: number = 0;
    
    constructor(options: {
      filename: string;
      maxSize?: number; // in bytes
      maxFiles?: number;
      fs: any; // Injected fs module
      path: any; // Injected path module
    }) {
      this.filename = options.filename;
      this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
      this.maxFiles = options.maxFiles || 5;
      this.fs = options.fs;
      this.path = options.path;
      
      // Initialize current size if file exists
      try {
        const stats = this.fs.statSync(this.filename);
        this.currentSize = stats.size;
      } catch (error) {
        // File doesn't exist yet, size is 0
        this.currentSize = 0;
      }
    }
    
    log(entry: LogEntry): void {
      const logLine = JSON.stringify(entry) + '\n';
      const lineSize = Buffer.byteLength(logLine, 'utf8');
      
      // Check if we need to rotate
      if (this.currentSize + lineSize > this.maxSize) {
        this.rotate();
      }
      
      // Append to file
      try {
        this.fs.appendFileSync(this.filename, logLine, 'utf8');
        this.currentSize += lineSize;
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
    
    private rotate(): void {
      try {
        // Check if log file exists
        if (!this.fs.existsSync(this.filename)) {
          return;
        }
        
        // Rotate existing backups
        for (let i = this.maxFiles - 1; i >= 1; i--) {
          const oldFile = `${this.filename}.${i}`;
          const newFile = `${this.filename}.${i + 1}`;
          
          if (this.fs.existsSync(oldFile)) {
            try {
              this.fs.renameSync(oldFile, newFile);
            } catch (error) {
              console.error(`Failed to rotate log file ${oldFile} to ${newFile}:`, error);
            }
          }
        }
        
        // Rename current log file to .1
        try {
          this.fs.renameSync(this.filename, `${this.filename}.1`);
        } catch (error) {
          console.error(`Failed to rotate current log file:`, error);
        }
        
        // Reset size counter
        this.currentSize = 0;
      } catch (error) {
        console.error('Failed to rotate log files:', error);
      }
    }
  }
  
  /**
   * [Logging] Create a colored console logger for Node.js
   */
  export class NodeConsoleTransport implements LogTransport {
    private readonly colors: Record<LogLevel, string> = {
      [LogLevel.TRACE]: '\x1b[90m', // Gray
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[34m',  // Blue
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m', // Magenta
      [LogLevel.OFF]: '',
    };
    
    private readonly resetColor = '\x1b[0m';
    
    log(entry: LogEntry): void {
      const color = this.colors[entry.level];
      const levelName = LogLevel[entry.level].padEnd(5);
      const prefix = `[${entry.timestamp}] [${levelName}]`;
      
      let logFn = console.log;
      if (entry.level === LogLevel.WARN) {
        logFn = console.warn;
      } else if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
        logFn = console.error;
      }
      
      // Basic output with color
      logFn(`${color}${prefix}${this.resetColor} ${entry.message}`);
      
      if (entry.tags && entry.tags.length > 0) {
        logFn(`  Tags: ${entry.tags.join(', ')}`);
      }
      
      if (entry.context) {
        logFn('  Context:', entry.context);
      }
      
      if (entry.source) {
        logFn(`  Source: ${entry.source}`);
      }
    }
  }