// ===================================================
// FRONTEND UTILITIES
// ===================================================

/**
 * [FrontendUtils] CSV & Data Processing Utilities
 */
export class CsvUtils {
    /**
     * Fast search through CSV data with multiple conditions
     */
    static searchCsv<T extends Record<string, any>>(
      data: T[],
      conditions: Array<{
        column: string;
        value: any;
        operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
      }>,
      options: {
        caseSensitive?: boolean;
        limit?: number;
        returnIndices?: boolean;
      } = {}
    ): T[] | number[] {
      const { caseSensitive = false, limit = Infinity, returnIndices = false } = options;
      
      // Prepare a function to check all conditions for a row
      const checkConditions = (row: T): boolean => {
        return conditions.every(({ column, value, operator = 'eq' }) => {
          if (!(column in row)) return false;
          
          const cellValue = row[column];
          const checkValue = value;
          
          // Skip undefined or null values based on operator
          if (cellValue === undefined || cellValue === null) {
            return operator === 'neq'; // Only "not equals" passes for null values
          }
          
          // Convert to string for string operations if needed
          const cellStr = typeof cellValue === 'string' 
            ? caseSensitive ? cellValue : cellValue.toLowerCase() 
            : String(cellValue);
          
          const checkStr = typeof checkValue === 'string' 
            ? caseSensitive ? checkValue : checkValue.toLowerCase() 
            : String(checkValue);
          
          // Check based on operator
          switch (operator) {
            case 'eq': 
              return cellValue === checkValue || cellStr === checkStr;
            case 'neq': 
              return cellValue !== checkValue && cellStr !== checkStr;
            case 'gt': 
              return cellValue > checkValue;
            case 'gte': 
              return cellValue >= checkValue;
            case 'lt': 
              return cellValue < checkValue;
            case 'lte': 
              return cellValue <= checkValue;
            case 'contains': 
              return cellStr.includes(checkStr);
            case 'startsWith': 
              return cellStr.startsWith(checkStr);
            case 'endsWith': 
              return cellStr.endsWith(checkStr);
            case 'regex': 
              return new RegExp(checkStr).test(cellStr);
            default: 
              return false;
          }
        });
      };
      
      // Find matching rows
      const result: number[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (checkConditions(data[i])) {
          result.push(i);
          if (result.length >= limit) break;
        }
      }
      
      // Return indices or actual data
      return returnIndices 
        ? result 
        : result.map(index => data[index]);
    }
    
