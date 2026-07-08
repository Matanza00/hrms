/**
 * Feedback backend for the LDS HRMS Apps Script API.
 * ---------------------------------------------------
 * The frontend Feedback widget (admin + employee) POSTs three actions:
 *   - submitFeedback        (POST)  create a report + optional screenshot
 *   - feedback              (GET)   list all reports (admin screen)
 *   - updateFeedbackStatus  (POST)  change a report's status
 *
 * HOW TO INSTALL
 * 1. Open your Apps Script project (the one deployed at VITE_API_URL).
 * 2. Paste the functions below into a file (e.g. Feedback.gs).
 * 3. In your existing router, wire the actions to these handlers, e.g.:
 *
 *      // inside doPost's action switch:
 *      case "submitFeedback":       return handleSubmitFeedback(data);
 *      case "updateFeedbackStatus": return handleUpdateFeedbackStatus(data);
 *
 *      // inside doGet's action switch:
 *      case "feedback":             return handleGetFeedback();
 *
 *    (Return however your existing router wraps { success, data }.)
 * 4. Re-deploy the web app (Manage deployments → Edit → New version).
 *
 * The first submission auto-creates a "Feedback" sheet and a Drive folder
 * "LDS Feedback Screenshots" for the images.
 */

var FEEDBACK_SHEET = "Feedback";
var FEEDBACK_SCREENSHOT_FOLDER = "LDS Feedback Screenshots";
var FEEDBACK_HEADERS = [
  "feedbackId", "createdAt", "type", "reason", "pagePath", "pageUrl",
  "role", "reporterName", "reporterEmail", "reporterCode",
  "userAgent", "viewport", "screenshotUrl", "status",
];

function getFeedbackSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FEEDBACK_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(FEEDBACK_SHEET);
    sheet.appendRow(FEEDBACK_HEADERS);
  }
  return sheet;
}

function getFeedbackFolder_() {
  var folders = DriveApp.getFoldersByName(FEEDBACK_SCREENSHOT_FOLDER);
  return folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(FEEDBACK_SCREENSHOT_FOLDER);
}

/** Save a base64 data URL to Drive and return a shareable link. */
function saveFeedbackScreenshot_(dataUrl, feedbackId) {
  if (!dataUrl) return "";
  var match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return "";
  var contentType = match[1];
  var bytes = Utilities.base64Decode(match[2]);
  var ext = contentType.split("/")[1] || "png";
  var blob = Utilities.newBlob(bytes, contentType, feedbackId + "." + ext);
  var file = getFeedbackFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/** POST: create a new feedback report. `data` is the JSON payload. */
function handleSubmitFeedback(data) {
  data = data || {};
  var sheet = getFeedbackSheet_();
  var feedbackId = "FB-" + Date.now();
  var createdAt = data.createdAt || new Date().toISOString();
  var screenshotUrl = saveFeedbackScreenshot_(data.screenshot, feedbackId);

  var row = {
    feedbackId: feedbackId,
    createdAt: createdAt,
    type: data.type || "",
    reason: data.reason || "",
    pagePath: data.pagePath || "",
    pageUrl: data.pageUrl || "",
    role: data.role || "",
    reporterName: data.reporterName || "",
    reporterEmail: data.reporterEmail || "",
    reporterCode: data.reporterCode || "",
    userAgent: data.userAgent || "",
    viewport: data.viewport || "",
    screenshotUrl: screenshotUrl,
    status: "New",
  };

  sheet.appendRow(FEEDBACK_HEADERS.map(function (h) { return row[h]; }));

  // OPTIONAL: email the developer on every new report.
  // MailApp.sendEmail("dev@legitdesign.studio",
  //   "New feedback: " + row.type,
  //   row.reason + "\n\nPage: " + row.pageUrl +
  //   "\nFrom: " + row.reporterName + " (" + row.role + ")" +
  //   (screenshotUrl ? "\nScreenshot: " + screenshotUrl : ""));

  return jsonSuccess_(row); // replace with your router's success wrapper
}

/** GET: return every feedback row (newest first). */
function handleGetFeedback() {
  var sheet = getFeedbackSheet_();
  var values = sheet.getDataRange().getValues();
  var headers = values.shift() || FEEDBACK_HEADERS;
  var rows = values.map(function (r) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = r[i]; });
    return obj;
  });
  rows.reverse();
  return jsonSuccess_(rows);
}

/** POST: update a report's status by feedbackId. */
function handleUpdateFeedbackStatus(data) {
  data = data || {};
  var sheet = getFeedbackSheet_();
  var values = sheet.getDataRange().getValues();
  var idCol = FEEDBACK_HEADERS.indexOf("feedbackId");
  var statusCol = FEEDBACK_HEADERS.indexOf("status");
  for (var i = 1; i < values.length; i++) {
    if (values[i][idCol] === data.feedbackId) {
      sheet.getRange(i + 1, statusCol + 1).setValue(data.status);
      return jsonSuccess_({ feedbackId: data.feedbackId, status: data.status });
    }
  }
  return jsonError_("Feedback not found");
}

/* ---------------------------------------------------------------------------
 * If your project does NOT already have these helpers, here are minimal ones.
 * Delete them if your router already returns { success, data } itself.
 * ------------------------------------------------------------------------- */
function jsonSuccess_(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}
function jsonError_(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
