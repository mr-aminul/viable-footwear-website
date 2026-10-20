import { SignJWT, jwtVerify } from 'jose'

export const STAFF_SESSION_COOKIE = 'viable_staff_session'
const MAX_AGE_SEC = 60 * 60 * 24 * 7

export type SessionPayload = {
  sub: string
  email: string
}

function secretKey() {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.VIABLE_SERVICE_KEY?.trim() ||
    'dev-only-change-me'
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secretKey())
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (typeof payload.sub !== 'string') return null
    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
    }
  } catch {
    return null
  }
}

export function sessionCookieMaxAge() {
  return MAX_AGE_SEC
}
