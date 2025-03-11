
  // ===================================================
  // ARRAY OPERATIONS
  // ===================================================
  
  /**
   * [Array] Removes duplicate values from an array
   */
  export const removeDuplicates = <T>(array: T[]): T[] => {
    return [...new Set(array)];
  };
  
  /**
   * [Array] Chunks an array into smaller arrays of specified size
   */
  export const chunkArray = <T>(array: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size)
    );
  };
  
  /**
   * [Array] Shuffles array elements randomly (Fisher-Yates algorithm)
   */
  export const shuffleArray = <T>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  
  /**
   * [Array] Groups array of objects by a specified key
   */
  export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((result: Record<string, T[]>, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {});
  };
  
  /**
   * [Array] Calculates the intersection of two arrays
   */
  export const intersection = <T>(a: T[], b: T[]): T[] => {
    const setB = new Set(b);
    return [...new Set(a)].filter(x => setB.has(x));
  };
  
  /**
   * [Array] Calculates the difference between two arrays (a - b)
   */
  export const difference = <T>(a: T[], b: T[]): T[] => {
    const setB = new Set(b);
    return a.filter(x => !setB.has(x));
  };
  
  /**
   * [Array] Creates an array of numbers between start and end
   */
  export const range = (start: number, end: number, step: number = 1): number[] => {
    const result: number[] = [];
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
    return result;
  };
  
  /**
   * [Array] Flattens a multi-dimensional array
   */
  export const flatten = <T>(array: any[]): T[] => {
    return array.reduce((result, item) => 
      result.concat(Array.isArray(item) ? flatten(item) : item), []);
  };
  
  /**
   * [Array] Creates a frequency map of array elements
   */
  export const countOccurrences = <T extends string | number>(array: T[]): Record<T, number> => {
    return array.reduce((result: Record<T, number>, item) => {
      result[item] = (result[item] || 0) + 1;
      return result;
    }, {} as Record<T, number>);
  };
  
  /**
   * [Array] Sorts an array of objects by a property
   */
  export const sortByProperty = <T>(array: T[], property: keyof T, ascending: boolean = true): T[] => {
    return [...array].sort((a, b) => {
      const valueA = a[property];
      const valueB = b[property];
      
      if (valueA < valueB) return ascending ? -1 : 1;
      if (valueA > valueB) return ascending ? 1 : -1;
      return 0;
    });
  };
  