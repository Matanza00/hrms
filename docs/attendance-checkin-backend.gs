/**
 * Attendance check-in — CORRECTED for the real backend.
 * ------------------------------------------------------
 * This matches YOUR actual classes (AttendanceService, AttendanceRepository,
 * LocationHelper, SettingsService, DateHelper). It fixes three bugs:
 *
 *   ISSUE 1  Geofence rejected staff standing in the office.
 *            - checkIn ignored settings.geofencingEnabled (the "Restrict check-in
 *              to office radius" toggle did nothing — radius was ALWAYS enforced).
 *            - No tolerance for GPS drift (laptop/Wi-Fi location is 100-1000m off).
 *            - Blank/misconfigured office coords weren't handled; error gave no
 *              distance so you couldn't tell bad-GPS from wrong-Settings.
 *            Fix: honor the toggle; add a buffer; fail OPEN on misconfig; put the
 *            measured distance in the error so it's diagnosable.
 *
 *   ISSUE 2  6pm->3am shift crosses midnight. checkIn used getTodayDate() (the
 *            CALENDAR date), so events after midnight collided on the date and the
 *            next check-in was rejected as "Already checked in today".
 *            Fix: attendanceDate = BUSINESS date of the shift. Times before
 *            `dayRolloverHour` (default 12:00 noon) belong to the previous shift
 *            day, so the whole 6pm->3am span shares ONE date == the check-in day.
 *
 *   ISSUE 3  Device-clock rollback. Already handled server-side (checkIn: now uses
 *            server time), but ONLY correct if the Apps Script project time zone is
 *            Asia/Karachi. getTodayDate()/isLate()/getBusinessDate() all rely on
 *            Session.getScriptTimeZone().  >>> Set File > Project Settings >
 *            Time zone = (GMT+05:00) Asia/Karachi and re-deploy. <<<
 *
 * INSTALL
 * 1. Replace AttendanceService.checkIn with the version below (same class).
 * 2. Add getBusinessDate() to DateHelper (or paste it into AttendanceService and
 *    call this.getBusinessDate(now)).
 * 3. In the Settings sheet you may add optional rows:
 *      geofenceBufferMeters   (default 50)  - tolerance for GPS drift
 *      dayRolloverHour        (default 12)  - business-day cutoff hour
 *    geofencingEnabled already exists (TRUE/FALSE).
 * 4. Set project time zone to Asia/Karachi and re-deploy the web app.
 */

/* Add to DateHelper.gs (or keep as a static on AttendanceService). */
class DateHelper_businessDate_patch {
  /**
   * Business date of a moment for an overnight shift, as "yyyy-MM-dd" in the
   * SCRIPT time zone. Hours before rolloverHour count as the previous day.
   */
  static getBusinessDate(now, rolloverHour) {
    const tz = Session.getScriptTimeZone();
    const cutoff = isNaN(rolloverHour) ? 12 : rolloverHour;
    const hour = Number(Utilities.formatDate(now, tz, "H"));
    const d =
      hour < cutoff ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
    return Utilities.formatDate(d, tz, "yyyy-MM-dd");
  }
}

/* Drop-in replacement for AttendanceService.checkIn. */
function checkIn_FIXED(data) {
  const employee = this.getEmployeeFromCode(data.employeeCode);
  const settings = SettingsService.getSettings();

  // ---- ISSUE 1: geofence honors the toggle, tolerates GPS drift, fails open ----
  const geofencingEnabled =
    settings.geofencingEnabled === true ||
    settings.geofencingEnabled === "TRUE" ||
    settings.geofencingEnabled === "true";

  if (geofencingEnabled) {
    const oLat = parseFloat(settings.officeLatitude);
    const oLng = parseFloat(settings.officeLongitude);
    const radius = parseFloat(settings.officeRadiusMeters);
    let buffer = parseFloat(settings.geofenceBufferMeters);
    if (isNaN(buffer)) buffer = 50; // absorb normal GPS inaccuracy

    if (isNaN(oLat) || isNaN(oLng) || isNaN(radius) || radius <= 0) {
      // Office location not configured -> do NOT block the whole company.
      Logger.log("Geofence skipped: office location not configured in Settings.");
    } else {
      const uLat = parseFloat(data.latitude);
      const uLng = parseFloat(data.longitude);
      if (!isNaN(uLat) && !isNaN(uLng)) {
        const distance = LocationHelper.calculateDistanceMeters(
          oLat,
          oLng,
          uLat,
          uLng
        );
        if (distance > radius + buffer) {
          throw new Error(
            "You are outside office radius (" +
              Math.round(distance) +
              "m from office, allowed " +
              radius +
              "m)."
          );
        }
      }
      // If the device sent no location we allow it (don't block on missing GPS).
    }
  }

  const now = new Date(); // ISSUE 3: server time, never the client's clock

  // ---- ISSUE 2: attendance date = shift's BUSINESS date (noon rollover) ----
  const rolloverHour = parseFloat(settings.dayRolloverHour);
  const attendanceDate = DateHelper.getBusinessDate(now, rolloverHour); // 12 default

  const existing = AttendanceRepository.getAttendanceByDate(
    employee.employeeId,
    attendanceDate
  );
  if (existing) {
    throw new Error("Already checked in for this shift (" + attendanceDate + ")");
  }

  if (HolidayRepository.isHoliday(attendanceDate)) {
    throw new Error("Today is a holiday");
  }

  if (AttendanceHelper.isWeekend(now)) {
    const workingDays = SpecialWorkingDayRepository.getByDate(attendanceDate);
    let allowed = false;
    workingDays.forEach((day) => {
      if (day.allEmployees === true || day.allEmployees === "TRUE") allowed = true;
      const assigned = String(day.assignedEmployeeIds || "");
      if (assigned.includes(employee.employeeId)) allowed = true;
    });
    // if (!allowed) { throw new Error("Today is an off day"); }
  }

  const attendance = {
    attendanceId: Utilities.getUuid(),
    employeeId: employee.employeeId,
    attendanceDate,
    checkIn: now,
    checkOut: "",
    breakStart: "",
    breakEnd: "",
    lateMinutes: AttendanceHelper.getLateMinutes(now),
    breakMinutes: 0,
    workingMinutes: 0,
    deficitMinutes: 0,
    isLate: AttendanceHelper.isLate(now),
    latitude: data.latitude,
    longitude: data.longitude,
    ipAddress: data.ipAddress,
    attendanceStatus: "Present",
    remarks: "",
    createdAt: now,
    updatedAt: now,
  };

  return AttendanceRepository.createAttendance(attendance);
}

/*
 * checkOut needs NO change: it already uses AttendanceRepository.getOpenAttendance,
 * which finds the still-open row from the previous calendar day, so a 3am checkout
 * correctly closes the 6pm check-in's row without touching its date.
 */
