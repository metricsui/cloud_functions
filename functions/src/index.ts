// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
admin.initializeApp()

import auth from './auth'

exports.auth = functions.region('asia-southeast2').https.onRequest(auth)
