/**
 * Lightweight PostgREST client (not Supabase). Speaks to VPS Postgres via
 * https://…/viable-rest with a shared service key.
 */

export type DbError = { message: string; code?: string; details?: string }
export type DbResult<T> = {
  data: T
  error: DbError | null
  count: number | null
  status: number
  statusText: string
}

type Filter = { type: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in' | 'contains'; column: string; value: unknown }
type Order = { column: string; ascending: boolean; nullsFirst?: boolean }

function apiBase(): string {
  const base = process.env.VIABLE_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('VIABLE_API_URL is not configured')
  return base
}

function serviceKey(): string {
  const key = process.env.VIABLE_SERVICE_KEY?.trim()
  if (!key) throw new Error('VIABLE_SERVICE_KEY is not configured')
  return key
}

function encodeFilterValue(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return `(${value.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(',')})`
  }
  return `"${String(value).replace(/"/g, '\\"')}"`
}

function toCsValue(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    // uuid[] contains — PostgREST: col=cs.{uuid}
    return `{${value.map((v) => String(v)).join(',')}}`
  }
  return String(value)
}

export class PostgrestQuery<T = unknown> implements PromiseLike<DbResult<T>> {
  private table: string
  private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET'
  private filters: Filter[] = []
  private orFilters: string[] = []
  private selectCols = '*'
  private preferCount = false
  private headOnly = false
  private wantSingle = false
  private wantMaybeSingle = false
  private body: unknown = undefined
  private orderBy: Order[] = []
  private limitN: number | null = null
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private upsertOnConflict: string | null = null
  private matchObj: Record<string, unknown> | null = null

  constructor(table: string) {
    this.table = table
  }

