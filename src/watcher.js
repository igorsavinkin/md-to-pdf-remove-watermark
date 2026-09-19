import chokidar from 'chokidar';
import path from 'path';
import logger from './utils/logger.js';
import { waitForFileStable } from './utils/file-ops.js';

export function createWatcher(inputDir, onFileReady) {
  const processing = new Set();
  const donePattern = /[\\/]done[\\/]/;

  logger.debug({ inputDir }, 'Watcher starting');

  const watcher = chokidar.watch(inputDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 500,
    },
  });

  watcher.on('ready', () => {
    logger.debug('Watcher ready and watching for changes');
  });

  watcher.on('add', async (filePath) => {
    if (donePattern.test(filePath)) return;
    if (!filePath.endsWith('.md')) return;

    const absPath = path.resolve(filePath);
    if (processing.has(absPath)) {
      logger.debug({ file: absPath }, 'File already being processed, skipping');
      return;
    }

    processing.add(absPath);
    logger.info({ file: absPath }, 'New markdown file detected');

    try {
      await waitForFileStable(absPath);
      await onFileReady(absPath);
    } catch (err) {
      logger.error({ file: absPath, error: err.message }, 'Error processing file');
    } finally {
      processing.delete(absPath);
    }
  });

  watcher.on('error', (err) => {
    logger.error({ error: err.message, stack: err.stack }, 'Watcher error');
  });

  return watcher;
}
