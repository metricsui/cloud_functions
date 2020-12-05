import * as admin from 'firebase-admin'

import { StepStatus } from './StepStatus'
import { StepType } from './StepType'

export interface Action {
  name: string
  description: string
  url: string
  deadline: number | undefined
  overdue: boolean
  step: Step
}

export interface Path {
  name: string
  taskUrl: string
}

export interface User {
  name: string
  username: string
  completedSteps: StepType[]
}

export interface UserResponse {
  user: User
  path: Path | undefined
  action: Action | undefined
  steps: Step[]
}

export interface Step {
  status: StepStatus
  description: string
  deadline: number | undefined
  type: StepType
}

export interface ApplicationStep {
  buttonName: string
  deadline: admin.firestore.Timestamp | undefined
  description: string
  taskDescription: string
  stepNumber: number
  type: StepType
  url: string
}