    /**
     * Create a searchable index for CSV data for faster repeat searches
     */
    static createCsvIndex<T extends Record<string, any>>(
      data: T[],
      columns: string[],
      options: {
        caseSensitive?: boolean;
        tokenize?: boolean;
        stemming?: boolean;
      } = {}
    ): {
      search: (query: string, limit?: number) => T[];
      searchByColumn: (column: string, query: string, limit?: number) => T[];
      addDocument: (doc: T) => void;
      removeDocument: (predicate: (doc: T) => boolean) => void;
    } {
      const { caseSensitive = false, tokenize = true, stemming = true } = options;
      
      // Create inverted index by column
      const indexByColumn: Record<string, Map<string, Set<number>>> = {};
      
      // Function to tokenize and stem text
      const processText = (text: string): string[] => {
        if (!text) return [];
        
        const processed = caseSensitive ? text : text.toLowerCase();
        
        if (!tokenize) return [processed];
        
        // Simple tokenization
        const tokens = processed
          .split(/\s+/)
          .map(t => t.replace(/[^\w]/g, ''))
          .filter(t => t.length > 1);
        
        if (!stemming) return tokens;
        
        // Simple stemming (can be replaced with a more comprehensive algorithm)
        return tokens.map(token => 
          token
            .replace(/ing$/, '')
            .replace(/ed$/, '')
            .replace(/s$/, '')
            .replace(/es$/, '')
            .replace(/ies$/, 'y')
        );
      };
      
      // Build the index
      const buildIndex = () => {
        columns.forEach(column => {
          indexByColumn[column] = new Map();
        });
        
        data.forEach((row, index) => {
          columns.forEach(column => {
            if (!(column in row)) return;
            
            const value = row[column];
            if (value === null || value === undefined) return;
            
            const tokens = processText(String(value));
            
            tokens.forEach(token => {
              if (!indexByColumn[column].has(token)) {
                indexByColumn[column].set(token, new Set());
              }
              indexByColumn[column].get(token)!.add(index);
            });
          });
        });
      };
      
      buildIndex();
      
      // Search functions
      const searchByColumn = (column: string, query: string, limit = Infinity): T[] => {
        if (!indexByColumn[column]) return [];
        
        const tokens = processText(query);
        if (tokens.length === 0) return [];
        
        // Get indices that match all tokens
        let matchingIndices: Set<number> | undefined = undefined;
        
        tokens.forEach(token => {
          const matchingForToken = indexByColumn[column].get(token) || new Set();
          
          if (matchingIndices === undefined) {
            matchingIndices = new Set(matchingForToken);
          } else {
            // Intersect sets
            matchingIndices = new Set<number>(
                [...matchingIndices].filter((idx: number) => matchingForToken.has(idx))
            );
          }
        });
        
        // Fix: Check if matchingIndices is undefined or empty
        if (!matchingIndices || matchingIndices.size === 0) return [];
        
        return [...matchingIndices]
          .slice(0, limit)
          .map(index => data[index]);
      };
      
      const search = (query: string, limit = Infinity): T[] => {
        const tokensByColumn: Record<string, Set<number>> = {};
        const tokens = processText(query);
        
        if (tokens.length === 0) return [];
        
        // Collect matching indices from all columns
        columns.forEach(column => {
          tokensByColumn[column] = new Set();
          
          tokens.forEach(token => {
            const matches = indexByColumn[column].get(token) || new Set();
            matches.forEach(idx => tokensByColumn[column].add(idx));
          });
        });
        
        // Combine results (union of all columns)
        const allMatches = new Set<number>();
        
        Object.values(tokensByColumn).forEach(indices => {
          indices.forEach(idx => allMatches.add(idx));
        });
        
        return [...allMatches]
          .slice(0, limit)
          .map(index => data[index]);
      };
      
      // Add a new document to the index
      const addDocument = (doc: T): void => {
        const index = data.length;
        data.push(doc);
        
        columns.forEach(column => {
          if (!(column in doc)) return;
          
          const value = doc[column];
          if (value === null || value === undefined) return;
          
          const tokens = processText(String(value));
          
          tokens.forEach(token => {
            if (!indexByColumn[column].has(token)) {
              indexByColumn[column].set(token, new Set());
            }
            indexByColumn[column].get(token)!.add(index);
          });
        });
      };
      
      // Remove documents matching a predicate
      const removeDocument = (predicate: (doc: T) => boolean): void => {
        // Find indices to remove
        const indicesToRemove = new Set<number>();
        
        data.forEach((doc, idx) => {
          if (predicate(doc)) {
            indicesToRemove.add(idx);
          }
        });
        
        if (indicesToRemove.size === 0) return;
        
        // Update index to remove references
        columns.forEach(column => {
          indexByColumn[column].forEach((indices, token) => {
            indicesToRemove.forEach(idx => {
              indices.delete(idx);
            });
            
            // Clean up empty token entries
            if (indices.size === 0) {
              indexByColumn[column].delete(token);
            }
          });
        });
        
        // Remove from data array and reindex
        const newData = data.filter((_, idx) => !indicesToRemove.has(idx));
        data.length = 0;
        data.push(...newData);
        
        // Rebuild index for simplicity
        // In a real implementation, you might want to update indices instead of rebuilding
        buildIndex();
      };
      
      return {
        search,
        searchByColumn,
        addDocument,
        removeDocument
      };
    }
    
    /**
     * Format CSV data for visualization in charts
     */
    static prepareChartData(
      csvData: Record<string, any>[],
      options: {
        xAxis: string;
        yAxes: string[];
        groupBy?: string;
        aggregate?: 'sum' | 'avg' | 'min' | 'max' | 'count';
        sort?: 'asc' | 'desc';
        limit?: number;
      }
    ): { 
      labels: string[]; 
      datasets: Array<{name: string; data: number[]}>
    } {
      const { xAxis, yAxes, groupBy, aggregate = 'sum', sort, limit } = options;
      
      // Group data if needed
      let processedData: any[];
      
      if (groupBy) {
        // Group by the specified column
        const groups: Record<string, any[]> = {};
        
        for (const row of csvData) {
          const groupKey = String(row[groupBy] || 'Unknown');
          
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          
          groups[groupKey].push(row);
        }
        
        // Apply aggregation to each group
        processedData = Object.entries(groups).map(([key, rows]) => {
          const result: Record<string, any> = { [groupBy]: key };
          
          for (const yAxis of yAxes) {
            // Extract numeric values for aggregation
            const values = rows
              .map(row => parseFloat(row[yAxis]))
              .filter(v => !isNaN(v));
            
            if (values.length === 0) {
              result[yAxis] = 0;
              continue;
            }
            
            // Apply aggregation function
            switch (aggregate) {
              case 'sum':
                result[yAxis] = values.reduce((a, b) => a + b, 0);
                break;
              case 'avg':
                result[yAxis] = values.reduce((a, b) => a + b, 0) / values.length;
                break;
              case 'min':
                result[yAxis] = Math.min(...values);
                break;
              case 'max':
                result[yAxis] = Math.max(...values);
                break;
              case 'count':
                result[yAxis] = values.length;
                break;
            }
          }
          
          return result;
        });
      } else {
        processedData = [...csvData];
      }
      
      // Sort if needed
      if (sort) {
        processedData.sort((a, b) => {
          const valueA = a[xAxis];
          const valueB = b[xAxis];
          
          // Try to detect if we're dealing with dates
          const dateA = new Date(valueA);
          const dateB = new Date(valueB);
          
          if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            return sort === 'asc' 
              ? dateA.getTime() - dateB.getTime() 
              : dateB.getTime() - dateA.getTime();
          }
          
          // Fall back to string comparison
          const strA = String(valueA);
          const strB = String(valueB);
          
          return sort === 'asc' 
            ? strA.localeCompare(strB) 
            : strB.localeCompare(strA);
        });
      }
      
