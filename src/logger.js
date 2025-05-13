import pino from 'pino';
import fs from 'fs/promises';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

// Create logs directory if it doesn't exist
try {
  await mkdir('./logs', { recursive: true });
} catch (err) {
  // Directory already exists or can't be created
  if (err.code !== 'EEXIST') {
    console.error('Failed to create logs directory:', err);
  }
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino/file',
    options: { destination: './logs/app.log' }
  }
});

// --- call tracer ---------------------------------------------------
export const trace = fn => function traced(...args) {
  logger.info({ fn: fn.name, args }, 'call');
  try {
    const result = fn.apply(this, args);
    if (result instanceof Promise) {
      return result
        .then(res => (logger.info({ fn: fn.name, res }, 'return'), res))
        .catch(err => (logger.error({ fn: fn.name, err }, 'error'), Promise.reject(err)));
    }
    logger.info({ fn: fn.name, result }, 'return');
    return result;
  } catch (err) {
    logger.error({ fn: fn.name, err }, 'error');
    throw err;
  }
};

// --- global traps --------------------------------------------------
process.on('uncaughtException', err => logger.fatal({ err }, 'uncaught'));
process.on('unhandledRejection', err => logger.fatal({ err }, 'promise-rejection'));

export default logger;

/**
 * Load the most recent error entry from logs (used in replay mode).
 */
export async function readLastError() {
  try {
    await fs.access('./logs/app.log');
    const data = await fs.readFile('./logs/app.log', 'utf8');
    const lines = data.trim().split('\n').reverse();
    const errLine = lines.find(l => l.includes('"level":50')); // pino level 50 = error
    return errLine ? JSON.parse(errLine) : null;
  } catch (err) {
    logger.warn({ err }, 'could not read error log');
    return null;
  }
} 