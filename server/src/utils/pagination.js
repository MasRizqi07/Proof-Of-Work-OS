const { z } = require('zod');
const { parse } = require('../validation');

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function pagination(req) {
  const { page, limit } = parse(pageQuery, req.query);
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { pagination, pageQuery };
