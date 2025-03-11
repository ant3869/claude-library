// ===================================================
// FUNCTIONAL PROGRAMMING
// ===================================================

/**
 * [Functional] Creates a memoized version of a function
 */
export const memoize = <T extends (...args: any[]) => any>(
    fn: T,
    keyFn?: (...args: Parameters<T>) => string
  ): (...args: Parameters<T>) => ReturnType<T> => {
    const cache = new Map<string, ReturnType<T>>();
    
    return (...args: Parameters<T>): ReturnType<T> => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      const result = fn(...args);
      cache.set(key, result);
      return result;
    };
  };
  
  /**
   * [Functional] Creates a curried version of a function
   */
  export const curry = <T extends (...args: any[]) => any>(
    fn: T
  ): (...args: Partial<Parameters<T>>) => ReturnType<T> | ((...args: any[]) => any) => {
    const arity = fn.length;
    
    return function curried(...args: any[]): any {
      if (args.length >= arity) {
        return fn(...args);
      }
      
      return function(...moreArgs: any[]): any {
        return curried(...args, ...moreArgs);
      };
    };
  };
  
  /**
   * [Functional] Creates a function that runs all provided functions in sequence
   */
  export const compose = <T>(...fns: Array<(arg: T) => T>) => {
    return (value: T): T => {
      return fns.reduceRight((result, fn) => fn(result), value);
    };
  };
  
  /**
   * [Functional] Creates a function that runs all provided functions in sequence (left to right)
   */
  export const pipe = <T>(...fns: Array<(arg: T) => T>) => {
    return (value: T): T => {
      return fns.reduce((result, fn) => fn(result), value);
    };
  };
  
  /**
   * [Functional] Creates a function that calls the original function once
   */
  export const once = <T extends (...args: any[]) => any>(fn: T): ((...args: Parameters<T>) => ReturnType<T> | undefined) => {
    let called = false;
    let result: ReturnType<T>;
    
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      if (called) return result;
      
      called = true;
      result = fn(...args);
      return result;
    };
  };
  
  /**
   * [Functional] Creates a function that negates the result of the predicate function
   */
  export const negate = <T>(predicate: (value: T) => boolean): (value: T) => boolean => {
    return (value: T): boolean => !predicate(value);
  };
  
  /**
   * [Functional] Creates a function that partials arguments from right
   */
  export const partialRight = <T extends (...args: any[]) => any>(
    fn: T,
    ...partialArgs: any[]
  ): (...args: any[]) => ReturnType<T> => {
    return (...args: any[]): ReturnType<T> => {
      return fn(...args, ...partialArgs);
    };
  };
  
  /**
   * [Functional] Creates a function that partials arguments from left
   */
  export const partial = <T extends (...args: any[]) => any>(
    fn: T,
    ...partialArgs: any[]
  ): (...args: any[]) => ReturnType<T> => {
    return (...args: any[]): ReturnType<T> => {
      return fn(...partialArgs, ...args);
    };
  };
  
  /**
   * [Functional] Creates an identity function that returns its argument
   */
  export const identity = <T>(value: T): T => value;
  
  /**
   * [Functional] Creates a constant function that always returns the same value
   */
  export const constant = <T>(value: T): () => T => {
    return () => value;
  };
  
  // ===================================================
  // FILE & I/O OPERATIONS
  // ===================================================
  
  /**
   * [File] Reads a file as a data URL
   */
  export const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  };
  
  /**
   * [File] Reads a text file
   */
  export const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };
  
  /**
   * [File] Downloads a file from a URL
   */
  export const downloadFile = (url: string, filename: string): void => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  /**
   * [File] Downloads a text file with content
   */
  export const downloadTextFile = (content: string, filename: string, type: string = 'text/plain'): void => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    
    downloadFile(url, filename);
    URL.revokeObjectURL(url);
  };
  
  /**
   * [File] Downloads a JSON file with content
   */
  export const downloadJsonFile = (data: any, filename: string): void => {
    const content = JSON.stringify(data, null, 2);
    downloadTextFile(content, filename, 'application/json');
  };
  
  /**
   * [File] Gets file extension from a filename
   */
  export const getFileExtension = (filename: string): string => {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
  };
  
  /**
   * [File] Gets the MIME type from a file extension
   */
  export const getMimeType = (extension: string): string => {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'audio/ogg',
      'wav': 'audio/wav',
      'avi': 'video/x-msvideo',
      'csv': 'text/csv'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  };
  
  /**
   * [File] Validates file size and type
   */
  export const validateFile = (
    file: File,
    options: { maxSizeMB?: number; allowedTypes?: string[] } = {}
  ): { valid: boolean; error?: string } => {
    const { maxSizeMB = 5, allowedTypes = [] } = options;
    
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds the limit of ${maxSizeMB}MB`
      };
    }
    
    // Check file type
    if (allowedTypes.length > 0) {
      const fileType = file.type;
      if (!allowedTypes.includes(fileType)) {
        return {
          valid: false,
          error: `File type ${fileType} is not allowed`
        };
      }
    }
    
    return { valid: true };
  };
  
  // ===================================================
  // STATE MANAGEMENT
  // ===================================================
  
  /**
   * [State] Creates a simple observable subject
   */
  export const createSubject = <T>() => {
    const observers: ((value: T) => void)[] = [];
    
    return {
      subscribe: (observer: (value: T) => void) => {
        observers.push(observer);
        
        return {
          unsubscribe: () => {
            const index = observers.indexOf(observer);
            if (index !== -1) {
              observers.splice(index, 1);
            }
          }
        };
      },
      next: (value: T) => {
        observers.forEach(observer => observer(value));
      }
    };
  };
  
  /**
   * [State] Creates a simple store with state management
   */
  export const createStore = <T>(initialState: T) => {
    let state = initialState;
    const subject = createSubject<T>();
    
    return {
      getState: () => state,
      setState: (newState: Partial<T>) => {
        state = { ...state, ...newState };
        subject.next(state);
      },
      subscribe: (callback: (state: T) => void) => {
        return subject.subscribe(callback);
      }
    };
  };
  
  /**
   * [State] Creates a memoized selector for derived state
   */
  export const createSelector = <State, Result>(
    selector: (state: State) => Result
  ): (state: State) => Result => {
    let lastState: State | undefined;
    let lastResult: Result | undefined;
    
    return (state: State): Result => {
      if (!lastState || !deepEqual(lastState, state)) {
        lastState = state;
        lastResult = selector(state);
      }
      
      return lastResult!;
    };
  };
  
  /**
   * [State] Creates a combined selector from multiple selectors
   */
  export const combineSelectors = <State, Result>(
    selectors: Array<(state: State) => any>,
    combiner: (...args: any[]) => Result
  ): (state: State) => Result => {
    return (state: State): Result => {
      const selectedValues = selectors.map(selector => selector(state));
      return combiner(...selectedValues);
    };
  };
  
  /**
   * [State] Creates a local storage persistence layer
   */
  export const createPersistence = <T>(key: string, initialState: T) => {
    const load = (): T => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : initialState;
      } catch (error) {
        console.error('Failed to load state from localStorage:', error);
        return initialState;
      }
    };
    
    const save = (state: T): void => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save state to localStorage:', error);
      }
    };
    
    return { load, save };
  };
  
  // ===================================================
  // STYLING & CSS
  // ===================================================
  
  /**
   * [Styling] Converts a CSS object to a style string
   */
  export const cssObjectToString = (styles: Record<string, string | number>): string => {
    return Object.entries(styles)
      .map(([key, value]) => {
        const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${kebabKey}: ${value};`;
      })
      .join(' ');
  };
  
  /**
   * [Styling] Parses a CSS string into an object
   */
  export const parseCssString = (css: string): Record<string, string> => {
    const result: Record<string, string> = {};
    
    css.split(';')
      .map(rule => rule.trim())
      .filter(Boolean)
      .forEach(rule => {
        const [key, value] = rule.split(':').map(part => part.trim());
        
        if (key && value) {
          const camelKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
          result[camelKey] = value;
        }
      });
    
    return result;
  };
  
  /**
   * [Styling] Creates a CSS variable with fallback
   */
  export const cssVar = (name: string, fallback?: string): string => {
    return fallback ? `var(--${name}, ${fallback})` : `var(--${name})`;
  };
  
  /**
   * [Styling] Converts a hex color to RGBA
   */
  export const hexToRgba = (hex: string, alpha: number = 1): string => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    
    if (!result) {
      return hex;
    }
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  /**
   * [Styling] Darkens a hex color by a percentage
   */
  export const darkenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    
    return '#' + (
      0x1000000 +
      (R << 16) +
      (G << 8) +
      B
    ).toString(16).slice(1);
  };
  
  /**
   * [Styling] Lightens a hex color by a percentage
   */
  export const lightenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    
    return '#' + (
      0x1000000 +
      (R << 16) +
      (G << 8) +
      B
    ).toString(16).slice(1);
  };
  
  /**
   * [Styling] Generates linear gradient CSS
   */
  export const linearGradient = (
    direction: string,
    ...colorStops: Array<string | [string, string]>
  ): string => {
    const stops = colorStops.map(stop => {
      if (Array.isArray(stop)) {
        return `${stop[0]} ${stop[1]}`;
      }
      return stop;
    });
    
    return `linear-gradient(${direction}, ${stops.join(', ')})`;
  };
  
  /**
   * [Styling] Applies CSS variables to an element
   */
  export const applyCssVariables = (
    element: HTMLElement, 
    variables: Record<string, string>
  ): void => {
    Object.entries(variables).forEach(([name, value]) => {
      element.style.setProperty(`--${name}`, value);
    });
  };
  
  // ===================================================
  // PERFORMANCE OPTIMIZATION
  // ===================================================
  
  /**
   * [Performance] Measures execution time of a function
   */
  export const measureTime = <T>(fn: () => T): { result: T; time: number } => {
    const start = performance.now();
    const result = fn();
    const time = performance.now() - start;
    
    return { result, time };
  };
  
  /**
   * [Performance] Creates a throttled requestAnimationFrame callback
   */
  export const rafThrottle = <T extends (...args: any[]) => void>(callback: T): T => {
    let requestId: number | null = null;
    let lastArgs: any[];
    
    const throttled = (...args: any[]) => {
      lastArgs = args;
      
      if (requestId === null) {
        requestId = requestAnimationFrame(() => {
          requestId = null;
          callback(...lastArgs);
        });
      }
    };
    
    return throttled as unknown as T;
  };
  
  /**
   * [Performance] Batch updates to avoid layout thrashing
   */
  export const batchDomUpdates = <T>(
    items: T[],
    updateFn: (item: T) => void,
    batchSize: number = 50,
    delayBetweenBatches: number = 8
  ): Promise<void> => {
    return new Promise(resolve => {
      const totalItems = items.length;
      let processedItems = 0;
      
      const processBatch = () => {
        const batchItems = items.slice(processedItems, processedItems + batchSize);
        
        if (batchItems.length === 0) {
          resolve();
          return;
        }
        
        requestAnimationFrame(() => {
          batchItems.forEach(updateFn);
          processedItems += batchSize;
          
          setTimeout(processBatch, delayBetweenBatches);
        });
      };
      
      processBatch();
    });
  };
  
  /**
   * [Performance] Creates a lazy loaded function
   */
  export const lazyLoad = <T extends (...args: any[]) => any>(factory: () => T): (...args: Parameters<T>) => ReturnType<T> => {
    let fn: T | undefined;
    
    return (...args: Parameters<T>): ReturnType<T> => {
      if (fn === undefined) {
        fn = factory();
      }
      
      return fn(...args);
    };
  };
  
  /**
   * [Performance] Creates a function that only executes when idle
   */
  export const onIdleCallback = <T extends (...args: any[]) => void>(
    callback: T,
    options?: IdleRequestOptions
  ): T => {
    let handle: number | null = null;
    let lastArgs: any[];
    
    const idleWrapper = (...args: any[]) => {
      lastArgs = args;
      
      if (handle === null) {
        handle = requestIdleCallback(() => {
          handle = null;
          callback(...lastArgs);
        }, options);
      }
    };
    
    return idleWrapper as unknown as T;
  };
  
  // ===================================================
  // REACTIVE PROGRAMMING
  // ===================================================
  
  /**
   * [Reactive] Creates a simple reactive value
   */
  export const createReactive = <T>(initialValue: T) => {
    let value = initialValue;
    const subscribers: ((value: T) => void)[] = [];
    
    return {
      get: () => value,
      set: (newValue: T) => {
        value = newValue;
        subscribers.forEach(fn => fn(value));
      },
      subscribe: (fn: (value: T) => void) => {
        subscribers.push(fn);
        fn(value); // Call immediately with current value
        
        return {
          unsubscribe: () => {
            const index = subscribers.indexOf(fn);
            if (index !== -1) {
              subscribers.splice(index, 1);
            }
          }
        };
      }
    };
  };
  
  /**
   * [Reactive] Creates a computed value that depends on other reactives
   */
  export const computed = <T>(
    reactives: Array<{
      get: () => any;
      subscribe: (fn: (value: any) => void) => { unsubscribe: () => void };
    }>,
    computeFn: (...values: any[]) => T
  ) => {
    const result = createReactive<T>(computeFn(...reactives.map(r => r.get())));
    
    reactives.forEach(reactive => {
      reactive.subscribe(() => {
        result.set(computeFn(...reactives.map(r => r.get())));
      });
    });
    
    return {
      get: result.get,
      subscribe: result.subscribe
    };
  };
  
  /**
   * [Reactive] Combines multiple reactive values
   */
  export const combineReactives = <T extends Record<string, { get: () => any; subscribe: (fn: (value: any) => void) => { unsubscribe: () => void } }>>(
    reactives: T
  ) => {
    type CombinedType = { [K in keyof T]: ReturnType<T[K]['get']> };
    
    const getAll = (): CombinedType => {
      const result = {} as CombinedType;
      
      Object.entries(reactives).forEach(([key, reactive]) => {
        result[key as keyof T] = reactive.get();
      });
      
      return result;
    };
    
    const result = createReactive<CombinedType>(getAll());
    
    (Object.keys(reactives) as Array<keyof T>).forEach(key => {
      reactives[key].subscribe(() => {
        result.set(getAll());
      });
    });
    
    return {
      get: result.get,
      subscribe: result.subscribe
    };
  };
  
  // ===================================================
  // I18N & LOCALIZATION
  // ===================================================
  
  /**
   * [I18n] Formats a number according to locale
   */
  export const formatLocalizedNumber = (
    value: number,
    locale: string = 'en-US',
    options?: Intl.NumberFormatOptions
  ): string => {
    return new Intl.NumberFormat(locale, options).format(value);
  };
  
  /**
   * [I18n] Formats a date according to locale
   */
  export const formatLocalizedDate = (
    date: Date,
    locale: string = 'en-US',
    options?: Intl.DateTimeFormatOptions
  ): string => {
    return new Intl.DateTimeFormat(locale, options).format(date);
  };
  
  /**
   * [I18n] Simple translation helper
   */
  export const createTranslator = (
    translations: Record<string, Record<string, string>>
  ) => {
    return (key: string, locale: string, params: Record<string, string> = {}): string => {
      const localeData = translations[locale] || translations['en'] || {};
      let translation = localeData[key] || key;
      
      // Replace params
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{{${paramKey}}}`, value);
      });
      
      return translation;
    };
  };
  
  /**
   * [I18n] Pluralization helper
   */
  export const pluralize = (
    value: number,
    singular: string,
    plural: string,
    zero?: string
  ): string => {
    if (value === 0 && zero !== undefined) {
      return zero.replace('{count}', value.toString());
    }
    
    return value === 1
      ? singular.replace('{count}', value.toString())
      : plural.replace('{count}', value.toString());
  };
  
/**
 * [I18n] Simple currency formatter with localization
 */
function deepEqual<T>(a: T, b: T): boolean {
    // If they are exactly the same, return true.
    if (a === b) {
        return true;
    }

    // If types are different, they are not equal.
    if (typeof a !== typeof b) {
        return false;
    }

    // If either is null (and the other is not), they are not equal.
    if (a === null || b === null) {
        return false;
    }

    // For non-object types, strict equality check has already been done.
    if (typeof a !== 'object') {
        return false;
    }

    // Handle arrays.
    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    if (aIsArray !== bIsArray) {
        return false;
    }
    if (aIsArray && bIsArray) {
        const arrA = a as unknown as any[];
        const arrB = b as unknown as any[];
        if (arrA.length !== arrB.length) {
            return false;
        }
        return arrA.every((item, index) => deepEqual(item, arrB[index]));
    }

    // Get the keys for both objects.
    const keysA = Object.keys(a);
    const keysB = Object.keys(b as object);

    // If objects have different number of keys, they're not equal.
    if (keysA.length !== keysB.length) {
        return false;
    }

    // Use recursion for every property.
    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) {
            return false;
        }
        if (!deepEqual((a as any)[key], (b as any)[key])) {
            return false;
        }
    }

    return true;
}

// Duplicate implementation removed.
