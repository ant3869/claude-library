// ===================================================
// BROWSER & DOM UTILITIES
// ===================================================

/**
 * [DOM] Safely gets an element by ID with type
 */
export const getElementById = <T extends HTMLElement>(id: string): T | null => {
    return document.getElementById(id) as T | null;
  };
  
  /**
   * [DOM] Adds event listener with automatic cleanup (for use in React or similar)
   */
  export const addEventListener = <K extends keyof WindowEventMap>(
    target: Window | Document | HTMLElement,
    event: K,
    handler: (event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): () => void => {
    target.addEventListener(event, handler as EventListener, options);
    return () => target.removeEventListener(event, handler as EventListener, options);
  };
  
  /**
   * [DOM] Creates an element with attributes
   */
  export const createElement = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attributes: Record<string, string> = {},
    children: (HTMLElement | string)[] = []
  ): HTMLElementTagNameMap[K] => {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
    
    return element;
  };
  
  /**
   * [DOM] Detects if an element is in viewport
   */
  export const isInViewport = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };
  
  /**
   * [DOM] Gets element's position relative to document
   */
  export const getOffset = (element: HTMLElement): { top: number; left: number } => {
    const rect = element.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    return {
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft
    };
  };
  
  /**
   * [DOM] Gets or sets cookie value
   */
  export const cookie = {
    get: (name: string): string | undefined => {
      const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
      return match ? decodeURIComponent(match[3]) : undefined;
    },
    set: (name: string, value: string, options: Record<string, any> = {}): void => {
      let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
      
      if (options.expires instanceof Date) {
        cookie += `;expires=${options.expires.toUTCString()}`;
      } else if (options.maxAge) {
        cookie += `;max-age=${options.maxAge}`;
      }
      
      if (options.path) cookie += `;path=${options.path}`;
      if (options.domain) cookie += `;domain=${options.domain}`;
      if (options.secure) cookie += `;secure`;
      if (options.sameSite) cookie += `;samesite=${options.sameSite}`;
      
      document.cookie = cookie;
    },
    remove: (name: string, options: Record<string, any> = {}): void => {
      cookie.set(name, '', { ...options, maxAge: -1 });
    }
  };
  
  /**
   * [Browser] Detects browser type and version
   */
  export const detectBrowser = (): { name: string; version: string } => {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';
    
    // Edge
    if (/Edg/.test(userAgent)) {
      name = 'Edge';
      version = userAgent.match(/Edg\/([\d.]+)/)?.[1] || '';
    }
    // Chrome
    else if (/Chrome/.test(userAgent)) {
      name = 'Chrome';
      version = userAgent.match(/Chrome\/([\d.]+)/)?.[1] || '';
    }
    // Firefox
    else if (/Firefox/.test(userAgent)) {
      name = 'Firefox';
      version = userAgent.match(/Firefox\/([\d.]+)/)?.[1] || '';
    }
    // Safari
    else if (/Safari/.test(userAgent)) {
      name = 'Safari';
      version = userAgent.match(/Version\/([\d.]+)/)?.[1] || '';
    }
    // IE
    else if (/MSIE|Trident/.test(userAgent)) {
      name = 'Internet Explorer';
      version = userAgent.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || '';
    }
    
    return { name, version };
  };
  
  /**
   * [Browser] Detects device type (mobile/tablet/desktop)
   */
  export const detectDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
    const userAgent = navigator.userAgent;
    
    // Tablet
    if (/(iPad|tablet|Tablet|Android(?!.*mobile))/i.test(userAgent)) {
      return 'tablet';
    }
    
    // Mobile
    if (/(iPhone|iPod|Android.*Mobile|BlackBerry|IEMobile)/i.test(userAgent)) {
      return 'mobile';
    }
    
    // Desktop
    return 'desktop';
  };
  
  /**
   * [DOM] Copies text to clipboard
   */
  export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      
      document.body.appendChild(textarea);
      textarea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      return success;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  };
  
  /**
   * [Browser] Gets user's preferred color scheme (dark/light)
   */
  export const getPreferredColorScheme = (): 'dark' | 'light' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  
  /**
   * [DOM] Focuses the next focusable element in the DOM
   */
  export const focusNextElement = (): void => {
    const focusableElements = 'a:not([disabled]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([disabled]):not([tabindex="-1"])';
    
    const elements = Array.from(document.querySelectorAll(focusableElements)) as HTMLElement[];
    const currentIndex = elements.findIndex(element => element === document.activeElement);
    
    const nextIndex = currentIndex + 1 < elements.length ? currentIndex + 1 : 0;
    elements[nextIndex].focus();
  };
  
  // ===================================================
  // MATH & NUMBER OPERATIONS
  // ===================================================
  
  /**
   * [Math] Clamps a number between min and max values
   */
  export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  };
  
  /**
   * [Math] Generates a random integer between min and max (inclusive)
   */
  export const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  
  /**
   * [Math] Generates a random float between min and max
   */
  export const randomFloat = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };
  
  /**
   * [Math] Calculates percentage value
   */
  export const percentage = (value: number, total: number): number => {
    return (value / total) * 100;
  };
  
  /**
   * [Math] Rounds a number to a specified precision
   */
  export const roundToPrecision = (value: number, precision: number = 2): number => {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  };
  
  /**
   * [Math] Formats a number with thousand separators
   */
  export const formatNumber = (value: number, locale: string = 'en-US'): string => {
    return new Intl.NumberFormat(locale).format(value);
  };
  
  /**
   * [Math] Formats currency values
   */
  export const formatCurrency = (
    value: number, 
    currency: string = 'USD', 
    locale: string = 'en-US'
  ): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(value);
  };
  
  /**
   * [Math] Maps a value from one range to another
   */
  export const mapRange = (
    value: number, 
    inputMin: number, 
    inputMax: number, 
    outputMin: number, 
    outputMax: number
  ): number => {
    return ((value - inputMin) * (outputMax - outputMin)) / (inputMax - inputMin) + outputMin;
  };
  
  /**
   * [Math] Calculates the average of an array of numbers
   */
  export const average = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  };
  
  /**
   * [Math] Calculates the median of an array of numbers
   */
  export const median = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  };
  
  /**
   * [Math] Calculates variance of an array of numbers
   */
  export const variance = (numbers: number[]): number => {
    if (numbers.length <= 1) return 0;
    
    const avg = average(numbers);
    const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
    
    return average(squaredDiffs);
  };
  
  /**
   * [Math] Calculates standard deviation of an array of numbers
   */
  export const standardDeviation = (numbers: number[]): number => {
    return Math.sqrt(variance(numbers));
  };
  
  // ===================================================
  // ASYNC UTILITIES
  // ===================================================
  
  /**
   * [Async] Creates a promise that resolves after a delay
   */
  export const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };
  
  /**
   * [Async] Creates a timeout promise that rejects after specified time
   */
  export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);
    });
    
    return Promise.race([
      promise.then(result => {
        clearTimeout(timeoutId);
        return result;
      }),
      timeoutPromise
    ]);
  };
  
  /**
   * [Async] Limits concurrency of async operations
   */
  export const limitConcurrency = async <T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number = 5
  ): Promise<R[]> => {
    const results: R[] = [];
    let currentIndex = 0;
    
    const executor = async (): Promise<void> => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        results[index] = await fn(items[index], index);
      }
    };
    
    const executors = Array.from({ length: Math.min(concurrency, items.length) }, 
      () => executor());
    
    await Promise.all(executors);
    return results;
  };
  
  /**
   * [Async] Creates a debounced function
   */
  export const debounce = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let timer: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };
  
  /**
   * [Async] Creates a throttled function
   */
  export const throttle = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let lastCall = 0;
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = delay - (now - lastCall);
      
      if (remaining <= 0) {
        lastCall = now;
        fn(...args);
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          lastCall = Date.now();
          fn(...args);
        }, remaining);
      }
    };
  };
  
  /**
   * [Async] Creates a memoized version of an async function
   */
  export const memoizeAsync = <T extends (...args: any[]) => Promise<any>>(
      fn: T,
      keyFn?: (...args: Parameters<T>) => string
    ): (...args: Parameters<T>) => Promise<ReturnType<T>> => {
      const cache = new Map<string, ReturnType<T>>();
      
      return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        const key = keyFn ? keyFn(...args) : JSON.stringify(args);
        
        if (cache.has(key)) {
          return cache.get(key)!;
        }
        
        const result = await fn(...args);
        cache.set(key, result);
        return result;
      };
    };
  
  /**
   * [Async] Retries a function several times before failing
   */
  export const retry = async <T>(
    fn: () => Promise<T>,
    options = { retries: 3, delay: 300, backoff: 2 }
  ): Promise<T> => {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < options.retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const waitTime = options.delay * Math.pow(options.backoff, attempt);
        await delay(waitTime);
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  };
  
  /**
   * [Async] Creates a queue for sequential async operations
   */
  export const createAsyncQueue = () => {
    let lastPromise = Promise.resolve();
    
    return {
      add: <T>(fn: () => Promise<T>): Promise<T> => {
        const promise = lastPromise.then(
          () => fn(),
          () => fn() // Continue on error in previous task
        );
        
        lastPromise = promise.catch(() => {}) as Promise<void>; // Prevent unhandled rejections
        return promise;
      }
    };
  };
  
  // ===================================================
  // SECURITY & ENCRYPTION
  // ===================================================
  
  /**
   * [Security] Generates a secure random token
   */
  export const generateSecureToken = (length: number = 32): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  };
  
  /**
   * [Security] Hashes a string using SHA-256
   */
  export const sha256 = async (message: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  };
  
  /**
   * [Security] Encrypts data with AES-GCM
   */
  export const encrypt = async (
    data: string, 
    key: CryptoKey
  ): Promise<{ ciphertext: string; iv: string }> => {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );
    
    return {
      ciphertext: arrayBufferToBase64(encryptedBuffer),
      iv: arrayBufferToBase64(iv)
    };
  };
  
  /**
   * [Security] Decrypts AES-GCM encrypted data
   */
  export const decrypt = async (
    ciphertext: string,
    iv: string,
    key: CryptoKey
  ): Promise<string> => {
    const encryptedData = base64ToArrayBuffer(ciphertext);
    const ivBuffer = base64ToArrayBuffer(iv);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  };
  
  /**
   * [Security] Generates an AES-GCM key
   */
  export const generateAesKey = async (): Promise<CryptoKey> => {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  };
  
  /**
   * [Security] Converts array buffer to base64 string
   */
  export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  };
  
  /**
   * [Security] Converts base64 string to array buffer
   */
  export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  };
  
  // ===================================================
  // ERROR HANDLING
  // ===================================================
  
  /**
   * [Error] Creates a custom error class
   */
  export const createErrorClass = <T extends Record<string, any>>(
    name: string, 
    defaultMessage: string = ''
  ) => {
    return class CustomError extends Error {
      data: T;
      
      constructor(message: string = defaultMessage, data: T = {} as T) {
        super(message);
        this.name = name;
        this.data = data;
        
        // Fix prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
      }
    };
  };
  
  /**
   * [Error] Attempts to run a function, returns result or fallback on error
   */
  export const tryCatch = <T>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch (error) {
      return fallback;
    }
  };
  
  /**
   * [Error] Creates a safe version of a function that never throws
   */
  export const createSafeFunction = <T extends (...args: any[]) => any>(
    fn: T,
    fallback: ReturnType<T>
  ): (...args: Parameters<T>) => ReturnType<T> => {
    return (...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        return fallback;
      }
    };
  };
  
  /**
   * [Error] Wraps an async function to handle errors
   */
  export const wrapAsync = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    errorHandler: (error: Error, ...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>>
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> => {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await fn(...args);
      } catch (error) {
        return errorHandler(error as Error, ...args);
      }
    };
  };
  
  /**
   * [Error] Enhanced console.error with stack trace formatting
   */
  export const logError = (error: Error | string, context: Record<string, any> = {}): void => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    console.error('Error:', errorObj.message);
    console.error('Context:', JSON.stringify(context, null, 2));
    
    if (errorObj.stack) {
      console.error('Stack:', errorObj.stack
        .split('\n')
        .slice(1)
        .map(line => line.trim())
        .join('\n')
      );
    }
  };
  
  // ===================================================
  // FORMATTING & PARSING
  // ===================================================
  
  /**
   * [Format] Converts bytes to human-readable size
   */
  export const formatBytes = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  };
  
  /**
   * [Format] Converts milliseconds to time format
   */
  export const formatTime = (ms: number, options = { 
    includeMilliseconds: false,
    includeHours: true,
    includeLeadingZeros: true
  }): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    
    const seconds = totalSeconds % 60;
    const minutes = totalMinutes % 60;
    const hours = options.includeHours ? totalHours : totalMinutes;
    
    const format = (value: number): string => {
      return options.includeLeadingZeros ? value.toString().padStart(2, '0') : value.toString();
    };
    
    let result = '';
    
    if (options.includeHours) {
      result += format(hours) + ':';
    }
    
    result += format(minutes) + ':' + format(seconds);
    
    if (options.includeMilliseconds) {
      const milliseconds = Math.floor((ms % 1000) / 10);
      result += '.' + milliseconds.toString().padStart(2, '0');
    }
    
    return result;
  };
  
  /**
   * [Parse] Extracts hashtags from text
   */
  export const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    
    if (!matches) return [];
    
    return matches.map(tag => tag.slice(1));
  };
  
  /**
   * [Parse] Extracts mentions from text
   */
  export const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    
    if (!matches) return [];
    
    return matches.map(mention => mention.slice(1));
  };
  
  /**
   * [Format] Truncates text by words count
   */
  export const truncateByWords = (
    text: string, 
    wordCount: number, 
    ending: string = '...'
  ): string => {
    const words = text.split(/\s+/);
    
    if (words.length <= wordCount) return text;
    
    return words.slice(0, wordCount).join(' ') + ending;
  };
  
  /**
   * [Format] Formats a phone number to a standard format
   */
  export const formatPhoneNumber = (
    phoneNumber: string, 
    format: string = '(xxx) xxx-xxxx'
  ): string => {
    let digits = phoneNumber.replace(/\D/g, '');
    
    let result = format;
    for (let i = 0; i < digits.length; i++) {
      result = result.replace('x', digits[i]);
    }
    
    // Remove remaining placeholders
    result = result.replace(/x/g, '');
    
    return result;
  };
  
  /**
   * [Format] Centers a string with specified padding
   */
  export const centerString = (
    str: string, 
    width: number, 
    padding: string = ' '
  ): string => {
    if (str.length >= width) return str;
    
    const leftPadding = Math.floor((width - str.length) / 2);
    const rightPadding = width - str.length - leftPadding;
    
    return padding.repeat(leftPadding) + str + padding.repeat(rightPadding);
  };