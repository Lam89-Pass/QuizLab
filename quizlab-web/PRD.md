# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# QUIZLAB — Interactive Quiz Platform

**Versi:** 1.0  
**Status:** Initial Product Requirement  
**Platform:** Web Application  
**Target Pengguna:** Guru, dosen, mahasiswa, pelajar, dan komunitas.

---

## 1. Product Overview

### 1.1 Deskripsi Produk

QuizLab adalah platform kuis interaktif berbasis web yang memungkinkan pengguna membuat, membagikan, dan memainkan kuis secara langsung bersama peserta lain.

Platform ini memungkinkan pembuat kuis (host) membuat kuis melalui dashboard setelah login menggunakan Google atau GitHub. Setelah kuis dibuat, host dapat membagikan tautan, kode permainan, atau QR Code kepada peserta.

Peserta dapat bergabung melalui tautan atau QR Code tanpa harus melakukan registrasi maupun login. Peserta cukup memasukkan kode permainan dan nama panggilan untuk mengikuti kuis.

QuizLab menghadirkan pengalaman bermain kuis yang interaktif dengan sistem timer, feedback suara, animasi jawaban, leaderboard realtime, dan halaman hasil akhir yang dapat disimpan sebagai gambar.

### 1.2 Product Vision

Membangun platform kuis yang sederhana, mudah digunakan, dan menyenangkan sehingga siapa pun dapat membuat serta memainkan kuis interaktif bersama orang lain tanpa proses registrasi yang rumit bagi peserta.

### 1.3 Tujuan Produk

1. Mempermudah pengguna membuat kuis interaktif.
2. Memungkinkan peserta bergabung tanpa akun.
3. Memberikan pengalaman bermain kuis secara realtime.
4. Menampilkan peringkat peserta selama permainan.
5. Memberikan hasil akhir berupa leaderboard pemenang.
6. Memungkinkan pengguna menyimpan hasil kemenangan dalam bentuk gambar.

---

## 2. Target Pengguna dan User Roles

QuizLab memiliki dua jenis pengguna utama.

### 2.1 Host / Quiz Creator

Host adalah pengguna yang mempunyai akun dan bertanggung jawab membuat serta mengelola kuis.

Hak akses:
- Login dan logout.
- Membuat kuis baru.
- Mengedit dan menghapus kuis.
- Menambahkan pertanyaan dan jawaban.
- Mengatur durasi setiap pertanyaan.
- Menjalankan sesi kuis.
- Membagikan kode, link, dan QR Code.
- Melihat peserta yang bergabung.
- Memantau leaderboard realtime.
- Melihat hasil akhir kuis.
- Mengunduh gambar leaderboard pemenang.

### 2.2 Participant / Peserta

Peserta adalah pengguna yang mengikuti permainan kuis tanpa harus mempunyai akun.

Hak akses:
- Bergabung menggunakan kode permainan.
- Bergabung melalui link atau QR Code.
- Memasukkan nama panggilan.
- Menjawab pertanyaan.
- Melihat feedback jawaban.
- Melihat leaderboard selama permainan.
- Melihat hasil akhir permainan.
- Menyimpan gambar hasil kemenangan.

---

## 3. Core Features

### 3.1 Homepage

Halaman utama merupakan halaman pertama yang diakses pengguna ketika membuka website QuizLab.

Komponen:
- Logo dan nama QuizLab.
- Navigasi utama.
- Tombol Login.
- Tombol Create Quiz.
- Kolom Join Quiz.
- Hero section yang menjelaskan QuizLab.
- Informasi singkat cara bermain.

Aturan:
- Pengguna dapat mengakses homepage tanpa login.
- Pengguna dapat langsung memasukkan kode permainan.
- Pengguna yang memilih Create Quiz harus melakukan login terlebih dahulu.

### 3.2 Authentication

Sistem autentikasi digunakan untuk Host atau Quiz Creator.

Metode login:
- Login menggunakan Google.
- Login menggunakan GitHub.

