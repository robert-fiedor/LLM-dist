import path from 'path';
import { trace } from '../logger.js';
import { UserInputError } from '../errors.js';

/**
 * Builds a project manifest from parsed file data
 * @param {object[]} parsedFiles - Array of parsed file metadata
 * @param {string} rootPath - Project root path
 * @returns {object} - Complete project manifest
 */
export const buildManifest = trace(function buildManifest(parsedFiles, rootPath) {
  if (!Array.isArray(parsedFiles) || parsedFiles.length === 0) {
    throw new UserInputError('No files to process');
  }
  
  // Initialize the manifest structure
  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    rootPath,
    files: [],
    stats: {
      totalFiles: parsedFiles.length,
      totalSymbols: 0,
      totalDependencies: 0,
      typeStats: {
        functions: 0,
        classes: 0,
        constants: 0,
        exports: 0,
      },
    },
  };
  
  // Process each file
  parsedFiles.forEach(fileData => {
    const { filePath, metadata } = fileData;
    
    // Extract filename and relative path
    const filename = path.basename(filePath);
    const relativePath = path.relative(rootPath, filePath);
    
    const fileManifest = {
      path: relativePath,
      filename,
      symbols: metadata.symbols || [],
      dependencies: metadata.dependencies || [],
      hasDefaultExport: metadata.hasDefaultExport || false,
    };
    
    // Update stats
    manifest.stats.totalSymbols += fileManifest.symbols.length;
    manifest.stats.totalDependencies += fileManifest.dependencies.length;
    
    // Count symbol types
    fileManifest.symbols.forEach(symbol => {
      if (symbol.type === 'fn') {
        manifest.stats.typeStats.functions += 1;
      } else if (symbol.type === 'class') {
        manifest.stats.typeStats.classes += 1;
      } else if (symbol.type === 'const') {
        manifest.stats.typeStats.constants += 1;
      } else if (symbol.type === 'export') {
        manifest.stats.typeStats.exports += 1;
      }
    });
    
    manifest.files.push(fileManifest);
  });
  
  return manifest;
});

/**
 * Optimizes the manifest by deduplicating strings (optional)
 * @param {object} manifest - The complete manifest
 * @returns {object} - Optimized manifest with string table
 */
export const optimizeManifest = trace(function optimizeManifest(manifest) {
  const stringTable = [];
  const stringMap = new Map();
  
  // Function to intern a string
  const internString = (str) => {
    if (typeof str !== 'string') {
      return str;
    }
    
    if (!stringMap.has(str)) {
      const index = stringTable.length;
      stringTable.push(str);
      stringMap.set(str, index);
    }
    
    return { $ref: stringMap.get(str) };
  };
  
  // Function to recursively process an object
  const processObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(item => processObject(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        // Don't optimize certain fields
        if (key === 'version' || key === 'generated' || key === 'rootPath') {
          result[key] = value;
        } else if (typeof value === 'string') {
          result[key] = internString(value);
        } else {
          result[key] = processObject(value);
        }
      }
      return result;
    }
    
    return obj;
  };
  
  // Create a copy with optimized strings
  const optimized = processObject(manifest);
  
  // Add string table
  return {
    ...optimized,
    stringTable,
  };
});

export default {
  buildManifest,
  optimizeManifest,
}; 