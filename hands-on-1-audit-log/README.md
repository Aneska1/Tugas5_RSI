# Hands-on 1 — Audit Log System

Sistem review kantin berbasis Express.js, React, TypeScript, dan SQL Server. Hands-on ini menambahkan audit trail untuk aktivitas penting agar aktivitas pengguna dan perubahan data dapat ditelusuri oleh admin.

## Fitur yang diimplementasikan

- Audit `LOGIN` dan `LOGOUT`, termasuk metadata request seperti `ip_address`, `user_agent`, `role`, dan `result`.
- Audit perubahan menu: `CREATE_MENU`, `UPDATE_MENU`, dan `DELETE_MENU`, dengan snapshot data yang relevan.
- Audit pembuatan pesanan (`CREATE_ORDER`) dan perubahan status pesanan (`UPDATE_ORDER_STATUS`).
- Penulisan audit untuk mutasi bisnis dilakukan dalam transaksi yang sama agar perubahan bisnis dan audit bersifat atomik.
- Pencatatan login/logout menggunakan mekanisme best-effort sesuai implementasi autentikasi.
- Riwayat audit hanya dapat dibaca oleh admin.
- Filter riwayat audit berdasarkan aksi, target, `targetId`, `userId`, rentang tanggal, dan pagination.
- Detail audit diambil dari endpoint berdasarkan ID dan ditampilkan dalam modal.
- Trigger database menjaga tabel audit tetap append-only dengan menolak operasi `UPDATE` dan `DELETE`.
- Password, token, dan cookie tidak dicatat ke metadata audit.

## Struktur repository

```text
Tugas5_RSI/
├── .gitignore
├── db/
│   ├── 01-audit-log-schema.sql
│   ├── 02-audit-seed.sql
│   ├── 03-audit-samples.sql
│   └── 04-audit-append-only.sql
└── hands-on-1-audit-log/
    ├── backend/
    ├── frontend/
    └── README.md
```

Catatan: folder `db` berada di root repository `Tugas5_RSI`, sejajar dengan folder `hands-on-1-audit-log`.

## Prasyarat

- Windows 10/11.
- Node.js 22.18 atau lebih baru dan npm.
- SQL Server dengan database `review_kantin` dari praktikum/pertemuan sebelumnya.
- SQL Server Management Studio (SSMS) atau tool SQL lain.
- ODBC Driver 18 for SQL Server (64-bit untuk Node.js 64-bit).
- Akun Windows yang menjalankan backend harus memiliki izin yang diperlukan pada database `review_kantin`.

## Konfigurasi port

| Komponen | Alamat |
|---|---|
| Backend Express API | `http://localhost:3000` |
| Frontend Vite | `http://localhost:5173` |
| API base URL frontend | `http://localhost:3000/api` |
| Database | SQL Server `review_kantin`, TCP `127.0.0.1:1433` |

Port backend dan frontend dikonfigurasi pada file backend `.env` dan `frontend/vite.config.ts`. Jangan menjalankan dua proses lain pada port yang sama.

## Persiapan database

Pastikan database `review_kantin` dan skema utama dari praktikum/pertemuan sebelumnya sudah tersedia. Jalankan script dari folder root `Tugas5_RSI\db` menggunakan SSMS dengan akun yang memiliki hak yang diperlukan.

Urutan penggunaan script:

1. `db/01-audit-log-schema.sql` — memastikan objek tabel/skema audit dan index yang diperlukan tersedia.
2. `db/02-audit-seed.sql` — menyiapkan data seed audit/admin sesuai isi script.
3. `db/04-audit-append-only.sql` — memasang mekanisme append-only agar `UPDATE` dan `DELETE` pada audit ditolak.
4. `db/03-audit-samples.sql` — query contoh untuk memeriksa data audit setelah aplikasi digunakan.

Jalankan script satu per satu di database `review_kantin`. Baca komentar di bagian awal setiap file SQL sebelum menjalankannya. Jangan jalankan script pada database lain.

Akun demo yang digunakan untuk praktikum:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@kantin.test` | `admin123` |
| Owner | `tini@kantin.test` | `rahasia123` |
| Customer | `bagas@student.test` | `rahasia123` |

Akun dan data warung/menu demo harus sudah tersedia pada database dari tahap praktikum sebelumnya. Kredensial tersebut hanya untuk lingkungan praktikum lokal.

## Menjalankan backend

Buka CMD pertama, lalu jalankan:

```cmd
cd /d "D:\Kuliah Semester 3\REKAYASA SISTEM INFORMASI\PRAKTIKUM\Tugas5_RSI\hands-on-1-audit-log\backend"
copy .env.example .env
notepad .env
```

Pastikan bagian konfigurasi pada `.env` sesuai dengan lingkungan lokal:

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

DB_SERVER=127.0.0.1
DB_PORT=1433
DB_NAME=review_kantin
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

JWT_SECRET=ganti_dengan_secret_acak_minimal_32_karakter
JWT_EXPIRES_IN=1d
AUTH_COOKIE_NAME=kantin_session_ho2
BCRYPT_SALT_ROUNDS=10
```

