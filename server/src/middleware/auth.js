const { createRemoteJWKSet, jwtVerify } = require('jose');
const { env } = require('../config/env');
const { prisma } = require('../db');
const { errorResponse } = require('./errors');

async function defaultProvisionUser(payload) {
  const email = payload.email || null;
  const fullName = payload.user_metadata?.full_name || null;
  const existing = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!existing) {
    try {
      return await prisma.user.create({
        data: {
          id: payload.sub,
          externalAuthId: payload.sub,
          email,
          name: fullName || email,
        },
      });
    } catch (err) {
      if (err.code !== 'P2002') throw err;
      // concurrent first request, or email already owned by another row
      const again = await prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (again) return again;
      return prisma.user.create({
        data: {
          id: payload.sub,
          externalAuthId: payload.sub,
          email: null,
          name: fullName || email,
        },
      });
    }
  }
  const patch = {};
  if (email && email !== existing.email) patch.email = email;
  if (fullName && fullName !== existing.name) patch.name = fullName;
  if (!Object.keys(patch).length) return existing;
  try {
    return await prisma.user.update({
      where: { id: existing.id },
      data: patch,
    });
  } catch (err) {
    if (err.code === 'P2002') return existing; // email owned by another row: keep login working
    throw err;
  }
}

let jwks;
function createAuthMiddleware({ verifyToken, provisionUser } = {}) {
  const verify =
    verifyToken ||
    (async (token) => {
      jwks ||= createRemoteJWKSet(
        new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
      );
      return (
        await jwtVerify(token, jwks, {
          issuer: `${env.SUPABASE_URL}/auth/v1`,
          audience: 'authenticated',
        })
      ).payload;
    });
  const provision = provisionUser || defaultProvisionUser;

  return async function authRequired(req, res, next) {
    const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token || (!env.SUPABASE_URL && !verifyToken)) {
      return res
        .status(401)
        .json(errorResponse(req, 'AUTH_REQUIRED', 'Authentication required'));
    }
    let payload;
    try {
      payload = await verify(token);
      if (!payload?.sub) throw new Error('Missing subject');
    } catch {
      return res
        .status(401)
        .json(errorResponse(req, 'AUTH_INVALID', 'Invalid access token'));
    }
    try {
      const user = await provision(payload);
      req.user = { id: user.id, role: payload.role || 'authenticated' };
      return next();
    } catch (err) {
      console.error({ requestId: req.id, message: err.message });
      return res
        .status(503)
        .json(
          errorResponse(
            req,
            'SERVICE_UNAVAILABLE',
            'Service temporarily unavailable',
          ),
        );
    }
  };
}

const authRequired = createAuthMiddleware();
module.exports = { authRequired, createAuthMiddleware, defaultProvisionUser };
