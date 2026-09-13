import { signInWithPassword } from '@/lib/auth/actions'
import { BrandLogo } from '@/components/BrandLogo'

export const metadata = {
  title: 'Staff login',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams
  const errorMessage = formatError(params.error)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-navy-deep px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lift">
        <BrandLogo heightClassName="h-8" />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-ink">
          Staff login
        </h1>
        <p className="mt-1 text-[13px] text-mute">
          Admin and Manager accounts only.
        </p>

        {errorMessage && (
          <p className="mt-4 rounded-lg bg-spark/10 px-3 py-2 text-[13px] text-spark">
            {errorMessage}
          </p>
        )}

        <form action={signInWithPassword} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={params.next ?? '/admin'} />
          <label className="block text-[13px] font-medium text-ink">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-cloud px-3 py-2.5 text-[14px] outline-none focus:border-navy"
            />
          </label>
          <label className="block text-[13px] font-medium text-ink">
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-cloud px-3 py-2.5 text-[14px] outline-none focus:border-navy"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-navy py-3 text-[14px] font-semibold text-white transition hover:bg-navy-soft"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}

function formatError(code?: string): string | null {
  if (!code) return null
  if (code === 'missing_supabase_env') {
    return 'Sign-in is temporarily unavailable. Please try again later.'
  }
  if (code === 'unauthorized') {
    return 'This account is not an active Admin or Manager.'
  }
  if (code === 'missing_fields') return 'Email and password are required.'
  if (code === 'auth_callback') return 'Auth callback failed. Try again.'
  return decodeURIComponent(code)
}
