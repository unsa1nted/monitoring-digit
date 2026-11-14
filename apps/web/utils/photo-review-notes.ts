type PhotoNoteField = { reviewKey: string; noteLabel: string }

export function parsePhotoNotes(value: string, fields: readonly PhotoNoteField[]) {
  const notes: Record<string, string> = {}
  const legacy: string[] = []
  for (const line of value.split('\n')) {
    const field = fields.find(field => line.startsWith(`${field.noteLabel}: `))
    if (field) notes[field.reviewKey] = line.slice(field.noteLabel.length + 2).trim()
    else if (line.trim()) legacy.push(line)
  }
  return { notes, legacy: legacy.join('\n') }
}

export function compilePhotoNotes(notes: Record<string, string>, fields: readonly PhotoNoteField[], legacy = '') {
  return [...fields.flatMap(field => notes[field.reviewKey]?.trim() ? [`${field.noteLabel}: ${notes[field.reviewKey].trim()}`] : []), legacy].filter(Boolean).join('\n')
}