Fitur:
- Login OAuth.
- Logout.
- Session management.
- Pengelolaan profil pengguna sederhana.

Aturan:
- Peserta tidak membutuhkan autentikasi.
- Hanya pengguna yang login yang dapat membuat dan mengelola kuis.
- Setiap kuis terhubung dengan akun pembuatnya.

### 3.3 Quiz Management

Fitur ini digunakan Host untuk membuat dan mengelola kuis.

Fitur:
- Create Quiz.
- Edit Quiz.
- Delete Quiz.
- Quiz Title.
- Quiz Description.
- Menambahkan pertanyaan.
- Menambahkan pilihan jawaban.
- Menentukan jawaban benar.
- Mengatur durasi pertanyaan.
- Mengatur urutan pertanyaan.
- Preview Quiz.

Jenis pertanyaan MVP:
- Multiple Choice.
- True or False.

Setiap pertanyaan minimal memiliki:
- Teks pertanyaan.
- Dua atau lebih pilihan jawaban.
- Satu jawaban benar.
- Durasi pengerjaan.

Durasi default setiap pertanyaan adalah 10 detik, tetapi dapat diubah oleh Host.

### 3.4 Quiz Sharing

Setelah kuis dibuat, Host dapat membagikannya kepada peserta.

Metode berbagi:
1. Share Link.
2. Game Code.
3. QR Code.

Contoh:
- Quiz Link: quizlab.com/join/ABC123
- Game Code: ABC123
- QR Code: Mengarahkan peserta menuju halaman bergabung dengan kode yang sudah terisi.

Aturan:
- Kode permainan dibuat secara otomatis.
- Kode hanya berlaku untuk sesi permainan yang aktif.
- Peserta yang membuka link akan diarahkan ke halaman Join Quiz.
- Host dapat menyalin link atau kode dan mengunduh QR Code.

### 3.5 Join Quiz

Peserta dapat bergabung tanpa membuat akun.

Alur:
1. Peserta membuka website QuizLab.
2. Peserta memasukkan kode permainan atau membuka link yang dibagikan.
3. Sistem memvalidasi kode.
4. Peserta memasukkan nama panggilan.
5. Peserta masuk ke Waiting Room.
6. Peserta menunggu Host memulai kuis.

Komponen Waiting Room:
- Nama kuis.
- Nama Host.
- Jumlah peserta.
- Daftar peserta yang bergabung.
- Informasi menunggu permainan dimulai.

Aturan:
- Nama panggilan wajib diisi.
- Nama peserta dalam satu sesi harus unik.
- Peserta tidak perlu login.
- Peserta yang bergabung setelah permainan dimulai tidak dapat masuk secara default.

### 3.6 Live Quiz / Gameplay

Fitur ini merupakan inti dari QuizLab.

Ketika Host memulai permainan, seluruh peserta yang sudah bergabung akan diarahkan ke halaman permainan.

Alur gameplay:

1. Host memulai permainan.
2. Sistem menampilkan pertanyaan kepada semua peserta.
3. Timer dimulai secara bersamaan.
4. Peserta memilih salah satu jawaban.
5. Jawaban dikunci setelah dipilih atau waktu habis.
6. Peserta menunggu hingga timer selesai.
7. Sistem menampilkan jawaban yang benar.
8. Sistem memberikan feedback suara dan animasi.
9. Sistem memperbarui leaderboard.
10. Host melanjutkan ke pertanyaan berikutnya.

Komponen tampilan:
- Nomor pertanyaan.
- Teks pertanyaan.
- Pilihan jawaban.
- Countdown timer.
- Status jawaban peserta.

### 3.7 Sound Effect dan Animation Feedback

QuizLab memiliki feedback interaktif untuk meningkatkan keseruan permainan.

**Jawaban Benar:**
- Sistem memainkan suara kemenangan (Win Sound).
- Menampilkan animasi atau indikator jawaban benar.
- Menampilkan informasi bahwa peserta menjawab dengan benar.

