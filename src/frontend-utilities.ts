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
        
        if (!matchingIndices || matchingIndices === 0) return [];
        
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
    
    /**
     * Create a dark mode modal dialog
     */
    static createModal(
      content: HTMLElement | string,
      options: {
        title?: string;
        closable?: boolean;
        width?: string;
        height?: string;
        onClose?: () => void;
        footer?: HTMLElement;
      } = {}
    ): {
      modal: HTMLDivElement;
      open: () => void;
      close: () => void;
    } {
      const { 
        title = '', 
        closable = true, 
        width = '400px', 
        height = 'auto', 
        onClose,
        footer
      } = options;
      
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'dark-modal-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '9999';
      
      // Create modal container
      const modal = document.createElement('div');
      modal.className = 'dark-modal-container';
      modal.style.backgroundColor = this.colors.surface;
      modal.style.color = this.colors.onSurface;
      modal.style.borderRadius = '8px';
      modal.style.maxWidth = '90%';
      modal.style.width = width;
      modal.style.height = height;
      modal.style.maxHeight = '90vh';
      modal.style.overflow = 'hidden';
      modal.style.display = 'flex';
      modal.style.flexDirection = 'column';
      modal.style.boxShadow = '0 4px 20px ' + this.colors.shadow;
      modal.style.border = '1px solid ' + this.colors.border;
      
      // Create modal header if title is provided
      if (title) {
        const header = document.createElement('div');
        header.className = 'dark-modal-header';
        header.style.padding = '16px';
        header.style.borderBottom = '1px solid ' + this.colors.border;
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';
        
        const titleEl = document.createElement('h3');
        titleEl.className = 'dark-modal-title';
        titleEl.style.margin = '0';
        titleEl.style.fontSize = '18px';
        titleEl.style.fontWeight = 'bold';
        titleEl.style.color = this.colors.primary;
        titleEl.textContent = title;
        
        header.appendChild(titleEl);
        
        if (closable) {
          const closeButton = document.createElement('button');
          closeButton.className = 'dark-modal-close';
          closeButton.style.background = 'none';
          closeButton.style.border = 'none';
          closeButton.style.cursor = 'pointer';
          closeButton.style.fontSize = '24px';
          closeButton.style.lineHeight = '1';
          closeButton.style.padding = '0';
          closeButton.style.color = this.colors.onSurface;
          closeButton.innerHTML = '&times;';
          
          closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
          });
          
          header.appendChild(closeButton);
        }
        
        modal.appendChild(header);
      }
      
      // Create modal body
      const body = document.createElement('div');
      body.className = 'dark-modal-body';
      body.style.padding = '16px';
      body.style.overflowY = 'auto';
      body.style.flex = '1';
      
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else {
        body.appendChild(content);
      }
      
      modal.appendChild(body);
      
      // Add footer if provided
      if (footer) {
        const footerContainer = document.createElement('div');
        footerContainer.className = 'dark-modal-footer';
        footerContainer.style.padding = '16px';
        footerContainer.style.borderTop = '1px solid ' + this.colors.border;
        footerContainer.style.display = 'flex';
        footerContainer.style.justifyContent = 'flex-end';
        footerContainer.style.gap = '8px';
        
        footerContainer.appendChild(footer);
        modal.appendChild(footerContainer);
      }
      
      overlay.appendChild(modal);
      
      // Close function
      const closeModal = () => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
          if (onClose) onClose();
        }
      };
      
      // Close when clicking on the overlay if closable
      if (closable) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            closeModal();
          }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', function escapeHandler(e) {
          if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
          }
        });
      }
      
      return {
        modal: overlay,
        open: () => document.body.appendChild(overlay),
        close: closeModal,
      };
    }
    
    /**
     * Create a dark mode toast notification
     */
    static createToast(
      message: string,
      options: {
        type?: 'info' | 'success' | 'warning' | 'error';
        duration?: number;
        position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
        onClose?: () => void;
        icon?: string; // HTML for icon
      } = {}
    ): {
      toast: HTMLDivElement;
      show: () => void;
      hide: () => void;
    } {
      const { 
        type = 'info', 
        duration = 3000, 
        position = 'top-right', 
        onClose,
        icon
      } = options;
      
      // Get or create toast container
      let container = document.getElementById('dark-toast-container');
      
      if (!container) {
        container = document.createElement('div');
        container.id = 'dark-toast-container';
        container.style.position = 'fixed';
        container.style.zIndex = '10000';
        container.style.maxWidth = '100%';
        
        document.body.appendChild(container);
      }
      
      // Set container position
      switch (position) {
        case 'top-left':
          Object.assign(container.style, {
            top: '20px',
            left: '20px',
          });
          break;
        case 'top-center':
          Object.assign(container.style, {
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
          });
          break;
        case 'bottom-right':
          Object.assign(container.style, {
            bottom: '20px',
            right: '20px',
          });
          break;
        case 'bottom-left':
          Object.assign(container.style, {
            bottom: '20px',
            left: '20px',
          });
          break;
        case 'bottom-center':
          Object.assign(container.style, {
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
          });
          break;
        default: // top-right
          Object.assign(container.style, {
            top: '20px',
            right: '20px',
          });
      }
      
      // Get color based on type
      let backgroundColor = '#333333';
      let iconColor = '#ffffff';
      
      switch (type) {
        case 'success':
          backgroundColor = '#1e4620'; // Dark green
          iconColor = '#4caf50';
          break;
        case 'warning':
          backgroundColor = '#422a16'; // Dark orange
          iconColor = '#ff9800';
          break;
        case 'error':
          backgroundColor = '#431c24'; // Dark red
          iconColor = '#f44336';
          break;
        case 'info':
        default:
          backgroundColor = '#1a2c42'; // Dark blue
          iconColor = '#2196f3';
          break;
      }
      
      // Get default icon based on type
      let defaultIcon = '';
      switch (type) {
        case 'success':
          defaultIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
          break;
        case 'warning':
          defaultIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
          break;
        case 'error':
          defaultIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
          break;
        case 'info':
        default:
          defaultIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
          break;
      }
      
      // Create toast element
      const toast = document.createElement('div');
      toast.className = `dark-toast dark-toast-${type}`;
      toast.style.backgroundColor = backgroundColor;
      toast.style.color = this.colors.onSurface;
      toast.style.padding = '12px 16px';
      toast.style.borderRadius = '8px';
      toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      toast.style.marginBottom = '10px';
      toast.style.minWidth = '280px';
      toast.style.maxWidth = '350px';
      toast.style.display = 'flex';
      toast.style.alignItems = 'center';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      toast.style.transition = 'all 0.3s ease-in-out';
      toast.style.position = 'relative';
      toast.style.border = '1px solid ' + this.colors.border;
      
      // Add icon if provided
      const iconContainer = document.createElement('div');
      iconContainer.style.marginRight = '12px';
      iconContainer.style.color = iconColor;
      iconContainer.innerHTML = icon || defaultIcon;
      toast.appendChild(iconContainer);
      
      // Add message
      const messageContainer = document.createElement('div');
      messageContainer.style.flex = '1';
      messageContainer.textContent = message;
      toast.appendChild(messageContainer);
      
      // Create close button
      const closeButton = document.createElement('button');
      closeButton.className = 'dark-toast-close';
      closeButton.style.background = 'none';
      closeButton.style.border = 'none';
      closeButton.style.color = 'inherit';
      closeButton.style.fontSize = '18px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.marginLeft = '12px';
      closeButton.style.opacity = '0.7';
      closeButton.style.padding = '0';
      closeButton.innerHTML = '&times;';
      closeButton.addEventListener('click', () => hideToast());
      
      toast.appendChild(closeButton);
      
      let timeoutId: number;
      
      // Show function
      const showToast = () => {
        container!.appendChild(toast);
        
        // Trigger a reflow before changing opacity to ensure transition happens
        void toast.offsetWidth;
        
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        
        if (duration > 0) {
          timeoutId = window.setTimeout(() => {
            hideToast();
          }, duration);
        }
      };
      
      // Hide function
      const hideToast = () => {
        clearTimeout(timeoutId);
        
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
            
            if (onClose) {
              onClose();
            }
          }
        }, 300); // Match the transition duration
      };
      
      return {
        toast,
        show: showToast,
        hide: hideToast,
      };
    }
    
    /**
     * Create a dark mode loading indicator
     */
    static createLoader(
      options: {
        type?: 'spinner' | 'dots' | 'bar';
        size?: 'small' | 'medium' | 'large';
        color?: string;
        fullscreen?: boolean;
        text?: string;
      } = {}
    ): {
      loader: HTMLDivElement;
      show: () => void;
      hide: () => void;
      setProgress: (value: number) => void;
    } {
      const { 
        type = 'spinner', 
        size = 'medium', 
        color = this.colors.primary,
        fullscreen = false,
        text
      } = options;
      
      // Create container
      const container = document.createElement('div');
      container.className = 'dark-loader-container';
      
      if (fullscreen) {
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        container.style.zIndex = '10000';
      } else {
        container.style.display = 'inline-flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
      }
      
      // Size mapping
      const sizeMap = {
        small: { size: '20px', thickness: '3px', textSize: '12px' },
        medium: { size: '40px', thickness: '4px', textSize: '14px' },
        large: { size: '60px', thickness: '5px', textSize: '16px' }
      };
      
      const { size: loaderSize, thickness, textSize } = sizeMap[size];
      
      // Create loader based on type
      let loader: HTMLElement;
      
      switch (type) {
        case 'spinner':
          loader = document.createElement('div');
          loader.className = 'dark-spinner';
          loader.style.width = loaderSize;
          loader.style.height = loaderSize;
          loader.style.border = `${thickness} solid rgba(255, 255, 255, 0.1)`;
          loader.style.borderTopColor = color;
          loader.style.borderRadius = '50%';
          loader.style.animation = 'dark-spin 1s linear infinite';
          
          // Add keyframes if not already added
          if (!document.getElementById('dark-loader-keyframes')) {
            const keyframes = document.createElement('style');
            keyframes.id = 'dark-loader-keyframes';
            keyframes.textContent = `
              @keyframes dark-spin {
                to { transform: rotate(360deg); }
              }
              @keyframes dark-pulse {
                0%, 100% { opacity: 0.4; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1); }
              }
              @keyframes dark-progress {
                from { width: 0; }
                to { width: 100%; }
              }
            `;
            document.head.appendChild(keyframes);
          }
          break;
          
        case 'dots':
          loader = document.createElement('div');
          loader.className = 'dark-dots';
          loader.style.display = 'flex';
          loader.style.alignItems = 'center';
          loader.style.justifyContent = 'center';
          loader.style.gap = thickness;
          
          for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.style.width = thickness;
            dot.style.height = thickness;
            dot.style.backgroundColor = color;
            dot.style.borderRadius = '50%';
            dot.style.animation = `dark-pulse 1.4s ease-in-out ${i * 0.2}s infinite`;
            loader.appendChild(dot);
          }
          break;
          
        case 'bar':
          loader = document.createElement('div');
          loader.className = 'dark-progress-bar';
          loader.style.width = loaderSize;
          loader.style.height = thickness;
          loader.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          loader.style.borderRadius = thickness;
          loader.style.overflow = 'hidden';
          loader.style.position = 'relative';
          
          const progress = document.createElement('div');
          progress.className = 'dark-progress';
          progress.style.height = '100%';
          progress.style.width = '0%';
          progress.style.backgroundColor = color;
          progress.style.position = 'absolute';
          progress.style.top = '0';
          progress.style.left = '0';
          progress.style.transition = 'width 0.3s ease-in-out';
          
          loader.appendChild(progress);
          break;
      }
      
      container.appendChild(loader);
      
      // Add text if provided
      if (text) {
        const textEl = document.createElement('div');
        textEl.className = 'dark-loader-text';
        textEl.style.marginTop = '10px';
        textEl.style.color = fullscreen ? this.colors.onSurface : color;
        textEl.style.fontSize = textSize;
        textEl.textContent = text;
        
        container.appendChild(textEl);
      }
      
      // Functions
      const show = () => {
        if (!container.parentNode) {
          document.body.appendChild(container);
        }
        container.style.display = fullscreen ? 'flex' : 'inline-flex';
      };
      
      const hide = () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };
      
      const setProgress = (value: number) => {
        if (type === 'bar') {
          const progressEl = container.querySelector('.dark-progress') as HTMLElement;
          if (progressEl) {
            const clampedValue = Math.max(0, Math.min(100, value));
            progressEl.style.width = `${clampedValue}%`;
          }
        }
      };
      
      return {
        loader: container,
        show,
        hide,
        setProgress
      };
    }
    
    /**
     * Create a dark mode tooltip
     */
    static createTooltip(
      target: HTMLElement,
      content: string,
      options: {
        position?: 'top' | 'bottom' | 'left' | 'right';
        className?: string;
        showDelay?: number;
        hideDelay?: number;
        theme?: 'dark' | 'light' | 'auto';
      } = {}
    ): {
      show: () => void;
      hide: () => void;
      update: (content: string) => void;
      destroy: () => void;
    } {
      const {
        position = 'top',
        className = '',
        showDelay = 300,
        hideDelay = 100,
        theme = 'dark'
      } = options;
      
      let tooltip: HTMLDivElement | null = null;
      let showTimeoutId: number | null = null;
      let hideTimeoutId: number | null = null;
      
      // Get colors based on theme
      const getColors = () => {
        if (theme === 'light') {
          return {
            bg: '#f5f5f5',
            text: '#333333',
            border: '#e0e0e0'
          };
        } else {
          return {
            bg: '#333333',
            text: '#ffffff',
            border: '#555555'
          };
        }
      };
      
      // Create the tooltip element
      const createTooltipElement = () => {
        const colors = getColors();
        
        const tooltipEl = document.createElement('div');
        tooltipEl.className = `dark-tooltip ${className}`;
        tooltipEl.style.position = 'absolute';
        tooltipEl.style.zIndex = '9999';
        tooltipEl.style.backgroundColor = colors.bg;
        tooltipEl.style.color = colors.text;
        tooltipEl.style.padding = '8px 12px';
        tooltipEl.style.borderRadius = '4px';
        tooltipEl.style.fontSize = '14px';
        tooltipEl.style.maxWidth = '250px';
        tooltipEl.style.wordWrap = 'break-word';
        tooltipEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        tooltipEl.style.border = `1px solid ${colors.border}`;
        tooltipEl.style.pointerEvents = 'none';
        tooltipEl.style.opacity = '0';
        tooltipEl.style.transition = 'opacity 0.2s ease-in-out';
        tooltipEl.innerHTML = content;
        
        // Add arrow element
        const arrow = document.createElement('div');
        arrow.className = 'dark-tooltip-arrow';
        arrow.style.position = 'absolute';
        arrow.style.width = '8px';
        arrow.style.height = '8px';
        arrow.style.backgroundColor = colors.bg;
        arrow.style.border = `1px solid ${colors.border}`;
        arrow.style.transform = 'rotate(45deg)';
        
        tooltipEl.appendChild(arrow);
        document.body.appendChild(tooltipEl);
        
        return tooltipEl;
      };
      
      // Position the tooltip
      const positionTooltip = () => {
        if (!tooltip) return;
        
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        let top = 0;
        let left = 0;
        
        const arrow = tooltip.querySelector('.dark-tooltip-arrow') as HTMLElement;
        
        switch (position) {
          case 'top':
            top = targetRect.top + scrollTop - tooltipRect.height - 10;
            left = targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipRect.width / 2);
            
            if (arrow) {
              arrow.style.left = '50%';
              arrow.style.marginLeft = '-4px';
              arrow.style.bottom = '-5px';
              arrow.style.borderTop = 'none';
              arrow.style.borderLeft = 'none';
            }
            break;
          
          case 'bottom':
            top = targetRect.bottom + scrollTop + 10;
            left = targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipRect.width / 2);
            
            if (arrow) {
              arrow.style.left = '50%';
              arrow.style.marginLeft = '-4px';
              arrow.style.top = '-5px';
              arrow.style.borderBottom = 'none';
              arrow.style.borderRight = 'none';
            }
            break;
          
          case 'left':
            top = targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipRect.height / 2);
            left = targetRect.left + scrollLeft - tooltipRect.width - 10;
            
            if (arrow) {
              arrow.style.top = '50%';
              arrow.style.marginTop = '-4px';
              arrow.style.right = '-5px';
              arrow.style.borderTop = 'none';
              arrow.style.borderRight = 'none';
            }
            break;
          
          case 'right':
            top = targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipRect.height / 2);
            left = targetRect.right + scrollLeft + 10;
            
            if (arrow) {
              arrow.style.top = '50%';
              arrow.style.marginTop = '-4px';
              arrow.style.left = '-5px';
              arrow.style.borderBottom = 'none';
              arrow.style.borderLeft = 'none';
            }
            break;
        }
        
        // Ensure tooltip stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (left < 10) {
          left = 10;
          if (arrow && (position === 'top' || position === 'bottom')) {
            arrow.style.left = `${targetRect.left + targetRect.width / 2 - left}px`;
            arrow.style.marginLeft = '0';
          }
        }
        
        if (left + tooltipRect.width > viewportWidth - 10) {
          left = viewportWidth - tooltipRect.width - 10;
          if (arrow && (position === 'top' || position === 'bottom')) {
            arrow.style.left = `${targetRect.left + targetRect.width / 2 - left}px`;
            arrow.style.marginLeft = '0';
          }
        }
        
        if (top < 10) {
          top = 10;
          if (arrow && (position === 'left' || position === 'right')) {
            arrow.style.top = `${targetRect.top + targetRect.height / 2 - top}px`;
            arrow.style.marginTop = '0';
          }
        }
        
        if (top + tooltipRect.height > viewportHeight - 10) {
          top = viewportHeight - tooltipRect.height - 10;
          if (arrow && (position === 'left' || position === 'right')) {
            arrow.style.top = `${targetRect.top + targetRect.height / 2 - top}px`;
            arrow.style.marginTop = '0';
          }
        }
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
      };
      
      // Show the tooltip
      const showTooltip = () => {
        if (showTimeoutId) {
          clearTimeout(showTimeoutId);
        }
        
        if (hideTimeoutId) {
          clearTimeout(hideTimeoutId);
          hideTimeoutId = null;
        }
        
        showTimeoutId = window.setTimeout(() => {
          if (!tooltip) {
            tooltip = createTooltipElement();
          }
          
          positionTooltip();
          tooltip.style.opacity = '1';
          
          showTimeoutId = null;
        }, showDelay);
      };
      
      // Hide the tooltip
      const hideTooltip = () => {
        if (showTimeoutId) {
          clearTimeout(showTimeoutId);
          showTimeoutId = null;
        }
        
        if (hideTimeoutId) {
          clearTimeout(hideTimeoutId);
        }
        
        hideTimeoutId = window.setTimeout(() => {
          if (tooltip) {
            tooltip.style.opacity = '0';
            
            setTimeout(() => {
              if (tooltip && tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
                tooltip = null;
              }
            }, 200);
          }
          
          hideTimeoutId = null;
        }, hideDelay);
      };
      
      // Update tooltip content
      const updateContent = (newContent: string) => {
        content = newContent;
        
        if (tooltip) {
          tooltip.innerHTML = content;
          
          // Re-add arrow
          const colors = getColors();
          const arrow = document.createElement('div');
          arrow.className = 'dark-tooltip-arrow';
          arrow.style.position = 'absolute';
          arrow.style.width = '8px';
          arrow.style.height = '8px';
          arrow.style.backgroundColor = colors.bg;
          arrow.style.border = `1px solid ${colors.border}`;
          arrow.style.transform = 'rotate(45deg)';
          
          tooltip.appendChild(arrow);
          
          // Reposition
          positionTooltip();
        }
      };
      
      // Setup event listeners
      target.addEventListener('mouseenter', showTooltip);
      target.addEventListener('mouseleave', hideTooltip);
      target.addEventListener('focus', showTooltip);
      target.addEventListener('blur', hideTooltip);
      
      // Cleanup function
      const destroy = () => {
        target.removeEventListener('mouseenter', showTooltip);
        target.removeEventListener('mouseleave', hideTooltip);
        target.removeEventListener('focus', showTooltip);
        target.removeEventListener('blur', hideTooltip);
        
        if (showTimeoutId) {
          clearTimeout(showTimeoutId);
        }
        
        if (hideTimeoutId) {
          clearTimeout(hideTimeoutId);
        }
        
        if (tooltip && tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
          tooltip = null;
        }
      };
      
      return {
        show: showTooltip,
        hide: hideTooltip,
        update: updateContent,
        destroy
      };
    }
    
    /**
     * Create a dark mode context menu
     */
    static createContextMenu(
      items: Array<{
        id: string;
        label: string;
        icon?: string;
        action?: () => void;
        disabled?: boolean;
        separator?: boolean;
        submenu?: Array<{ id: string; label: string; icon?: string; action?: () => void; disabled?: boolean; }>;
      }>
    ): {
      attach: (target: HTMLElement) => void;
      detach: (target: HTMLElement) => void;
      show: (x: number, y: number) => void;
      hide: () => void;
      updateItems: (newItems: any[]) => void;
    } {
      let menu: HTMLElement | null = null;
      let activeSubmenu: HTMLElement | null = null;
      
      const createMenuItem = (item: any): HTMLElement => {
        if (item.separator) {
          const separator = document.createElement('div');
          separator.className = 'dark-context-menu-separator';
          separator.style.height = '1px';
          separator.style.margin = '5px 0';
          separator.style.backgroundColor = this.colors.border;
          return separator;
        }
        
        const menuItem = document.createElement('div');
        menuItem.id = item.id;
        menuItem.className = 'dark-context-menu-item';
        menuItem.style.padding = '8px 16px';
        menuItem.style.display = 'flex';
        menuItem.style.alignItems = 'center';
        menuItem.style.cursor = item.disabled ? 'default' : 'pointer';
        menuItem.style.opacity = item.disabled ? '0.5' : '1';
        menuItem.style.position = 'relative';
        
        if (item.icon) {
          const icon = document.createElement('span');
          icon.className = 'dark-context-menu-icon';
          icon.style.marginRight = '8px';
          icon.innerHTML = item.icon;
          menuItem.appendChild(icon);
        }
        
        const label = document.createElement('span');
        label.textContent = item.label;
        menuItem.appendChild(label);
        
        if (item.submenu) {
          const arrow = document.createElement('span');
          arrow.className = 'dark-context-menu-arrow';
          arrow.style.marginLeft = 'auto';
          arrow.style.paddingLeft = '8px';
          arrow.innerHTML = '&#9654;'; // Right-pointing triangle
          menuItem.appendChild(arrow);
          
          menuItem.addEventListener('mouseenter', (e) => {
            if (item.disabled) return;
            
            if (activeSubmenu) {
              activeSubmenu.style.display = 'none';
              activeSubmenu = null;
            }
            
            const submenu = createSubmenu(item.submenu, menuItem);
            activeSubmenu = submenu;
          });
        } else {
          menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (!item.disabled && item.action) {
              item.action();
            }
            
            hideMenu();
          });
        }
        
        menuItem.addEventListener('mouseenter', () => {
          if (!item.disabled) {
            menuItem.style.backgroundColor = this.colors.border;
          }
        });
        
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.backgroundColor = '';
          
          if (item.submenu && activeSubmenu) {
            // Don't hide submenu immediately, check if mouse is over it
            setTimeout(() => {
              if (activeSubmenu && !isMouseOverElement(activeSubmenu)) {
                activeSubmenu.style.display = 'none';
                activeSubmenu = null;
              }
            }, 100);
          }
        });
        
        return menuItem;
      };
      
      const createSubmenu = (submenuItems: any[], parentItem: HTMLElement): HTMLElement => {
        const submenu = document.createElement('div');
        submenu.className = 'dark-context-submenu';
        submenu.style.position = 'absolute';
        submenu.style.top = '0';
        submenu.style.left = '100%';
        submenu.style.backgroundColor = this.colors.surface;
        submenu.style.border = `1px solid ${this.colors.border}`;
        submenu.style.borderRadius = '4px';
        submenu.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        submenu.style.minWidth = '180px';
        submenu.style.zIndex = '10001';
        
        submenuItems.forEach(subitem => {
          const submenuItem = createMenuItem(subitem);
          submenu.appendChild(submenuItem);
        });
        
        // Position submenu
        const parentRect = parentItem.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        
        // Check if submenu would go off-screen to the right
        if (parentRect.right + 180 > viewportWidth) {
          submenu.style.left = 'auto';
          submenu.style.right = '100%';
        }
        
        parentItem.appendChild(submenu);
        return submenu;
      };
      
      const isMouseOverElement = (element: HTMLElement): boolean => {
        const rect = element.getBoundingClientRect();
        const x = (event as MouseEvent)?.clientX || 0;
        const y = (event as MouseEvent)?.clientY || 0;
        
        return (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        );
      };
      
      const createMenu = () => {
        if (menu) {
          document.body.removeChild(menu);
        }
        
        menu = document.createElement('div');
        menu.className = 'dark-context-menu';
        menu.style.position = 'fixed';
        menu.style.zIndex = '10000';
        menu.style.backgroundColor = this.colors.surface;
        menu.style.color = this.colors.onSurface;
        menu.style.border = `1px solid ${this.colors.border}`;
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        menu.style.minWidth = '180px';
        menu.style.display = 'none';
        
        items.forEach(item => {
          const menuItem = createMenuItem(item);
          menu!.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
      };
      
      const showMenu = (x: number, y: number) => {
        if (!menu) {
          createMenu();
        }
        
        // Position the menu
        menu!.style.left = `${x}px`;
        menu!.style.top = `${y}px`;
        menu!.style.display = 'block';
        
        // Check if the menu is out of viewport bounds
        const menuRect = menu!.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (menuRect.right > viewportWidth) {
          menu!.style.left = `${x - menuRect.width}px`;
        }
        
        if (menuRect.bottom > viewportHeight) {
          menu!.style.top = `${y - menuRect.height}px`;
        }
        
        // Add global click handler to hide menu
        setTimeout(() => {
          document.addEventListener('click', hideOnClickOutside);
        }, 0);
      };
      
      const hideMenu = () => {
        if (menu) {
          menu.style.display = 'none';
        }
        
        if (activeSubmenu) {
          activeSubmenu.style.display = 'none';
          activeSubmenu = null;
        }
        
        document.removeEventListener('click', hideOnClickOutside);
      };
      
      const hideOnClickOutside = (e: MouseEvent) => {
        if (menu && !menu.contains(e.target as Node)) {
          hideMenu();
        }
      };
      
      const updateMenuItems = (newItems: any[]) => {
        items.length = 0;
        items.push(...newItems);
        
        if (menu) {
          document.body.removeChild(menu);
          menu = null;
        }
      };
      
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY);
      };
      
      // Public API
      return {
        attach: (target: HTMLElement) => {
          target.addEventListener('contextmenu', handleContextMenu);
        },
        
        detach: (target: HTMLElement) => {
          target.removeEventListener('contextmenu', handleContextMenu);
        },
        
        show: showMenu,
        
        hide: hideMenu,
        
        updateItems: updateMenuItems
      };
    }
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
    
    /**
     * Initialize a canvas for dark mode charts
     */
    static initCanvas(
      container: HTMLElement | string,
      width: number = 600,
      height: number = 400
    ): HTMLCanvasElement {
      const parentElement = typeof container === 'string' 
        ? document.querySelector(container) as HTMLElement
        : container;
      
      if (!parentElement) {
        throw new Error(`Container ${container} not found`);
      }
      
      // Clear container
      parentElement.innerHTML = '';
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.style.display = 'block';
      canvas.style.backgroundColor = this.chartColors.background;
      canvas.style.borderRadius = '8px';
      
      parentElement.appendChild(canvas);
      
      return canvas;
    }
    
    /**
     * Create a simple line chart
     */
    static createLineChart(
      container: HTMLElement | string,
      data: {
        labels: string[];
        datasets: Array<{
          name: string;
          data: number[];
          color?: string;
          lineWidth?: number;
          dashed?: boolean;
          fill?: boolean;
        }>;
      },
      options: {
        width?: number;
        height?: number;
        title?: string;
        xAxisLabel?: string;
        yAxisLabel?: string;
        gridLines?: boolean;
        legend?: boolean;
        animation?: boolean;
        padding?: { top: number; right: number; bottom: number; left: number };
        yAxisMin?: number;
        yAxisMax?: number;
      } = {}
    ): {
      update: (newData: typeof data) => void;
      resize: (width: number, height: number) => void;
      toImage: () => string;
    } {
      const {
        width = 600,
        height = 400,
        title,
        xAxisLabel,
        yAxisLabel,
        gridLines = true,
        legend = true,
        animation = true,
        padding = { top: 40, right: 40, bottom: 60, left: 60 },
        yAxisMin,
        yAxisMax
      } = options;
      
      // Initialize canvas
      const canvas = this.initCanvas(container, width, height);
      const ctx = canvas.getContext('2d')!;
      
      // Store chart data and state
      let chartData = data;
      let animationProgress = 0;
      let animationFrameId: number | null = null;
      
      // Helper function to draw the chart
      const drawChart = (progress: number = 1) => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        ctx.fillStyle = this.chartColors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set chart area dimensions
        const chartLeft = padding.left;
        const chartTop = padding.top;
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;
        const chartBottom = chartTop + chartHeight;
        
        // Draw title if provided
        if (title) {
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = this.chartColors.text;
          ctx.textAlign = 'center';
          ctx.fillText(title, canvas.width / 2, 24);
        }
        
        // Find min and max values for Y axis scaling
        let minValue = yAxisMin !== undefined ? yAxisMin : Infinity;
        let maxValue = yAxisMax !== undefined ? yAxisMax : -Infinity;
        
        chartData.datasets.forEach(dataset => {
          dataset.data.forEach(value => {
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
          });
        });
        
        // Add some padding to the range
        if (minValue === maxValue) {
          minValue = minValue > 0 ? 0 : minValue * 1.1;
          maxValue = maxValue > 0 ? maxValue * 1.1 : 0;
        } else {
          const range = maxValue - minValue;
          minValue = yAxisMin !== undefined ? yAxisMin : minValue - range * 0.05;
          maxValue = yAxisMax !== undefined ? yAxisMax : maxValue + range * 0.05;
        }
        
        // Draw Y axis
        ctx.beginPath();
        ctx.strokeStyle = this.chartColors.grid;
        ctx.lineWidth = 1;
        ctx.moveTo(chartLeft, chartTop);
        ctx.lineTo(chartLeft, chartBottom);
        ctx.stroke();
        
        // Draw Y axis label if provided
        if (yAxisLabel) {
          ctx.save();
          ctx.font = '12px Arial';
          ctx.fillStyle = this.chartColors.text;
          ctx.textAlign = 'center';
          ctx.translate(padding.left / 3, chartTop + chartHeight / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(yAxisLabel, 0, 0);
          ctx.restore();
        }
        
        // Draw Y axis ticks and grid lines
        const numYTicks = 5;
        for (let i = 0; i <= numYTicks; i++) {
          const value = minValue + (maxValue - minValue) * (numYTicks - i) / numYTicks;
          const y = chartTop + (chartHeight * i / numYTicks);
          
          // Draw tick
          ctx.beginPath();
          ctx.strokeStyle = this.chartColors.grid;
          ctx.lineWidth = 1;
          ctx.moveTo(chartLeft - 5, y);
          ctx.lineTo(chartLeft, y);
          ctx.stroke();
          
          // Draw grid line
          if (gridLines && i > 0 && i < numYTicks) {
            ctx.beginPath();
            ctx.strokeStyle = this.chartColors.grid;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([4, 4]);
            ctx.moveTo(chartLeft, y);
            ctx.lineTo(chartLeft + chartWidth, y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // Draw tick label
          ctx.font = '12px Arial';
          ctx.fillStyle = this.chartColors.text;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(value.toFixed(1), chartLeft - 8, y);
        }
        
        // Draw X axis
        ctx.beginPath();
        ctx.strokeStyle = this.chartColors.grid;
        ctx.lineWidth = 1;
        ctx.moveTo(chartLeft, chartBottom);
        ctx.lineTo(chartLeft + chartWidth, chartBottom);
        ctx.stroke();
        
        // Draw X axis label if provided
        if (xAxisLabel) {
          ctx.font = '12px Arial';
          ctx.fillStyle = this.chartColors.text;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(xAxisLabel, chartLeft + chartWidth / 2, chartBottom + padding.bottom * 0.7);
        }
        
        // Draw X axis ticks and labels
        const numLabels = chartData.labels.length;
        const xStep = chartWidth / (numLabels - 1 || 1);
        
        chartData.labels.forEach((label, i) => {
          const x = chartLeft + xStep * i;
          
          // Draw tick
          ctx.beginPath();
          ctx.strokeStyle = this.chartColors.grid;
          ctx.lineWidth = 1;
          ctx.moveTo(x, chartBottom);
          ctx.lineTo(x, chartBottom + 5);
          ctx.stroke();
          
          // Draw grid line
          if (gridLines && i > 0 && i < numLabels - 1) {
            ctx.beginPath();
            ctx.strokeStyle = this.chartColors.grid;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([4, 4]);
            ctx.moveTo(x, chartBottom);
            ctx.lineTo(x, chartTop);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // Draw tick label
          ctx.font = '12px Arial';
          ctx.fillStyle = this.chartColors.text;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(label, x, chartBottom + 8);
        });
        
        // Draw data lines
        chartData.datasets.forEach((dataset, datasetIndex) => {
          const color = dataset.color || this.chartColors.palette[datasetIndex % this.chartColors.palette.length];
          const lineWidth = dataset.lineWidth || 2;
          
          if (dataset.dashed) {
            ctx.setLineDash([6, 4]);
          } else {
            ctx.setLineDash([]);
          }
          
          // Draw line
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          
          dataset.data.forEach((value, i) => {
            const x = chartLeft + xStep * i;
            const valueProgress = animation ? value * progress : value;
            const y = chartBottom - ((valueProgress - minValue) / (maxValue - minValue)) * chartHeight;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          
          ctx.stroke();
          
          // Fill area under line if requested
          if (dataset.fill) {
            ctx.lineTo(chartLeft + xStep * (dataset.data.length - 1), chartBottom);
            ctx.lineTo(chartLeft, chartBottom);
            ctx.closePath();
            ctx.fillStyle = color + '33'; // Add transparency
            ctx.fill();
          }
          
          // Reset line dash
          ctx.setLineDash([]);
          
          // Draw data points
          dataset.data.forEach((value, i) => {
            const x = chartLeft + xStep * i;
            const valueProgress = animation ? value * progress : value;
            const y = chartBottom - ((valueProgress - minValue) / (maxValue - minValue)) * chartHeight;
            
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.fillStyle = this.chartColors.background;
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          });
        });
        
        // Draw legend if enabled
        if (legend && chartData.datasets.length > 0) {
          const legendX = chartLeft;
          const legendY = chartTop - 20;
          const itemWidth = chartWidth / chartData.datasets.length;
          
          chartData.datasets.forEach((dataset, i) => {
            const color = dataset.color || this.chartColors.palette[i % this.chartColors.palette.length];
            const x = legendX + (itemWidth * i) + 15;
            
            // Draw legend marker
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(x, legendY, 4, 0, Math.PI * 2);
            ctx.fill();
            
            if (dataset.dashed) {
              ctx.beginPath();
              ctx.strokeStyle = color;
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 2]);
              ctx.moveTo(x - 8, legendY);
              ctx.lineTo(x + 8, legendY);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            
            // Draw legend text
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(dataset.name, x + 8, legendY);
          });
        }
      };
      
      // Handle animation
      const animate = () => {
        animationProgress += 0.05;
        
        if (animationProgress < 1) {
          drawChart(animationProgress);
          animationFrameId = requestAnimationFrame(animate);
        } else {
          drawChart(1);
          animationFrameId = null;
        }
      };
      
      // Initial draw
      if (animation) {
        animationProgress = 0;
        animate();
      } else {
        drawChart();
      }
      
      // Return methods for updating the chart
      return {
        update: (newData) => {
          chartData = newData;
          
          if (animation) {
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
            }
            
            animationProgress = 0;
            animate();
          } else {
            drawChart();
          }
        },
        
        resize: (newWidth, newHeight) => {
          canvas.width = newWidth;
          canvas.height = newHeight;
          drawChart();
        },
        
        toImage: () => {
          return canvas.toDataURL('image/png');
        }
      };
    }
    
    /**
     * Create a bar chart
     */
    static createBarChart(
      container: HTMLElement | string,
      data: {
        labels: string[];
        datasets: Array<{
          name: string;
          data: number[];
          color?: string;
          borderColor?: string;
        }>;
      },
      options: {
        width?: number;
        height?: number;
        title?: string;
        xAxisLabel?: string;
        yAxisLabel?: string;
        gridLines?: boolean;
        legend?: boolean;
        animation?: boolean;
        padding?: { top: number; right: number; bottom: number; left: number };
        yAxisMin?: number;
        yAxisMax?: number;
        stacked?: boolean;
        horizontal?: boolean;
      } = {}
    ): {
      update: (newData: typeof data) => void;
      resize: (width: number, height: number) => void;
      toImage: () => string;
    } {
      const {
        width = 600,
        height = 400,
        title,
        xAxisLabel,
        yAxisLabel,
        gridLines = true,
        legend = true,
        animation = true,
        padding = { top: 40, right: 40, bottom: 60, left: 60 },
        yAxisMin,
        yAxisMax,
        stacked = false,
        horizontal = false
      } = options;
      
      // Initialize canvas
      const canvas = this.initCanvas(container, width, height);
      const ctx = canvas.getContext('2d')!;
      
      // Store chart data and state
      let chartData = data;
      let animationProgress = 0;
      let animationFrameId: number | null = null;
      
      // Helper function to draw the chart
      const drawChart = (progress: number = 1) => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        ctx.fillStyle = this.chartColors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set chart area dimensions
        const chartLeft = padding.left;
        const chartTop = padding.top;
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;
        const chartBottom = chartTop + chartHeight;
        const chartRight = chartLeft + chartWidth;
        
        // Draw title if provided
        if (title) {
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = this.chartColors.text;
          ctx.textAlign = 'center';
          ctx.fillText(title, canvas.width / 2, 24);
        }
        
        // Find min and max values for scaling
        let minValue = yAxisMin !== undefined ? yAxisMin : 0;
        let maxValue = yAxisMax !== undefined ? yAxisMax : -Infinity;
        
        if (stacked) {
          // For stacked bars, we need to calculate sums for each data point
          const sums = new Array(chartData.labels.length).fill(0);
          
          chartData.datasets.forEach(dataset => {
            dataset.data.forEach((value, i) => {
              sums[i] += value;
            });
          });
          
          maxValue = Math.max(maxValue, ...sums);
        } else {
          // For regular bars, find max across all datasets
          chartData.datasets.forEach(dataset => {
            maxValue = Math.max(maxValue, ...dataset.data);
          });
        }
        
        // Add padding to max value
        maxValue = maxValue * 1.1;
        
        // Draw axes based on orientation
        if (horizontal) {
          // Draw X axis (which is now the value axis)
          ctx.beginPath();
          ctx.strokeStyle = this.chartColors.grid;
          ctx.lineWidth = 1;
          ctx.moveTo(chartLeft, chartBottom);
          ctx.lineTo(chartRight, chartBottom);
          ctx.stroke();
          
          // Draw X axis label if provided
          if (xAxisLabel) {
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(xAxisLabel, chartLeft + chartWidth / 2, chartBottom + padding.bottom * 0.7);
          }
          
          // Draw X axis ticks and grid lines
          const numXTicks = 5;
          for (let i = 0; i <= numXTicks; i++) {
            const value = minValue + (maxValue - minValue) * i / numXTicks;
            const x = chartLeft + (chartWidth * i / numXTicks);
            
            // Draw tick
            ctx.beginPath();
            ctx.strokeStyle = this.chartColors.grid;
            ctx.lineWidth = 1;
            ctx.moveTo(x, chartBottom);
            ctx.lineTo(x, chartBottom + 5);
            ctx.stroke();
            
            // Draw grid line
            if (gridLines && i > 0) {
              ctx.beginPath();
              ctx.strokeStyle = this.chartColors.grid;
              ctx.lineWidth = 0.5;
              ctx.setLineDash([4, 4]);
              ctx.moveTo(x, chartBottom);
              ctx.lineTo(x, chartTop);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            
            // Draw tick label
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(value.toFixed(0), x, chartBottom + 8);
          }
          
          // Draw Y axis (which is now the category axis)
          ctx.beginPath();
          ctx.strokeStyle = this.chartColors.grid;
          ctx.lineWidth = 1;
          ctx.moveTo(chartLeft, chartTop);
          ctx.lineTo(chartLeft, chartBottom);
          ctx.stroke();
          
          // Draw Y axis label if provided
          if (yAxisLabel) {
            ctx.save();
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'center';
            ctx.translate(padding.left / 3, chartTop + chartHeight / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(yAxisLabel, 0, 0);
            ctx.restore();
          }
          
          // Calculate bar dimensions
          const barHeight = chartHeight / chartData.labels.length / (stacked ? 1 : chartData.datasets.length + 0.2);
          const groupHeight = stacked ? barHeight : barHeight * chartData.datasets.length;
          const barPadding = chartHeight * 0.1 / chartData.labels.length;
          
          // Draw bars
          chartData.labels.forEach((label, labelIndex) => {
            const groupY = chartTop + (groupHeight + barPadding) * labelIndex;
            let stackOffset = 0;
            
            // Draw the label
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, chartLeft - 8, groupY + groupHeight / 2);
            
            // Draw dataset bars
            chartData.datasets.forEach((dataset, datasetIndex) => {
              const color = dataset.color || this.chartColors.palette[datasetIndex % this.chartColors.palette.length];
              const borderColor = dataset.borderColor || color;
              const value = dataset.data[labelIndex] || 0;
              const valueProgress = animation ? value * progress : value;
              
              const y = stacked
                ? groupY + stackOffset
                : groupY + barHeight * datasetIndex;
              
              const barWidth = (valueProgress / maxValue) * chartWidth;
              
              // Draw bar
              ctx.fillStyle = color;
              ctx.strokeStyle = borderColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.rect(chartLeft, y, barWidth, barHeight);
              ctx.fill();
              ctx.stroke();
              
              if (stacked) {
                stackOffset += barHeight;
              }
            });
          });
          
        } else {
          // Vertical bar chart (default)
          
          // Draw Y axis
          ctx.beginPath();
          ctx.strokeStyle = this.chartColors.grid;
          ctx.lineWidth = 1;
          ctx.moveTo(chartLeft, chartTop);
          ctx.lineTo(chartLeft, chartBottom);
          ctx.stroke();
          
          // Draw Y axis label if provided
          if (yAxisLabel) {
            ctx.save();
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'center';
            ctx.translate(padding.left / 3, chartTop + chartHeight / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(yAxisLabel, 0, 0);
            ctx.restore();
          }
          
          // Draw Y axis ticks and grid lines
          const numYTicks = 5;
          for (let i = 0; i <= numYTicks; i++) {
            const value = minValue + (maxValue - minValue) * (numYTicks - i) / numYTicks;
            const y = chartTop + (chartHeight * i / numYTicks);
            
            // Draw tick
            ctx.beginPath();
            ctx.strokeStyle = this.chartColors.grid;
            ctx.lineWidth = 1;
            ctx.moveTo(chartLeft - 5, y);
            ctx.lineTo(chartLeft, y);
            ctx.stroke();
            
            // Draw grid line
            if (gridLines && i > 0) {
              ctx.beginPath();
              ctx.strokeStyle = this.chartColors.grid;
              ctx.lineWidth = 0.5;
              ctx.setLineDash([4, 4]);
              ctx.moveTo(chartLeft, y);
              ctx.lineTo(chartLeft + chartWidth, y);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            
            // Draw tick label
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(value.toFixed(0), chartLeft - 8, y);
          }
          
          // Draw X axis
          ctx.beginPath();
          ctx.strokeStyle = this.chartColors.grid;
          ctx.lineWidth = 1;
          ctx.moveTo(chartLeft, chartBottom);
          ctx.lineTo(chartLeft + chartWidth, chartBottom);
          ctx.stroke();
          
          // Draw X axis label if provided
          if (xAxisLabel) {
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(xAxisLabel, chartLeft + chartWidth / 2, chartBottom + padding.bottom * 0.7);
          }
          
          // Calculate bar dimensions
          const barWidth = chartWidth / chartData.labels.length / (stacked ? 1 : chartData.datasets.length + 0.2);
          const groupWidth = stacked ? barWidth : barWidth * chartData.datasets.length;
          const barPadding = chartWidth * 0.1 / chartData.labels.length;
          
          // Draw bars
          chartData.labels.forEach((label, labelIndex) => {
            const groupX = chartLeft + (groupWidth + barPadding) * labelIndex;
            let stackOffset = 0;
            
            // Draw the label
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(label, groupX + groupWidth / 2, chartBottom + 8);
            
            // Draw dataset bars
            chartData.datasets.forEach((dataset, datasetIndex) => {
              const color = dataset.color || this.chartColors.palette[datasetIndex % this.chartColors.palette.length];
              const borderColor = dataset.borderColor || color;
              const value = dataset.data[labelIndex] || 0;
              const valueProgress = animation ? value * progress : value;
              
              const x = stacked
                ? groupX
                : groupX + barWidth * datasetIndex;
              
              const barHeight = (valueProgress / maxValue) * chartHeight;
              
              // Draw bar
              ctx.fillStyle = color;
              ctx.strokeStyle = borderColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              
              if (stacked) {
                ctx.rect(x, chartBottom - barHeight - stackOffset, barWidth, barHeight);
                stackOffset += barHeight;
              } else {
                ctx.rect(x, chartBottom - barHeight, barWidth, barHeight);
              }
              
              ctx.fill();
              ctx.stroke();
            });
          });
        }
        
        // Draw legend if enabled
        if (legend && chartData.datasets.length > 0) {
          const legendX = chartLeft;
          const legendY = chartTop - 20;
          const itemWidth = chartWidth / chartData.datasets.length;
          
          chartData.datasets.forEach((dataset, i) => {
            const color = dataset.color || this.chartColors.palette[i % this.chartColors.palette.length];
            const x = legendX + (itemWidth * i) + 15;
            
            // Draw legend marker
            ctx.fillStyle = color;
            ctx.fillRect(x - 8, legendY - 4, 16, 8);
            ctx.strokeStyle = dataset.borderColor || color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 8, legendY - 4, 16, 8);
            
            // Draw legend text
            ctx.font = '12px Arial';
            ctx.fillStyle = this.chartColors.text;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(dataset.name, x + 15, legendY);
          });
        }
      };
      
      // Handle animation
      const animate = () => {
        animationProgress += 0.05;
        
        if (animationProgress < 1) {
          drawChart(animationProgress);
          animationFrameId = requestAnimationFrame(animate);
        } else {
          drawChart(1);
          animationFrameId = null;
        }
      };
      
      // Initial draw
      if (animation) {
        animationProgress = 0;
        animate();
      } else {
        drawChart();
      }
      
      // Return methods for updating the chart
      return {
        update: (newData) => {
          chartData = newData;
          
          if (animation) {
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
            }
            
            animationProgress = 0;
            animate();
          } else {
            drawChart();
          }
        },
        
        resize: (newWidth, newHeight) => {
          canvas.width = newWidth;
          canvas.height = newHeight;
          drawChart();
        },
        
        toImage: () => {
          return canvas.toDataURL('image/png');
        }
      };
    }
}
    
    // /**
    //  * Create a pie or donut chart
    //  */
    // static createPieChart(
    //   container: HTMLElement | string,
    //   data: Array<{
    //     label: string;
    //     value: number;
    //     color?: string;
    //   }>,
    //   options: {
    //     width?: number;
    //     height?: number;
    //     title?: string;
    //     donut?: boolean;
    //     donutRatio?: number;
    //     legend?: boolean;
    //     animation?: boolean;
    //     labelPosition?: 'inside' | 'outside' | 'none';
    //     showPercentages?: boolean;
    //   } = {}
    // ): {
    //   update: (newData: typeof data) => void;
    //   resize: (width: number, height: number) => void;
    //   toImage: () => string;
    // } {
    //   const {
    //     width = 500,
    //     height = 500,
    //     title,