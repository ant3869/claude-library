// ===================================================
// TEXT FORMATTING UTILITIES
// ===================================================

/**
 * [Formatting] Color text utilities for logs and console output
 */
export const colorize = {
    // Terminal colors (ANSI escape codes)
    success: (text: string): string => `\x1b[32m${text}\x1b[0m`, // Green
    info: (text: string): string => `\x1b[34m${text}\x1b[0m`,    // Blue
    warning: (text: string): string => `\x1b[33m${text}\x1b[0m`, // Yellow
    error: (text: string): string => `\x1b[31m${text}\x1b[0m`,   // Red
    highlight: (text: string): string => `\x1b[35m${text}\x1b[0m`, // Magenta
    
    // Browser console formatting
    browserSuccess: (text: string): [string, string] => [`%c${text}`, 'color: #48c774; font-weight: bold;'],
    browserInfo: (text: string): [string, string] => [`%c${text}`, 'color: #3298dc; font-weight: bold;'],
    browserWarning: (text: string): [string, string] => [`%c${text}`, 'color: #ffdd57; font-weight: bold;'],
    browserError: (text: string): [string, string] => [`%c${text}`, 'color: #f14668; font-weight: bold;'],
    browserHighlight: (text: string): [string, string] => [`%c${text}`, 'color: #9c27b0; font-weight: bold;'],
    
    // Custom browser console coloring
    browserColorize: (text: string, color: string): [string, string] => [`%c${text}`, `color: ${color};`],
    browserCustom: (text: string, styles: string): [string, string] => [`%c${text}`, styles],
    
    // HTML formatting with spans
    toHTML: (text: string, color: string): string => `<span style="color: ${color}">${text}</span>`,
    toHTMLClass: (text: string, className: string): string => `<span class="${className}">${text}</span>`,
  };
  
  /**
   * [Formatting] Parse JSON with error handling and type safety
   */
  export const parseJSON = <T>(text: string, defaultValue?: T): T => {
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      console.error('JSON parsing error:', error);
      return defaultValue as T;
    }
  };
  
  /**
   * [Formatting] CSV parsing options
   */
  export interface CSVParseOptions {
    delimiter?: string;
    hasHeader?: boolean;
    trimValues?: boolean;
    skipEmptyLines?: boolean;
    quoteChar?: string;
  }
  
  /**
   * [Formatting] Parse CSV data with options
   */
  export const parseCSV = (text: string, options: CSVParseOptions = {}): string[][] => {
    const {
      delimiter = ',',
      hasHeader = true,
      trimValues = true,
      skipEmptyLines = true,
      quoteChar = '"'
    } = options;
    
    const lines = text.split('\n');
    const result: string[][] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (skipEmptyLines && !line) {
        continue;
      }
      
      // Handle quoted values with embedded delimiters
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === quoteChar) {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(trimValues ? currentValue.trim() : currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the final value
      values.push(trimValues ? currentValue.trim() : currentValue);
      
      // Remove quotes around values
      const cleanValues = values.map(val => {
        if (val.startsWith(quoteChar) && val.endsWith(quoteChar)) {
          return val.substring(1, val.length - 1).replace(new RegExp(`${quoteChar}${quoteChar}`, 'g'), quoteChar);
        }
        return val;
      });
      
      result.push(cleanValues);
    }
    
    return result;
  };
  
  /**
   * [Formatting] Convert array to CSV
   */
  export const toCSV = (data: any[][], options: { 
    delimiter?: string; 
    includeHeader?: boolean;
    quoteStrings?: boolean;
    quoteChar?: string;
  } = {}): string => {
    const { 
      delimiter = ',', 
      includeHeader = true,
      quoteStrings = true,
      quoteChar = '"'
    } = options;
    
    return data
      .filter((row, index) => includeHeader || index > 0)
      .map(row => {
        return row.map(value => {
          // Handle values with delimiters, quotes or newlines
          if (value === null || value === undefined) {
            return '';
          }
          
          const stringValue = String(value);
          if (quoteStrings && (
            stringValue.includes(delimiter) || 
            stringValue.includes(quoteChar) || 
            stringValue.includes('\n')
          )) {
            return `${quoteChar}${stringValue.replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar)}${quoteChar}`;
          }
          
          return stringValue;
        }).join(delimiter);
      }).join('\n');
  };
  
  /**
   * [Formatting] Convert CSV to JSON objects
   */
  export const csvToJSON = <T extends Record<string, any> = Record<string, string>>(
    csv: string, 
    options: CSVParseOptions = {}
  ): T[] => {
    const { hasHeader = true } = options;
    const parsedCSV = parseCSV(csv, options);
    
    if (parsedCSV.length === 0) {
      return [];
    }
    
    if (!hasHeader) {
      return parsedCSV.map(row => {
        const obj: Record<string, string> = {};
        for (let i = 0; i < row.length; i++) {
          obj[`column${i}`] = row[i];
        }
        return obj as T;
      });
    }
    
    const headers = parsedCSV[0];
    return parsedCSV.slice(1).map(row => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < Math.min(headers.length, row.length); i++) {
        obj[headers[i]] = row[i];
      }
      return obj as T;
    });
  };
  
  /**
   * [Formatting] Convert JSON to CSV
   */
  export const jsonToCSV = <T extends Record<string, any>>(
    data: T[], 
    options: {
      delimiter?: string;
      header?: boolean;
      columns?: string[];
    } = {}
  ): string => {
    const { delimiter = ',', header = true, columns } = options;
    
    if (data.length === 0) {
      return '';
    }
    
    // Determine columns to include
    const fields = columns || Object.keys(data[0]);
    
    // Create CSV rows
    const rows: string[][] = [];
    
    // Add header row if requested
    if (header) {
      rows.push(fields);
    }
    
    // Add data rows
    data.forEach(item => {
      const row = fields.map(field => {
        const value = item[field];
        return value === null || value === undefined ? '' : String(value);
      });
      rows.push(row);
    });
    
    return toCSV(rows, { delimiter });
  };
  
  /**
   * [Formatting] Format file size to human-readable string
   */
  export const formatFileSize = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  /**
   * [Formatting] Format date/time according to specified format
   */
  export const formatDate = (
    date: Date | string | number,
    format: string = 'YYYY-MM-DD HH:mm:ss'
  ): string => {
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    
    const pad = (num: number): string => String(num).padStart(2, '0');
    
    const tokens: Record<string, string> = {
      YYYY: String(d.getFullYear()),
      YY: String(d.getFullYear()).slice(-2),
      MM: pad(d.getMonth() + 1),
      DD: pad(d.getDate()),
      HH: pad(d.getHours()),
      hh: pad(d.getHours() > 12 ? d.getHours() - 12 : d.getHours()),
      mm: pad(d.getMinutes()),
      ss: pad(d.getSeconds()),
      SSS: String(d.getMilliseconds()).padStart(3, '0'),
      A: d.getHours() < 12 ? 'AM' : 'PM',
      a: d.getHours() < 12 ? 'am' : 'pm',
    };
    
    return format.replace(/YYYY|YY|MM|DD|HH|hh|mm|ss|SSS|A|a/g, match => tokens[match] || match);
  };
  
  /**
   * [Formatting] Truncate text to specified length with ellipsis
   */
  export const truncateText = (text: string, maxLength: number, ellipsis: string = '...'): string => {
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    return text.slice(0, maxLength - ellipsis.length) + ellipsis;
  };
  
  /**
   * [Formatting] Convert string to sentence case
   */
  export const toSentenceCase = (text: string): string => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };
  
  /**
   * [Formatting] Convert string to title case
   */
  export const toTitleCase = (text: string): string => {
    if (!text) return text;
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  /**
   * [Formatting] Convert camelCase to kebab-case
   */
  export const camelToKebab = (text: string): string => {
    return text.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  };
  
  /**
   * [Formatting] Convert kebab-case to camelCase
   */
  export const kebabToCamel = (text: string): string => {
    return text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  };
  
  /**
   * [Formatting] Format number with thousands separator
   */
  export const formatNumber = (num: number, options: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}): string => {
    const {
      locale = 'en-US',
      minimumFractionDigits = 0,
      maximumFractionDigits = 2
    } = options;
    
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(num);
  };