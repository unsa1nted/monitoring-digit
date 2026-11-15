import { mysqlTable, varchar, int, timestamp, mysqlEnum, text, bigint, index, json, uniqueIndex, foreignKey } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  username: varchar('username', { length: 80 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['Admin', 'Dinas', 'Internal']).notNull().default('Dinas'),
  province: varchar('province', { length: 120 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const petugasReviewer = mysqlTable('petugas_reviewer', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  namaPetugas: varchar('nama_petugas', { length: 120 }).notNull(),
  userPetugas: varchar('user_petugas', { length: 80 }).notNull().unique(),
  alokasiPersen: int('alokasi_persen')
})

export const bappReviewerAssignments = mysqlTable('bapp_reviewer_assignments', {
  npsn: varchar('npsn', { length: 20 }).primaryKey(),
  userPetugas: varchar('user_petugas', { length: 80 }).notNull()
}, table => ({ reviewer: foreignKey({ columns: [table.userPetugas], foreignColumns: [petugasReviewer.userPetugas], name: 'bapp_reviewer_petugas_fk' }) }))

export const masterBapp = mysqlTable('master_bapp', {
id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
idTransaksi: varchar('id_transaksi', { length: 80 }).notNull().unique(),
  sudahAdaRevisi: mysqlEnum('sudah_ada_revisi', ['Ya', 'Tidak']).notNull(),
  statusProgress: varchar('status_progress', { length: 80 }),
  npsn: varchar('npsn', { length: 20 }).notNull(),
  namaSekolah: varchar('nama_sekolah', { length: 255 }),
  propinsi: varchar('propinsi', { length: 120 }),
  kabupatenKota: varchar('kabupaten_kota', { length: 120 }),
  kecamatan: varchar('kecamatan', { length: 120 }),
  serialNumber: varchar('serial_number', { length: 160 }),
  tag: text('tag'),
  petugasReviu: varchar('petugas_reviu', { length: 80 }).notNull(),
  fotoPlangSekolah: mysqlEnum('foto_plang_sekolah', ['Ya', 'Tidak']),
  fotoBoxPic: mysqlEnum('foto_box_pic', ['Ya', 'Tidak']),
  fotoKelengkapanUnit: mysqlEnum('foto_kelengkapan_unit', ['Ya', 'Tidak']),
  fotoProsesInstalasi: mysqlEnum('foto_proses_instalasi', ['Ya', 'Tidak']),
  fotoKesesuaianSerialNumber: mysqlEnum('foto_kesesuaian_serial_number', ['Ya', 'Tidak']),
  fotoTrainingRumahPendidikan: mysqlEnum('foto_training_rumah_pendidikan', ['Ya', 'Tidak']),
  fotoBapp1: mysqlEnum('foto_bapp_1', ['Ya', 'Tidak']),
  fotoBapp2: mysqlEnum('foto_bapp_2', ['Ya', 'Tidak']),
  hasilAkhirReviu: mysqlEnum('hasil_akhir_reviu', ['Sesuai', 'Tidak Sesuai']),
  catatanPetugas: text('catatan_petugas')
})

export const bappReviewNotifications = mysqlTable('bapp_review_notifications', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  idTransaksi: varchar('id_transaksi', { length: 80 }).notNull().unique(),
  userPetugas: varchar('user_petugas', { length: 80 }).notNull(),
  namaSekolah: varchar('nama_sekolah', { length: 255 }),
  npsn: varchar('npsn', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at')
}, table => ({ reviewerUnread: index('bapp_review_notifications_reviewer_unread').on(table.userPetugas, table.readAt) }))

export const bappHisenseSyncRuns = mysqlTable('bapp_hisense_sync_runs', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  source: mysqlEnum('source', ['automatic', 'manual']).notNull(),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
  created: int('created').notNull(),
  updated: int('updated').notNull(),
  allocated: int('allocated').notNull(),
  distribution: json('distribution').$type<Array<{ userPetugas: string; namaPetugas: string; count: number }>>().notNull()
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
