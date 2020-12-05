import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

import * as crypto from 'crypto'

import { Path } from './models/Path'
import { StepType } from './models/StepType'
import Logger from './utils/logger'

interface TypeformAnswer {
  type: string
  field: {
    id: string
  }
  choice: {
    label: string
  }
}

function isFromTypeformWebhook(req: any): boolean {
  try {
    const expectedSig = req.header('typeform-signature')
    const hash = crypto
      .createHmac('sha256', functions.config().typeform.secret)
      .update(req.rawBody)
      .digest('base64')

    const actualSig = `sha256=${hash}`

    return actualSig === expectedSig
  } catch (e) {
    Logger.error(e)
    return false
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
    Logger.warn(
      `[405] METHOD NOT ALLOWED: Typeform webhook called with method: ${
        req.method
      }, body: ${JSON.stringify(req.body)}, headers: ${JSON.stringify(
        req.headers
      )}`
    )
    res.status(405).json({
      status: 405,
      message: `${req.method} is not allowed`,
    })
    return
  }
  if (!isFromTypeformWebhook(req)) {
    Logger.warn(
      `[403] FORBIDDEN: Typeform webhook called with: body: ${JSON.stringify(
        req.body
      )}, headers: ${JSON.stringify(req.headers)}`
    )
    res.status(403).json({
      status: 403,
      message: `You are not authorized to trigger this webhook. Please don't hack our website :(`,
    })
    return
  }
  try {
    const { body } = req
    const response = body.form_response
    const submittedAt = response.submitted_at
    const { hidden } = response

    function assertHiddenFieldExistsAndNotEmpty(fieldName: string) {
      if (!(fieldName in hidden) || !hidden[fieldName]) {
        throw Error(
          `[400] BAD REQUEST: ${fieldName} not found in the hidden field`
        )
      }
    }
    assertHiddenFieldExistsAndNotEmpty('secret_key')
    assertHiddenFieldExistsAndNotEmpty('username_sso')
    assertHiddenFieldExistsAndNotEmpty('npm')
    assertHiddenFieldExistsAndNotEmpty('name')
    assertHiddenFieldExistsAndNotEmpty('study_program')

    const username = hidden['username_sso']

    const ref = admin.firestore().collection('users').doc(username)
    const doc = await ref.get()
    if (!doc.exists) {
      throw Error(
        `[400] BAD REQUEST: User ${username} submitted Typeform without signing in.`
      )
    }

    const chosenPath = getChosenPath(response)
    if (
      doc.data()?.chosenPath?.length > 0 ||
      doc.data()?.completedSteps?.length > 0
    ) {
      throw Error(
        `[400] BAD REQUEST: User ${username} may have submitted Typeform more than once\n
          Previously chosenPath: ${JSON.stringify(
            doc.data()?.chosenPath
          )}, incoming request: ${chosenPath}\n,
          Previously completedSteps: ${JSON.stringify(
            doc.data()?.completedSteps
          )}
        `
      )
    }

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
      hidden,
    })
  } catch (e) {
    Logger.error(e)
  } finally {
    res.status(200).json({
      status: 200,
    })
  }
}

export default typeformWebhook
