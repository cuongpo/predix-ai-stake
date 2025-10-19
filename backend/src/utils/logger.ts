import winston from 'winston';
import { config } from '../config/config';

const { combine, timestamp, printf, colorize, align } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const consoleTransport = new winston.transports.Console({
  level: config.LOG_LEVEL,
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    logFormat
  )
});

const fileTransport = new winston.transports.File({
  level: 'warn', // Log warnings and errors to a file
  filename: config.LOG_FILE || 'logs/predix-api.log',
  format: combine(
    timestamp(),
    logFormat
  ),
  maxsize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5
});

const transports = [consoleTransport];

if (config.NODE_ENV === 'production') {
  transports.push(fileTransport);
}

export const logger = winston.createLogger({
  transports
});

// Stream for morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.substring(0, message.lastIndexOf('\n')));
  }
};

