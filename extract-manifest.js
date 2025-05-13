#!/usr/bin/env node

// This is a convenience wrapper to run the manifest extractor
// It simply forwards all arguments to the main src/index.js file

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the main script
const mainScript = path.join(__dirname, 'src', 'index.js');

// Forward all CLI arguments
const args = process.argv.slice(2);

// Spawn the main script with all arguments
const child = spawn('node', [mainScript, ...args], { 
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

// Handle process exit
child.on('exit', (code) => {
  process.exit(code);
}); 