**Jawaban Salah:**
- Sistem memainkan suara jawaban salah.
- Menampilkan animasi video dengan efek zoom-in dari ukuran kecil menjadi besar.
- Menampilkan informasi jawaban yang benar.

**Waktu Habis:**
- Menampilkan notifikasi waktu habis.
- Peserta yang belum menjawab memperoleh 0 poin.

Catatan implementasi:
- Sound effect dan animasi diputar pada halaman peserta.
- Animasi jawaban salah menggunakan video atau aset animasi yang disediakan platform.
- Efek suara dapat dimatikan melalui pengaturan.
- Feedback tidak boleh mengganggu proses sinkronisasi permainan.

### 3.8 Realtime Leaderboard

Leaderboard menjadi salah satu fitur utama QuizLab.

Leaderboard menampilkan peringkat peserta berdasarkan skor yang diperoleh selama permainan.

Fitur:
- Peringkat peserta.
- Nama peserta.
- Total skor.
- Perubahan posisi peserta.
- Update secara realtime setelah setiap pertanyaan selesai.

Leaderboard dapat dilihat oleh:
- Host.
- Seluruh peserta.

Leaderboard ditampilkan di antara sesi pertanyaan sebagai jeda permainan.

### 3.9 Final Leaderboard

Setelah seluruh pertanyaan selesai, sistem menampilkan halaman hasil akhir.

Komponen:
- Judul Final Results.
- Top 3 Winners.
- Podium juara 1, 2, dan 3.
- Nama pemenang.
- Total skor.
- Peringkat peserta lainnya.
- Tombol Save Winner Image.
- Tombol Kembali ke Dashboard untuk Host.
- Tombol Kembali ke Homepage untuk Peserta.

Halaman hasil akhir harus ditampilkan kepada Host dan seluruh peserta.

### 3.10 Save Winner Image

Host dan peserta dapat menyimpan gambar leaderboard pemenang.

Ketika tombol Save Winner Image ditekan, sistem menghasilkan gambar leaderboard dalam format PNG.

Konten gambar:
- Logo QuizLab.
- Judul kuis.
- Tanggal permainan.
- Juara 1, 2, dan 3.
- Nama pemenang.
- Total skor masing-masing pemenang.

Gambar dapat diunduh langsung melalui browser.

---

## 4. User Flow

### 4.1 Host Flow

1. Membuka homepage.
2. Memilih Create Quiz.
3. Login menggunakan Google atau GitHub.
4. Masuk ke Dashboard.
5. Memilih Create New Quiz.
6. Mengisi informasi kuis.
7. Menambahkan pertanyaan dan jawaban.
8. Menyimpan kuis.
9. Menekan tombol Start Quiz.
10. Sistem menghasilkan kode permainan dan QR Code.
11. Host membagikan link, kode, atau QR Code.
12. Host menunggu peserta bergabung.
13. Host memulai permainan.
14. Host memantau pertanyaan dan leaderboard.
15. Permainan selesai.
16. Host melihat Final Leaderboard.
17. Host mengunduh gambar pemenang.

### 4.2 Participant Flow

1. Membuka website atau link yang dibagikan Host.
2. Memasukkan kode permainan jika belum tersedia.
3. Memasukkan nama panggilan.
4. Bergabung ke Waiting Room.
5. Menunggu Host memulai permainan.
6. Mengerjakan pertanyaan.
7. Mendapatkan feedback benar atau salah.
8. Melihat leaderboard setelah setiap pertanyaan.
9. Melanjutkan permainan.
10. Melihat Final Leaderboard.
11. Mengunduh gambar hasil kemenangan.

---

## 5. Scoring System

Sistem penilaian dibuat sederhana untuk MVP.

Ketentuan:
- Jawaban benar mendapatkan 1.000 poin.
- Jawaban salah mendapatkan 0 poin.
- Tidak menjawab mendapatkan 0 poin.
- Total skor merupakan akumulasi seluruh jawaban benar.
- Peserta dengan skor tertinggi berada di posisi teratas.
- Jika skor sama, peserta dengan total waktu menjawab lebih cepat mendapat peringkat lebih tinggi.

