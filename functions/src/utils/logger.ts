import * as functions from 'firebase-functions'

// TODO: Push error/warn to alert system?
export class Logger {
  static error(...args: any[]) {
    functions.logger.error(...args)
  }

  static warn(...args: any[]) {
    functions.logger.warn(...args)
  }

  static info(...args: any[]) {
    functions.logger.info(...args)
  }

  static debug(...args: any[]) {
    functions.logger.debug(...args)
  }

  static log(...args: any[]) {
    functions.logger.log(...args)
  }
}

export default Logger
