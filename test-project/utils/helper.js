/**
 * Helper utilities
 */

/**
 * Generates a random ID
 * @param {number} length - ID length
 * @returns {string} - Random ID
 */
export function generateId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Formats a date
 * @param {Date} date - Date to format
 * @param {string} format - Format string
 * @returns {string} - Formatted date
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}

export const CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_ITEMS: 100,
  VERSION: '1.0.0',
};

export default {
  generateId,
  formatDate,
  CONSTANTS,
}; 