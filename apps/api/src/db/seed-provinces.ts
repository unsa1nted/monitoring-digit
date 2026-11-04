import '../config.js'
import { pool } from './index.js'
import { seedProvinceAccounts } from './province-accounts.js'

try {
  await seedProvinceAccounts()
} finally {
  await pool.end()
}
