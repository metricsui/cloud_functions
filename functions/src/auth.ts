import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

import * as jwt from 'jsonwebtoken'
import * as axios from 'axios'

import SsoPayload from './models/SsoPayload'
import User from './models/User'

import { withEnableCORS } from './utils/decorators'

function validateTicket(ticket: string, service: string): Promise<SsoPayload> {
  return new Promise(async (resolve, reject) => {
    try {
      const resp = await axios.default.get(
        'https://akun-kp.cs.ui.ac.id/cas/serviceValidate',
        {
          params: {
            format: 'json',
            service,
            ticket,
          },
          timeout: 5000,
        }
      )
      const { serviceResponse } = resp.data
      const { authenticationFailure } = serviceResponse
      if (authenticationFailure) {
        const { description } = authenticationFailure
        reject(description)
      } else {
        const { authenticationSuccess } = serviceResponse
        resolve(authenticationSuccess)
      }
    } catch (e) {
      functions.logger.error(e)
      reject('Something went wrong. Please try again')
    }
  })
}

async function signIn(req: functions.Request, res: functions.Response) {
  if (req.method !== 'POST') {
    res.status(405).json({
      status: 405,
      message: `${req.method} is not allowed`,
    })
    return
  }
  const { ticket, service } = req.body
  if (!ticket) {
    functions.logger.error(
      `[signIn] missing required params 'ticket'. request: ${req}`
    )
    res.status(400).json({
      status: 400,
      message: '"ticket" is required',
    })
    return
  } else if (!service) {
    functions.logger.error(
      `[signIn] missing required params 'service'. request: ${req}`
    )
    res.status(400).json({
      status: 400,
      message: '"service" is required',
    })
    return
  }
  try {
    const ssoPayload = await validateTicket(ticket, service)
    const user = new User(ssoPayload)

    const ref = admin.firestore().collection('users').doc(user.username)
    const doc = await ref.get()
    if (!doc.exists) {
      await ref.set(user.toPlainObject())
    }

    const secretKey = functions.config().auth.jwt_secret
    const token = jwt.sign(user.toPlainObject(), secretKey, {
      expiresIn: '1d',
    })
    res.status(200).json({
      status: 200,
      message: 'Successfully validate ticket.',
      data: token,
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({
      status: 400,
      message: error.toString(),
    })
  }
}

export default withEnableCORS(signIn)