Backend menggunakan Windows Authentication melalui `mssql/msnodesqlv8` dan ODBC Driver 18. Karena itu, konfigurasi tidak menggunakan `DB_USER` atau `DB_PASSWORD`. Pastikan akun Windows yang menjalankan Node.js memiliki akses database. Jangan commit file `.env` atau secret asli.

Buat secret JWT acak untuk `.env` lokal, misalnya dengan perintah berikut dari folder backend:

```cmd
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Salin hasilnya sebagai nilai `JWT_SECRET` pada `.env`, lalu pasang dependency dan jalankan backend:

```cmd
npm install
npm run dev
```

Backend berjalan di `http://localhost:3000`.

## Menjalankan frontend

Buka CMD kedua (backend tetap berjalan), lalu jalankan:

```cmd
cd /d "D:\Kuliah Semester 3\REKAYASA SISTEM INFORMASI\PRAKTIKUM\Tugas5_RSI\hands-on-1-audit-log\frontend"
npm install
npm run dev
```

Buka aplikasi melalui browser:

```text
http://localhost:5173
```

Frontend menggunakan API `http://localhost:3000/api`. Konfigurasi server Vite menetapkan port `5173` dan `strictPort: true`.

## Alur demo fitur audit

### 1. Login dan logout

1. Buka aplikasi pada `http://localhost:5173`.
2. Login sebagai admin, owner, atau customer menggunakan akun demo.
3. Logout dari aplikasi.
4. Login kembali sebagai admin dan buka menu **Audit**.
5. Cari aktivitas `LOGIN` dan `LOGOUT`, lalu buka detailnya.
6. Untuk aktivitas yang berasal dari browser, metadata request menampilkan User-Agent browser. Catatan dari pengujian Node.js dapat memiliki User-Agent `node`.

Metadata request yang relevan dapat berisi IP address, user agent, role, dan result. Nilai dapat berbeda sesuai sumber request dan ketersediaan metadata pada aktivitas tersebut.

### 2. Perubahan menu

1. Login sebagai owner.
2. Tambah menu, ubah menu, atau hapus menu.
3. Login sebagai admin dan buka menu **Audit**.
4. Periksa catatan `CREATE_MENU`, `UPDATE_MENU`, atau `DELETE_MENU`.
5. Metadata perubahan menu menyimpan snapshot yang relevan, misalnya `after` untuk pembuatan dan `before` untuk penghapusan.

### 3. Pembuatan dan perubahan status pesanan

1. Login sebagai customer dan buat pesanan.
2. Login sebagai admin untuk memproses status pesanan.
3. Buka menu **Audit** dan periksa catatan `CREATE_ORDER` serta `UPDATE_ORDER_STATUS`.
4. Metadata berisi ringkasan perubahan yang diperlukan untuk penelusuran.

### 4. Filter audit

Pada halaman **Audit**, tersedia filter berdasarkan:

- Aksi (`action`).
- Target tabel (`targetTable`).
- ID objek yang menjadi target (`targetId`).
- ID pengguna pelaku (`userId`).
- Tanggal awal (`from`) dan tanggal akhir (`to`).

Masukkan angka saja pada filter `targetId` dan `userId`, tanpa tanda `#`. Klik **Terapkan** untuk menjalankan filter. Tombol **Reset** menghapus filter aktif.

### 5. Detail audit

Klik **Lihat** pada salah satu baris. Frontend mengambil detail melalui `GET /api/audit-logs/:id`, kemudian menampilkan identitas pelaku, waktu, target, metadata, dan field request yang tersedia seperti IP address, user agent, role, serta result.

## Ringkasan API

| Method | Path | Akses | Fungsi |
|---|---|---|---|
| `POST` | `/api/auth/login` | Publik | Login dan pencatatan audit login |
| `POST` | `/api/auth/logout` | Pengguna terautentikasi | Logout dan pencatatan audit logout |
| `POST` | `/api/menu` | Owner | Membuat menu dan audit |
| `PUT` | `/api/menu/:id` | Owner pemilik | Mengubah menu dan audit |
| `DELETE` | `/api/menu/:id` | Owner pemilik | Menghapus menu dan audit |
| `POST` | `/api/orders` | Customer | Membuat pesanan dan audit |
| `PATCH` | `/api/orders/:id/status` | Admin | Mengubah status pesanan dan audit |
| `GET` | `/api/audit-logs` | Admin | Daftar audit dengan filter dan pagination |
| `GET` | `/api/audit-logs/:id` | Admin | Detail satu catatan audit |

