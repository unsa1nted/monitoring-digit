import { mysqlTable, varchar, int, timestamp, mysqlEnum, text, bigint, index, json, uniqueIndex } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  username: varchar('username', { length: 80 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['Admin', 'Dinas', 'Internal']).notNull().default('Dinas'),
  province: varchar('province', { length: 120 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const bappStorages = mysqlTable('bapp_storages', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 120 }).notNull().unique(),
  type: mysqlEnum('type', ['Dus', 'Kontainer', 'Penyimpanan Lainnya']).notNull(),
  vendor: mysqlEnum('vendor', ['Hisense', 'Skylink', 'PLN']).notNull().default('Hisense'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const bappFolders = mysqlTable('bapp_folders', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  storageId: bigint('storage_id', { mode: 'number', unsigned: true }).notNull().references(() => bappStorages.id),
  number: int('number', { unsigned: true }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, table => ({ storageNumber: uniqueIndex('bapp_folders_storage_number_unique').on(table.storageId, table.number) }))

export const bappScans = mysqlTable('bapp_scans', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  storageId: bigint('storage_id', { mode: 'number', unsigned: true }).notNull().references(() => bappStorages.id),
  folderId: bigint('folder_id', { mode: 'number', unsigned: true }).references(() => bappFolders.id),
  requestId: varchar('request_id', { length: 36 }).notNull().unique(),
  barcode: varchar('barcode', { length: 160 }).notNull(),
  scannedBy: int('scanned_by').notNull(),
  validationStatus: mysqlEnum('validation_status', ['pending', 'checking', 'valid', 'invalid', 'error', 'unsupported']).notNull().default('pending'),
  validationMessage: varchar('validation_message', { length: 255 }),
  schoolName: varchar('school_name', { length: 255 }),
  npsn: varchar('npsn', { length: 20 }),
  checkedAt: timestamp('checked_at'),
  claimedAt: timestamp('claimed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, table => ({ storageIndex: index('bapp_scans_storage_idx').on(table.storageId, table.id), barcodeIndex: index('bapp_scans_barcode_idx').on(table.barcode), statusIndex: index('bapp_scans_status_idx').on(table.validationStatus), npsnIndex: index('bapp_scans_npsn_idx').on(table.npsn, table.validationStatus) }))

export const bappSchoolCounts = mysqlTable('bapp_school_counts', {
  npsn: varchar('npsn', { length: 20 }).primaryKey(),
  status: mysqlEnum('status', ['pending', 'checking', 'ready', 'error']).notNull().default('pending'),
  transactionIds: json('transaction_ids').$type<string[]>(),
  serialNumbers: json('serial_numbers').$type<string[]>(),
  checkedAt: timestamp('checked_at'),
  claimedAt: timestamp('claimed_at'),
  message: varchar('message', { length: 255 })
})

export const schools = mysqlTable('schools', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  npsn: varchar('npsn', { length: 20 }).notNull().unique(),
  namaSekolah: varchar('nama_sekolah', { length: 255 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('aktif'),
  provinsi: varchar('provinsi', { length: 120 }).notNull(),
  kabKota: varchar('kab_kota', { length: 120 }).notNull(),
  kecamatan: varchar('kecamatan', { length: 120 }).notNull(),
  jumlahPid: int('jumlah_pid').notNull().default(0)
})

export const services = mysqlTable('services', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  url: varchar('url', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['operational', 'degraded', 'down']).notNull().default('operational'),
  uptime: int('uptime').notNull().default(10000),
  latency: int('latency').notNull().default(0),
  lastCheckedAt: timestamp('last_checked_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const activityLogs = mysqlTable('activity_logs', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  userId: int('user_id'),
  username: varchar('username', { length: 80 }).notNull(),
  role: mysqlEnum('role', ['Admin', 'Dinas', 'Internal']).notNull(),
  action: varchar('action', { length: 80 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 255 }).notNull(),
  detail: text('detail'),
  ipAddress: varchar('ip_address', { length: 64 }),
  userAgent: varchar('user_agent', { length: 512 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
