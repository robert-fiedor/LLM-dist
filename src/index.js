import path from 'path';
import dotenv from 'dotenv';
import logger, { trace, readLastError } from './logger.js';
import { parseCliArguments, printUsage } from './modules/cli.js';
import { findSourceFiles, readFile, writeManifest } from './modules/fileSystem.js';
import { parseFile } from './modules/parser.js';
import { buildManifest, optimizeManifest, optimizeForLLM } from './modules/manifestBuilder.js';
import { UserInputError, FileSystemError, ParseError } from './errors.js';

// Load environment variables
dotenv.config();

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const config = parseCliArguments();
    
    // Check for help flag
    if (config.help) {
      printUsage();
      return;
    }
    
    logger.info({ config }, 'Starting extraction');
    
    // Find all source files
    const filePaths = await findSourceFiles(config.sourcePath);
    logger.info(`Found ${filePaths.length} source files to process`);
    
    // Process each file
    const processedFiles = [];
    for (const filePath of filePaths) {
      logger.debug(`Processing ${filePath}`);
      
      // Read file content
      const content = await readFile(filePath);
      
      // Parse the file
      const metadata = parseFile(content, filePath);
      
      // Add to processed files
      processedFiles.push({
        filePath,
        metadata,
      });
    }
    
    // Build the manifest
    const manifest = buildManifest(processedFiles, config.sourcePath);
    
    // Apply optimizations
    let finalManifest = manifest;
    
    // First apply LLM optimization if requested (default behavior)
    if (config.llmOptimized) {
      finalManifest = optimizeForLLM(finalManifest);
    }
    
    // Then apply string optimization if compression is requested
    if (config.compress) {
      finalManifest = optimizeManifest(finalManifest);
    }
    
    // Write the manifest
    const outputPath = await writeManifest(finalManifest, config.outputPath, config.compress);
    logger.info(`Manifest written to ${outputPath}`);
    
    console.log(`✅ Manifest extraction complete. Output: ${outputPath}`);
    
    // Stats - always available for console output even when not included in the output file
    const stats = manifest.stats;
    console.log(`
Extraction summary:
- Total files processed: ${stats.totalFiles}
- Total symbols discovered: ${stats.totalSymbols}
- Functions: ${stats.typeStats.functions}
- Classes: ${stats.typeStats.classes}
- Constants: ${stats.typeStats.constants}
- Exports: ${stats.typeStats.exports}
- Dependencies: ${stats.totalDependencies}
${config.llmOptimized ? '- LLM optimization: ENABLED (use --full-format to disable)' : '- Full format: ENABLED'}
${config.compress ? '- Compression: ENABLED' : ''}
`);
    
  } catch (err) {
    handleError(err);
  }
}

/**
 * Error handler
 * @param {Error} err - The error to handle
 */
function handleError(err) {
  if (err instanceof UserInputError) {
    console.error(`❌ Input error: ${err.message}`);
    printUsage();
  } else if (err instanceof FileSystemError) {
    console.error(`❌ File system error: ${err.message}`);
    if (err.path) {
      console.error(`  Path: ${err.path}`);
    }
  } else if (err instanceof ParseError) {
    console.error(`❌ Parse error: ${err.message}`);
    if (err.path) {
      console.error(`  File: ${err.path}`);
    }
    if (err.position) {
      console.error(`  Position: Line ${err.position.line}, Column ${err.position.column}`);
    }
  } else {
    console.error(`❌ Unexpected error: ${err.message}`);
    console.error(err.stack);
  }
  
  // Exit with error code
  process.exitCode = 1;
}

// Check for replay mode
const replayMode = process.argv.includes('--replay-errors');

// Main execution
(async () => {
  if (replayMode) {
    const lastErr = await readLastError();
    if (lastErr) {
      logger.info({ lastErr }, 'Replaying after previous failure');
      console.log('Replaying after previous failure:');
      console.log(JSON.stringify(lastErr, null, 2));
    }
  }
  
  try {
    await main();
  } catch (err) {
    logger.error({ err }, 'main-failed');
    if (!replayMode) {
      logger.warn('Rerunning in --replay-errors mode');
      console.error('Error occurred. Run with `npm run replay` to see detailed error information.');
      process.exitCode = 1;
    }
  }
})(); 