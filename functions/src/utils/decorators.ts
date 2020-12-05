import * as functions from 'firebase-functions'

export declare type CloudFunction = (
  req: functions.Request,
  resp: functions.Response
) => void | Promise<void>

export const withEnableCORS = (wrapped: CloudFunction): CloudFunction => async (
  req: functions.Request,
  res: functions.Response
) => {
  // Set CORS headers for preflight requests
  // Allows GETs from any origin with the Content-Type header
  // and caches preflight response for 3600s

  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'GET,POST')
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.set('Access-Control-Max-Age', '3600')
    res.status(204).send('')
  } else {
    await wrapped(req, res)
  }
}
