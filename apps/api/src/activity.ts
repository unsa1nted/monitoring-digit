import type { Context } from 'elysia'
import { db } from './db/index.js'
import { activityLogs } from './db/schema.js'
import type { AuthUser } from './auth.js'

export async function recordActivity(context: Context, user: Pick<AuthUser, 'id' | 'username' | 'role'>, action = 'API_REQUEST', actionDetail?: string) {
  const url = new URL(context.request.url)
  const detail = actionDetail ?? (url.searchParams.get('refresh') === '1' ? 'Sinkron data terbaru' : null)
  await db.insert(activityLogs).values({
    userId: user.id,
    username: user.username,
    role: user.role,
    action,
    method: context.request.method,
    path: url.pathname,
    detail,
    ipAddress: context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? context.request.headers.get('x-real-ip'),
    userAgent: context.request.headers.get('user-agent')
  })
}
