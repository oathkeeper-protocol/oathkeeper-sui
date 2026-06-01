import pino from 'pino';
import { config } from './config.js';

export const log = pino({
  level: config.log.level,
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
  },
});
