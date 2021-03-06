import * as axios from 'axios'
import Logger from './logger'

export function sendToDiscord(
  webhookUrl: string,
  contentString: string,
  shouldPrintSeeMore: boolean = true
) {
  setImmediate(async () => {
    try {
      let content = contentString.substring(0, 1000)
      if (shouldPrintSeeMore && contentString.length > 1000) {
        content += ` ...\n See more at: https://console.firebase.google.com/u/0/project/metrics-csui/functions/logs`
      }
      await axios.default.post(
        webhookUrl,
        {
          content,
        },
        {
          timeout: 10000,
        }
      )
    } catch (e) {
      Logger.error(e)
    }
  })
}
