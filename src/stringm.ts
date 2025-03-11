// ===================================================
// STRING MANIPULATION
// ===================================================

/**
 * [String] Capitalizes the first letter of a string
 */
export const capitalize = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  /**
   * [String] Converts a string to camelCase
   */
  export const toCamelCase = (str: string): string => {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase())
      .replace(/\s+/g, '');
  };
  
  /**
   * [String] Converts a string to kebab-case
   */
  export const toKebabCase = (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  };
  
  /**
   * [String] Converts a string to snake_case
   */
  export const toSnakeCase = (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  };
  
  /**
   * [String] Truncates a string to a specified length and adds ellipsis
   */
  export const truncate = (str: string, length: number, ending: string = '...'): string => {
    if (str.length <= length) return str;
    return str.substring(0, length - ending.length) + ending;
  };
  
  /**
   * [String] Removes all HTML tags from a string
   */
  export const stripHtml = (html: string): string => {
    return html.replace(/<\/?[^>]+(>|$)/g, '');
  };
  
  /**
   * [String] Escapes special characters for use in HTML
   */
  export const escapeHtml = (str: string): string => {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, match => htmlEscapes[match]);
  };
  
  /**
   * [String] Generates a random string of specified length
   */
  export const randomString = (length: number, chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string => {
    let result = '';
    const charsLength = chars.length;
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * charsLength));
    }
    return result;
  };
  
  /**
   * [String] Slugifies a string for use in URLs
   */
  export const slugify = (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
  
  /**
   * [String] Formats a string template with provided values
   */
  export const formatString = (template: string, values: Record<string, any>): string => {
    return template.replace(/\${(.*?)}/g, (_, key) => values[key] || '');
  };
  
  /**
   * [String] Extracts all URLs from a text
   */
  export const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };
  
  /**
   * [String] Masks a string except for the last n characters
   */
  export const maskString = (str: string, visibleChars: number = 4, mask: string = '*'): string => {
    if (str.length <= visibleChars) return str;
    return mask.repeat(str.length - visibleChars) + str.slice(-visibleChars);
  };
  