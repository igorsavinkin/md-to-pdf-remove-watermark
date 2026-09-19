import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

function isRemoteOrData(uri) {
  return uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:');
}

export async function embedImages(markdownContent, mdFilePath) {
  const mdDir = path.dirname(mdFilePath);
  let embeddedCount = 0;
  const matches = [...markdownContent.matchAll(IMAGE_REGEX)];

  if (matches.length === 0) return markdownContent;

  let result = markdownContent;

  for (const match of matches) {
    const [fullMatch, alt, uri] = match;

    if (isRemoteOrData(uri)) continue;

    const imgPath = path.resolve(mdDir, uri);
    const ext = path.extname(imgPath).toLowerCase();
    const mime = MIME_TYPES[ext];

    if (!mime) {
      logger.warn({ path: imgPath }, 'Unknown image type, skipping embed');
      continue;
    }

    try {
      const imgBuffer = await fs.readFile(imgPath);
      const base64 = imgBuffer.toString('base64');
      const dataUri = `data:${mime};base64,${base64}`;
      const replacement = `![${alt}](${dataUri})`;
      result = result.replace(fullMatch, replacement);
      embeddedCount++;
      logger.debug({ path: imgPath, size: imgBuffer.length }, 'Image embedded as base64');
    } catch (err) {
      logger.warn({ path: imgPath, error: err.message }, 'Failed to read image, skipping embed');
    }
  }

  if (embeddedCount > 0) {
    logger.info({ count: embeddedCount, total: matches.length }, 'Images embedded into markdown');
  }

  return result;
}
