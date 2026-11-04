# Hisense - Spesifikasi Integrasi API & Webhook Direktorat

Dokumen ini merupakan panduan teknis resmi integrasi **Hisense Delivery API & Webhook Service** yang disediakan bagi Kemendikdasmen / Direktorat untuk memantau status pengiriman, proses instalasi perangkat IFP, data BAPP, serta melakukan peninjauan (*Review / Approval / Revisi*) langsung melalui sistem informasi internal masing-masing direktorat.

---

## 1. Arsitektur & Informasi Lingkungan (Environment)

* **Production Base URL**: `https://ifp-api.pyxscreen.co.id/api`
* **Root Path Layanan**: `/api/direktorat/...`
* **Format Data**: JSON (`application/json`)
* **Standar Karakter & Encoding**: UTF-8
* **Keamanan**: TLS/HTTPS 1.3, JSON Web Token (JWT) Bearer Authentication

---

## 2. Autentikasi & Manajemen Token

Setiap request ke endpoint data dan action wajib menyertakan token JWT yang diperoleh dari endpoint Login pada HTTP Header:
```http
Authorization: Bearer <TOKEN_JWT_DIREKTORAT>
```

### A. Login Autentikasi Direktorat
* **Endpoint**: `POST /api/direktorat/auth/login`
* **Full URL**: `https://ifp-api.pyxscreen.co.id/api/direktorat/auth/login`
* **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "username": "direktoratsd",
  "password": "2026@HISENSE"
}
```

> **Daftar Akun Standar per Direktorat**:
> * Direktorat SD: `username: "direktoratsd"`, `password: "2026@HISENSE"`
> * Direktorat SMP: `username: "direktoratsmp"`, `password: "2026@HISENSE"`
> * Direktorat SMA: `username: "direktoratsma"`, `password: "2026@HISENSE"`
> * Direktorat SMK: `username: "direktoratsmk"`, `password: "2026@HISENSE"`
> * Direktorat PAUD: `username: "direktoratpaud"`, `password: "2026@HISENSE"`
> * Direktorat PKPLK: `username: "direktoratpkplk"`, `password: "2026@HISENSE"`
> * Direktorat PNFI: `username: "direktoratpnfi"`, `password: "2026@HISENSE"`

#### Response (Success - HTTP 200 OK)
```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "username": "direktoratsd",
    "nama_direktorat": "Direktorat Sekolah Dasar",
    "kode_direktorat": "SD",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRpcmVrdG9yYXRzZCIsImtvZGVfZGlyZWt0b3JhdCI6IlNEIiwicm9sZSI6ImRpcmVrdG9yYXQiLCJpYXQiOjE3OTE0ODU0NDgsImV4cCI6MTc5NDA3NzQ0OH0...",
    "token_type": "Bearer",
    "expires_in": "30d"
  }
}
```

---

### B. Validasi Masa Aktif Token (Check Token)
Digunakan oleh sistem direktorat untuk memverifikasi apakah token masih aktif tanpa perlu login ulang.

* **Endpoint**: `GET /api/direktorat/auth/check-token`
* **Headers**: `Authorization: Bearer <TOKEN>`

#### Response (Success - HTTP 200 OK)
```json
{
  "success": true,
  "valid": true,
  "data": {
    "username": "direktoratsd",
    "kode_direktorat": "SD",
    "expires_at": "2026-11-08T06:05:55.000Z"
  }
}
```

#### Response (Error - HTTP 401 Unauthorized)
```json
{
  "success": false,
  "valid": false,
  "message": "Token tidak valid atau telah expired. Silakan lakukan login kembali."
}
```

---

## 3. Pengambilan Data Instalasi per Direktorat

Setiap direktorat memiliki endpoint khusus yang terisolasi (*data isolation guard*):

| Direktorat | Endpoint Tarikan List | Endpoint Single Transaksi |
| :--- | :--- | :--- |
| **SD** | `GET /api/direktorat/sd` | `GET /api/direktorat/sd/:id_transaksi` |
| **SMP** | `GET /api/direktorat/smp` | `GET /api/direktorat/smp/:id_transaksi` |
| **SMA** | `GET /api/direktorat/sma` | `GET /api/direktorat/sma/:id_transaksi` |
| **SMK** | `GET /api/direktorat/smk` | `GET /api/direktorat/smk/:id_transaksi` |
| **PAUD** | `GET /api/direktorat/paud` | `GET /api/direktorat/paud/:id_transaksi` |
| **PKPLK** | `GET /api/direktorat/pkplk` | `GET /api/direktorat/pkplk/:id_transaksi` |
| **PNFI** | `GET /api/direktorat/pnfi` | `GET /api/direktorat/pnfi/:id_transaksi` |

### Parameter Query (Tarikan List):
* `page` *(integer, default: 1)*: Halaman data.
* `limit` *(integer, default: 100, maksimal: 5000)*: Jumlah data per tarikan.
* `status` *(string, opsional)*: Filter status alokasi (bebas filter semua status, misal: `BARANG SIAP`, `PROSES PENGIRIMAN`, `MENUJU ALAMAT`, `INSTALASI SELESAI`, `REVISI`, `DISETUJUI`, `REVIU APIP`, `SESUAI APIP`).
* `nama_batch` *(string, opsional)*: Contoh: `Batch 1`, `Batch 2`.
* `nama_termin` *(string, opsional)*: Contoh: `1`, `2`.
* `search` *(string, opsional)*: Pencarian teks pada NPSN, Nomor Resi, ID Transaksi, Serial Number, atau Nama Sekolah.

---

### Contoh Response Data Transaksi (HTTP 200 OK)

```json
{
  "success": true,
  "meta": {
    "process": "1 to 2 out of 15751 total",
    "item_count": 15751,
    "page_count": 7876,
    "current_page": 1,
    "limit": 2,
    "has_next_page": true
  },
  "data": [
    {
      "id_transaksi": "HI202600000015452",
      "kode_direktorat": "SD",
      "nama_batch": "Batch 2",
      "nama_termin": null,
      "serial_number": "3TB76B26234J01742GJ2710",
      "kode_status_progress": "INSTALASI SELESAI",
      
      "waktu_barang_siap": "2026-10-07T17:00:00.000Z",
      "waktu_proses_pengiriman": "2026-10-08T01:08:00.000Z",
      "waktu_menuju_alamat": "2026-10-08T01:08:00.000Z",
      "waktu_barang_tiba": "2026-10-08T04:24:00.000Z",
      "waktu_mulai_instalasi": "2026-10-08T04:41:03.629Z",
      "waktu_selesai_instalasi_aktual": "2026-10-09T01:52:13.000Z",
      "waktu_selesai_instalasi": "2026-10-09T01:52:13.000Z",
      
      "waktu_disetujui": null,
      "waktu_revisi": null,
      "waktu_reviu_apip": null,
      "waktu_revisi_apip": null,
      "waktu_sesuai_apip": null,

      "approved_by_moe": null,
      "rejected_by_moe": null,
      "approved_by_apip": null,
      "rejected_by_apip": null,
      
      "tag_revisi": null,
      "catatan_revisi": null,
      "public_bapp_url": "https://ifp.hisense.co.id/verify-bapp?doc_id=9e03806225d6c4ee371dc0719542ade4:fadef4e3dc75ca86673733c7d687b9f4...",

      "foto_instalasi": {
        "foto_plang_sekolah": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_plang_sekolah-1791453849540-73105418.jpeg",
        "foto_box_pic": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_box_pic-1791463249090-693115971.jpeg",
        "foto_kelengkapan_unit": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_kelengkapan_unit.jpeg",
        "foto_proses_instalasi": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_proses_instalasi.jpeg",
        "foto_sn": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_sn-1791464475940-589575117.jpeg",
        "foto_training": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_training-1791466513714-678545668.jpeg",
        "foto_bapp_1": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_bapp_1-1791467322456-363403498.jpeg",
        "foto_bapp_2": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_bapp_2-1791467379351-653290836.jpeg",
        "foto_suket_1": null,
        "foto_suket_2": null
      },

      "npsn_info": {
        "no_urut_sekolah": "SD141417",
        "npsn": "20532992",
        "nama_sekolah": "SD ISLAM TARBIYATUL ATHFAL",
        "kode_status_sekolah": "SWASTA",
        "tipe_sekolah": "Tipe 1 - Sudah revitalisasi/kondisi sekolah paling baik",
        "kondisi_sekolah": null,
        "kategori_penerima": null,
        "kode_direktorat": "SD",
        "kode_jenjang_pendidikan": "SD",
        "propinsi": "Prov. Jawa Timur",
        "kabupaten_kota": "Kota Surabaya",
        "kecamatan": "Kec. Rungkut",
        "kelurahan": "Kali Rungkut",
        "zona_sekolah": "JAWA",
        "latitude": -7.319289580936772,
        "longitude": 112.7689505588085,
        "qty": 5,
        "alamat": "Jl. Raya Rungkut No. 35 Surabaya",
        "nama_pic": "FITA ELSIA PUTRI, S.Pd",
        "no_telepon": "081333034573",
        "nama_kepsek": "Zaenal Mahmudi, S.P.D.I",
        "no_telepon_kepsek": "081553934933"
      },

      "data_pengiriman": [
        {
          "nomor_resi": "262053299220113",
          "ekspedisi": "SARTRANS",
          "status_pengiriman": "DELIVERED",
          "waktu_tiba": "2026-10-08T04:24:00.000Z",
          "nama_penerima": "FITA ELSIA PUTRI",
          "hubungan_penerima": "PIC Sekolah",
          
          "milestone_logistik": {
            "waktu_berangkat_crossdock": "2026-10-07T17:00:00.000Z",
            "waktu_menuju_hub_origin": "2026-10-07T19:00:00.000Z",
            "waktu_tiba_hub_origin": "2026-10-07T21:30:00.000Z",
            "waktu_tiba_port_origin": null,
            "waktu_berangkat_port_origin": null,
            "waktu_tiba_port_transit": null,
            "waktu_berangkat_port_transit": null,
            "waktu_tiba_port_destinasi": null,
            "waktu_menuju_hub_destinasi": "2026-10-07T23:00:00.000Z",
            "waktu_tiba_hub_destinasi": "2026-10-08T00:30:00.000Z",
            "waktu_process_dooring": "2026-10-08T01:08:00.000Z",
            "waktu_delivered": "2026-10-08T04:24:00.000Z"
          },

          "riwayat_checkpoint": [
            { "waktu": "2026-10-07 17:00:00", "status": "Berangkat dari Crossdock", "lokasi": "DC Karawang", "keterangan": "Manifest muatan keluar DC" },
            { "waktu": "2026-10-07 21:30:00", "status": "Tiba di Hub. Origin", "lokasi": "Hub Jakarta", "keterangan": "Barang siap konsolidasi" },
            { "waktu": "2026-10-08 00:30:00", "status": "Tiba di Hub Destinasi", "lokasi": "Hub Surabaya", "keterangan": "Sortir delivery rute" },
            { "waktu": "2026-10-08 01:08:00", "status": "Process Dooring", "lokasi": "Surabaya - Rungkut", "keterangan": "Menuju alamat sekolah" },
            { "waktu": "2026-10-08 04:24:00", "status": "Delivered", "lokasi": "SD ISLAM TARBIYATUL ATHFAL", "keterangan": "Barang diterima pihak sekolah" }
          ],

          "foto_bukti_pengiriman": [
            "https://ifp-prod.sgp1.digitaloceanspaces.com/production/pengiriman/2026/10/HI202600000015452/pod_tanda_terima.jpg",
            "https://ifp-prod.sgp1.digitaloceanspaces.com/production/pengiriman/2026/10/HI202600000015452/pod_barang.jpg"
          ]
        }
      ],

      "riwayat_revisi_moe": [
        {
          "id_history": 2260,
          "waktu_rejeksi": "2026-10-08T14:57:53.176Z",
          "tag_rejeksi": "Dokumen BAPP Salah/Kurang",
          "catatan_rejeksi": "Tanda tangan kepsek belum berstempel basah",
          "reviewer_name": "Dr. Ahmad Wahyudi (Direktorat SD)",
          "waktu_revisi": "2026-10-09T02:47:24.026Z",
          "catatan_perbaikan": "Sudah revisi dan diupload ulang lembar BAPP berstempel",
          "direvisi_oleh": "Budi Teknisi"
        }
      ],

      "riwayat_revisi_apip": [
        {
          "id_history": 91,
          "id_batch_reviu_apip": "AR/261005/00002",
          "waktu_rejeksi": "2026-10-06T10:06:07.366Z",
          "tag_rejeksi": "Serial Number Tidak Cocok",
          "catatan_rejeksi": "Serial number fisik tidak sama antara aplikasi dengan lembar BAPP",
          "reviewer_name": "Auditor Heru (APIP)",
          "waktu_revisi": "2026-10-07T03:00:02.455Z",
          "catatan_perbaikan": "BAPP SN sudah diperbaiki dan diverifikasi fisik",
          "direvisi_oleh": "Budi Teknisi"
        }
      ]
    }
  ]
}
```

---

## 4. Aksi Peninjauan (Review Action)

### A. Menyetujui Instalasi (Approve)
* **Endpoint**: `POST /api/direktorat/approve`
* **Headers**: `Authorization: Bearer <TOKEN>`

#### Request Body
```json
{
  "id_transaksi": "HI202600000015452",
  "reviewer_name": "Dr. Ahmad Wahyudi (Direktorat SD)"
}
```

#### Response (Success - HTTP 200 OK)
```json
{
  "success": true,
  "message": "Instalasi HI202600000015452 berhasil disetujui (DISETUJUI).",
  "data": {
    "id_transaksi": "HI202600000015452",
    "kode_status_progress": "DISETUJUI",
    "waktu_disetujui": "2026-10-09T12:30:00.000Z",
    "approved_by_moe": "Dr. Ahmad Wahyudi (Direktorat SD)"
  }
}
```

---

### B. Mengembalikan untuk Perbaikan (Reject / Revisi)
* **Endpoint**: `POST /api/direktorat/reject`
* **Headers**: `Authorization: Bearer <TOKEN>`

#### Pilihan Tag Revisi Standard (`tag_revisi`):
* `Dokumen BAPP Salah/Kurang`
* `Foto SN Buram`
* `Foto Plang Tidak Jelas`
* `Serial Number Tidak Cocok`
* `Unit Bermasalah`
* `Lainnya`

#### Request Body (Mendukung Multiple Tags)
```json
{
  "id_transaksi": "HI202600000015452",
  "tag_revisi": [
    "Dokumen BAPP Salah/Kurang",
    "Foto SN Buram"
  ],
  "catatan_revisi": "Tanda tangan kepala sekolah pada lembar BAPP halaman 2 belum dibubuhi stempel basah. Foto SN di belakang unit blur.",
  "reviewer_name": "Dr. Ahmad Wahyudi (Direktorat SD)"
}
```

#### Response (Success - HTTP 200 OK)
```json
{
  "success": true,
  "message": "Instalasi HI202600000015452 berhasil dikembalikan untuk perbaikan (REVISI).",
  "data": {
    "id_transaksi": "HI202600000015452",
    "kode_status_progress": "REVISI",
    "tag_revisi": "Dokumen BAPP Salah/Kurang, Foto SN Buram",
    "catatan_revisi": "Tanda tangan kepala sekolah pada lembar BAPP halaman 2 belum dibubuhi stempel basah. Foto SN di belakang unit blur.",
    "waktu_revisi": "2026-10-09T12:35:00.000Z",
    "rejected_by_moe": "Dr. Ahmad Wahyudi (Direktorat SD)"
  }
}
```

---

## 5. Sinkronisasi Otomatis Webhook Keluar (Outbound Webhooks)

Sistem Hisense Delivery dapat mengirimkan notifikasi *event-driven* secara real-time ke server direktorat saat terjadi pembaruan data transaksi. Format payload pembaruan instalasi menyertakan seluruh detail atribut yang sama lengkapnya seperti penarikan data melalui API.

### A. Event: Update Status Instalasi
* **Target Path**: `POST {base_url}/update-installation`
* **Headers Dikirimkan**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <secret_key>` *(jika secret_key dikonfigurasi)*
  * `X-Webhook-Secret: <secret_key>` *(opsional)*
