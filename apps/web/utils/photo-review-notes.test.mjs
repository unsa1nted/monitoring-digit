import assert from 'node:assert/strict'
import { compilePhotoNotes, parsePhotoNotes } from './photo-review-notes.ts'

const fields = [{ reviewKey: 'plang', noteLabel: 'Plang' }, { reviewKey: 'box', noteLabel: 'Box & PIC' }]
const text = compilePhotoNotes({ plang: 'Kurang jelas', box: '  Label hilang  ' }, fields)
assert.equal(text, 'Plang: Kurang jelas\nBox & PIC: Label hilang')
assert.deepEqual(parsePhotoNotes(text, fields), { notes: { plang: 'Kurang jelas', box: 'Label hilang' }, legacy: '' })
assert.equal(compilePhotoNotes({ plang: '', box: 'Label hilang' }, fields, 'Catatan lama'), 'Box & PIC: Label hilang\nCatatan lama')
