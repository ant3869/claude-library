
  // ===================================================
  // NETWORKING
  // ===================================================
  
  /**
   * [Networking] Fetches JSON data with error handling
   */
  export const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };
  
  /**
   * [Networking] Creates a cancellable fetch request
   */
  export const cancellableFetch = <T>(url: string, options?: RequestInit): { 
    promise: Promise<T>; 
    cancel: () => void 
  } => {
    const controller = new AbortController();
    const { signal } = controller;
    
    const promise = fetch(url, { ...options, signal })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      });
    
    const cancel = () => controller.abort();
    
    return { promise, cancel };
  };
  
  /**
   * [Networking] Fetches with automatic retry on failure
   */
  export const fetchWithRetry = async <T>(
    url: string, 
    options?: RequestInit, 
    retries: number = 3, 
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
    
    throw lastError || new Error('Fetch failed after retries');
  };
  
  /**
   * [Networking] Creates a debounced fetch function
   */
  export const debouncedFetch = <T>(
    fetchFn: (url: string, options?: RequestInit) => Promise<T>,
    debounceTime: number = 300
  ): (url: string, options?: RequestInit) => Promise<T> => {
    let timeout: NodeJS.Timeout;
    let resolvePromise: (value: T) => void;
    let rejectPromise: (reason: any) => void;
    
    return (url: string, options?: RequestInit) => {
      clearTimeout(timeout);
      return new Promise<T>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
        
        timeout = setTimeout(() => {
          fetchFn(url, options)
            .then(resolvePromise)
            .catch(rejectPromise);
        }, debounceTime);
      });
    };
  };
  
  /**
   * [Networking] Serializes form data to URL encoded string
   */
  export const serializeFormData = (data: Record<string, any>): string => {
    return Object.entries(data)
      .map(([key, value]) => {
        if (value === null || value === undefined) return '';
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      })
      .filter(Boolean)
      .join('&');
  };
  
  /**
   * [Networking] Parses URL query parameters
   */
  export const parseQueryParams = (url: string): Record<string, string> => {
    const params: Record<string, string> = {};
    const query = url.split('?')[1];
    
    if (!query) return params;
    
    query.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });
    
    return params;
  };
  
  /**
   * [Networking] Creates a URL with query parameters
   */
  export const createUrlWithParams = (baseUrl: string, params: Record<string, any>): string => {
    const url = new URL(baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
    
    return url.toString();
  };