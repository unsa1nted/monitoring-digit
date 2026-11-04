import { Elysia, t } from 'elysia'
import { asc, eq } from 'drizzle-orm'
import { db } from './db/index.js'
import { users } from './db/schema.js'
import { getSessionUser, hashPassword } from './auth.js'
import { canonicalProvince } from './province-scope.js'
import { provinceNames } from '../../../shared/province-names.js'
import { recordActivity } from './activity.js'

const passwordSchema = t.String({ minLength: 8, maxLength: 128 })
const publicColumns = { id: users.id, username: users.username, role: users.role, province: users.province, createdAt: users.createdAt }

export const adminUsers = new Elysia({ prefix: '/api/admin/users' })
  .onBeforeHandle(async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
    if (user.role !== 'Admin') { context.set.status = 403; return { message: 'Hanya admin yang dapat mengelola user.' } }
  })
  .get('/', async () => ({ data: await db.select(publicColumns).from(users).orderBy(asc(users.username)), provinces: provinceNames }))
  .post('/', async (context) => {
    const { body, set } = context
    const username = body.username.trim()
    if (!/^[a-zA-Z0-9_.-]{3,80}$/.test(username)) {
      set.status = 400
      return { message: 'Username harus 3–80 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.' }
    }
    const province = body.role === 'Dinas' ? canonicalProvince(body.province) : null
    if (body.role === 'Dinas' && !province) { set.status = 400; return { message: 'Pilih provinsi yang valid untuk akun Dinas.' } }
    try {
      await db.insert(users).values({ username, role: body.role, province, passwordHash: await hashPassword(body.password) })
    } catch (error) {
      const cause = error as { code?: string; cause?: { code?: string } }
      if (cause.code === 'ER_DUP_ENTRY' || cause.cause?.code === 'ER_DUP_ENTRY') {
        set.status = 409
        return { message: 'Username sudah digunakan. Pilih username lain.' }
      }
      throw error
    }
    const actor = await getSessionUser(context)
    if (actor) await recordActivity(context, actor, 'USER_CREATED', `User: ${username}`).catch(console.error)
    set.status = 201
    return { success: true, message: 'User berhasil ditambahkan.' }
  }, { body: t.Object({ username: t.String({ minLength: 3, maxLength: 80 }), password: passwordSchema, role: t.Union([t.Literal('Admin'), t.Literal('Dinas'), t.Literal('Internal')]), province: t.Optional(t.String({ maxLength: 120 })) }) })
  .patch('/:id/password', async (context) => {
    const id = Number(context.params.id)
    if (!Number.isSafeInteger(id) || id <= 0) { context.set.status = 400; return { message: 'ID user tidak valid.' } }
    const [target] = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1)
    if (!target) { context.set.status = 404; return { message: 'User tidak ditemukan.' } }
    const actor = await getSessionUser(context)
    await db.update(users).set({ passwordHash: await hashPassword(context.body.password) }).where(eq(users.id, id))
    if (actor) await recordActivity(context, actor, 'PASSWORD_CHANGED', `User: ${target.username} (ID ${id})`).catch(console.error)
    return { success: true, message: 'Password berhasil diubah. User harus login kembali.' }
  }, { body: t.Object({ password: passwordSchema }) })
