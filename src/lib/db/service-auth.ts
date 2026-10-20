import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import type { DbError } from '@/lib/db/postgrest'

/**
 * Auth surface for the service DB client — no next/headers (safe for modules
 * that may be imported from Client Components via settings helpers).
 */
async function apiFetch(path: string, init?: RequestInit) {
  const base = process.env.VIABLE_API_URL?.replace(/\/$/, '')
  const key = process.env.VIABLE_SERVICE_KEY?.trim()
  if (!base || !key) throw new Error('Viable API is not configured')
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      'X-Viable-Key': key,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
}

function unsupported(message: string) {
  return {
    data: { user: null, session: null },
    error: { message } satisfies DbError,
  }
}

export function createServiceAuthApi() {
  return {
    async signInWithPassword() {
      return unsupported('Use the cookie session client for sign-in.')
    },
    async signOut() {
      return { error: null }
    },
    async getSession() {
      return { data: { session: null } }
    },
    async getUser() {
      return { data: { user: null } }
    },
    async exchangeCodeForSession() {
      return { error: { message: 'OAuth is not supported.' } }
    },
    admin: {
      async createUser(input: {
        email: string
        password: string
        email_confirm?: boolean
        user_metadata?: { full_name?: string }
      }) {
        const id = randomUUID()
        const hash = await bcrypt.hash(input.password, 10)
        const res = await apiFetch('/profiles', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            id,
            email: input.email.trim().toLowerCase(),
            full_name: input.user_metadata?.full_name ?? null,
            role: 'manager',
            active: true,
            password_hash: hash,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          return {
            data: { user: null },
            error: {
              message:
                (err as { message?: string }).message ||
                'Could not create user.',
            },
          }
        }
        return {
          data: { user: { id, email: input.email.trim().toLowerCase() } },
          error: null,
        }
      },

      async updateUserById(
        id: string,
        attrs: { password?: string; email?: string },
      ) {
        const patch: Record<string, unknown> = {}
        if (attrs.password) {
          patch.password_hash = await bcrypt.hash(attrs.password, 10)
        }
        if (attrs.email) patch.email = attrs.email.trim().toLowerCase()
        if (Object.keys(patch).length === 0) {
          return { data: { user: { id } }, error: null }
        }
        const res = await apiFetch(`/profiles?id=eq.${id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          return {
            data: { user: null },
            error: {
              message:
                (err as { message?: string }).message ||
                'Could not update user.',
            },
          }
        }
        return { data: { user: { id } }, error: null }
      },
    },
  }
}
