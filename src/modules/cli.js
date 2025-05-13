import path from 'path';
import { trace } from '../logger.js';
import { UserInputError } from '../errors.js';

/**
 * Parses command line arguments and returns configuration
 * @returns {object} - CLI configuration
 */
export const parseCliArguments = trace(function parseCliArguments() {
  const args = process.argv.slice(2);
  
  if (args.includes('--replay-errors')) {
    return { replayMode: true };
  }
  
  const config = {
    replayMode: false,
    sourcePath: null,
    outputPath: null,
    compress: false,
    llmOptimized: true, // LLM optimization is on by default
    fullFormat: false,  // Full format is off by default
  };
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--out' || arg === '-o') {
      // Next argument should be the output path
      i++;
      if (i >= args.length) {
        throw new UserInputError('Missing output file path after --out option');
      }
      config.outputPath = args[i];
    } else if (arg === '--compress' || arg === '-c') {
      config.compress = true;
    } else if (arg === '--full-format' || arg === '-f') {
      config.fullFormat = true;
      config.llmOptimized = false; // Turn off LLM optimization when full format is requested
    } else if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (arg.startsWith('-')) {
      throw new UserInputError(`Unknown option: ${arg}`);
    } else if (!config.sourcePath) {
      // First non-option argument is the source path
      config.sourcePath = arg;
    }
  }
  
  // Source path is required unless help is requested
  if (!config.sourcePath && !config.help) {
    throw new UserInputError('Source path is required. Usage: node extract-manifest.js <source-folder> [--out <file>] [--compress]');
  }
  
  // Resolve source path if provided
  if (config.sourcePath) {
    config.sourcePath = path.resolve(config.sourcePath);
  }
  
  // Set default output path if not provided
  if (!config.outputPath) {
    config.outputPath = 'project.manifest.json';
  }
  
  return config;
});

/**
 * Prints usage information
 */
export const printUsage = trace(function printUsage() {
  console.log(`
JavaScript Project Manifest Extractor

Usage:
  node extract-manifest.js <source-folder> [options]

Options:
  --out, -o <file>    Specify output file path (default: project.manifest.json)
  --compress, -c      Compress output with gzip
  --full-format, -f   Include all metadata (locations, stats, etc.) - more verbose
  --help, -h          Show this help message

Notes:
  - By default, output is optimized for LLM consumption (removes locations, stats, etc.)
  - Use --full-format to get the complete manifest with all details

Example:
  node extract-manifest.js ./src --out my-project.manifest.json --compress
  `);
});

export default {
  parseCliArguments,
  printUsage,
}; 