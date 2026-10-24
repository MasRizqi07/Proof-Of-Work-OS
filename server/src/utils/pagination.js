function pagination(req) {
  const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit || '20', 10)),
  );
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { pagination };

