import * as functions from 'firebase-functions'
import * as axios from 'axios'
import * as util from 'util'

function entryFromArgs(severity, args) {
  let entry = {}
  const lastArg = args[args.length - 1]
  if (lastArg && typeof lastArg === 'object' && lastArg.constructor == Object) {
    entry = args.pop()
  }
  return Object.assign({}, entry, {
    severity,
    // mimic `console.*` behavior, see https://nodejs.org/api/console.html#console_console_log_data_args
    message: util.format.apply(null, args),
  })
}

export class Logger {
  static error(...args: any[]): void {
    functions.logger.error(...args)
    setImmediate(async () => {
      await axios.default.post(functions.config().discord.error_webhook_url, {
        content: entryFromArgs('ERROR', args),
      })
    })
  }

  static warn(...args: any[]): void {
    functions.logger.warn(...args)
    setImmediate(async () => {
      await axios.default.post(functions.config().discord.error_webhook_url, {
        content: entryFromArgs('INFO', args),
      })
    })
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
