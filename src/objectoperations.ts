
  // ===================================================
  // OBJECT OPERATIONS
  // ===================================================
  
  /**
   * [Object] Creates a deep clone of an object
   */
  export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    
    if (Array.isArray(obj)) {
      return obj.map(item => deepClone(item)) as any;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    
    return cloned;
  };
  
  /**
   * [Object] Picks specified properties from an object
   */
  export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    return keys.reduce((result, key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
      return result;
    }, {} as Pick<T, K>);
  };
  
  /**
   * [Object] Omits specified properties from an object
   */
  export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    return Object.entries(obj).reduce((result, [key, value]) => {
      if (!keys.includes(key as K)) {
        result[key as keyof Omit<T, K>] = value;
      }
      return result;
    }, {} as Omit<T, K>);
  };
  
  /**
   * [Object] Safely gets a nested property with a path
   */
  export const getNestedValue = <T>(obj: any, path: string, defaultValue?: T): T | undefined => {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === undefined || current === null) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current === undefined ? defaultValue : current;
  };
  
  /**
   * [Object] Sets a nested property with a path
   */
  export const setNestedValue = <T>(obj: T, path: string, value: any): T => {
    const result = { ...obj as object } as T;
    const keys = path.split('.');
    let current: any = result;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
    
    return result;
  };
  
  /**
   * [Object] Merges objects deeply
   */
  export const deepMerge = <T>(...objects: any[]): T => {
    const result: any = {};
    
    objects.forEach(obj => {
      if (!obj) return;
      
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        
        if (Array.isArray(value)) {
          result[key] = (result[key] || []).concat(value);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = deepMerge(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      });
    });
    
    return result as T;
  };
  
  /**
   * [Object] Checks if two objects are deeply equal
   */
  export const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
      return false;
    }
    
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => keysB.includes(key) && deepEqual(a[key], b[key]));
  };
  
  /**
   * [Object] Flattens a nested object with dot notation
   */
  export const flattenObject = (obj: Record<string, any>, parentKey: string = ''): Record<string, any> => {
    return Object.keys(obj).reduce((result, key) => {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flattenObject(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
      
      return result;
    }, {} as Record<string, any>);
  };
  
  /**
   * [Object] Unflatterns a dot notation object to nested object
   */
  export const unflattenObject = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const keys = key.split('.');
      let current = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) {
          current[k] = {};
        }
        current = current[k];
      }
      
      current[keys[keys.length - 1]] = value;
    });
    
    return result;
  };
  