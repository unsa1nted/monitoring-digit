import '../config.js'
import { pool } from './index.js'
import { seedAllAccounts } from './province-accounts.js'

try {
  await seedAllAccounts()
} finally {
  await pool.end()
}