* **Payload**:
```json
{
  "event": "INSTALLATION_UPDATE",
  "timestamp": "2026-10-09T12:00:00.000Z",
  "data": {
    "id_transaksi": "HI202600000015452",
    "kode_direktorat": "SD",
    "nama_batch": "Batch 2",
    "nama_termin": null,
    "serial_number": "3TB76B26234J01742GJ2710",
    "kode_status_progress": "INSTALASI SELESAI",
    
    "waktu_barang_siap": "2026-10-07T17:00:00.000Z",
    "waktu_proses_pengiriman": "2026-10-08T01:08:00.000Z",
    "waktu_menuju_alamat": "2026-10-08T01:08:00.000Z",
    "waktu_barang_tiba": "2026-10-08T04:24:00.000Z",
    "waktu_mulai_instalasi": "2026-10-08T04:41:03.629Z",
    "waktu_selesai_instalasi_aktual": "2026-10-09T01:52:13.000Z",
    "waktu_selesai_instalasi": "2026-10-09T01:52:13.000Z",
    
    "waktu_disetujui": null,
    "waktu_revisi": null,
    "waktu_reviu_apip": null,
    "waktu_revisi_apip": null,
    "waktu_sesuai_apip": null,

    "approved_by_moe": null,
    "rejected_by_moe": null,
    "approved_by_apip": null,
    "rejected_by_apip": null,
    
    "tag_revisi": null,
    "catatan_revisi": null,
    "public_bapp_url": "https://ifp.hisense.co.id/verify-bapp?doc_id=9e03806225d6c4ee371dc0719542ade4:fadef4e3dc75ca86673733c7d687b9f4...",

    "foto_instalasi": {
      "foto_plang_sekolah": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_plang_sekolah-1791453849540-73105418.jpeg",
      "foto_box_pic": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_box_pic-1791463249090-693115971.jpeg",
      "foto_kelengkapan_unit": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_kelengkapan_unit.jpeg",
      "foto_proses_instalasi": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_proses_instalasi.jpeg",
      "foto_sn": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_sn-1791464475940-589575117.jpeg",
      "foto_training": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_training-1791466513714-678545668.jpeg",
      "foto_bapp_1": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_bapp_1-1791467322456-363403498.jpeg",
      "foto_bapp_2": "https://ifp-prod.sgp1.digitaloceanspaces.com/production/instalasi/2026/10/HI202600000015452/foto_bapp_2-1791467379351-653290836.jpeg",
      "foto_suket_1": null,
      "foto_suket_2": null
    },

    "npsn_info": {
      "no_urut_sekolah": "SD141417",
      "npsn": "20532992",
      "nama_sekolah": "SD ISLAM TARBIYATUL ATHFAL",
      "kode_status_sekolah": "SWASTA",
      "tipe_sekolah": "Tipe 1 - Sudah revitalisasi/kondisi sekolah paling baik",
      "kondisi_sekolah": null,
      "kategori_penerima": null,
      "kode_direktorat": "SD",
      "kode_jenjang_pendidikan": "SD",
      "propinsi": "Prov. Jawa Timur",
      "kabupaten_kota": "Kota Surabaya",
      "kecamatan": "Kec. Rungkut",
      "kelurahan": "Kali Rungkut",
      "zona_sekolah": "JAWA",
      "latitude": -7.319289580936772,
      "longitude": 112.7689505588085,
      "qty": 5,
      "alamat": "Jl. Raya Rungkut No. 35 Surabaya",
      "nama_pic": "FITA ELSIA PUTRI, S.Pd",
      "no_telepon": "081333034573",
      "nama_kepsek": "Zaenal Mahmudi, S.P.D.I",
      "no_telepon_kepsek": "081553934933"
    },

    "data_pengiriman": [
      {
        "nomor_resi": "262053299220113",
        "ekspedisi": "SARTRANS",
        "status_pengiriman": "DELIVERED",
        "waktu_tiba": "2026-10-08T04:24:00.000Z",
        "nama_penerima": "FITA ELSIA PUTRI",
        "hubungan_penerima": "PIC Sekolah",
        
        "milestone_logistik": {
          "waktu_berangkat_crossdock": "2026-10-07T17:00:00.000Z",
          "waktu_menuju_hub_origin": "2026-10-07T19:00:00.000Z",
          "waktu_tiba_hub_origin": "2026-10-07T21:30:00.000Z",
          "waktu_tiba_port_origin": null,
          "waktu_berangkat_port_origin": null,
          "waktu_tiba_port_transit": null,
          "waktu_berangkat_port_transit": null,
          "waktu_tiba_port_destinasi": null,
          "waktu_menuju_hub_destinasi": "2026-10-07T23:00:00.000Z",
          "waktu_tiba_hub_destinasi": "2026-10-08T00:30:00.000Z",
          "waktu_process_dooring": "2026-10-08T01:08:00.000Z",
          "waktu_delivered": "2026-10-08T04:24:00.000Z"
        },

        "riwayat_checkpoint": [
          { "waktu": "2026-10-07 17:00:00", "status": "Berangkat dari Crossdock", "lokasi": "DC Karawang", "keterangan": "Manifest muatan keluar DC" },
          { "waktu": "2026-10-07 21:30:00", "status": "Tiba di Hub. Origin", "lokasi": "Hub Jakarta", "keterangan": "Barang siap konsolidasi" },
          { "waktu": "2026-10-08 00:30:00", "status": "Tiba di Hub Destinasi", "lokasi": "Hub Surabaya", "keterangan": "Sortir delivery rute" },
          { "waktu": "2026-10-08 01:08:00", "status": "Process Dooring", "lokasi": "Surabaya - Rungkut", "keterangan": "Menuju alamat sekolah" },
          { "waktu": "2026-10-08 04:24:00", "status": "Delivered", "lokasi": "SD ISLAM TARBIYATUL ATHFAL", "keterangan": "Barang diterima pihak sekolah" }
        ],

        "foto_bukti_pengiriman": [
          "https://ifp-prod.sgp1.digitaloceanspaces.com/production/pengiriman/2026/10/HI202600000015452/pod_tanda_terima.jpg",
          "https://ifp-prod.sgp1.digitaloceanspaces.com/production/pengiriman/2026/10/HI202600000015452/pod_barang.jpg"
        ]
      }
    ],

    "riwayat_revisi_moe": [
      {
        "id_history": 2260,
        "waktu_rejeksi": "2026-10-08T14:57:53.176Z",
        "tag_rejeksi": "Dokumen BAPP Salah/Kurang",
        "catatan_rejeksi": "Tanda tangan kepsek belum berstempel basah",
        "reviewer_name": "Dr. Ahmad Wahyudi (Direktorat SD)",
        "waktu_revisi": "2026-10-09T02:47:24.026Z",
        "catatan_perbaikan": "Sudah revisi dan diupload ulang lembar BAPP berstempel",
        "direvisi_oleh": "Budi Teknisi"
      }
    ],

    "riwayat_revisi_apip": [
      {
        "id_history": 91,
        "id_batch_reviu_apip": "AR/261005/00002",
        "waktu_rejeksi": "2026-10-06T10:06:07.366Z",
        "tag_rejeksi": "Serial Number Tidak Cocok",
        "catatan_rejeksi": "Serial number fisik tidak sama antara aplikasi dengan lembar BAPP",
        "reviewer_name": "Auditor Heru (APIP)",
        "waktu_revisi": "2026-10-07T03:00:02.455Z",
        "catatan_perbaikan": "BAPP SN sudah diperbaiki dan diverifikasi fisik",
        "direvisi_oleh": "Budi Teknisi"
      }
    ]
  }
}
```

