import config from './config.js';
import logger from './utils/logger.js';
import { createWatcher } from './watcher.js';
import { processFile } from './pipeline.js';
import { ensureDir } from './utils/file-ops.js';
import * as cli from './utils/cli.js';

async function main() {
  await ensureDir(config.watcher.inputDir);
  await ensureDir(config.watcher.outputDir);
  await ensureDir(config.watcher.tempDir);
  if (config.watcher.moveProcessed) {
    await ensureDir(config.watcher.doneDir);
  }

  cli.banner(config);

  const watcher = createWatcher(config.watcher.inputDir, async (mdPath) => {
    try {
      await processFile(mdPath, config);
    } catch (err) {
      logger.error({ file: mdPath, error: err.message }, 'File processing failed');
    }
  });

  cli.watching();

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down...');
    watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ error: err.message, stack: err.stack }, 'Fatal error');
  process.exit(1);
});
