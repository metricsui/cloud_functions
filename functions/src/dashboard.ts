import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

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
  if (req.method !== 'GET') {
    res.status(405).json({
      status: 405,
      message: `${req.method} is not allowed`,
    })
    return
  }

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

  const ref = admin.firestore().collection('users').doc(user.username)
  const doc = await ref.get()
  if (!doc.exists) {
    res.status(401).json({
      status: 401,
      message: 'User is not found',
    })
    functions.logger.warn(
      `JWT auth user is not found in firestore, user: ${user}`
    )
    return
  }

  res.status(200).json({
    status: 200,
    message: 'Successfully validate token.',
    data: user,
  })
}

export default withEnableCORS(getUserInfo)
