const { createRemoteJWKSet, jwtVerify } = require('jose');
const { env } = require('../config/env');
const { prisma } = require('../db');

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
  const provision =
    provisionUser ||
    ((payload) =>
      prisma.user.upsert({
        where: { id: payload.sub },
        update: {
          email: payload.email,
          name: payload.user_metadata?.full_name,
        },
        create: {
          id: payload.sub,
          externalAuthId: payload.sub,
          email: payload.email,
          name: payload.user_metadata?.full_name || payload.email,
        },
      }));

  return async function authRequired(req, res, next) {
    const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token || (!env.SUPABASE_URL && !verifyToken)) {
      return res.status(401).json({
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        requestId: req.id,
      });
    }
    try {
      const payload = await verify(token);
      if (!payload?.sub) throw new Error('Missing subject');
      const user = await provision(payload);
      req.user = { id: user.id, role: payload.role || 'authenticated' };
      return next();
    } catch {
      return res.status(401).json({
        error: { code: 'AUTH_INVALID', message: 'Invalid access token' },
        requestId: req.id,
      });
    }
  };
}

const authRequired = createAuthMiddleware();
module.exports = { authRequired, createAuthMiddleware };
