import assert from 'node:assert/strict'

// Isolate lookup tests from the live API and real credentials.
process.env.HISENSE_BASE_URL = 'https://hisense.test/api'
process.env.HISENSE_SMK_USERNAME = 'test'
process.env.HISENSE_SMK_PASSWORD = 'test'
const { getHisenseBySerialNumber, getHisenseTransaction } = await import('../src/hisense.js')
const originalFetch = globalThis.fetch
let pages: Record<string, unknown>[] = []
const searchedPages: number[] = []
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input))
  if (url.pathname.endsWith('/login')) return Response.json({ data: { token: 'test-token', expires_in: '1' } })
  assert.equal(url.searchParams.get('search'), '000-SN-ABC')
  const page = Number(url.searchParams.get('page'))
  searchedPages.push(page)
  return Response.json(pages[page - 1])
}
const record = { id_transaksi: 'TX-DIFFERENT', serial_number: '000-SN-ABC', npsn_info: { npsn: '00123456' } }
const response = (data: unknown[], current_page = 1, has_next_page = false) => ({ success: true, data, meta: { current_page, has_next_page } })
try {
  pages = [response([{ ...record, id_transaksi: '000-SN-ABC', serial_number: 'OTHER' }], 1, true), response([record], 2)]
  assert.equal((await getHisenseBySerialNumber('000-SN-ABC', 'smk', { bypassCache: true }))?.id_transaksi, 'TX-DIFFERENT')
  assert.deepEqual(searchedPages, [1, 2])
  pages = [response([{ ...record, id_transaksi: '000-SN-ABC', serial_number: '000-SN-ABC-EXTRA' }])]
  assert.equal(await getHisenseBySerialNumber('000-SN-ABC', 'smk', { bypassCache: true }), null, 'ID and partial serial matches must not validate')
  assert.ok(await getHisenseTransaction('000-SN-ABC', 'smk', { bypassCache: true }), 'Transaction detail lookup still uses transaction IDs')
  pages = [response([record], 1, true), response([{ ...record, id_transaksi: 'OTHER-UNIT', npsn_info: { npsn: 'OTHER-SCHOOL' } }], 2)]
  await assert.rejects(getHisenseBySerialNumber('000-SN-ABC', 'smk', { bypassCache: true }), /lebih dari satu/)
  pages = [response([{ ...record, serial_number: ' 000-SN-ABC ' }])]
  assert.ok(await getHisenseBySerialNumber(' 000-SN-ABC ', 'smk', { bypassCache: true }))
  pages = [response([{ ...record, npsn_info: null }])]
  await assert.rejects(getHisenseBySerialNumber('000-SN-ABC', 'smk', { bypassCache: true }), /sekolah/)
  pages = [{ success: true, data: [record] }]
  await assert.rejects(getHisenseBySerialNumber('000-SN-ABC', 'smk', { bypassCache: true }), /belum lengkap/)
  console.log('PASS: exact serial match across pages; transaction ID and partial match rejected; ambiguous and incomplete data rejected; transaction detail unchanged.')
} finally {
  globalThis.fetch = originalFetch
}
