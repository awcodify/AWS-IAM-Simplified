/**
 * Structured logging utility
 * 
 * Provides consistent, leveled logging across the application.
 * In production, this can be extended to send logs to external services.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  error?: Error;
}

class Logger {
  private minLevel: LogLevel = LogLevel.INFO;

  /**
   * Set the minimum log level to display
   * Logs below this level will be suppressed
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get the numeric value of a log level for comparison
   */
  private getLevelValue(level: LogLevel): number {
    switch (level) {
      case LogLevel.DEBUG: return 0;
      case LogLevel.INFO: return 1;
      case LogLevel.WARN: return 2;
      case LogLevel.ERROR: return 3;
    }
  }

  /**
   * Check if a log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    return this.getLevelValue(level) >= this.getLevelValue(this.minLevel);
  }

  /**
   * Format and output a log entry
   */
  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const { level, message, context, error } = entry;
    const prefix = `[${entry.timestamp}] [${level}]`;

    // Format the log message
    let formattedMessage = `${prefix} ${message}`;

    // Add context if provided
    if (context && Object.keys(context).length > 0) {
      formattedMessage += ` ${JSON.stringify(context)}`;
    }

    // Output based on level
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        if (error) console.warn(error);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        if (error) console.error(error);
        break;
    }
  }

  /**
   * Log a debug message
   * Use for detailed diagnostic information during development
   */
  debug(message: string, context?: LogContext): void {
    this.log({
      level: LogLevel.DEBUG,
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log an info message
   * Use for general informational messages about application flow
   */
  info(message: string, context?: LogContext): void {
    this.log({
      level: LogLevel.INFO,
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log a warning message
   * Use for potentially harmful situations that don't stop execution
   */
  warn(message: string, context?: LogContext, error?: Error): void {
    this.log({
      level: LogLevel.WARN,
      message,
      context,
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log an error message
   * Use for error events that might still allow the application to continue
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log({
      level: LogLevel.ERROR,
      message,
      context,
      error,
      timestamp: new Date().toISOString()
    });
  }
}

// Export a singleton instance
export const logger = new Logger();

// Set appropriate log level based on environment
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  logger.setLevel(LogLevel.WARN);
} else if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  logger.setLevel(LogLevel.DEBUG);
} else {
  logger.setLevel(LogLevel.INFO);
}
