/**
 * Availability Calculation Engine
 * Section 10 of Specification: Handles business hours, provider availability,
 * blocked periods, existing bookings, and timezone adjustments.
 */

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap.
 * Overlap Rule (Section 10.2): existing_start < requested_end AND existing_end > requested_start
 */
function isOverlapping(startsA, endsA, startsB, endsB) {
  const startA = new Date(startsA).getTime();
  const endA = new Date(endsA).getTime();
  const startB = new Date(startsB).getTime();
  const endB = new Date(endsB).getTime();

  return startA < endB && endA > startB;
}

/**
 * Generates available time slots for a business, date, service, and optional provider.
 */
function calculateAvailableSlots({
  dateStr,               // YYYY-MM-DD
  serviceDurationMinutes, // e.g. 30, 60, 90
  businessHours,         // { day_of_week, start_time, end_time, enabled }
  blockedPeriods,        // Array of { starts_at, ends_at }
  existingBookings,      // Array of { starts_at, ends_at, status }
  slotIntervalMinutes = 30 // Slot interval spacing
}) {
  if (!businessHours || !businessHours.enabled) {
    return []; // Closed on this day
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Parse start_time "HH:MM"
  const [startHour, startMin] = businessHours.start_time.split(':').map(Number);
  const [endHour, endMin] = businessHours.end_time.split(':').map(Number);

  // Business open and close Date objects for requested date
  const dayStart = new Date(Date.UTC(year, month - 1, day, startHour, startMin, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, endHour, endMin, 0));

  const availableSlots = [];
  const durationMs = serviceDurationMinutes * 60 * 1000;
  const stepMs = slotIntervalMinutes * 60 * 1000;

  let candidateStart = new Date(dayStart);

  while (candidateStart.getTime() + durationMs <= dayEnd.getTime()) {
    const candidateEnd = new Date(candidateStart.getTime() + durationMs);

    // 1. Check blocked periods overlap
    const isBlocked = blockedPeriods.some(period =>
      isOverlapping(candidateStart, candidateEnd, period.starts_at, period.ends_at)
    );

    // 2. Check active existing bookings overlap (ignoring cancelled)
    const isBooked = existingBookings.some(booking => {
      if (['cancelled'].includes(booking.status)) return false;
      return isOverlapping(candidateStart, candidateEnd, booking.starts_at, booking.ends_at);
    });

    if (!isBlocked && !isBooked) {
      // Format 12-hour time representation (e.g. "09:30 AM")
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      });

      availableSlots.push({
        starts_at: candidateStart.toISOString(),
        ends_at: candidateEnd.toISOString(),
        formatted_time: timeFormatter.format(candidateStart)
      });
    }

    // Step to next candidate slot
    candidateStart = new Date(candidateStart.getTime() + stepMs);
  }

  return availableSlots;
}

module.exports = {
  isOverlapping,
  calculateAvailableSlots
};
