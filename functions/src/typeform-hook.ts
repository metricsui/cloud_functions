import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

import { Path } from './models/Path'
import { StepType } from './models/StepType'

interface TypeformAnswer {
  type: string
  field: {
    id: string
  }
  choice: {
    label: string
  }
}

function pathLabelToPathDocumentId(pathLabel: string): Path | null {
  switch (pathLabel) {
    case 'Data Science & Analytics':
      return Path.dataScienceAnalytics
    case 'Product Design':
      return Path.productDesign
    case 'Product Management':
      return Path.productManagement
    case 'Software Engineering':
      return Path.softwareEngineering
    default:
      return null
  }
}

function getChosenPath(formResponseBody: any): Path | null {
  const questions: any[] = formResponseBody.definition.fields
  const questionId = 'xm74kGhgR0tT'
  for (const question of questions) {
    const title: string = question.title
    if (title.includes('pathways')) {
      break
    }
  }

  const answers: TypeformAnswer[] = formResponseBody.answers
  let chosenPathAnswer: TypeformAnswer | null = null
  for (const answer of answers) {
    if (answer.field.id === questionId) {
      chosenPathAnswer = answer
      break
    }
  }
  if (chosenPathAnswer !== null) {
    const label = chosenPathAnswer.choice.label
    return pathLabelToPathDocumentId(label)
  }
  return null
}

async function typeformWebhook(
  req: functions.Request,
  res: functions.Response
) {
  if (req.method !== 'POST') {
    res.status(405).json({
      status: 405,
      message: `${req.method} is not allowed`,
    })
    return
  }
  try {
    const { body } = req
    const response = body.form_response
    const submittedAt = response.submitted_at
    const { hidden } = response
    const username = hidden['username_sso']

    const ref = admin.firestore().collection('users').doc(username)
    const doc = await ref.get()
    if (!doc.exists) {
      throw Error(`User ${username} submitted Typeform without signing in.`)
    }
    const chosenPath = getChosenPath(response)
    await doc.ref.update({
      completedSteps: [StepType[StepType.apply]],
      chosenPath,
    })

    const applicationRef = admin
      .firestore()
      .collection('applications')
      .doc(username)
    await applicationRef.set({
      submittedAt: admin.firestore.Timestamp.fromDate(new Date(submittedAt)),
      chosenPath,
      username,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (e) {
    functions.logger.error(e)
  } finally {
    res.status(200).json({
      status: 200,
    })
  }
}

export default typeformWebhook