  select(
    columns = '*',
    options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean },
  ) {
    this.selectCols = columns
    if (options?.count) this.preferCount = true
    if (options?.head) this.headOnly = true
    return this
  }

  insert(values: unknown) {
    this.method = 'POST'
    this.body = values
    return this
  }

  upsert(
    values: unknown,
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {
    this.method = 'POST'
    this.body = values
    this.upsertOnConflict = options?.onConflict ?? null
    return this
  }

  update(values: Record<string, unknown>) {
    this.method = 'PATCH'
    this.body = values
    return this
  }

  delete() {
    this.method = 'DELETE'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }
  neq(column: string, value: unknown) {
    this.filters.push({ type: 'neq', column, value })
    return this
  }
  gt(column: string, value: unknown) {
    this.filters.push({ type: 'gt', column, value })
    return this
  }
  gte(column: string, value: unknown) {
    this.filters.push({ type: 'gte', column, value })
    return this
  }
  lt(column: string, value: unknown) {
    this.filters.push({ type: 'lt', column, value })
    return this
  }
  lte(column: string, value: unknown) {
    this.filters.push({ type: 'lte', column, value })
    return this
  }
  like(column: string, value: unknown) {
    this.filters.push({ type: 'like', column, value })
    return this
  }
  ilike(column: string, value: unknown) {
    this.filters.push({ type: 'ilike', column, value })
    return this
  }
  is(column: string, value: unknown) {
    this.filters.push({ type: 'is', column, value })
    return this
  }
  in(column: string, values: unknown[]) {
    this.filters.push({ type: 'in', column, value: values })
    return this
  }
  contains(column: string, value: unknown) {
    this.filters.push({ type: 'contains', column, value })
    return this
  }

  match(query: Record<string, unknown>) {
    this.matchObj = { ...(this.matchObj ?? {}), ...query }
    return this
  }

  or(filters: string) {
    this.orFilters.push(filters)
    return this
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === 'is' && value === null) {
      this.filters.push({
        type: 'is',
        column,
        value: { __not: true, v: null },
      })
    }
    return this
  }

  filter(column: string, operator: string, value: unknown) {
    const op = operator as Filter['type']
    this.filters.push({ type: op, column, value })
    return this
  }

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ) {
    this.orderBy.push({
      column,
      ascending: options?.ascending !== false,
      nullsFirst: options?.nullsFirst,
    })
    return this
  }

  limit(count: number) {
    this.limitN = count
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  single() {
    this.wantSingle = true
    return this as unknown as PostgrestQuery<T extends unknown[] ? T[number] : T>
  }

  maybeSingle() {
    this.wantMaybeSingle = true
    return this as unknown as PostgrestQuery<
      T extends unknown[] ? T[number] | null : T
    >
  }

  then<TResult1 = DbResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: DbResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected)
  }

  private buildUrl(): string {
    const params = new URLSearchParams()
    if (this.selectCols) {
      params.set('select', this.selectCols)
    }

    for (const f of this.filters) {
      if (
        typeof f.value === 'object' &&
        f.value &&
        '__not' in (f.value as object)
      ) {
        params.append(f.column, 'not.is.null')
        continue
      }
      if (f.type === 'in') {
        params.append(f.column, `in.${encodeFilterValue(f.value)}`)
      } else if (f.type === 'contains') {
        params.append(f.column, `cs.${toCsValue(f.value)}`)
      } else if (f.type === 'is') {
        params.append(
          f.column,
          `is.${f.value === null ? 'null' : toCsValue(f.value)}`,
        )
      } else if (f.type === 'like' || f.type === 'ilike') {
        params.append(f.column, `${f.type}.${String(f.value)}`)
      } else {
        params.append(f.column, `${f.type}.${toCsValue(f.value)}`)
      }
    }

    if (this.matchObj) {
      for (const [k, v] of Object.entries(this.matchObj)) {
        params.append(k, `eq.${toCsValue(v)}`)
      }
    }

    for (const or of this.orFilters) {
      if (or.startsWith('not.')) {
        // handled as filter above when possible
        const m = or.match(/^not\.([^.]+)\.is\.null$/)
        if (m) {
          params.append(m[1], 'not.is.null')
          continue
        }
      }
      params.append('or', `(${or})`)
    }

    if (this.orderBy.length) {
      params.set(
        'order',
        this.orderBy
          .map((o) => {
            let s = `${o.column}.${o.ascending ? 'asc' : 'desc'}`
            if (o.nullsFirst === true) s += '.nullsfirst'
            if (o.nullsFirst === false) s += '.nullslast'
            return s
          })
          .join(','),
      )
    }

    if (this.limitN != null) params.set('limit', String(this.limitN))
    if (this.rangeFrom != null && this.rangeTo != null) {
      // Prefer Range header; also set limit/offset for safety
      params.set('limit', String(this.rangeTo - this.rangeFrom + 1))
      params.set('offset', String(this.rangeFrom))
    }

    const qs = params.toString()
    return `${apiBase()}/${this.table}${qs ? `?${qs}` : ''}`
  }

  private async execute(): Promise<DbResult<T>> {
    const url = this.buildUrl()
    const headers: Record<string, string> = {
      'X-Viable-Key': serviceKey(),
      Accept: 'application/json',
    }

    if (this.method !== 'GET') {
      headers['Content-Type'] = 'application/json'
      headers.Prefer = [
        this.upsertOnConflict
          ? `resolution=merge-duplicates`
          : null,
        'return=representation',
        this.preferCount ? 'count=exact' : null,
      ]
        .filter(Boolean)
        .join(',')
      if (this.upsertOnConflict) {
        headers['Prefer'] += ``
        // PostgREST upsert via on_conflict query param
      }
    } else if (this.preferCount) {
      headers.Prefer = 'count=exact'
    }

    if (this.headOnly) {
      headers.Prefer = (headers.Prefer ? headers.Prefer + ',' : '') + 'count=exact'
    }

    let finalUrl = url
    if (this.upsertOnConflict) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') +
        `on_conflict=${encodeURIComponent(this.upsertOnConflict)}`
    }

    try {
      const res = await fetch(finalUrl, {
        method: this.headOnly ? 'HEAD' : this.method,
        headers,
        body:
          this.body !== undefined && !this.headOnly
            ? JSON.stringify(this.body)
            : undefined,
        cache: 'no-store',
      })

      const countHeader = res.headers.get('content-range')
      let count: number | null = null
      if (countHeader) {
        const m = countHeader.match(/\/(\d+|\*)/)
        if (m && m[1] !== '*') count = Number(m[1])
      }

      if (this.headOnly) {
        return {
          data: null as T,
          error: res.ok ? null : { message: res.statusText },
          count,
          status: res.status,
          statusText: res.statusText,
        }
      }

      const text = await res.text()
      let parsed: unknown = null
      if (text) {
        try {
          parsed = JSON.parse(text)
        } catch {
          parsed = text
        }
      }

      if (!res.ok) {
        const errObj = parsed as { message?: string; code?: string; details?: string }
        return {
          data: null as T,
          error: {
            message:
              errObj?.message ||
              (typeof parsed === 'string' ? parsed : res.statusText),
            code: errObj?.code,
            details: errObj?.details,
          },
          count,
          status: res.status,
          statusText: res.statusText,
        }
      }

      let data = parsed as T
      if (this.wantSingle || this.wantMaybeSingle) {
        const rows = Array.isArray(parsed) ? parsed : [parsed]
        if (rows.length === 0) {
          if (this.wantMaybeSingle) {
            return {
              data: null as T,
              error: null,
              count,
              status: res.status,
              statusText: res.statusText,
            }
          }
          return {
            data: null as T,
            error: { message: 'JSON object requested, multiple (or no) rows returned' },
            count,
            status: 406,
            statusText: 'Not Acceptable',
          }
        }
        if (rows.length > 1 && this.wantSingle) {
          return {
            data: null as T,
            error: { message: 'JSON object requested, multiple (or no) rows returned' },
            count,
            status: 406,
            statusText: 'Not Acceptable',
          }
        }
        data = rows[0] as T
      }

      return {
        data,
        error: null,
        count,
        status: res.status,
        statusText: res.statusText,
      }
    } catch (error) {
      return {
        data: null as T,
        error: {
          message: error instanceof Error ? error.message : 'Request failed',
        },
        count: null,
        status: 0,
        statusText: 'Network Error',
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any

export type ViableDbClient = {
  from: (table: string) => PostgrestQuery<AnyRow[]>
  rpc: <T = AnyRow>(
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<DbResult<T>>
  auth: AuthApi
}

// Auth surface used by existing server actions — intentionally loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthApi = any

export function createDbClient(auth: AuthApi): ViableDbClient {
  return {
    from: (table: string) => new PostgrestQuery<AnyRow[]>(table),
    rpc: async <T = AnyRow>(fn: string, args?: Record<string, unknown>) => {
      try {
        const res = await fetch(`${apiBase()}/rpc/${fn}`, {
          method: 'POST',
          headers: {
            'X-Viable-Key': serviceKey(),
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(args ?? {}),
          cache: 'no-store',
        })
        const text = await res.text()
        let parsed: unknown = null
        if (text) {
          try {
            parsed = JSON.parse(text)
          } catch {
            parsed = text
          }
        }
        if (!res.ok) {
          const errObj = parsed as { message?: string }
          return {
            data: null as T,
            error: { message: errObj?.message || res.statusText },
            count: null,
            status: res.status,
            statusText: res.statusText,
          }
        }
        return {
          data: parsed as T,
          error: null,
          count: null,
          status: res.status,
          statusText: res.statusText,
        }
      } catch (error) {
        return {
          data: null as T,
          error: {
            message: error instanceof Error ? error.message : 'RPC failed',
          },
          count: null,
          status: 0,
          statusText: 'Network Error',
        }
      }
    },
    auth,
  }
}

export function isDbConfigured(): boolean {
  return Boolean(
    process.env.VIABLE_API_URL?.trim() && process.env.VIABLE_SERVICE_KEY?.trim(),
  )
}