Skor ditentukan oleh backend, bukan oleh browser peserta.

---

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Pengguna dapat mengakses homepage | Must Have |
| FR-02 | Host dapat login menggunakan Google | Must Have |
| FR-03 | Host dapat login menggunakan GitHub | Must Have |
| FR-04 | Host dapat membuat dan mengelola kuis | Must Have |
| FR-05 | Host dapat menambahkan pertanyaan dan jawaban | Must Have |
| FR-06 | Host dapat mengatur timer pertanyaan | Must Have |
| FR-07 | Sistem dapat menghasilkan game code | Must Have |
| FR-08 | Sistem dapat menghasilkan QR Code | Must Have |
| FR-09 | Peserta dapat bergabung tanpa login | Must Have |
| FR-10 | Peserta dapat menjawab pertanyaan | Must Have |
| FR-11 | Sistem dapat menampilkan timer realtime | Must Have |
| FR-12 | Sistem dapat memeriksa jawaban | Must Have |
| FR-13 | Sistem dapat memainkan sound effect | Should Have |
| FR-14 | Sistem dapat menampilkan animasi feedback | Should Have |
| FR-15 | Sistem dapat menampilkan leaderboard realtime | Must Have |
| FR-16 | Sistem dapat menampilkan final leaderboard | Must Have |
| FR-17 | Sistem dapat mengunduh gambar pemenang | Should Have |

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Tampilan kuis harus responsif.
- Perubahan pertanyaan dan timer harus tersinkronisasi.
- Leaderboard harus diperbarui tanpa refresh halaman.
- Sistem harus mampu menangani peserta dalam satu sesi secara bersamaan.

### 7.2 Security
- Host wajib login untuk membuat kuis.
- Endpoint pengelolaan kuis harus dilindungi autentikasi.
- Jawaban benar tidak boleh dikirim kepada peserta sebelum waktu pertanyaan selesai.
- Validasi jawaban dilakukan pada backend.
- Peserta hanya dapat mengirim satu jawaban per pertanyaan.
- Kode permainan harus divalidasi sebelum peserta bergabung.

### 7.3 Reliability
- Sistem menggunakan server sebagai sumber waktu utama.
- Jawaban yang sudah diterima tidak boleh hilang ketika terjadi pembaruan leaderboard.
- Jika koneksi peserta terputus, peserta dapat mencoba bergabung kembali menggunakan sesi permainan yang masih aktif.

### 7.4 Usability
- Website harus mudah digunakan oleh pengguna baru.
- Tampilan responsif pada desktop dan mobile.
- Peserta dapat bergabung dengan langkah yang minimal.
- Informasi permainan harus mudah dipahami.

---

## 8. Technology Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- WebSocket Client

### Backend
- Golang
- Gin Framework
- WebSocket
- REST API

### Database
- PostgreSQL

### Authentication
- Google OAuth 2.0
- GitHub OAuth

### Deployment
- Frontend: Vercel
- Backend: Render atau VPS
- Database: Neon PostgreSQL atau PostgreSQL pada VPS
- Source Code: GitHub

---

## 9. System Architecture

Frontend berkomunikasi dengan backend menggunakan REST API untuk operasi seperti login, pembuatan kuis, pengelolaan pertanyaan, dan pengambilan riwayat kuis.

WebSocket digunakan untuk komunikasi realtime selama sesi permainan.

Alur komunikasi:

1. Host membuat kuis melalui Next.js.
2. Next.js mengirim data ke Golang API.
3. Golang menyimpan kuis ke PostgreSQL.
4. Host memulai sesi permainan.
5. Golang menghasilkan kode permainan.
6. Peserta bergabung melalui kode permainan.
7. Backend mengelola seluruh sesi dan timer.
8. Backend mengirim pertanyaan melalui WebSocket.
9. Peserta mengirim jawaban.
10. Backend memeriksa jawaban dan menghitung skor.
11. Backend memperbarui leaderboard.
12. Hasil dikirim kepada Host dan seluruh peserta.
13. Setelah selesai, sistem menyediakan data leaderboard untuk dibuat menjadi gambar PNG.

