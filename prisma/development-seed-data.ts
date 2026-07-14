// Checklist perkembangan (CDC Learn the Signs. Act Early.) — 2 bulan s/d 5 tahun.
// Digunakan oleh prisma/seed.ts. Bukan alat diagnosis medis.

export type DevelopmentCategory =
  | 'physical'
  | 'cognitive'
  | 'linguistic'
  | 'social'

export type DevelopmentChecklistSeed = {
  ageGroupMonths: number
  category: DevelopmentCategory
  question: string
}

export function developmentSeedKey(item: DevelopmentChecklistSeed): string {
  return `${item.ageGroupMonths}|${item.category}|${item.question}`
}

export const developmentChecklistSeedData: DevelopmentChecklistSeed[] = [
    // ===================== 2 BULAN =====================
    { ageGroupMonths: 2, category: "social", question: "Bisa tenang saat diajak bicara atau digendong?" },
    { ageGroupMonths: 2, category: "social", question: "Menatap wajah orang tua/pengasuh?" },
    { ageGroupMonths: 2, category: "social", question: "Terlihat senang saat orang tua/pengasuh mendekat?" },
    { ageGroupMonths: 2, category: "social", question: "Tersenyum saat diajak bicara atau tersenyum kepadanya?" },
    { ageGroupMonths: 2, category: "linguistic", question: "Membuat suara selain menangis?" },
    { ageGroupMonths: 2, category: "linguistic", question: "Bereaksi terhadap suara keras?" },
    { ageGroupMonths: 2, category: "cognitive", question: "Mengikuti gerakan orang tua dengan pandangan matanya?" },
    { ageGroupMonths: 2, category: "cognitive", question: "Menatap sebuah mainan selama beberapa detik?" },
    { ageGroupMonths: 2, category: "physical", question: "Bisa mengangkat kepala saat tengkurap?" },
    { ageGroupMonths: 2, category: "physical", question: "Menggerakkan kedua lengan dan kedua kakinya?" },
    { ageGroupMonths: 2, category: "physical", question: "Membuka telapak tangannya sebentar?" },
  
    // ===================== 4 BULAN =====================
    { ageGroupMonths: 4, category: "social", question: "Tersenyum sendiri untuk menarik perhatian orang tua?" },
    { ageGroupMonths: 4, category: "social", question: "Terkekeh (belum tertawa penuh) saat diajak bercanda?" },
    { ageGroupMonths: 4, category: "social", question: "Melihat, bergerak, atau bersuara untuk mendapat/menjaga perhatian orang tua?" },
    { ageGroupMonths: 4, category: "linguistic", question: "Membuat suara vokal seperti \"oooo\" atau \"aahh\"?" },
    { ageGroupMonths: 4, category: "linguistic", question: "Membalas dengan suara saat diajak bicara?" },
    { ageGroupMonths: 4, category: "linguistic", question: "Menoleh ke arah sumber suara orang tua?" },
    { ageGroupMonths: 4, category: "cognitive", question: "Membuka mulut saat melihat payudara/botol susu ketika lapar?" },
    { ageGroupMonths: 4, category: "cognitive", question: "Melihat tangannya sendiri dengan penuh perhatian?" },
    { ageGroupMonths: 4, category: "physical", question: "Bisa menahan kepala tegak tanpa bantuan saat digendong?" },
    { ageGroupMonths: 4, category: "physical", question: "Memegang mainan yang diletakkan di tangannya?" },
    { ageGroupMonths: 4, category: "physical", question: "Mengayunkan lengan ke arah mainan yang menarik perhatiannya?" },
    { ageGroupMonths: 4, category: "physical", question: "Membawa tangannya sendiri ke mulut?" },
    { ageGroupMonths: 4, category: "physical", question: "Mendorong badan dengan siku/lengan bawah saat tengkurap?" },
  
    // ===================== 6 BULAN =====================
    { ageGroupMonths: 6, category: "social", question: "Mengenali orang-orang yang familiar baginya?" },
    { ageGroupMonths: 6, category: "social", question: "Suka melihat dirinya sendiri di cermin?" },
    { ageGroupMonths: 6, category: "social", question: "Sudah bisa tertawa?" },
    { ageGroupMonths: 6, category: "linguistic", question: "Bergantian membuat suara dengan orang tua (seperti mengobrol)?" },
    { ageGroupMonths: 6, category: "linguistic", question: "Meniup \"raspberries\" (menjulurkan lidah sambil meniup)?" },
    { ageGroupMonths: 6, category: "linguistic", question: "Membuat suara melengking/memekik?" },
    { ageGroupMonths: 6, category: "cognitive", question: "Memasukkan benda ke mulut untuk mengeksplorasinya?" },
    { ageGroupMonths: 6, category: "cognitive", question: "Meraih mainan yang diinginkannya?" },
    { ageGroupMonths: 6, category: "cognitive", question: "Menutup bibir untuk menunjukkan sudah tidak mau makan lagi?" },
    { ageGroupMonths: 6, category: "physical", question: "Bisa berguling dari posisi tengkurap ke telentang?" },
    { ageGroupMonths: 6, category: "physical", question: "Mendorong badan dengan lengan lurus saat tengkurap?" },
    { ageGroupMonths: 6, category: "physical", question: "Bersandar pada tangan untuk menopang diri saat duduk?" },
  
    // ===================== 9 BULAN =====================
    { ageGroupMonths: 9, category: "social", question: "Terlihat malu, lengket, atau takut di dekat orang asing?" },
    { ageGroupMonths: 9, category: "social", question: "Menunjukkan beberapa ekspresi wajah (senang, sedih, marah, terkejut)?" },
    { ageGroupMonths: 9, category: "social", question: "Menoleh saat namanya dipanggil?" },
    { ageGroupMonths: 9, category: "social", question: "Bereaksi saat ditinggal (melihat, meraih, atau menangis)?" },
    { ageGroupMonths: 9, category: "social", question: "Tersenyum/tertawa saat bermain cilukba?" },
    { ageGroupMonths: 9, category: "linguistic", question: "Membuat suara berulang seperti \"mamamama\" atau \"babababa\"?" },
    { ageGroupMonths: 9, category: "linguistic", question: "Mengangkat kedua tangan minta digendong?" },
    { ageGroupMonths: 9, category: "cognitive", question: "Mencari benda yang jatuh dari pandangannya (seperti sendok/mainan)?" },
    { ageGroupMonths: 9, category: "cognitive", question: "Membenturkan dua benda bersamaan?" },
    { ageGroupMonths: 9, category: "physical", question: "Bisa duduk dari posisi lain tanpa dibantu?" },
    { ageGroupMonths: 9, category: "physical", question: "Memindahkan benda dari satu tangan ke tangan lain?" },
    { ageGroupMonths: 9, category: "physical", question: "Menggunakan jari untuk \"mengais\" makanan?" },
    { ageGroupMonths: 9, category: "physical", question: "Duduk tanpa bantuan?" },
  
    // ===================== 12 BULAN =====================
    { ageGroupMonths: 12, category: "social", question: "Bermain permainan seperti tepuk tangan (pat-a-cake)?" },
    { ageGroupMonths: 12, category: "linguistic", question: "Melambaikan tangan \"dadah\"?" },
    { ageGroupMonths: 12, category: "linguistic", question: "Memanggil orang tua \"mama\"/\"papa\" atau panggilan khusus lain?" },
    { ageGroupMonths: 12, category: "linguistic", question: "Memahami kata \"tidak\" (berhenti sejenak/berhenti saat diucapkan)?" },
    { ageGroupMonths: 12, category: "cognitive", question: "Memasukkan benda ke dalam wadah, seperti balok ke cangkir?" },
    { ageGroupMonths: 12, category: "cognitive", question: "Mencari benda yang disembunyikan di depan matanya, seperti mainan di bawah selimut?" },
    { ageGroupMonths: 12, category: "physical", question: "Menarik badan untuk berdiri?" },
    { ageGroupMonths: 12, category: "physical", question: "Berjalan sambil berpegangan pada furnitur?" },
    { ageGroupMonths: 12, category: "physical", question: "Minum dari cangkir tanpa tutup (dipegangi orang tua)?" },
    { ageGroupMonths: 12, category: "physical", question: "Mengambil benda kecil dengan ibu jari dan telunjuk?" },
  
    // ===================== 15 BULAN =====================
    { ageGroupMonths: 15, category: "social", question: "Meniru anak lain saat bermain, seperti mengeluarkan mainan dari wadah?" },
    { ageGroupMonths: 15, category: "social", question: "Menunjukkan benda kesukaannya kepada orang tua?" },
    { ageGroupMonths: 15, category: "social", question: "Bertepuk tangan saat merasa senang?" },
    { ageGroupMonths: 15, category: "social", question: "Memeluk boneka atau mainan lain?" },
    { ageGroupMonths: 15, category: "social", question: "Menunjukkan kasih sayang (memeluk, memeluk erat, atau mencium)?" },
    { ageGroupMonths: 15, category: "linguistic", question: "Mencoba mengucapkan 1-2 kata selain \"mama\"/\"papa\"?" },
    { ageGroupMonths: 15, category: "linguistic", question: "Melihat benda familiar saat disebutkan namanya?" },
    { ageGroupMonths: 15, category: "linguistic", question: "Mengikuti perintah yang disertai gestur dan kata (misal diberi mainan saat diminta)?" },
    { ageGroupMonths: 15, category: "linguistic", question: "Menunjuk untuk meminta sesuatu atau minta bantuan?" },
    { ageGroupMonths: 15, category: "cognitive", question: "Mencoba menggunakan benda dengan cara yang benar, seperti telepon, cangkir, atau buku?" },
    { ageGroupMonths: 15, category: "cognitive", question: "Menyusun minimal 2 benda kecil, seperti balok?" },
    { ageGroupMonths: 15, category: "physical", question: "Melangkah beberapa langkah sendiri tanpa dipegangi?" },
    { ageGroupMonths: 15, category: "physical", question: "Menggunakan jari untuk makan sendiri?" },
  
    // ===================== 18 BULAN =====================
    { ageGroupMonths: 18, category: "social", question: "Menjauh dari orang tua tapi tetap memastikan mereka dekat?" },
    { ageGroupMonths: 18, category: "social", question: "Menunjuk untuk menunjukkan sesuatu yang menarik perhatiannya?" },
    { ageGroupMonths: 18, category: "social", question: "Mengulurkan tangan minta dicucikan?" },
    { ageGroupMonths: 18, category: "social", question: "Melihat beberapa halaman buku bersama orang tua?" },
    { ageGroupMonths: 18, category: "social", question: "Membantu memakai baju (mendorong lengan ke lubang lengan/mengangkat kaki)?" },
    { ageGroupMonths: 18, category: "linguistic", question: "Mencoba mengucapkan 3 kata atau lebih selain \"mama\"/\"papa\"?" },
    { ageGroupMonths: 18, category: "linguistic", question: "Mengikuti perintah satu langkah tanpa gestur (misal langsung memberikan mainan saat diminta)?" },
    { ageGroupMonths: 18, category: "cognitive", question: "Meniru pekerjaan rumah tangga, seperti menyapu?" },
    { ageGroupMonths: 18, category: "cognitive", question: "Bermain mainan dengan cara sederhana, seperti mendorong mobil mainan?" },
    { ageGroupMonths: 18, category: "physical", question: "Berjalan tanpa berpegangan pada apa pun?" },
    { ageGroupMonths: 18, category: "physical", question: "Mencoret-coret?" },
    { ageGroupMonths: 18, category: "physical", question: "Minum dari cangkir tanpa tutup (walau kadang tumpah)?" },
    { ageGroupMonths: 18, category: "physical", question: "Makan menggunakan jari sendiri?" },
    { ageGroupMonths: 18, category: "physical", question: "Mencoba menggunakan sendok?" },
    { ageGroupMonths: 18, category: "physical", question: "Naik-turun sofa/kursi tanpa bantuan?" },
  
    // ===================== 24 BULAN (2 TAHUN) =====================
    { ageGroupMonths: 24, category: "social", question: "Menyadari saat orang lain terluka atau kesal?" },
    { ageGroupMonths: 24, category: "social", question: "Melihat wajah orang tua untuk tahu cara bereaksi di situasi baru?" },
    { ageGroupMonths: 24, category: "linguistic", question: "Menunjuk benda di buku saat diminta?" },
    { ageGroupMonths: 24, category: "linguistic", question: "Mengucapkan minimal 2 kata bersamaan, seperti \"mau susu\"?" },
    { ageGroupMonths: 24, category: "linguistic", question: "Menunjuk minimal 2 bagian tubuh saat diminta?" },
    { ageGroupMonths: 24, category: "linguistic", question: "Menggunakan gestur lain selain melambai/menunjuk, seperti mengangguk atau kecupan jarak jauh?" },
    { ageGroupMonths: 24, category: "cognitive", question: "Memegang sesuatu di satu tangan sambil menggunakan tangan lainnya?" },
    { ageGroupMonths: 24, category: "cognitive", question: "Mencoba menggunakan saklar, kenop, atau tombol pada mainan?" },
    { ageGroupMonths: 24, category: "cognitive", question: "Bermain dengan lebih dari satu mainan sekaligus?" },
    { ageGroupMonths: 24, category: "physical", question: "Menendang bola?" },
    { ageGroupMonths: 24, category: "physical", question: "Berlari?" },
    { ageGroupMonths: 24, category: "physical", question: "Menaiki beberapa anak tangga (bukan memanjat), dengan/tanpa bantuan?" },
    { ageGroupMonths: 24, category: "physical", question: "Makan menggunakan sendok?" },
  
    // ===================== 30 BULAN =====================
    { ageGroupMonths: 30, category: "social", question: "Bermain di sebelah anak lain, kadang ikut bermain bersama?" },
    { ageGroupMonths: 30, category: "social", question: "Menunjukkan kemampuannya dengan berkata \"lihat aku!\"?" },
    { ageGroupMonths: 30, category: "social", question: "Mengikuti rutinitas sederhana saat diminta, seperti membantu beres-beres mainan?" },
    { ageGroupMonths: 30, category: "linguistic", question: "Mengucapkan sekitar 50 kata?" },
    { ageGroupMonths: 30, category: "linguistic", question: "Merangkai 2 kata atau lebih dengan kata kerja, seperti \"anjing lari\"?" },
    { ageGroupMonths: 30, category: "linguistic", question: "Menyebutkan nama benda di buku saat ditunjuk dan ditanya?" },
    { ageGroupMonths: 30, category: "linguistic", question: "Menggunakan kata seperti \"aku\", \"kamu\", atau \"kita\"?" },
    { ageGroupMonths: 30, category: "cognitive", question: "Berpura-pura menggunakan benda untuk bermain, seperti menyuapi boneka dengan balok?" },
    { ageGroupMonths: 30, category: "cognitive", question: "Menunjukkan kemampuan memecahkan masalah sederhana, seperti berdiri di bangku kecil untuk meraih sesuatu?" },
    { ageGroupMonths: 30, category: "cognitive", question: "Mengikuti instruksi dua langkah, seperti \"taruh mainannya lalu tutup pintunya\"?" },
    { ageGroupMonths: 30, category: "cognitive", question: "Menunjukkan sudah mengenal minimal satu warna, seperti menunjuk krayon merah saat diminta?" },
    { ageGroupMonths: 30, category: "physical", question: "Menggunakan tangan untuk memutar benda, seperti membuka gagang pintu atau tutup botol?" },
    { ageGroupMonths: 30, category: "physical", question: "Melepas sebagian pakaiannya sendiri, seperti celana longgar atau jaket terbuka?" },
    { ageGroupMonths: 30, category: "physical", question: "Melompat dengan kedua kaki lepas dari tanah?" },
    { ageGroupMonths: 30, category: "physical", question: "Membalik halaman buku satu per satu saat dibacakan?" },
  
    // ===================== 36 BULAN (3 TAHUN) =====================
    { ageGroupMonths: 36, category: "social", question: "Bisa tenang dalam 10 menit setelah ditinggal, misalnya saat diantar ke tempat penitipan?" },
    { ageGroupMonths: 36, category: "social", question: "Menyadari kehadiran anak lain dan mengajak mereka bermain?" },
    { ageGroupMonths: 36, category: "linguistic", question: "Bercakap-cakap dengan minimal 2 kali bergantian bicara?" },
    { ageGroupMonths: 36, category: "linguistic", question: "Bertanya \"siapa\", \"apa\", \"di mana\", atau \"kenapa\"?" },
    { ageGroupMonths: 36, category: "linguistic", question: "Menyebutkan aktivitas yang terjadi di gambar/buku saat ditanya (misal \"lari\", \"makan\")?" },
    { ageGroupMonths: 36, category: "linguistic", question: "Menyebutkan nama depannya saat ditanya?" },
    { ageGroupMonths: 36, category: "linguistic", question: "Berbicara cukup jelas untuk dimengerti orang lain sebagian besar waktu?" },
    { ageGroupMonths: 36, category: "cognitive", question: "Menggambar lingkaran saat dicontohkan?" },
    { ageGroupMonths: 36, category: "cognitive", question: "Menghindari menyentuh benda panas, seperti kompor, saat diperingatkan?" },
    { ageGroupMonths: 36, category: "physical", question: "Merangkai benda-benda, seperti manik besar atau makaroni?" },
    { ageGroupMonths: 36, category: "physical", question: "Memakai sebagian pakaiannya sendiri, seperti celana longgar atau jaket?" },
    { ageGroupMonths: 36, category: "physical", question: "Menggunakan garpu untuk makan?" },
  
    // ===================== 48 BULAN (4 TAHUN) =====================
    { ageGroupMonths: 48, category: "social", question: "Berpura-pura menjadi sosok lain saat bermain (guru, superhero, hewan)?" },
    { ageGroupMonths: 48, category: "social", question: "Meminta bermain dengan anak lain kalau tidak ada teman di sekitarnya?" },
    { ageGroupMonths: 48, category: "social", question: "Menghibur orang lain yang terluka atau sedih, seperti memeluk teman yang menangis?" },
    { ageGroupMonths: 48, category: "social", question: "Menghindari bahaya, seperti tidak melompat dari ketinggian di taman bermain?" },
    { ageGroupMonths: 48, category: "social", question: "Senang menjadi \"pembantu\" untuk tugas kecil?" },
    { ageGroupMonths: 48, category: "social", question: "Menyesuaikan perilaku sesuai tempatnya berada (misal tempat ibadah, perpustakaan, taman bermain)?" },
    { ageGroupMonths: 48, category: "linguistic", question: "Mengucapkan kalimat 4 kata atau lebih?" },
    { ageGroupMonths: 48, category: "linguistic", question: "Menyanyikan sebagian lirik dari lagu, cerita, atau sajak?" },
    { ageGroupMonths: 48, category: "linguistic", question: "Menceritakan minimal satu hal yang terjadi hari itu, seperti \"tadi main bola\"?" },
    { ageGroupMonths: 48, category: "linguistic", question: "Menjawab pertanyaan sederhana seperti \"jaket buat apa?\"?" },
    { ageGroupMonths: 48, category: "cognitive", question: "Menyebutkan beberapa nama warna benda?" },
    { ageGroupMonths: 48, category: "cognitive", question: "Menebak kelanjutan cerita yang sudah dikenalnya?" },
    { ageGroupMonths: 48, category: "cognitive", question: "Menggambar orang dengan minimal 3 bagian tubuh?" },
    { ageGroupMonths: 48, category: "physical", question: "Menangkap bola besar sebagian besar waktu?" },
    { ageGroupMonths: 48, category: "physical", question: "Mengambil makanan sendiri atau menuang air dengan pengawasan orang dewasa?" },
    { ageGroupMonths: 48, category: "physical", question: "Membuka sebagian kancing baju?" },
    { ageGroupMonths: 48, category: "physical", question: "Memegang krayon/pensil dengan jari dan ibu jari (bukan digenggam)?" },
  
    // ===================== 60 BULAN (5 TAHUN) =====================
    { ageGroupMonths: 60, category: "social", question: "Mengikuti aturan atau bergiliran saat bermain dengan anak lain?" },
    { ageGroupMonths: 60, category: "social", question: "Bernyanyi, menari, atau berakting untuk orang tua?" },
    { ageGroupMonths: 60, category: "social", question: "Melakukan pekerjaan rumah sederhana, seperti memasangkan kaus kaki atau membereskan meja makan?" },
    { ageGroupMonths: 60, category: "linguistic", question: "Menceritakan kembali cerita yang didengar atau dibuat sendiri dengan minimal 2 kejadian?" },
    { ageGroupMonths: 60, category: "linguistic", question: "Menjawab pertanyaan sederhana tentang buku/cerita yang baru dibacakan?" },
    { ageGroupMonths: 60, category: "linguistic", question: "Mempertahankan percakapan dengan lebih dari 3 kali bergantian bicara?" },
    { ageGroupMonths: 60, category: "linguistic", question: "Menggunakan atau mengenali sajak sederhana (misal kucing-cabang)?" },
    { ageGroupMonths: 60, category: "cognitive", question: "Menghitung sampai 10?" },
    { ageGroupMonths: 60, category: "cognitive", question: "Menyebutkan beberapa angka antara 1-5 saat ditunjuk?" },
    { ageGroupMonths: 60, category: "cognitive", question: "Menggunakan kata-kata waktu seperti \"kemarin\", \"besok\", \"pagi\", atau \"malam\"?" },
    { ageGroupMonths: 60, category: "cognitive", question: "Fokus pada satu aktivitas selama 5-10 menit (di luar screen time)?" },
    { ageGroupMonths: 60, category: "cognitive", question: "Menulis beberapa huruf dari namanya sendiri?" },
    { ageGroupMonths: 60, category: "cognitive", question: "Menyebutkan beberapa huruf saat ditunjuk?" },
    { ageGroupMonths: 60, category: "physical", question: "Mengancingkan beberapa kancing baju?" },
    { ageGroupMonths: 60, category: "physical", question: "Melompat dengan satu kaki?" },
  ];
  
  // =====================================================================
  // SUMBER & CATATAN PENTING
  // =====================================================================
  // Berdasarkan: CDC "Learn the Signs. Act Early." — Milestone Moments Booklet
  // (checklist perkembangan usia 2 bulan - 5 tahun), salah satu rujukan
  // perkembangan anak yang paling luas dipakai secara internasional dan juga
  // dipakai sebagai salah satu acuan dalam skrining perkembangan anak.
  //
  // INI BUKAN ALAT DIAGNOSIS. Beberapa catatan penting:
  // - Setiap item merefleksikan kemampuan yang SEBAGIAN BESAR (≥75%) anak
  //   seusianya sudah bisa lakukan — bukan checklist yang harus 100% terpenuhi.
  // - Kalau bayi lahir prematur (>3 minggu), gunakan "usia terkoreksi"
  //   (usia sebenarnya dikurangi jumlah minggu lahir prematur) sampai usia
  //   sekitar 2 tahun, bukan usia kalender.
  // - CDC merekomendasikan skrining perkembangan formal (oleh dokter) di usia
  //   9, 18, dan 30 bulan, dan skrining khusus autisme di usia 18 & 24 bulan.
  // - Kalau ada kekhawatiran terhadap perkembangan anak di usia berapa pun
  //   (bukan cuma di checkpoint di atas), Kalau anak kehilangan kemampuan yang
  //   sebelumnya sudah dikuasai, itu tanda yang perlu segera dikonsultasikan
  //   ke dokter anak, bukan ditunggu.