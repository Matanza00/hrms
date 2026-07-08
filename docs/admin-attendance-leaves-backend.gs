/**
 * Admin direct-edit backend for Attendance + Leaves.
 * ---------------------------------------------------
 * Adds four actions the new admin UI calls:
 *   adminUpdateAttendance   correct an existing attendance row's times
 *   adminCreateAttendance   add an attendance row for a past day
 *   adminAddLeave           backfill an old/historical leave (default Approved)
 *   adminUpdateLeave        correct an existing leave row
 *
 * INSTALL
 * 1. Paste this file into your Apps Script project (e.g. AdminEdits.gs).
 * 2. Set ATTENDANCE_SHEET / LEAVE_SHEET below to match your sheet tab names.
 * 3. Add these cases to doPost's switch (they wrap in successResponse like the rest):
 *
 *      case "adminUpdateAttendance": return successResponse(handleAdminUpdateAttendance(body.data));
 *      case "adminCreateAttendance": return successResponse(handleAdminCreateAttendance(body.data));
 *      case "adminAddLeave":         return successResponse(handleAdminAddLeave(body.data));
 *      case "adminUpdateLeave":      return successResponse(handleAdminUpdateLeave(body.data));
 *
 * 4. Re-deploy the web app (Manage deployments -> Edit -> New version).
 *
 * These handlers map values BY HEADER NAME, so they work regardless of column
 * order. The header names must match the field names the frontend sends
 * (attendanceId, employeeId, attendanceDate, checkIn, checkOut, breakStart,
 * breakEnd, workingMinutes, breakMinutes, deficitMinutes, isLate,
 * attendanceStatus / leaveId, leaveType, startDate, endDate, totalDays,
 * paidDays, unpaidDays, status, reason, ...). Adjust the maps if yours differ.
 *
 * NOTE: attendance working/deficit minutes are recomputed from the times using
 * your Settings sheet. If you already have a canonical recompute in
 * AttendanceService, call that instead of recomputeAttendance_().
 */

var ATTENDANCE_SHEET = "Attendance"; // <-- set to your tab name
var LEAVE_SHEET = "Leaves"; // <-- set to your tab name (e.g. "LeaveRequests")

function sheet_(name) {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) throw new Error("Sheet not found: " + name);
  return s;
}

function headers_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/** Find the 1-based row index whose `idColumn` cell equals `id` (or -1). */
function findRow_(sheet, idColumn, id) {
  var hdr = headers_(sheet);
  var col = hdr.indexOf(idColumn);
  if (col < 0) return -1;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][col]) === String(id)) return i + 1;
  }
  return -1;
}

/** Overwrite only the provided fields on the given row; returns the row object. */
function patchRow_(sheet, rowIndex, patch) {
  var hdr = headers_(sheet);
  var range = sheet.getRange(rowIndex, 1, 1, hdr.length);
  var row = range.getValues()[0];
  hdr.forEach(function (h, i) {
    if (Object.prototype.hasOwnProperty.call(patch, h) && patch[h] !== undefined) {
      row[i] = patch[h];
    }
  });
  range.setValues([row]);
  return rowToObject_(hdr, row);
}

/** Append a row from a patch object (missing columns left blank). */
function appendRow_(sheet, patch) {
  var hdr = headers_(sheet);
  var row = hdr.map(function (h) {
    return Object.prototype.hasOwnProperty.call(patch, h) ? patch[h] : "";
  });
  sheet.appendRow(row);
  return rowToObject_(hdr, row);
}

function rowToObject_(hdr, row) {
  var obj = {};
  hdr.forEach(function (h, i) {
    obj[h] = row[i];
  });
  return obj;
}

function minutesBetween_(a, b) {
  if (!a || !b) return 0;
  var da = new Date(a);
  var db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
  return Math.max(0, Math.round((db.getTime() - da.getTime()) / 60000));
}