---

## 10. Database Overview

Entitas utama yang diperlukan:

### Users
- id
- name
- email
- avatar_url
- provider
- provider_user_id
- created_at

### Quizzes
- id
- user_id
- title
- description
- created_at
- updated_at

### Questions
- id
- quiz_id
- question_text
- duration
- order_number

### Answers
- id
- question_id
- answer_text
- is_correct

### Game Sessions
- id
- quiz_id
- host_id
- game_code
- status
- started_at
- ended_at

### Participants
- id
- session_id
- nickname
- total_score
- joined_at

### Participant Answers
- id
- participant_id
- question_id
- selected_answer_id
- is_correct
- response_time
- score

---

## 11. Scope dan Batasan MVP

Untuk menjaga pengembangan tetap realistis, versi pertama QuizLab hanya mengembangkan fitur utama.

### In Scope
- Homepage.
- Login Google dan GitHub.
- Dashboard Host.
- Create, edit, dan delete quiz.
- Multiple Choice dan True or False.
- Share link, game code, dan QR Code.
- Join tanpa login.
- Waiting Room.
- Live Quiz.
- Timer 10 detik secara default.
- Sound effect benar dan salah.
- Animasi feedback jawaban.
- Leaderboard realtime.
- Final leaderboard.
- Download winner image.

### Out of Scope untuk MVP
- Integrasi AI untuk membuat pertanyaan.
- Upload video dan gambar pada soal.
- Pembuatan kelas dan manajemen sekolah.
- Sistem langganan dan pembayaran.
- Turnamen antarkelas.
- Fitur chat antarpeserta.
- Analitik pembelajaran tingkat lanjut.
- Aplikasi mobile native.

---

## 12. Success Metrics

Keberhasilan MVP diukur berdasarkan:

1. Host berhasil membuat dan menyimpan kuis.
2. Peserta dapat bergabung tanpa login menggunakan kode atau QR.
3. Semua peserta menerima pertanyaan dan timer yang sinkron.
4. Jawaban dapat diproses dan dinilai oleh backend.
5. Leaderboard dapat diperbarui setelah setiap pertanyaan.
6. Host dan peserta dapat melihat hasil akhir yang sama.
7. Gambar leaderboard dapat diunduh dengan benar.

---

## 13. Development Roadmap

### Phase 1 — Foundation
- Setup project Next.js.
- Setup project Golang.
- Setup PostgreSQL.
- Membuat struktur database.
- Membuat sistem autentikasi.

### Phase 2 — Quiz Management
- Dashboard Host.
- Create Quiz.
- Edit Quiz.
- Delete Quiz.
- Quiz Editor.
- Preview Quiz.

### Phase 3 — Game Session
- Generate Game Code.
- Generate QR Code.
- Join Quiz.
- Waiting Room.
- Participant Management.

### Phase 4 — Live Gameplay
- WebSocket Integration.
- Timer.
- Question Synchronization.
- Answer Validation.
- Scoring System.
- Sound Effect dan Animation.

### Phase 5 — Leaderboard
- Live Leaderboard.
- Final Leaderboard.
- Winner Podium.
- Download Winner Image.

### Phase 6 — Testing & Deployment
- Functional Testing.
- Realtime Testing.
- Multi-Participant Testing.
- Security Testing.
- Deployment Frontend.
- Deployment Backend.
- Database Deployment.

---

## 14. Final Product Goal

QuizLab diharapkan menjadi platform kuis interaktif sederhana yang memungkinkan seorang Host membuat permainan kuis dan mengundang banyak peserta melalui link, kode permainan, atau QR Code.

Peserta tidak perlu melakukan registrasi sehingga proses bergabung menjadi lebih cepat.

Seluruh proses permainan, mulai dari menjawab pertanyaan, menunggu timer, menerima feedback, hingga melihat leaderboard, berjalan secara realtime.

**Core Value QuizLab:**

"Create a Quiz. Share the Code. Let Everyone Play."