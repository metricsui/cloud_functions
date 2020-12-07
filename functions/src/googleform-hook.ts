import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

import { pathLabelToPathDocumentId } from './utils/common'
import { StepType } from './models/StepType'
import Logger from './utils/logger'
import { Path } from './models/Path'
import { sendToDiscord } from './utils/discord'

function getDiscordSubmissionWebhookUrl(path: Path): string {
  switch (path) {
    case Path.dataScienceAnalytics:
      return functions.config().discord.data_submission_webhook
    case Path.productDesign:
      return functions.config().discord.design_submission_webhook
    case Path.productManagement:
      return functions.config().discord.product_submission_webhook
    case Path.softwareEngineering:
      return functions.config().discord.eng_submission_webhook
    default:
      return functions.config().discord.error_webhook_url
  }
}

function notifyDiscord(submission: SubmissionDocument): void {
  const chosenPathEnum = Path[submission.chosenPath]
  const webhookUrl = getDiscordSubmissionWebhookUrl(chosenPathEnum)
  sendToDiscord(
    webhookUrl,
    `**New Task Submitted**
Username: ${submission.username}
Path: ${submission.chosenPath}
URL: ${submission.submissionUrl}
`
  )
}

interface SubmissionDocument {
  submittedAt: admin.firestore.Timestamp
  submissionUrl: string
  username: string
  receivedAt: admin.firestore.FieldValue
  chosenPath: string
}

async function googleformWebhook(
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
  try {
    const { body } = req
    const submittedAt = body.submitted_at
    const email = body.email
    const submissionUrl = body.submission_url
    const secretKey = body.secret_key
    const chosenPath = pathLabelToPathDocumentId(body.path)

    if (secretKey !== functions.config().googleformhook.secret_key) {
      throw Error(
        `[403] FORBIDDEN : Secret key mismatch. received ${secretKey}`
      )
    }

    const username = email.split('@')[0]

    const ref = admin.firestore().collection('users').doc(username)
    const doc = await ref.get()
    if (!doc.exists) {
      throw Error(
        `[400] BAD REQUEST: User ${username} submitted Typeform without signing in.`
      )
    }

    if (doc.data()?.completedSteps?.length > 1) {
      throw Error(
        `[400] BAD REQUEST: User ${username} may have submitted Google Form(Task) more than once\n
            Previously chosenPath: ${JSON.stringify(
              doc.data()?.chosenPath
            )}, incoming request: ${chosenPath}\n,
            Previously completedSteps: ${JSON.stringify(
              doc.data()?.completedSteps
            )}
          `
      )
    }

    if (doc.data()?.chosenPath !== chosenPath) {
      Logger.warn(
        `User ${username} previously chose ${JSON.stringify(
          doc.data()?.chosenPath
        )}, now choose ${JSON.stringify(chosenPath)}`
      )
    }

    await doc.ref.update({
      completedSteps: [
        ...doc.data()?.completedSteps,
        StepType[StepType.submitTask],
      ],
    })

    const submissionRef = admin
      .firestore()
      .collection('submissions')
      .doc(username)
    const submissionDoc: SubmissionDocument = {
      submittedAt: admin.firestore.Timestamp.fromDate(new Date(submittedAt)),
      submissionUrl,
      username,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      chosenPath: doc.get('chosenPath'),
    }
    await submissionRef.set(submissionDoc)
    notifyDiscord(submissionDoc)
  } catch (e) {
    Logger.error(e)
  } finally {
    res.status(200).json({
      status: 200,
    })
  }
}

export default googleformWebhook
