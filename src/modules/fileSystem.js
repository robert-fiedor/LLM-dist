import fs from 'fs/promises';
import path from 'path';
import glob from 'fast-glob';
import { createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { trace } from '../logger.js';
import { FileSystemError } from '../errors.js';

/**
 * Finds all JavaScript and TypeScript files in the given directory
 * @param {string} sourcePath - Root directory to search
 * @returns {Promise<string[]>} - Array of file paths
 */
export const findSourceFiles = trace(async function findSourceFiles(sourcePath) {
  try {
    // Resolve the absolute path
    const absolutePath = path.resolve(sourcePath);
    
    // Check if the path exists
    await fs.access(absolutePath);
    
    // Find all JS and TS files (excluding node_modules)
    const files = await glob(['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'], {
      cwd: absolutePath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      absolute: true,
    });
    
    return files;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new FileSystemError(`Directory not found: ${sourcePath}`, sourcePath);
    }
    throw new FileSystemError(`Error scanning directory: ${err.message}`, sourcePath);
  }
});

/**
 * Reads a file and returns its contents
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File contents
 */
export const readFile = trace(async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    throw new FileSystemError(`Could not read file: ${err.message}`, filePath);
  }
});

/**
 * Writes manifest data to a file
 * @param {object} data - The manifest data to write
 * @param {string} outputPath - Path to the output file
 * @param {boolean} compress - Whether to compress the output
 * @returns {Promise<string>} - Path to the written file
 */
export const writeManifest = trace(async function writeManifest(data, outputPath, compress) {
  try {
    const finalPath = outputPath || 'project.manifest.json';
    const compressedPath = compress ? `${finalPath}.gz` : null;
    const targetPath = compress ? compressedPath : finalPath;
    
    // Convert to JSON string
    const jsonString = JSON.stringify(data, null, 2);
    
    if (compress) {
      return new Promise((resolve, reject) => {
        const gzip = createGzip();
        const output = createWriteStream(targetPath);
        
        output.on('finish', () => resolve(targetPath));
        output.on('error', (err) => reject(new FileSystemError(`Could not write compressed file: ${err.message}`, targetPath)));
        
        gzip.pipe(output);
        gzip.write(jsonString);
        gzip.end();
      });
    } else {
      await fs.writeFile(targetPath, jsonString, 'utf8');
      return targetPath;
    }
  } catch (err) {
    throw new FileSystemError(`Could not write manifest: ${err.message}`, outputPath);
  }
});

/**
 * Gets the relative path from the project root
 * @param {string} absolutePath - Absolute file path
 * @param {string} rootPath - Project root path
 * @returns {string} - Relative path
 */
export const getRelativePath = trace(function getRelativePath(absolutePath, rootPath) {
  return path.relative(rootPath, absolutePath);
});

export default {
  findSourceFiles,
  readFile,
  writeManifest,
  getRelativePath,
}; 