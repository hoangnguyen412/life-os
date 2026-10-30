const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const YAML = require('yaml');
const CalendarEvent = require('../models/CalendarEvent');
const eventService = require('../services/eventService');
const eventController = require('../controllers/eventController');
const eventRoutes = require('../routes/eventRoutes');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const errorHandler = require('../middleware/errorHandler');
const {
  eventId,
  createEventValidation,
  replaceEventValidation,
  listEventsValidation,
} = require('../routes/eventValidation');

const USER_ID = '64f000000000000000000001';
const OTHER_USER_ID = '64f000000000000000000002';
const EVENT_ID = '64f000000000000000000041';
const JWT_SECRET = 'event-test-secret-with-at-least-32-characters';
process.env.JWT_SECRET = JWT_SECRET;

function eventDocument(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(EVENT_ID),
    userId: new mongoose.Types.ObjectId(USER_ID),
    title: 'Study database',
    startTime: new Date('2026-10-30T02:00:00.000Z'),
    endTime: new Date('2026-10-30T03:30:00.000Z'),
    description: null,
    createdAt: new Date('2026-10-20T10:00:00.000Z'),
    async save() {},
    ...overrides,
  };
}

async function validationError(chains, req) {
  for (const chain of chains) await chain.run(req);
  let result;
  validateRequest(req, {}, (error) => { result = error; });
  return result;
}

function responseRecorder() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('all five Event endpoints are registered behind JWT authentication and mounted before 404', () => {
  const app = require('../app');
  assert.ok(eventRoutes.stack.some((layer) => layer.name === 'authMiddleware'));
  assert.deepEqual(
    eventRoutes.stack.filter((layer) => layer.route)
      .map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods) })),
    [
      { path: '/', methods: ['get'] },
      { path: '/', methods: ['post'] },
      { path: '/:id', methods: ['get'] },
      { path: '/:id', methods: ['put'] },
      { path: '/:id', methods: ['delete'] },
    ],
  );
  const eventMountIndex = app.router.stack.findIndex((layer) => layer.handle === eventRoutes);
  const notFoundIndex = app.router.stack.findIndex((layer) => (
    layer.handle.toString().includes("Error('Route not found')")
  ));
  assert.ok(eventMountIndex >= 0);
  assert.ok(notFoundIndex > eventMountIndex);
});

test('Event authentication rejects missing tokens and identifies the JWT owner', () => {
  let error;
  authMiddleware({ get: () => undefined }, {}, (nextError) => { error = nextError; });
  assert.equal(error.status, 401);

  const req = { get: () => `Bearer ${jwt.sign({}, JWT_SECRET, { subject: USER_ID })}` };
  authMiddleware(req, {}, (nextError) => { error = nextError; });
  assert.equal(error, undefined);
  assert.equal(req.userId, USER_ID);
});

