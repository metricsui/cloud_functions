import { StepStatus } from './StepStatus'
import { StepType } from './StepType'

export interface Action {
  name: string
  description: string
  url: string
  deadline: Date
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
  completedSteps?: StepType[]
}

export interface UserResponse {
  user: User
  path?: Path
  action?: Action
  steps: Step[]
}

export interface Step {
  status: StepStatus
  description: string
  deadline: Date
  type: StepType
}

export interface ApplicationStep {
  buttonName: string
  deadline: Date
  description: string
  taskDescription: string
  stepNumber: number
  type: StepType
  url: string
}
