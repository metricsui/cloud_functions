import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

import * as jwt from 'jsonwebtoken'
import UserModel from './models/User'
import {
  Action,
  ApplicationStep,
  User,
  UserResponse,
  Path,
  Step,
} from './models/Dashboard'
import { StepStatus } from './models/StepStatus'

import { withEnableCORS } from './utils/decorators'
import { StepType } from './models/StepType'
import Logger from './utils/logger'

const EXCEEDED_DEADLINE_DESC =
  'Sorry, you have exceeded your deadline. ' +
  'So you cannot go further into this application 😢'

interface UserStepAndAction {
  userSteps: Step[]
  userAction?: Action
}

function validateJwtAndGetUser(
  token: string,
  secretKey: string
): UserModel | undefined {
  try {
    const decodedUser = jwt.verify(token, secretKey, {
      ignoreExpiration: false,
      maxAge: '1d',
    })
    return decodedUser as UserModel
  } catch (e) {
    const err: jwt.JsonWebTokenError = e
    if (!err.message.includes('maxAge exceeded')) {
      Logger.error(`[403] Unauthorized JWT: ${token} error: ${err}`)
    }
  }

  return undefined
}

function getUserStepsAndAction(
  completedSteps: StepType[] | undefined,
  applicationSteps: ApplicationStep[],
  username: string
): UserStepAndAction {
  const userSteps: Step[] = []
  let userAction: Action | undefined = undefined

  const remainingSteps: ApplicationStep[] = Object.assign([], applicationSteps)

  const applicationStepMap: Map<StepType, ApplicationStep> = new Map()
  applicationSteps.map((appStep) => {
    applicationStepMap.set(appStep.type, appStep)
  })

  // Insert all completed steps to UserSteps also remove completedStep from remainingSteps
  if (completedSteps) {
    completedSteps.map((completedStep) => {
      const appStep = applicationStepMap.get(completedStep)
      if (!appStep) {
        Logger.warn(
          `Undefined completed step: ${completedStep.toString()}, username: ${username}`
        )
        return
      }

      const userStep: Step = {
        type: appStep.type,
        description: appStep.taskDescription,
        deadline: appStep.deadline?.toMillis(),
        status: StepStatus.completed,
      }

      userSteps.push(userStep)
      remainingSteps.shift()
    })
  }

  // Insert next +1 step in remainingStep as inProgress status
  const nextStep: ApplicationStep | undefined = remainingSteps.shift()
  if (!nextStep) {
    Logger.warn(`Undefined when remainingSteps.shift(), username: ${username}`)
    return { userSteps, userAction }
  }

  const appStep = applicationStepMap.get(nextStep.type)
  if (!appStep) {
    Logger.warn(
      `Undefined next step: ${nextStep.toString()}, username: ${username}`
    )
    return { userSteps, userAction }
  }

  const dateNow = new Date()
  let isExceededDeadline: boolean = false
  if (appStep.deadline) {
    isExceededDeadline = dateNow > appStep.deadline.toDate()
  }

  const nextUserStep = {
    type: appStep.type,
    description: appStep.taskDescription,
    deadline: appStep.deadline?.toMillis(),
    status: isExceededDeadline ? StepStatus.overdue : StepStatus.inProgress,
  }
  userSteps.push(nextUserStep)

  userAction = {
    name: appStep.buttonName,
    description: isExceededDeadline
      ? EXCEEDED_DEADLINE_DESC
      : appStep.description,
    url: appStep.url,
    deadline: appStep.deadline?.toMillis(),
    overdue: isExceededDeadline,
    step: nextUserStep,
  }

  // Insert the rest of remaining steps to UserSteps
  remainingSteps.map((remainingStep) => {
    userSteps.push({
      type: remainingStep.type,
      description: remainingStep.taskDescription,
      deadline: remainingStep.deadline?.toMillis(),
      status: StepStatus.notStarted,
    })
  })

  return { userSteps, userAction }
}

async function getApplicationSteps(): Promise<ApplicationStep[]> {
  const applicationStepRef = admin.firestore().collection('applicationSteps')
  const stepDocs = await applicationStepRef.get()

  const applicationSteps: ApplicationStep[] = []
  stepDocs.forEach((stepDoc) => {
    const applicationStep: ApplicationStep = {
      buttonName: stepDoc.get('buttonName'),
      deadline: stepDoc.get('deadline'),
      description: stepDoc.get('description'),
      taskDescription: stepDoc.get('taskDescription'),
      stepNumber: stepDoc.get('stepNumber'),
      type: stepDoc.get('type'),
      url: stepDoc.get('url'),
    }
    applicationSteps.push(applicationStep)
  })
  return applicationSteps
}

async function getUserPath(path: string): Promise<Path> {
  const pathRef = admin.firestore().collection('paths').doc(path)
  const pathDoc = await pathRef.get()

  return {
    name: pathDoc.get('name'),
    taskUrl: pathDoc.get('taskUrl'),
  } as Path
}

async function getUserInfo(req: functions.Request, res: functions.Response) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({
        status: 405,
        message: `${req.method} is not allowed`,
      })
      return
    }
    // User Validation
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

    const userRef = admin.firestore().collection('users').doc(user.username)
    const userDoc = await userRef.get()
    if (!userDoc.exists) {
      res.status(401).json({
        status: 401,
        message: 'User is not found',
      })
      Logger.warn(`JWT auth user is not found in firestore, user: ${user}`)
      return
    }

    // Dashboard payload
    const completedSteps: StepType[] | undefined = userDoc.get('completedSteps')
    const chosenPath: string | undefined = userDoc.get('chosenPath')

    const applicationSteps = await getApplicationSteps()
    const sortedApplicationSteps = applicationSteps.sort(
      (a, b) => a.stepNumber - b.stepNumber
    )

    const { userSteps, userAction } = getUserStepsAndAction(
      completedSteps,
      sortedApplicationSteps,
      userDoc.get('username')
    )

    const responseUser: User = {
      name: userDoc.get('name'),
      username: userDoc.get('username'),
      completedSteps: userDoc.get('completedSteps'),
    }

    const response: UserResponse = {
      user: responseUser,
      path: chosenPath ? await getUserPath(chosenPath) : undefined,
      action: userAction,
      steps: userSteps,
    }

    res.status(200).json({
      status: 200,
      message: 'Successfully get user data',
      data: response,
    })
  } catch (e) {
    Logger.error(`Caught exception: ${e}`)
    res.status(500).json({
      status: 500,
      message: 'Something is wrong with the server :(',
    })
  }
}

export default withEnableCORS(getUserInfo)
