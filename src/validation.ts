
  // ===================================================
  // VALIDATION & TYPE CHECKING
  // ===================================================
  
  /**
   * [Validation] Validates email format
   */
  export const isValidEmail = (email: string): boolean => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };
  
  /**
   * [Validation] Validates URL format
   */
  export const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  /**
   * [Validation] Checks if a value is empty (null, undefined, empty string, array, object)
   */
  export const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  };
  
  /**
   * [TypeChecking] Safe type checking for primitives and common types
   */
  export const typeOf = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value instanceof RegExp) return 'regexp';
    return typeof value;
  };
  
  /**
   * [Validation] Validates password complexity
   */
  export const isStrongPassword = (password: string, options = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true
  }): boolean => {
    if (password.length < options.minLength) return false;
    if (options.requireUppercase && !/[A-Z]/.test(password)) return false;
    if (options.requireLowercase && !/[a-z]/.test(password)) return false;
    if (options.requireNumbers && !/[0-9]/.test(password)) return false;
    if (options.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
    return true;
  };
  
  /**
   * [Validation] Checks if a number is within a range
   */
  export const isInRange = (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  };