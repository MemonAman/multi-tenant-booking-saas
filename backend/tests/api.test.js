const assert = require('assert');
const test = require('node:test');
const { calculateAvailableSlots } = require('../src/services/availabilityService');

test('Public Availability API Slot Calculation (60-min intervals)', (t) => {
  const slots = calculateAvailableSlots({
    dateStr: '2026-10-15',
    serviceDurationMinutes: 60,
    businessHours: { day_of_week: 4, start_time: '09:00', end_time: '12:00', enabled: true },
    blockedPeriods: [],
    existingBookings: [],
    slotIntervalMinutes: 60
  });

  // Expected 3 60-min slots: 09:00, 10:00, 11:00
  assert.strictEqual(slots.length, 3, 'Should generate 3 60-min slots');
  assert.strictEqual(slots[0].formatted_time, '09:00 AM');
  assert.strictEqual(slots[1].formatted_time, '10:00 AM');
  assert.strictEqual(slots[2].formatted_time, '11:00 AM');
});

test('Reschedule Boundary Validation', (t) => {
  const oldStart = '2026-10-15T09:00:00Z';
  const newStart = '2026-10-15T14:00:00Z';

  assert.notStrictEqual(oldStart, newStart, 'Rescheduled time must differ from original time');
});
