import * as functions from 'firebase-functions'

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const signIn = functions.https.onRequest(async (req, res) => {
  functions.logger.info('Hello!')
  res.send({
    message: 'Hello from Firebase!',
  })
})
