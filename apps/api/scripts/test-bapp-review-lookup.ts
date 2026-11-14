import '../src/config.js'
import assert from 'node:assert/strict'
import { collectHisenseReviewerUpdates, finalReviewResult, prepareAssignments, prepareAutoAssignments } from '../src/bapp-review.js'
assert.deepEqual(prepareAssignments([{ npsn: ' 12345678 ', userPetugas: ' petugas_a ' }, { npsn: '87654321', userPetugas: 'petugas_a' }]), [{ npsn: '12345678', userPetugas: 'petugas_a' }, { npsn: '87654321', userPetugas: 'petugas_a' }])
assert.throws(() => prepareAssignments([{ npsn: '12345678', userPetugas: 'petugas_a' }, { npsn: '12345678', userPetugas: 'petugas_b' }]), /lebih dari sekali/)
const autoAssignments = prepareAutoAssignments([
  { npsn: '12345678', petugasReviu: 'Petugas_A' },
  { npsn: '12345678', petugasReviu: 'petugas_a' },
  { npsn: '87654321', petugasReviu: 'petugas_a' },
  { npsn: '87654321', petugasReviu: 'petugas_b' },
  { npsn: '11111111', petugasReviu: 'belum_ada' },
  { npsn: '22222222', petugasReviu: '' }
], [{ userPetugas: 'petugas_a' }, { userPetugas: 'petugas_b' }])
assert.deepEqual({ rows: autoAssignments.rows, conflicts: autoAssignments.conflicts, unregistered: autoAssignments.unregistered, invalid: autoAssignments.invalid }, {
  rows: [{ npsn: '12345678', userPetugas: 'petugas_a' }], conflicts: 1, unregistered: 1, invalid: 1
})
assert.equal(autoAssignments.skipped.find(item => item.npsn === '87654321')?.category, 'conflict')
assert.match(autoAssignments.skipped.find(item => item.npsn === '22222222')?.reason ?? '', /kosong/)
async function* hisensePages() {
  yield [{ id_transaksi: 'A', approved_by_moe: ' petugas_a ' }, { id_transaksi: 'B', approved_by_moe: null }, { id_transaksi: 'C', approved_by_moe: 'petugas_lain' }, { id_transaksi: 'D', approved_by_moe: 'x'.repeat(81) }, { id_transaksi: 'X', approved_by_moe: 'irrelevant' }]
}
assert.deepEqual(await collectHisenseReviewerUpdates([
  { idTransaksi: 'A', petugasReviu: '' }, { idTransaksi: 'B', petugasReviu: '  ' }, { idTransaksi: 'C', petugasReviu: 'petugas_c' }, { idTransaksi: 'D', petugasReviu: '' }, { idTransaksi: 'E', petugasReviu: '' }
], hisensePages()), {
  updates: [{ idTransaksi: 'A', petugasReviu: 'petugas_a' }], total: 5, empty: 4, alreadyFilled: 1, withoutApproval: 1, tooLong: 1, notFound: 1
})
assert.equal(finalReviewResult(Array(8).fill('Ya')), 'Sesuai')
assert.equal(finalReviewResult(['Ya', 'Ya', 'Tidak', 'Ya', 'Ya', 'Ya', 'Ya', 'Ya']), 'Tidak Sesuai')
console.log('BAPP reviewer NPSN lookup passed')
