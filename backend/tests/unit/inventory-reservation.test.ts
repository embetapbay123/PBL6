import { reservationView, isoTime } from '../../catalog-service/src/inventory/inventory.mapper';

const line = { order_id: 'order-1', variant_id: 'variant-1', quantity: 2 };
const reservation = { id: 'reservation-1', order_id: 'order-1', status: 'ACTIVE', expires_at: new Date('2030-01-01T00:00:00Z') };

test('reservationView maps one line and keeps the requested quantity', () => {
  expect(reservationView(reservation, line)).toEqual({
    id: 'reservation-1', order_id: 'order-1', variant_id: 'variant-1', quantity: 2, expires_at: '2030-01-01T00:00:00.000Z',
  });
});

test('a live result and an idempotent replay are byte-identical', () => {
  // `operation_result` stores JSON, so a replay returns the timestamp as a string, not a Date.
  expect(reservationView(reservation, line)).toEqual(reservationView({ ...reservation, expires_at: '2030-01-01T00:00:00.000Z' }, line));
});

test('isoTime normalises both timestamp representations', () => {
  expect(isoTime(new Date('2030-01-01T00:00:00Z'))).toBe('2030-01-01T00:00:00.000Z');
  expect(isoTime('2030-01-01T00:00:00Z')).toBe('2030-01-01T00:00:00.000Z');
});
