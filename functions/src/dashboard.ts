import * as functions from 'firebase-functions'

import * as jwt from 'jsonwebtoken'
import User from './models/User'

import { withEnableCORS } from './utils/decorators'

function validateJwtAndGetUser(
  token: string,
  secretKey: string
): User | undefined {
  try {
    const decodedUser = jwt.verify(token, secretKey, {
      ignoreExpiration: false,
      maxAge: '1d',
    })
    return decodedUser as User
  } catch (e) {}

  return undefined
}

async function getUserInfo(req: functions.Request, res: functions.Response) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 401,
      message: 'Token is not found',
    })
    return
  }

  const token = authHeader.split(' ')[1]

  const secretKey = functions.config().auth.jwt_secret
  const user = validateJwtAndGetUser(token, secretKey)
  if (!user) {
    res.status(401).json({
      status: 401,
      message: 'Token is invalid or expired',
    })
    return
  }

  res.status(200).json({
    status: 200,
    message: 'Successfully validate token.',
    data: user,
  })
}

export default withEnableCORS(getUserInfo)
