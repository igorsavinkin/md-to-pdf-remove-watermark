import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function moveFile(src, dest) {
  try {
    await fs.rename(src, dest);
  } catch (err) {
    if (err.code === 'EXDEV') {
      await fs.copyFile(src, dest);
      await fs.unlink(src);
    } else {
      throw err;
    }
  }
}

export async function safeMove(src, dest) {
  await ensureDir(path.dirname(dest));
  let finalDest = dest;
  if (await fileExists(dest)) {
    const ext = path.extname(dest);
    const base = dest.slice(0, -ext.length);
    finalDest = `${base}-${Date.now()}${ext}`;
    logger.info({ original: dest, actual: finalDest }, 'Output filename collision, appending timestamp');
  }
  await moveFile(src, finalDest);
  return finalDest;
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function waitForFileStable(filePath, intervalMs = 500, stableMs = 1000) {
  let lastSize = -1;
  let stableCount = 0;
  const requiredStable = Math.ceil(stableMs / intervalMs);

  while (true) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.size === lastSize) {
        stableCount++;
        if (stableCount >= requiredStable) return;
      } else {
        lastSize = stat.size;
        stableCount = 0;
      }
    } catch {
      stableCount = 0;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
}
