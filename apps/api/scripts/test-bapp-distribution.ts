import '../src/config.js'
import assert from 'node:assert/strict'
import { planBappDistribution } from '../src/bapp-review.js'

const rows = ['A', 'B', 'C', 'D']
assert.deepEqual(planBappDistribution(rows, [{ userPetugas: 'petugas_a', count: 2 }, { userPetugas: 'petugas_b', count: 1 }]), [
  { row: 'A', userPetugas: 'petugas_a' },
  { row: 'B', userPetugas: 'petugas_a' },
  { row: 'C', userPetugas: 'petugas_b' }
])
console.log('BAPP distribution passed')