      // Apply limit if needed
      if (limit && limit > 0 && processedData.length > limit) {
        processedData = processedData.slice(0, limit);
      }
      
      // Extract labels and datasets
      const labels = processedData.map(row => String(row[xAxis] || ''));
      const datasets = yAxes.map(yAxis => ({
        name: yAxis,
        data: processedData.map(row => {
          const val = parseFloat(row[yAxis]);
          return isNaN(val) ? 0 : val;
        })
      }));
      
      return { labels, datasets };
    }
    
    /**
     * Calculate summary statistics for CSV data
     */
    static calculateStatistics(
      data: Array<Record<string, any>>,
      columns: string[]
    ): Record<string, {
      min: number;
      max: number;
      sum: number;
      mean: number;
      median: number;
      stdDev: number;
      count: number;
      missingCount: number;
    }> {
      const stats: Record<string, any> = {};
      
      for (const column of columns) {
        // Extract numeric values
        const rawValues = data.map(row => row[column]);
        const values = rawValues
          .map(v => parseFloat(v))
          .filter(v => !isNaN(v));
        
        if (values.length === 0) {
          stats[column] = {
            min: 0,
            max: 0,
            sum: 0,
            mean: 0,
            median: 0,
            stdDev: 0,
            count: 0,
            missingCount: rawValues.length
          };
          continue;
        }
        
        // Sort values for median calculation
        const sortedValues = [...values].sort((a, b) => a - b);
        const middleIndex = Math.floor(sortedValues.length / 2);
        
        // Calculate median
        const median = sortedValues.length % 2 === 0
          ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
          : sortedValues[middleIndex];
        
        // Calculate sum and mean
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        
        // Calculate standard deviation
        const variances = values.map(v => Math.pow(v - mean, 2));
        const variance = variances.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        stats[column] = {
          min: Math.min(...values),
          max: Math.max(...values),
          sum,
          mean,
          median,
          stdDev,
          count: values.length,
          missingCount: rawValues.length - values.length
        };
      }
      
      return stats;
    }
}

/**
 * [FrontendUtils] Dark Mode UI Components
 */
export class DarkUI {
    // Common dark mode color palette
    static readonly colors = {
      background: '#121212',
      surface: '#1e1e1e',
      primary: '#bb86fc',
      primaryVariant: '#3700b3',
      secondary: '#03dac6',
      error: '#cf6679',
      onBackground: '#e1e1e1',
      onSurface: '#ffffff',
      onPrimary: '#000000',
      onSecondary: '#000000',
      onError: '#000000',
      border: '#333333',
      shadow: 'rgba(0, 0, 0, 0.5)'
    };
}

/**
 * [FrontendUtils] Enhanced Visualization Library
 */
export class DarkCharts {
    // Common dark theme colors
    static readonly chartColors = {
      background: '#121212',
      grid: '#333333',
      text: '#e0e0e0',
      primary: '#8ab4f8',
      secondary: '#81c995',
      tertiary: '#f28b82',
      quaternary: '#fdd663',
      quinary: '#d7aefb',
      palette: [
        '#8ab4f8', // blue
        '#81c995', // green
        '#f28b82', // red
        '#fdd663', // yellow
        '#d7aefb', // purple
        '#78d9ec', // cyan
        '#fcad70', // orange
        '#c58af9', // violet
        '#ee8ebc', // pink
        '#a1e4a1'  // light green
      ]
    };
}