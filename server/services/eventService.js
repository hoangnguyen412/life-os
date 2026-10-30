const mongoose = require('mongoose');
const CalendarEvent = require('../models/CalendarEvent');
const AppError = require('../middleware/AppError');

function serializeEvent(event) {
  const source = typeof event.toObject === 'function' ? event.toObject() : event;
  return {
    _id: source._id.toString(),
    title: source.title,
    startTime: new Date(source.startTime).toISOString(),
    endTime: new Date(source.endTime).toISOString(),
    description: source.description ?? null,
    createdAt: new Date(source.createdAt).toISOString(),
  };
}

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, 'VALIDATION_ERROR', 'page must be an integer of at least 1', 'page');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, 'VALIDATION_ERROR', 'limit must be an integer from 1 to 100', 'limit');
  }

  return { page, limit };
}

function buildEventFilter(userId, query) {
  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  if (query.from && query.to) {
    filter.startTime = { $lt: new Date(query.to) };
    filter.endTime = { $gt: new Date(query.from) };
  }
  return filter;
}

async function listEvents(userId, query) {
  const { page, limit } = parsePagination(query);
  const filter = buildEventFilter(userId, query);
  const [events, total] = await Promise.all([
    CalendarEvent.find(filter)
      .sort({ startTime: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    CalendarEvent.countDocuments(filter),
  ]);

  return {
    data: events.map(serializeEvent),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

async function createEvent(userId, input) {
  const event = await CalendarEvent.create({
    userId: new mongoose.Types.ObjectId(userId),
    title: input.title.trim(),
    startTime: new Date(input.startTime),
    endTime: new Date(input.endTime),
    description: input.description == null ? null : input.description.trim(),
  });
  return serializeEvent(event);
}

async function findOwnedEvent(userId, eventId) {
  const event = await CalendarEvent.findOne({
    _id: new mongoose.Types.ObjectId(eventId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Calendar event not found');
  return event;
}

async function getEvent(userId, eventId) {
  return serializeEvent(await findOwnedEvent(userId, eventId));
}

async function updateEvent(userId, eventId, input) {
  const event = await findOwnedEvent(userId, eventId);
  event.title = input.title.trim();
  event.startTime = new Date(input.startTime);
  event.endTime = new Date(input.endTime);
  event.description = input.description == null ? null : input.description.trim();
  await event.save();
  return serializeEvent(event);
}

async function deleteEvent(userId, eventId) {
  const event = await CalendarEvent.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(eventId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Calendar event not found');
  return { _id: event._id.toString(), deleted: true };
}

module.exports = {
  listEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  buildEventFilter,
  parsePagination,
  serializeEvent,
};
