/**
 * A simple JavaScript module to test the manifest extractor
 */

import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Reads and processes a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Processed content
 */
export async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return content.toUpperCase();
  } catch (err) {
    throw new Error(`Failed to process file: ${err.message}`);
  }
}

/**
 * A sample Person class
 */
export class Person {
  /**
   * @param {string} name - Person's name
   * @param {number} age - Person's age
   */
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  /**
   * Greet someone
   * @param {string} other - Person to greet
   * @returns {string} - Greeting message
   */
  greet(other) {
    return `Hello ${other}, my name is ${this.name}`;
  }

  /**
   * Get person's details
   * @returns {object} - Person details
   */
  getDetails() {
    return {
      name: this.name,
      age: this.age,
      adult: this.age >= 18
    };
  }
}

/**
 * A simple utility function
 * @param {string} str - String to format
 * @returns {string} - Formatted string
 */
export const formatString = (str) => {
  return str.trim().toLowerCase();
};

export default {
  processFile,
  Person,
  formatString
}; 