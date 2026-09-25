const { createRemoteJWKSet, jwtVerify } = require('jose');
const { env } = require('../config/env');
const { prisma } = require('../db');

let jwks;
function authRequired(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !env.SUPABASE_URL)
    return res
      .status(401)
      .json({ error: 'Authentication required', requestId: req.id });
  try {
    jwks ||= createRemoteJWKSet(
      new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
    );
    jwtVerify(token, jwks, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    })
      .then(({ payload }) => {
        prisma.user
          .upsert({
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
          })
          .then((user) => {
            req.user = { id: user.id, role: payload.role || 'authenticated' };
            next();
          })
          .catch(next);
      })
      .catch(() =>
        res.status(401).json({
          error: { code: 'AUTH_INVALID', message: 'Invalid access token' },
          requestId: req.id,
        }),
      );
  } catch {
    return res.status(401).json({
      error: { code: 'AUTH_INVALID', message: 'Invalid access token' },
      requestId: req.id,
    });
  }
}
module.exports = { authRequired };