### Query `GET /api/audit-logs`

| Parameter | Tipe | Keterangan |
|---|---|---|
| `page` | Integer positif | Nomor halaman |
| `pageSize` | Integer 1–100 | Jumlah data per halaman |
| `action` | String | Filter jenis aktivitas |
| `targetTable` | String | Filter nama tabel target |
| `targetId` | Integer positif | Filter ID objek target |
| `userId` | Integer positif | Filter ID pengguna pelaku |
| `from` | `YYYY-MM-DD` | Tanggal awal |
| `to` | `YYYY-MM-DD` | Tanggal akhir |

Filter yang dikirim bersama-sama diterapkan sebagai kondisi gabungan (AND). Query tidak valid ditolak dengan respons validasi.

## Arsitektur singkat

### Backend

| Komponen | Tanggung jawab |
|---|---|
| `src/db/pool.ts` | Koneksi SQL Server melalui Windows Authentication dan ODBC Driver 18 |
| `src/db/transaction.ts` | Transaksi untuk mutasi bisnis dan audit |
| `src/db/request.ts` | Membuat request SQL dari pool atau transaksi |
| `src/repositories/auditLogRepository.ts` | Insert dan query data audit |
| `src/services/auditLogService.ts` | Logika pencatatan dan pembacaan audit |
| `src/controllers/auditLogController.ts` | Penanganan request endpoint audit |
| `src/routes/auditLogRouter.ts` | Routing dan pembatasan akses admin |

### Frontend

| File | Tanggung jawab |
|---|---|
| `src/types/auditLog.ts` | Tipe data audit, filter, dan pagination |
| `src/lib/api.ts` | Fungsi API daftar dan detail audit |
| `src/lib/audit.ts` | Label aksi/target dan format metadata |
| `src/pages/AuditLogPage.tsx` | Filter, tabel, pagination, dan modal detail |

## Pengujian

Jalankan perintah berikut dari folder masing-masing.

Backend:

```cmd
npm run typecheck
npm run test:unit
npm run test:integration
```

Frontend:

```cmd
npm test
npm run build
```

Hasil pengujian yang telah dijalankan pada lingkungan praktikum:

| Pengujian | Hasil |
|---|---:|
| Backend unit test | 57/57 lulus |
| Backend integration test | 25/25 lulus |
| Frontend test | 33/33 lulus |
| Frontend production build | Berhasil |
| Backend TypeScript typecheck | Berhasil |

Integration test membutuhkan database `review_kantin` beserta akun demo dan data warung/menu yang disiapkan pada tahap praktikum sebelumnya.

## Keamanan dan batasan

- Endpoint daftar dan detail audit hanya dapat diakses admin.
- Aplikasi tidak menyediakan endpoint untuk mengubah atau menghapus catatan audit.
- Trigger database menolak `UPDATE` dan `DELETE` pada tabel audit.
- Jangan menyimpan password, token, cookie, atau header otorisasi dalam metadata.
- File `.env` berisi konfigurasi lokal dan secret, sehingga tidak boleh dimasukkan ke Git.
- Metadata audit harus ditampilkan sebagai data, bukan dieksekusi sebagai HTML atau kode.
- Audit trail bukan pengganti backup database.

## Troubleshooting

| Gejala | Pemeriksaan |
|---|---|
| Backend gagal konek ke SQL Server | Pastikan SQL Server aktif, TCP/IP aktif, port TCP `1433` dapat diakses, ODBC Driver 18 tersedia, dan akun Windows memiliki izin database. |
| Error ODBC driver tidak ditemukan | Pastikan nama driver ODBC 18 terpasang dan arsitektur driver sesuai dengan Node.js. |
| Frontend tidak dapat memanggil API | Pastikan backend berjalan di port `3000`, `CORS_ORIGIN` adalah `http://localhost:5173`, dan frontend dibuka di port `5173`. |
| `403` saat membuka Audit | Login menggunakan akun admin. |
| Filter menghasilkan daftar kosong | Periksa kembali angka `targetId` dan `userId`, rentang tanggal, serta filter lain yang aktif. |
| Tidak ada catatan audit | Pastikan script skema sudah dijalankan dan lakukan aktivitas login, perubahan menu, atau pesanan. |
