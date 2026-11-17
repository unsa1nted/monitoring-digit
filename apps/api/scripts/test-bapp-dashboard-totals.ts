import assert from 'node:assert/strict'
import { loadBappDashboard } from '../src/bapp-review.js'
import { pool } from '../src/db/index.js'

try {
  const { reviewers } = await loadBappDashboard()
  for (const reviewer of reviewers) {
    assert.equal(reviewer.diterima + reviewer.ditolak + reviewer.sedangRevisi, reviewer.sudahDiperiksa, reviewer.username)
    assert.equal(reviewer.sudahDiperiksa + reviewer.belumDiperiksa, reviewer.alokasi, reviewer.username)
  }
  console.log(`Rekap ${reviewers.length} petugas konsisten`)
} finally {
  await pool.end()
}
