/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when user input is invalid
 */
export class UserInputError extends AppError {
  constructor(message) {
    super(message);
  }
}

/**
 * Error thrown when there's an issue with file operations
 */
export class FileSystemError extends AppError {
  constructor(message, path) {
    super(message);
    this.path = path;
  }
}

/**
 * Error thrown when there's an issue parsing a file
 */
export class ParseError extends AppError {
  constructor(message, path, position) {
    super(message);
    this.path = path;
    this.position = position;
  }
} 