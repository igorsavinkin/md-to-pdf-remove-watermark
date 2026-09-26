import config from './config.js';
import logger from './utils/logger.js';
import { createWatcher } from './watcher.js';
import { processFile } from './pipeline.js';
import { ensureDir } from './utils/file-ops.js';
import * as cli from './utils/cli.js';
import fs from 'fs/promises';
import path from 'path';

async function scanExistingFiles(inputDir, onFileReady) {
  const donePattern = /[\\/]done[\\/]/;
  const entries = await fs.readdir(inputDir, { withFileTypes: true, recursive: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.join(e.parentPath || e.path, e.name))
    .filter((p) => !donePattern.test(p));

  if (mdFiles.length === 0) return;

  logger.info({ count: mdFiles.length }, 'Found existing markdown files');
  for (const filePath of mdFiles) {
    try {
      await onFileReady(filePath);
    } catch (err) {
      logger.error({ file: filePath, error: err.message }, 'File processing failed');
    }
  }
}

async function main() {
  await ensureDir(config.watcher.inputDir);
  await ensureDir(config.watcher.outputDir);
  await ensureDir(config.watcher.tempDir);
  if (config.watcher.moveProcessed) {
    await ensureDir(config.watcher.doneDir);
  }

  cli.banner(config);

  const onFileReady = async (mdPath) => {
    try {
      await processFile(mdPath, config);
    } catch (err) {
      logger.error({ file: mdPath, error: err.message }, 'File processing failed');
    }
  };

  await scanExistingFiles(config.watcher.inputDir, onFileReady);

  const watcher = createWatcher(config.watcher.inputDir, onFileReady);

  cli.watching();

  // Keep the process alive
  const keepAlive = setInterval(() => {
    logger.debug('Keep-alive heartbeat');
  }, 60000);

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down...');
    clearInterval(keepAlive);
    watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason: reason?.message, stack: reason?.stack }, 'Unhandled rejection');
  });
  
  process.on('uncaughtException', (err) => {
    logger.fatal({ error: err.message, stack: err.stack }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ error: err.message, stack: err.stack }, 'Fatal error');
  process.exit(1);
});
