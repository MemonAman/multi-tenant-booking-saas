const assert = require('assert');
const test = require('node:test');
const { isOverlapping, calculateAvailableSlots } = require('../src/services/availabilityService');

test('Overlap Rule - Basic Overlaps', (t) => {
  // 09:00 to 10:00 vs 09:30 to 10:30 (Overlap)
  assert.strictEqual(
    isOverlapping('2026-10-10T09:00:00Z', '2026-10-10T10:00:00Z', '2026-10-10T09:30:00Z', '2026-10-10T10:30:00Z'),
    true
  );

  // 09:00 to 10:00 vs 10:00 to 11:00 (Back to back - NO overlap)
  assert.strictEqual(
    isOverlapping('2026-10-10T09:00:00Z', '2026-10-10T10:00:00Z', '2026-10-10T10:00:00Z', '2026-10-10T11:00:00Z'),
    false
  );
});

test('Calculate Available Slots - 30-min Service with 1 Booking', (t) => {
  const dateStr = '2026-10-12'; // Monday
  const businessHours = { day_of_week: 1, start_time: '09:00', end_time: '12:00', enabled: true };
  const blockedPeriods = [];
  const existingBookings = [
    { starts_at: '2026-10-12T10:00:00.000Z', ends_at: '2026-10-12T10:30:00.000Z', status: 'confirmed' }
  ];

  const slots = calculateAvailableSlots({
    dateStr,
    serviceDurationMinutes: 30,
    businessHours,
    blockedPeriods,
    existingBookings
  });

  // Expected 6 total potential slots (09:00, 09:30, 10:00, 10:30, 11:00, 11:30).
  // 10:00 slot should be excluded due to existing booking.
  const timeStrings = slots.map(s => s.formatted_time);
  assert.strictEqual(timeStrings.includes('10:00 AM'), false, '10:00 AM slot must be excluded');
  assert.strictEqual(timeStrings.includes('09:00 AM'), true, '09:00 AM slot must be available');
  assert.strictEqual(timeStrings.includes('10:30 AM'), true, '10:30 AM slot must be available');
});

test('Calculate Available Slots - 90-min Service Duration Overlaps', (t) => {
  const dateStr = '2026-10-12';
  const businessHours = { day_of_week: 1, start_time: '09:00', end_time: '13:00', enabled: true };
  const existingBookings = [
    { starts_at: '2026-10-12T10:00:00.000Z', ends_at: '2026-10-12T10:30:00.000Z', status: 'confirmed' }
  ];

  const slots = calculateAvailableSlots({
    dateStr,
    serviceDurationMinutes: 90,
    businessHours,
    blockedPeriods: [],
    existingBookings
  });

  // 09:00 to 10:30 overlaps with 10:00-10:30 booking -> Rejected
  // 09:30 to 11:00 overlaps with 10:00-10:30 booking -> Rejected
  // 10:30 to 12:00 -> Valid
  // 11:00 to 12:30 -> Valid
  // 11:30 to 13:00 -> Valid
  const timeStrings = slots.map(s => s.formatted_time);
  assert.strictEqual(timeStrings.includes('09:00 AM'), false, '09:00 AM 90-min slot must be excluded');
  assert.strictEqual(timeStrings.includes('10:30 AM'), true, '10:30 AM 90-min slot must be available');
});