test('Event create validation requires a trimmed title and valid UTC start/end times', async () => {
  const valid = { body: {
    title: '  Study database  ',
    startTime: '2026-10-30T02:00:00.000Z',
    endTime: '2026-10-30T03:30:00.000Z',
  } };
  assert.equal(await validationError(createEventValidation, valid), undefined);
  assert.equal(valid.body.title, 'Study database');

  for (const body of [
    { startTime: '2026-10-30T02:00:00.000Z', endTime: '2026-10-30T03:30:00.000Z' },
    { title: 'Event', endTime: '2026-10-30T03:30:00.000Z' },
    { title: 'Event', startTime: '2026-10-30T02:00:00.000Z' },
  ]) {
    const error = await validationError(createEventValidation, { body });
    assert.equal(error.status, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
  }

  const blankTitle = await validationError(createEventValidation, {
    body: { title: '   ', startTime: '2026-10-30T02:00:00Z', endTime: '2026-10-30T03:00:00Z' },
  });
  assert.equal(blankTitle.field, 'title');
});

test('Event date validation rejects invalid dates and endTime at or before startTime', async () => {
  for (const endTime of ['not-a-date', '2026-10-30T03:00:00+00:00', '2026-10-30T02:00:00.000Z']) {
    const error = await validationError(createEventValidation, {
      body: { title: 'Event', startTime: '2026-10-30T02:00:00.000Z', endTime },
    });
    assert.equal(error.status, 400);
    assert.equal(error.field, 'endTime');
  }

  const invalidStart = await validationError(createEventValidation, {
    body: { title: 'Event', startTime: '2026-02-30T02:00:00.000Z', endTime: '2026-10-30T03:00:00Z' },
  });
  assert.equal(invalidStart.field, 'startTime');
});

test('Event PUT requires all editable fields and validates description', async () => {
  const incomplete = await validationError(replaceEventValidation, {
    body: { title: 'Event', startTime: '2026-10-30T02:00:00.000Z', endTime: '2026-10-30T03:00:00Z' },
  });
  assert.equal(incomplete.field, 'description');

  const invalidDescription = await validationError(replaceEventValidation, {
    body: {
      title: 'Event', startTime: '2026-10-30T02:00:00.000Z',
      endTime: '2026-10-30T03:00:00Z', description: 12,
    },
  });
  assert.equal(invalidDescription.field, 'description');

  const invalidId = await validationError([eventId], { params: { id: 'bad' } });
  assert.equal(invalidId.field, 'id');
});

test('Event range validation requires both UTC bounds and from earlier than to', async () => {
  const valid = { query: {
    from: '2026-10-30T00:00:00.000Z',
    to: '2026-10-31T00:00:00.000Z',
    page: '2',
    limit: '10',
  } };
  assert.equal(await validationError(listEventsValidation, valid), undefined);
  assert.equal(valid.query.page, 2);
  assert.equal(valid.query.limit, 10);

  for (const query of [
    { from: '2026-10-30T00:00:00.000Z' },
    { to: '2026-10-31T00:00:00.000Z' },
    { from: '2026-10-31T00:00:00.000Z', to: '2026-10-30T00:00:00.000Z' },
    { from: '2026-10-30', to: '2026-10-31T00:00:00Z' },
    { page: '0', limit: '101' },
  ]) {
    const error = await validationError(listEventsValidation, { query });
    assert.equal(error.status, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
  }
});

test('CalendarEvent model rejects an endTime that is not later than startTime', async () => {
  const event = new CalendarEvent({
    userId: USER_ID,
    title: 'Invalid range',
    startTime: '2026-10-30T03:00:00.000Z',
    endTime: '2026-10-30T02:00:00.000Z',
  });
  await assert.rejects(event.validate(), (error) => (
    error.name === 'ValidationError' && error.errors.endTime.message === 'endTime must be later than startTime'
  ));
});

test('Event creation uses authenticated ownership, defaults description, and returns a safe response', async (t) => {
  let persisted;
  t.mock.method(CalendarEvent, 'create', async (input) => {
    persisted = input;
    return eventDocument({ ...input, createdAt: new Date('2026-10-20T10:00:00.000Z') });
  });

  const created = await eventService.createEvent(USER_ID, {
    title: '  New event  ',
    startTime: '2026-10-30T02:00:00.000Z',
    endTime: '2026-10-30T03:30:00.000Z',
    userId: OTHER_USER_ID,
  });

  assert.equal(persisted.userId.toString(), USER_ID);
  assert.notEqual(persisted.userId.toString(), OTHER_USER_ID);
  assert.equal(persisted.title, 'New event');
  assert.equal(persisted.description, null);
  assert.equal(created.startTime, '2026-10-30T02:00:00.000Z');
  assert.equal(created.endTime, '2026-10-30T03:30:00.000Z');
  assert.equal(created.description, null);
  assert.equal(Object.hasOwn(created, 'userId'), false);
});

test('Event list scopes by owner, filters overlapping ranges, sorts, and paginates', async (t) => {
  let findFilter;
  let countFilter;
  let sortValue;
  let skipValue;
  let limitValue;
  const query = {
    sort(value) { sortValue = value; return this; },
    skip(value) { skipValue = value; return this; },
    limit(value) { limitValue = value; return this; },
    then(resolve, reject) { return Promise.resolve([eventDocument()]).then(resolve, reject); },
  };
  t.mock.method(CalendarEvent, 'find', (filter) => { findFilter = filter; return query; });
  t.mock.method(CalendarEvent, 'countDocuments', async (filter) => { countFilter = filter; return 21; });

  const result = await eventService.listEvents(USER_ID, {
    from: '2026-10-30T00:00:00.000Z',
    to: '2026-10-31T00:00:00.000Z',
    page: 2,
    limit: 10,
  });

  assert.equal(findFilter.userId.toString(), USER_ID);
  assert.deepEqual(findFilter.startTime, { $lt: new Date('2026-10-31T00:00:00.000Z') });
  assert.deepEqual(findFilter.endTime, { $gt: new Date('2026-10-30T00:00:00.000Z') });
  assert.deepEqual(countFilter, findFilter);
  assert.deepEqual(sortValue, { startTime: 1, _id: 1 });
  assert.equal(skipValue, 10);
  assert.equal(limitValue, 10);
  assert.deepEqual(result.pagination, { page: 2, limit: 10, total: 21, totalPages: 3 });
  assert.equal(result.data[0]._id, EVENT_ID);
  assert.equal(Object.hasOwn(result.data[0], 'userId'), false);
});

test('Event list without a range returns all of the authenticated user’s events', () => {
  const filter = eventService.buildEventFilter(USER_ID, {});
  assert.deepEqual(filter, { userId: new mongoose.Types.ObjectId(USER_ID) });
});

test('Event get, update, and delete operations are scoped to the authenticated user', async (t) => {
  const event = eventDocument();
  const queries = [];
  t.mock.method(CalendarEvent, 'findOne', async (filter) => { queries.push(filter); return event; });
  t.mock.method(CalendarEvent, 'findOneAndDelete', async (filter) => { queries.push(filter); return event; });

  const read = await eventService.getEvent(USER_ID, EVENT_ID);
  const updated = await eventService.updateEvent(USER_ID, EVENT_ID, {
    title: ' Updated event ',
    startTime: '2026-10-30T04:00:00.000Z',
    endTime: '2026-10-30T05:00:00.000Z',
    description: '  Review  ',
    userId: OTHER_USER_ID,
  });
  const deleted = await eventService.deleteEvent(USER_ID, EVENT_ID);

  assert.equal(read.title, 'Study database');
  assert.equal(updated.title, 'Updated event');
  assert.equal(updated.description, 'Review');
  assert.equal(updated.startTime, '2026-10-30T04:00:00.000Z');
  assert.equal(event.userId.toString(), USER_ID);
  assert.deepEqual(deleted, { _id: EVENT_ID, deleted: true });
  assert.ok(queries.every((filter) => filter._id.toString() === EVENT_ID));
  assert.ok(queries.every((filter) => filter.userId.toString() === USER_ID));
});

test('foreign Event reads, updates, and deletes return NOT_FOUND', async (t) => {
  t.mock.method(CalendarEvent, 'findOne', async () => null);
  t.mock.method(CalendarEvent, 'findOneAndDelete', async () => null);

  await assert.rejects(eventService.getEvent(USER_ID, EVENT_ID), (error) => error.status === 404);
  await assert.rejects(eventService.updateEvent(USER_ID, EVENT_ID, {
    title: 'Event', startTime: '2026-10-30T02:00:00.000Z',
    endTime: '2026-10-30T03:00:00.000Z', description: null,
  }), (error) => error.status === 404);
  await assert.rejects(eventService.deleteEvent(USER_ID, EVENT_ID), (error) => error.status === 404);
});

test('Event controller returns the standard create response envelope', async (t) => {
  t.mock.method(eventService, 'createEvent', async () => ({ _id: EVENT_ID, title: 'Event' }));
  const res = responseRecorder();
  await eventController.create({ userId: USER_ID, body: {} }, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { success: true, data: { _id: EVENT_ID, title: 'Event' } });
});

test('OpenAPI documents every authenticated Event endpoint and request schema', () => {
  const specPath = path.resolve(__dirname, '..', '..', 'docs', 'openapi.yaml');
  const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));
  assert.deepEqual(Object.keys(spec.paths['/events']).sort(), ['get', 'post']);
  assert.deepEqual(Object.keys(spec.paths['/events/{id}']).sort(), ['delete', 'get', 'parameters', 'put']);
  assert.deepEqual(spec.security, [{ bearerAuth: [] }]);
  assert.deepEqual(spec.components.schemas.EventCreateInput.required, ['title', 'startTime', 'endTime']);
  assert.deepEqual(spec.components.schemas.EventReplaceInput.required, [
    'title', 'startTime', 'endTime', 'description',
  ]);
});
