# Hisense - Spesifikasi Integrasi Webhook Direktorat

Dokumen ini merupakan panduan teknis resmi integrasi **Hisense Delivery Outbound Webhook Service** yang disediakan bagi Kemendikdasmen / Direktorat untuk menerima notifikasi otomatis secara *event-driven* dan real-time langsung ke server/endpoint internal masing-masing direktorat ketika terjadi pembaruan status transaksi IFP di lapangan.

---

## 1. Mekanisme & Konfigurasi Webhook

Layanan Webhook Hisense Delivery beroperasi dengan mekanisme *event-driven*:
1. **Pengiriman Real-Time**: Setiap kali terjadi perubahan status pada transaksi alokasi IFP (baik progres ekspedisi, progres teknisi di lapangan, maupun peninjauan berkas), sistem Hisense secara otomatis mengirimkan request HTTP POST ke server direktorat terkait.
2. **Endpoint Terdaftar**: Server direktorat cukup menyediakan endpoint yang dapat menerima payload JSON pada path yang disepakati.
3. **Validasi Respon**: Server penerima diharapkan memproses payload dan mengembalikan HTTP Response `200 OK` dengan format JSON `{ "success": true }`.

### A. Konfigurasi Endpoint Server Penerima
Setiap direktorat mendaftarkan URL dasar (*base URL*) server penerima. Sistem Hisense akan melakukan pengiriman HTTP POST ke target path berikut:
* **Pembaruan Status & Data Instalasi**: `POST {base_url}/update-installation`
* **Pembatalan Pengiriman (Shipment Void)**: `POST {base_url}/void`

### B. Header Request yang Dikirimkan
Setiap request webhook yang dikirimkan oleh Hisense menyertakan header standar berikut:

| Header Key | Tipe | Keterangan |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Format payload berupa JSON UTF-8. |
| `Authorization` | `Bearer <secret_key>` | *Opsional*: Token / Secret Key autentikasi webhook yang telah didaftarkan. |
| `X-Webhook-Secret` | `String` | *Opsional*: Secret Key autentikasi tambahan untuk memvalidasi request dari Hisense. |

---

## 2. Event & Spesifikasi Payload Webhook

### A. Event: Update Status Instalasi
* **Target Path**: `POST {base_url}/update-installation`
* **Trigger**: 
  - Perubahan milestone logistik ekspedisi (`BARANG SIAP`, `PROSES PENGIRIMAN`, `MENUJU ALAMAT`, `BARANG TIBA`).
  - Teknisi memulai atau menyelesaikan pemasangan unit di sekolah (`PROSES INSTALASI`, `INSTALASI SELESAI`).
  - Status review dari Direktorat / MOE (`DISETUJUI`, `REVISI`).
  - Status audit APIP (`REVIU APIP`, `SESUAI APIP`).
  - Status kendala lapangan (`INSTALASI TERKENDALA`, `INSTALASI GAGAL`, `PENGIRIMAN GAGAL`).

#### Payload Transaksi Lengkap (Full Schema):
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
* **Trigger**: Terjadi pembatalan resi atau pemindahan rute pengiriman oleh pihak ekspedisi logistik.

#### Payload:
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

## 3. Standar Response Server Direktorat

Server webhook milik direktorat diharapkan mengembalikan status HTTP sukses (2xx) dalam waktu kurang dari **5 detik**:

### Contoh Response Sukses (HTTP 200 OK)
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

## 4. Daftar Kode Status & Pemetaan Logistik Ekspedisi

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
| `INSTALASI GAGAL` | Lapangan | Pemasangan gagal atau dibatalkan karena kendala unit rusak atau tidak lengkap di lokasi sekolah. |
| `PENGIRIMAN GAGAL` | Logistik | Pengiriman logistik gagal atau pengantaran dibatalkan (*Undelivered / Void*). |

---

### B. Pemetaan Checkpoint Logistik Ekspedisi (Sartrans) ke Status Sistem

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

## 5. Keandalan & Mekanisme Percobaan Ulang (Retry Policy)

1. **Timeout**: Setiap pemanggilan webhook dibatasi timeout maksimal 10 detik.
2. **Retry Otomatis & Manual**: Jika server webhook direktorat mengembalikan error (status code 4xx / 5xx) atau mengalami network timeout, log pengiriman akan tercatat dengan status gagal dan dapat di-retry secara manual melalui portal admin Hisense.
3. **Idempotency**: Disarankan bagi server penerima untuk menggunakan `id_transaksi` dan `timestamp` sebagai kunci idempotensi agar aman dari pemrosesan data duplikat bila terjadi network retry.
