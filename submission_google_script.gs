function onSpreadsheetSubmit(e) {
  var row = e.range.getRow();
  var sheet = SpreadsheetApp.getActiveSheet();
  var timestamp = sheet.getRange('A' + row).getValue();
  var email = sheet.getRange('B' + row).getValue();
  var path = sheet.getRange('C' + row).getValue();
  var submission_url = sheet.getRange('D' + row).getValue();
  var url = "https://asia-southeast2-metrics-csui.cloudfunctions.net/googleformHook";
  const SECRET_KEY = "SECRET_KEY";
  const params = {
    submitted_at: timestamp,
    email: email,
    path: path,
    submission_url: submission_url,
    secret_key: SECRET_KEY,
  };
  var options = {
    "method": "post",
    'contentType': 'application/json',
    "payload": JSON.stringify(params),
  };
  var response = UrlFetchApp.fetch(url, options);
}
