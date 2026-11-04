import '../src/config.js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { inArray } from 'drizzle-orm'
import { db, pool } from '../src/db/index.js'
import { users, activityLogs } from '../src/db/schema.js'
import { hashPassword } from '../src/password.js'

// Run against the local running app; creates and removes only uniquely named test accounts.
const base = process.env.TEST_WEB_ORIGIN ?? 'http://localhost:3000'
const prefix = `test_${randomUUID().replaceAll('-', '').slice(0, 12)}`
const names = [`${prefix}_admin`, `${prefix}_dinas`, `${prefix}_newadmin`, `${prefix}_internal`]
const password = randomUUID()
const changedPassword = randomUUID()
async function request(path: string, method = 'GET', body?: unknown, cookie?: string) {
  return fetch(`${base}${path}`, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
}
async function login(username: string, secret: string) {
  const response = await request('/api/auth/login', 'POST', { username, password: secret })
  assert.equal(response.status, 200, await response.clone().text())
  assert.ok(response.headers.get('set-cookie'))
  return response.headers.get('set-cookie')!.split(';')[0]
}
try {
  await db.insert(users).values({ username: names[0], role: 'Admin', passwordHash: await hashPassword(password) })
  assert.equal((await request('/api/admin/users')).status, 401)
  assert.equal((await request('/api/admin/users', 'POST', { username: names[1], role: 'Admin', password })).status, 401)
  const admin = await login(names[0], password)
  const list = await request('/api/admin/users', 'GET', undefined, admin)
  assert.equal(list.status, 200)
  const initial = await list.json() as { data: { id: number; username: string }[]; provinces: string[] }
  assert.equal(initial.provinces.length, 38)
  assert.ok(!JSON.stringify(initial).includes('passwordHash'))
  const adminId = initial.data.find(user => user.username === names[0])!.id
  const adminPage = await request('/users', 'GET', undefined, admin)
  assert.equal(adminPage.status, 200)
  const html = await adminPage.text()
  for (const label of ['Kelola User', 'Tambah User', 'Ubah Password', 'Logout']) assert.ok(html.includes(label), label)
  const create = (body: unknown) => request('/api/admin/users', 'POST', body, admin)
  assert.equal((await create({ username: names[1], role: 'Dinas', password })).status, 400)
  assert.equal((await create({ username: names[1], role: 'Dinas', province: 'Unknown', password })).status, 400)
  assert.equal((await create({ username: names[1], role: 'Admin', password: 'short' })).status, 422)
  assert.equal((await create({ username: names[1], role: 'Dinas', province: 'Aceh', password })).status, 201)
  assert.equal((await create({ username: names[1], role: 'Admin', password })).status, 409)
  assert.equal((await create({ username: names[2], role: 'Admin', password })).status, 201)
  assert.equal((await create({ username: names[3], role: 'Internal', password })).status, 201)
  const internal = await login(names[3], password)
  const internalMe = await request('/api/auth/me', 'GET', undefined, internal)
  assert.equal(internalMe.status, 200)
  const internalAccount = (await internalMe.json() as { user: { id: number; role: string; province: null } }).user
  assert.equal(internalAccount.role, 'Internal')
  assert.equal(internalAccount.province, null)
  for (const path of ['/', '/hisense', '/hisense/example', '/users', '/activity']) {
    const redirect = await fetch(`${base}${path}`, { headers: { cookie: internal }, redirect: 'manual' })
    assert.equal(redirect.status, 302, path)
    assert.equal(redirect.headers.get('location'), '/bapp-fisik', path)
  }
  const internalPage = await request('/bapp-fisik', 'GET', undefined, internal)
  assert.equal(internalPage.status, 200)
  const internalHtml = await internalPage.text()
  assert.ok(internalHtml.includes('Bapp Fisik'))
  assert.ok(internalHtml.includes('Logout'))
  for (const label of ['Data Hisense', 'Kelola User', 'Activity Log', 'Penerima PID']) assert.ok(!internalHtml.includes(label), label)
  for (const path of ['/api/admin/users', '/api/services', '/api/overview', '/api/admin/province-statistics', '/api/admin/hisense/province-progress', '/api/hisense/province-progress', '/api/admin/activity-logs', '/api/schools/provinces', '/api/schools/locations', '/api/hisense/transactions', '/api/hisense/transactions/example']) {
    assert.equal((await request(path, 'GET', undefined, internal)).status, 403, path)
  }
  assert.equal((await request('/api/admin/users', 'POST', { username: 'forbidden_internal', role: 'Admin', password }, internal)).status, 403)
  assert.equal((await request(`/api/admin/users/${adminId}/password`, 'PATCH', { password }, internal)).status, 403)
  assert.equal((await request(`/api/admin/users/${internalAccount.id}/password`, 'PATCH', { password: changedPassword }, admin)).status, 200)
  assert.equal((await request('/api/auth/me', 'GET', undefined, internal)).status, 401)
  const freshInternal = await login(names[3], changedPassword)
  const internalLogout = await request('/api/auth/logout', 'POST', undefined, freshInternal)
  assert.equal(internalLogout.status, 200)
  assert.match(internalLogout.headers.get('set-cookie') ?? '', /monitoring_session=;/)
  const dinas = await login(names[1], password)
  const newAdmin = await login(names[2], password)
  const me = await request('/api/auth/me', 'GET', undefined, dinas)
  const account = (await me.json() as { user: { id: number; province: string } }).user
  assert.equal(account.province, 'Aceh')
  const restrictedPage = await fetch(`${base}/users`, { headers: { cookie: dinas }, redirect: 'manual' })
  assert.equal(restrictedPage.status, 302)
  assert.equal(restrictedPage.headers.get('location'), '/')
  assert.equal((await request('/api/admin/users', 'GET', undefined, dinas)).status, 403)
  assert.equal((await request('/api/admin/users', 'POST', { username: 'forbidden_user', role: 'Admin', password }, dinas)).status, 403)
  assert.equal((await request(`/api/admin/users/${adminId}/password`, 'PATCH', { password: changedPassword }, dinas)).status, 403)
  assert.equal((await request(`/api/admin/users/${account.id}/password`, 'PATCH', { password: 'short' }, admin)).status, 422)
  assert.equal((await request('/api/admin/users/0/password', 'PATCH', { password }, admin)).status, 400)
  assert.equal((await request('/api/admin/users/999999999/password', 'PATCH', { password }, admin)).status, 404)
  assert.equal((await request(`/api/admin/users/${account.id}/password`, 'PATCH', { password: changedPassword }, admin)).status, 200)
  assert.equal((await request('/api/auth/me', 'GET', undefined, dinas)).status, 401)
  assert.equal((await request('/api/auth/login', 'POST', { username: names[1], password })).status, 401)
  const freshDinas = await login(names[1], changedPassword)
  assert.equal((await request('/api/auth/me', 'GET', undefined, freshDinas)).status, 200)
  for (const cookie of [freshDinas, newAdmin]) {
    const logout = await request('/api/auth/logout', 'POST', undefined, cookie)
    assert.equal(logout.status, 200)
    assert.match(logout.headers.get('set-cookie') ?? '', /monitoring_session=;/)
  }
  assert.equal((await request(`/api/admin/users/${adminId}/password`, 'PATCH', { password: changedPassword }, admin)).status, 200)
  assert.equal((await request('/api/auth/me', 'GET', undefined, admin)).status, 401)
  await login(names[0], changedPassword)
  const loginPage = await request('/login?passwordChanged=1')
  assert.ok((await loginPage.text()).includes('Password berhasil diubah'))
  console.log('PASS: all three roles, Internal-only navigation/API restrictions, user creation, validation, duplicate usernames, admin-only authorization, password changes, session invalidation, and logout.')
} finally {
  await db.delete(activityLogs).where(inArray(activityLogs.username, names))
  await db.delete(users).where(inArray(users.username, names))
  await pool.end()
}
