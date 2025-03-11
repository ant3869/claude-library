
  // ===================================================
  // DATE & TIME
  // ===================================================
  
  /**
   * [DateTime] Formats a date using specified options
   */
  export const formatDate = (date: Date, options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }, locale: string = 'en-US'): string => {
    return new Intl.DateTimeFormat(locale, options).format(date);
  };
  
  /**
   * [DateTime] Adds a specified number of days to a date
   */
  export const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  /**
   * [DateTime] Adds a specified number of months to a date
   */
  export const addMonths = (date: Date, months: number): Date => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };
  
  /**
   * [DateTime] Gets the difference between two dates in days
   */
  export const getDaysDifference = (date1: Date, date2: Date): number => {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  /**
   * [DateTime] Checks if a date is between two other dates
   */
  export const isDateBetween = (date: Date, startDate: Date, endDate: Date): boolean => {
    return date >= startDate && date <= endDate;
  };
  
  /**
   * [DateTime] Gets the start of a day (midnight)
   */
  export const startOfDay = (date: Date): Date => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };
  
  /**
   * [DateTime] Gets the end of a day (23:59:59.999)
   */
  export const endOfDay = (date: Date): Date => {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  };
  
  /**
   * [DateTime] Gets the start of a month
   */
  export const startOfMonth = (date: Date): Date => {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  };
  
  /**
   * [DateTime] Gets the end of a month
   */
  export const endOfMonth = (date: Date): Date => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1);
    result.setDate(0);
    result.setHours(23, 59, 59, 999);
    return result;
  };
  
  /**
   * [DateTime] Formats a time duration in seconds to human readable format
   */
  export const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  };
  
  /**
   * [DateTime] Converts a date to ISO string without timezone info
   */
  export const toLocalISOString = (date: Date): string => {
    const pad = (num: number) => String(num).padStart(2, '0');
    
    return (
      date.getFullYear() +
      '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) +
      ':' + pad(date.getMinutes()) +
      ':' + pad(date.getSeconds()) +
      '.' + String((date.getMilliseconds() / 1000).toFixed(3)).slice(2, 5)
    );
  };
  
  /**
   * [DateTime] Gets relative time description (e.g., "2 hours ago")
   */
  export const getRelativeTime = (date: Date, baseDate: Date = new Date()): string => {
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = date.getTime() - baseDate.getTime();
    const diffAbs = Math.abs(diff);
    
    const seconds = diffAbs / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    const weeks = days / 7;
    const months = days / 30;
    const years = days / 365;
    
    const sign = diff >= 0 ? 1 : -1;
    
    if (seconds < 60) return formatter.format(sign * Math.round(seconds), 'second');
    if (minutes < 60) return formatter.format(sign * Math.round(minutes), 'minute');
    if (hours < 24) return formatter.format(sign * Math.round(hours), 'hour');
    if (days < 7) return formatter.format(sign * Math.round(days), 'day');
    if (weeks < 4) return formatter.format(sign * Math.round(weeks), 'week');
    if (months < 12) return formatter.format(sign * Math.round(months), 'month');
    return formatter.format(sign * Math.round(years), 'year');
  };
  
  