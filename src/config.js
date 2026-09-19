import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function resolveDir(dir) {
  return path.isAbsolute(dir) ? dir : path.resolve(rootDir, dir);
}

const config = Object.freeze({
  rootDir,
  markdownToPdf: {
    apiKey: process.env.MARKDOWNTOPDF_API_KEY || '',
    baseUrl: 'https://www.markdowntopdf.com/api/v1',
    timeoutMs: 30_000,
  },
  watermarkRemoval: {
    strategy: process.env.WM_STRATEGY || 'local',
  },
  watcher: {
    inputDir: resolveDir(process.env.INPUT_DIR || './input'),
    outputDir: resolveDir(process.env.OUTPUT_DIR || './output'),
    tempDir: resolveDir(process.env.TEMP_DIR || './temp'),
    moveProcessed: process.env.MOVE_PROCESSED !== 'false',
    get doneDir() { return path.join(this.inputDir, 'done'); },
  },
  pipeline: {
    maxRetries: 3,
    retryDelayMs: 1000,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

if (!config.markdownToPdf.apiKey) {
  console.error('ERROR: MARKDOWNTOPDF_API_KEY is not set in .env');
  console.error('Get a free sandbox key from https://www.markdowntopdf.com/dashboard/api');
  process.exit(1);
}

export default config;