/** Recompute working/break/deficit minutes + lateness from the raw times. */
function recomputeAttendance_(fields) {
  var settings =
    typeof SettingsService !== "undefined" ? SettingsService.getSettings() : {};
  var requiredHours = Number(settings.requiredHours || 8);
  var graceMinutes = Number(settings.graceMinutes || 0);
  var officeStart = String(settings.officeStartTime || "");

  var breakMinutes = minutesBetween_(fields.breakStart, fields.breakEnd);
  var grossMinutes = minutesBetween_(fields.checkIn, fields.checkOut);
  var workingMinutes = Math.max(0, grossMinutes - breakMinutes);
  var deficitMinutes = Math.max(0, requiredHours * 60 - workingMinutes);

  var isLate = false;
  if (fields.checkIn && officeStart.indexOf(":") > -1) {
    var ci = new Date(fields.checkIn);
    if (!isNaN(ci.getTime())) {
      var parts = officeStart.split(":");
      var startMins = Number(parts[0]) * 60 + Number(parts[1]) + graceMinutes;
      var ciMins = ci.getHours() * 60 + ci.getMinutes();
      isLate = ciMins > startMins;
    }
  }

  return {
    breakMinutes: breakMinutes,
    workingMinutes: workingMinutes,
    deficitMinutes: deficitMinutes,
    isLate: isLate,
  };
}

/* --------------------------------- Attendance --------------------------------- */

function handleAdminUpdateAttendance(payload) {
  var attendanceId = payload.attendanceId;
  var fields = payload.data || {};
  var sheet = sheet_(ATTENDANCE_SHEET);
  var rowIndex = findRow_(sheet, "attendanceId", attendanceId);
  if (rowIndex < 0) throw new Error("Attendance record not found: " + attendanceId);

  var derived = recomputeAttendance_(fields);
  var patch = {
    attendanceDate: fields.attendanceDate,
    checkIn: fields.checkIn,
    checkOut: fields.checkOut,
    breakStart: fields.breakStart,
    breakEnd: fields.breakEnd,
    attendanceStatus: fields.attendanceStatus,
    breakMinutes: derived.breakMinutes,
    workingMinutes: derived.workingMinutes,
    deficitMinutes: derived.deficitMinutes,
    isLate: derived.isLate,
    updatedAt: new Date().toISOString(),
  };
  return patchRow_(sheet, rowIndex, patch);
}

function handleAdminCreateAttendance(fields) {
  var sheet = sheet_(ATTENDANCE_SHEET);
  var derived = recomputeAttendance_(fields);
  var patch = {
    attendanceId: "ATT-" + Date.now(),
    employeeId: fields.employeeId,
    employeeCode: fields.employeeCode,
    attendanceDate: fields.attendanceDate,
    checkIn: fields.checkIn,
    checkOut: fields.checkOut,
    breakStart: fields.breakStart,
    breakEnd: fields.breakEnd,
    attendanceStatus: fields.attendanceStatus,
    breakMinutes: derived.breakMinutes,
    workingMinutes: derived.workingMinutes,
    deficitMinutes: derived.deficitMinutes,
    isLate: derived.isLate,
    createdAt: new Date().toISOString(),
  };
  return appendRow_(sheet, patch);
}

/* ----------------------------------- Leaves ----------------------------------- */

function handleAdminAddLeave(fields) {
  var sheet = sheet_(LEAVE_SHEET);
  var patch = {
    leaveId: "LV-" + Date.now(),
    employeeId: fields.employeeId,
    employeeCode: fields.employeeCode,
    leaveType: fields.leaveType,
    startDate: fields.startDate,
    endDate: fields.endDate,
    totalDays: fields.totalDays,
    paidDays: fields.paidDays,
    unpaidDays: fields.unpaidDays,
    status: fields.status || "Approved",
    reason: fields.reason,
    approvedBy: "Admin (backfill)",
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  return appendRow_(sheet, patch);
}

function handleAdminUpdateLeave(payload) {
  var leaveId = payload.leaveId;
  var fields = payload.data || {};
  var sheet = sheet_(LEAVE_SHEET);
  var rowIndex = findRow_(sheet, "leaveId", leaveId);
  if (rowIndex < 0) throw new Error("Leave record not found: " + leaveId);

  var patch = {
    leaveType: fields.leaveType,
    startDate: fields.startDate,
    endDate: fields.endDate,
    totalDays: fields.totalDays,
    paidDays: fields.paidDays,
    unpaidDays: fields.unpaidDays,
    status: fields.status,
    reason: fields.reason,
    updatedAt: new Date().toISOString(),
  };
  return patchRow_(sheet, rowIndex, patch);
}
