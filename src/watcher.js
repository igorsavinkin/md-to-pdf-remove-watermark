import chokidar from 'chokidar';
import path from 'path';
import logger from './utils/logger.js';
import { waitForFileStable } from './utils/file-ops.js';

export function createWatcher(inputDir, onFileReady) {
  const processing = new Set();

  const donePattern = /[\\/]done[\\/]/;

  const watcher = chokidar.watch(path.join(inputDir, '**', '*.md'), {
    persistent: true,
    ignoreInitial: true,
    ignored: (filePath) => donePattern.test(filePath),
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 500,
    },
  });

  watcher.on('add', async (filePath) => {
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
    logger.error({ error: err.message }, 'Watcher error');
  });

  return watcher;
}
