import { eq } from 'drizzle-orm'
import { db } from './index.js'
import { users } from './schema.js'
import { hashPassword } from '../password.js'
import { provinceNames } from '../../../../shared/province-names.js'

async function seedAccounts(includeAdmin: boolean) {
  const accounts: { username: string; province: string | null; role: 'Admin' | 'Dinas' }[] = provinceNames.map(province => ({
    username: `dinas_${province.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    province: `Prov. ${province}`,
    role: 'Dinas'
  }))
  if (includeAdmin) accounts.unshift({ username: 'admin', province: null, role: 'Admin' })
  await db.transaction(async tx => {
    for (const account of accounts) {
      const [existing] = await tx.select({ id: users.id, role: users.role }).from(users).where(eq(users.username, account.username)).limit(1)
      const passwordHash = await hashPassword('digit123')
      if (existing) {
        if (existing.role !== account.role) throw new Error(`Username ${account.username} sudah dipakai role berbeda. Seeder dibatalkan.`)
        await tx.update(users).set({ passwordHash, province: account.province, role: account.role }).where(eq(users.id, existing.id))
      } else {
        await tx.insert(users).values({ ...account, passwordHash })
      }
    }
  })
  console.log(`${accounts.length} akun berhasil disimpan. Password seluruh akun seed disamakan sesuai konfigurasi seeder.`)
  for (const account of accounts) console.log(`${account.username} | ${account.role} | ${account.province ?? 'Semua provinsi'}`)
}

export const seedProvinceAccounts = () => seedAccounts(false)
export const seedAllAccounts = () => seedAccounts(true)
