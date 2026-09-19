import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from './utils/logger.js';
import { retry } from './utils/retry.js';
import { ensureDir, safeMove } from './utils/file-ops.js';
import { convertMarkdownToPdf } from './converters/markdown-to-pdf.js';
import { removeWatermark } from './removers/local-remover.js';
import { embedImages } from './utils/image-embedder.js';
import * as cli from './utils/cli.js';

export async function processFile(mdPath, config) {
  const correlationId = uuidv4();
  const startTime = Date.now();
  const basename = path.basename(mdPath, '.md');
  const displayName = `${basename}.md`;

  cli.processing(displayName);
  logger.info({ correlationId, file: mdPath }, 'Processing started');

  const tempPdfPath = path.join(config.watcher.tempDir, `${correlationId}.pdf`);
  const cleanPdfPath = path.join(config.watcher.tempDir, `${correlationId}-clean.pdf`);

  try {
    await ensureDir(config.watcher.tempDir);
    await ensureDir(config.watcher.outputDir);

    const markdownContent = await fs.readFile(mdPath, 'utf-8');
    logger.debug({ correlationId, size: markdownContent.length }, 'Markdown read');

    cli.processingStep('embedding-images');
    const enrichedMarkdown = await embedImages(markdownContent, mdPath);

    cli.processingStep('converting');
    const pdfBuffer = await retry(
      () => convertMarkdownToPdf(enrichedMarkdown, `${basename}.pdf`),
      {
        maxRetries: config.pipeline.maxRetries,
        retryableErrors: ['RATE_LIMIT', 'SERVICE_UNAVAILABLE'],
        label: 'markdown-to-pdf',
      }
    );

    await fs.writeFile(tempPdfPath, pdfBuffer);
    logger.info({ correlationId, size: pdfBuffer.length }, 'PDF generated (with watermark)');

    cli.processingStep('removing-wm');
    const cleanBuffer = await removeWatermark(pdfBuffer);
    await fs.writeFile(cleanPdfPath, cleanBuffer);
    logger.info({ correlationId, size: cleanBuffer.length }, 'Watermark removed');

    cli.processingStep('saving');
    const outputPath = await safeMove(cleanPdfPath, path.join(config.watcher.outputDir, `${basename}.pdf`));
    logger.info({ correlationId, output: outputPath }, 'Clean PDF saved');

    await fs.unlink(tempPdfPath).catch(() => {});
    await fs.unlink(cleanPdfPath).catch(() => {});

    if (config.watcher.moveProcessed) {
      const donePath = path.join(config.watcher.doneDir, path.basename(mdPath));
      await safeMove(mdPath, donePath);
      logger.debug({ correlationId, done: donePath }, 'Source file moved to done/');
    }

    const duration = Date.now() - startTime;
    logger.info({ correlationId, durationMs: duration, output: outputPath }, 'Processing complete');
    cli.done(`${basename}.pdf`, duration);

    return { inputPath: mdPath, outputPath, correlationId, duration };
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error({ correlationId, error: err.message, stack: err.stack, durationMs: duration }, 'Processing failed');
    cli.fail(displayName, err.message);

    const failedDir = path.join(config.watcher.tempDir, 'failed', correlationId);
    await ensureDir(failedDir);

    if (await fileExists(tempPdfPath)) {
      await fs.copyFile(tempPdfPath, path.join(failedDir, 'watermarked.pdf')).catch(() => {});
    }
    if (await fileExists(cleanPdfPath)) {
      await fs.copyFile(cleanPdfPath, path.join(failedDir, 'clean.pdf')).catch(() => {});
    }

    throw err;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
