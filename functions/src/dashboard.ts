import * as functions from 'firebase-functions'

import * as jwt from 'jsonwebtoken'
import User from './models/User'

import { withEnableCORS } from './utils/decorators'

function validateJwtAndGetUser(token: string): string | object | undefined {
  const secretKey = functions.config().auth.jwt_secret

  try {
    const decodedUser = jwt.verify(token, secretKey, {
      ignoreExpiration: false,
      maxAge: '1d',
    })
    return decodedUser
  } catch (e) {
    functions.logger.warn(`Invalid JWT exception ${e}`)
  }

  return undefined
}

async function getUserInfo(req: functions.Request, res: functions.Response) {
  const token = req.headers.authorization

  if (!token) {
    res.status(401).json({
      status: 401,
      message: 'Token is not found',
    })
    return
  }

  const user = validateJwtAndGetUser(token)
  if (!user) {
    res.status(401).json({
      status: 401,
      message: 'Token is invalid or expired',
    })
    return
  }

  console.log(user)
}

export default withEnableCORS(getUserInfo)
