import * as functions from 'firebase-functions'
import * as util from 'util'
import { sendToDiscord } from './discord'

function entryFromArgs(severity, args) {
  return `**[${severity}]** ` + util.format.apply(null, args)
}

export class Logger {
  static error(...args: any[]): void {
    functions.logger.error(...args)
    sendToDiscord(
      functions.config().discord.error_webhook_url,
      entryFromArgs('ERROR', args)
    )
  }

  static warn(...args: any[]): void {
    functions.logger.warn(...args)
    sendToDiscord(
      functions.config().discord.warn_webhook_url,
      entryFromArgs('WARN', args)
    )
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
