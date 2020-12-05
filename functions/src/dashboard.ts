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
  } catch (e) {}

  return undefined
}

function getUserStepsAndAction(
  completedSteps: StepType[] | undefined,
  applicationSteps: ApplicationStep[]
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
        return
      }

      const userStep: Step = {
        type: appStep.type,
        description: appStep.taskDescription,
        deadline: appStep.deadline.getTime(),
        status: StepStatus.completed,
      }

      userSteps.push(userStep)
      remainingSteps.shift()
    })
  }

  // Insert next +1 step in remainingStep as inProgress status
  const nextStep: ApplicationStep | undefined = remainingSteps.shift()
  if (!nextStep) {
    return { userSteps, userAction }
  }

  const appStep = applicationStepMap.get(nextStep.type)
  if (!appStep) {
    return { userSteps, userAction }
  }

  const dateNow = new Date()
  const isExceededDeadline: boolean = dateNow > appStep.deadline

  const nextUserStep = {
    type: appStep.type,
    description: appStep.taskDescription,
    deadline: appStep.deadline.getTime(),
    status: isExceededDeadline ? StepStatus.overdue : StepStatus.inProgress,
  }
  userSteps.push(nextUserStep)

  userAction = {
    name: appStep.buttonName,
    description: isExceededDeadline
      ? EXCEEDED_DEADLINE_DESC
      : appStep.description,
    url: appStep.url,
    deadline: appStep.deadline.getTime(),
    overdue: isExceededDeadline,
    step: nextUserStep,
  }

  // Insert the rest of remaining steps to UserSteps
  remainingSteps.map((remainingStep) => {
    userSteps.push({
      type: remainingStep.type,
      description: appStep.taskDescription,
      deadline: remainingStep.deadline.getTime(),
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
  console.log('secret key', secretKey)

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
    functions.logger.warn(
      `JWT auth user is not found in firestore, user: ${user}`
    )
    return
  }

  // Dashboard payload
  const completedSteps: StepType[] | undefined = userDoc.get('completedSteps')
  const chosenPath: string | undefined = userDoc.get('chosenPath')

  const applicationSteps = await getApplicationSteps()
  const sortedApplicationSteps = applicationSteps.sort((a, b) =>
    a.stepNumber < b.stepNumber ? -1 : a.stepNumber > b.stepNumber ? 1 : 0
  )

  console.log('applicationSteps', sortedApplicationSteps)

  const { userSteps, userAction } = getUserStepsAndAction(
    completedSteps,
    sortedApplicationSteps
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
}

export default withEnableCORS(getUserInfo)