---

### B. Event: Pembatalan Pengiriman (Shipment Void)
* **Target Path**: `POST {base_url}/void`
* **Headers Dikirimkan**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <secret_key>` *(jika secret_key dikonfigurasi)*
  * `X-Webhook-Secret: <secret_key>` *(opsional)*
* **Payload**:
```json
{
  "event": "SHIPMENT_VOID",
  "timestamp": "2026-10-09T12:05:00.000Z",
  "id_transaksi": "HI202600000015452",
  "kode_direktorat": "SD",
  "npsn": "20532992",
  "nomor_resi_pengiriman": "262053299220113",
  "reason": "Shipment cancelled / voided by Sartrans Logistic or Rerouted"
}
```

---

---

## 6. Daftar Kode Status & Pemetaan Logistik Ekspedisi

### A. Tabel Status Utama (`kode_status_progress`)

| Kode Status | Kategori | Deskripsi |
| :--- | :--- | :--- |
| `BARANG SIAP` | Logistik | Unit barang telah selesai diproses dan **berangkat keluar dari Crossdock / Factory DC** menuju hub ekspedisi pengiriman. |
| `PROSES PENGIRIMAN` | Logistik | Unit dalam perjalanan logistik antar hub, pelabuhan origin, kapal laut/pesawat, dan pelabuhan destinasi. |
| `MENUJU ALAMAT` | Logistik | Unit telah tiba di hub regional kota tujuan dan sedang dalam proses pengantaran (*Process Dooring*) ke alamat fisik sekolah. |
| `BARANG TIBA` | Logistik | Unit IFP telah sampai dan diterima secara resmi oleh pihak sekolah / PIC penerima. |
| `PROSES INSTALASI` | Lapangan | Teknisi telah tiba di sekolah dan sedang melakukan proses perakitan, pemasangan braket/standing, dan konfigurasi unit. |
| `INSTALASI SELESAI` | Lapangan | Pemasangan fisik, pelatihan guru/PIC, dan berkas lembar BAPP fisik selesai diunggah. Transaksi siap ditinjau (*Review*) oleh Direktorat. |
| `REVISI` | Peninjauan | Transaksi dikembalikan oleh Direktorat (MOE) atau auditor APIP untuk perbaikan foto, serial number, atau dokumen BAPP. |
| `DISETUJUI` | Peninjauan | Peninjauan berkas dan pemasangan disetujui resmi oleh Direktorat (Approved by MOE). |
| `REVIU APIP` | Audit | Alokasi telah masuk ke dalam batch peninjauan auditor Aparat Pengawasan Intern Pemerintah (APIP). |
| `SESUAI APIP` | Audit | Hasil audit APIP menyatakan berkas dan instalasi 100% sah dan sesuai standar (*Final Verified*). |
| `INSTALASI TERKENDALA` | Lapangan | Pemasangan tertunda / terkendala oleh faktor eksternal di sekolah (contoh: gedung sekolah masih renovasi, instalasi listrik belum siap). |
| `INSTALASI GAGAL` | Lapangan | Pemasangan gagal atau dibatalkan karena kendala unit rusak atau tidak lengkap. |
| `PENGIRIMAN GAGAL` | Logistik | Pengiriman logistik gagal atau pengantaran dibatalkan (*Undelivered / Void*). |

---

### B. Pemetaan Checkpoint Logistik Ekspedisi (Sartrans) ke Status Sistem

Berikut adalah tabel pemetaan antara status checkpoint yang dikirimkan oleh pihak ekspedisi (Sartrans) dengan status `kode_status_progress` pada sistem:

| Checkpoint Ekspedisi (Sartrans) | Status Sistem (`kode_status_progress`) | Milestone Logistik |
| :--- | :--- | :--- |
| `Berangkat dari Crossdock` | `BARANG SIAP` | `milestone_logistik.waktu_berangkat_crossdock` |
| `Menuju Hub. Origin` | `PROSES PENGIRIMAN` | `milestone_logistik.waktu_menuju_hub_origin` |
| `Tiba di Hub. Origin` | `PROSES PENGIRIMAN` | `milestone_logistik.waktu_tiba_hub_origin` |
| `Tiba di Port Origin` | `PROSES PENGIRIMAN` | `milestone_logistik.waktu_tiba_port_origin` |
| `Berangkat dari Port Origin` | `PROSES PENGIRIMAN` | `milestone_logistik.waktu_berangkat_port_origin` |
| `Tiba di Port Transit` | `MENUJU ALAMAT` | `milestone_logistik.waktu_tiba_port_transit` |
| `Berangkat dari Port Transit` | `MENUJU ALAMAT` | `milestone_logistik.waktu_berangkat_port_transit` |
| `Tiba di Port Destinasi` | `PROSES PENGIRIMAN` | `milestone_logistik.waktu_tiba_port_destinasi` |
| `Menuju Hub Destinasi` | `PROSES PENGIRIMAN` | `milestone_logistik.waktu_menuju_hub_destinasi` |
| `Tiba di Hub Destinasi` | `PROSES PENGIRIMAN` | `milestone_logistik.waktu_tiba_hub_destinasi` |
| `Process Dooring` | `MENUJU ALAMAT` | `milestone_logistik.waktu_process_dooring` |
| `Delivered` | `BARANG TIBA` *(Siap Diinstal)* | `milestone_logistik.waktu_delivered` |
| `Undelivered` / `Void` | `PENGIRIMAN GAGAL` | Checkpoint Gagal Antar |

---

## 7. Penanganan Error (Error Handling Standard)

Layanan mengembalikan kode status HTTP standar:
* **HTTP 200 OK**: Request berhasil diproses.
* **HTTP 400 Bad Request**: Parameter tidak lengkap, format payload salah, atau transisi status tidak valid.
* **HTTP 401 Unauthorized**: Token tidak disertakan atau telah expired.
* **HTTP 403 Forbidden**: Percobaan akses lintas direktorat (contoh: akun SD mengakses data SMP).
* **HTTP 404 Not Found**: Data transaksi atau endpoint tidak ditemukan.
* **HTTP 500 Internal Server Error**: Terjadi kendala internal pada server.
