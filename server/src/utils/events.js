function event(type, userId, ids, metadata) {
  return { type, userId, ...ids, metadata };
}

module.exports = { event };

