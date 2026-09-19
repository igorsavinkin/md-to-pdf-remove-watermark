import pino from 'pino';
import config from '../config.js';

const logger = pino({
  level: config.logging.level,
  transport: config.logging.level === 'debug'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export default logger;
