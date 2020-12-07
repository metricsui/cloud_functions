// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
admin.initializeApp()

import auth from './auth'
import dashboard from './dashboard'
import typeformHook from './typeform-hook'
import googleformHook from './googleform-hook'

exports.auth = functions.region('asia-southeast2').https.onRequest(auth)

exports.typeformHook = functions
  .region('asia-southeast2')
  .https.onRequest(typeformHook)

exports.auth = functions.region('asia-southeast2').https.onRequest(auth)
exports.dashboard = functions
  .region('asia-southeast2')
  .https.onRequest(dashboard)

exports.googleformHook = functions
  .region('asia-southeast2')
  .https.onRequest(googleformHook)
