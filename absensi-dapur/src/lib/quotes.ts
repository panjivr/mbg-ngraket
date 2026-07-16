// Kutipan penyemangat untuk staf dapur MBG (program Makan Bergizi Gratis).
// Ditampilkan secara acak setiap kali staf melakukan check-in kehadiran.
// Data-only module. Jangan tambahkan dependensi React di sini.

export interface Quote {
  teks: string;
  sumber: string;
}

export const QUOTES: Quote[] = [
  // --- Semangat kerja & etos ---
  {
    teks: "Kerja keras hari ini adalah bekal terbaik untuk esok yang lebih baik. 💪",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Datang tepat waktu bukan sekadar aturan, tapi bentuk cinta pada pekerjaan.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Konsistensi kecil setiap hari mengalahkan semangat besar yang hanya sesekali.",
    sumber: "Anonim",
  },
  {
    teks: "Disiplin adalah jembatan antara cita-cita dan kenyataan.",
    sumber: "Anonim",
  },
  {
    teks: "Sedikit demi sedikit, lama-lama menjadi bukit.",
    sumber: "Pepatah",
  },
  {
    teks: "Sehari selembar benang, lama-lama menjadi kain.",
    sumber: "Pepatah",
  },
  {
    teks: "Rajin pangkal pandai, hemat pangkal kaya.",
    sumber: "Pepatah",
  },
  {
    teks: "Alah bisa karena biasa; keterampilanmu tumbuh dari latihan setiap hari.",
    sumber: "Pepatah",
  },
  {
    teks: "Di mana ada kemauan, di situ ada jalan.",
    sumber: "Pepatah",
  },
  {
    teks: "Mulailah dari yang kecil, kerjakan dengan tekun, selesaikan dengan bangga.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Segalanya tampak mustahil sampai semuanya selesai dilakukan.",
    sumber: "Nelson Mandela",
  },
  {
    teks: "Tidak masalah seberapa lambat langkahmu, asalkan kamu tidak berhenti.",
    sumber: "Anonim",
  },
  {
    teks: "Kejeniusan adalah satu persen inspirasi dan sembilan puluh sembilan persen kerja keras.",
    sumber: "Thomas Edison",
  },
  {
    teks: "Banyak kegagalan terjadi karena orang tak sadar betapa dekatnya mereka dengan keberhasilan saat menyerah.",
    sumber: "Thomas Edison",
  },
  {
    teks: "Kita adalah apa yang berulang kali kita lakukan; keunggulan bukan tindakan, melainkan kebiasaan.",
    sumber: "Will Durant",
  },
  {
    teks: "Kalau hidup sekadar hidup, babi di hutan juga hidup. Kalau bekerja sekadar bekerja, kera juga bekerja.",
    sumber: "Buya Hamka",
  },
  {
    teks: "Gantungkan cita-citamu setinggi langit. Jika jatuh, engkau akan jatuh di antara bintang-bintang.",
    sumber: "Soekarno",
  },
  {
    teks: "Semangat pagi! Awali hari dengan senyum, akhiri dengan syukur.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Pekerjaan yang dilakukan dengan sepenuh hati tidak pernah terasa sia-sia.",
    sumber: "Anonim",
  },
  {
    teks: "Genggam bara api biar sampai jadi arang; tekun sampai membuahkan hasil.",
    sumber: "Pepatah",
  },
  {
    teks: "Tepat waktu adalah wujud rasa hormat kepada rekan dan tanggung jawab pada tugas.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Jangan tunda kebaikan hari ini hanya karena menunggu waktu yang sempurna.",
    sumber: "Anonim",
  },
  {
    teks: "Etos kerja yang baik dimulai dari niat yang lurus dan langkah yang mantap.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Hari ini adalah kesempatan baru untuk menjadi lebih baik daripada kemarin.",
    sumber: "Anonim",
  },

  // --- Kebersamaan tim & misi MBG ---
  {
    teks: "Berat sama dipikul, ringan sama dijinjing.",
    sumber: "Pepatah",
  },
  {
    teks: "Bersatu kita teguh, bercerai kita runtuh.",
    sumber: "Pepatah",
  },
  {
    teks: "Sepiring makanan bergizi yang kita siapkan hari ini adalah masa depan anak Indonesia. 🍚",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Tangan-tangan di dapur ini sedang menumbuhkan generasi yang sehat dan kuat.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Dapur yang kompak menghasilkan hidangan yang penuh cinta.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Gotong royong membuat pekerjaan berat terasa ringan dan menyenangkan.",
    sumber: "Anonim",
  },
  {
    teks: "Satu tim, satu tujuan: menyajikan makanan bergizi untuk anak-anak negeri.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Duduk sama rendah, berdiri sama tinggi; di dapur ini kita setara dan saling menjaga.",
    sumber: "Pepatah",
  },
  {
    teks: "Bulat air karena pembuluh, bulat kata karena mufakat.",
    sumber: "Pepatah Minang",
  },
  {
    teks: "Kebaikan yang kita masak hari ini akan dikenang dalam senyum anak-anak.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Melayani dengan tulus adalah cara sederhana kita mencintai negeri ini.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Setiap porsi yang kita antar membawa harapan dan energi bagi anak bangsa.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Cara terbaik menemukan dirimu adalah dengan melupakan diri dalam melayani orang lain.",
    sumber: "Mahatma Gandhi",
  },
  {
    teks: "Sebaik-baik manusia adalah yang paling bermanfaat bagi sesama.",
    sumber: "HR. Ahmad",
  },
  {
    teks: "Kerja bakti di dapur bukan beban, melainkan ladang kebaikan bersama.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Kekuatan sebuah tim ada pada tiap anggotanya; kekuatan tiap anggota ada pada timnya.",
    sumber: "Anonim",
  },
  {
    teks: "Senyum satu rekan bisa menular ke seluruh dapur. Sebarkan energi baik. 😊",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Ketika kita saling membantu, tak ada pekerjaan yang terlalu berat.",
    sumber: "Anonim",
  },
  {
    teks: "Bersama kita masak, bersama kita jaga gizi anak Indonesia.",
    sumber: "Tim Dapur MBG",
  },

  // --- Islami & universal: doa, syukur, keberkahan, niat ---
  {
    teks: "Sesungguhnya bersama kesulitan ada kemudahan.",
    sumber: "QS Al-Insyirah: 6",
  },
  {
    teks: "Jika kamu bersyukur, pasti akan Kami tambah nikmat kepadamu.",
    sumber: "QS Ibrahim: 7",
  },
  {
    teks: "Segala amal bergantung pada niatnya; luruskan niat, keberkahan pun mengikuti.",
    sumber: "HR. Bukhari & Muslim",
  },
  {
    teks: "Ya Tuhan, berkahilah rezeki dan pekerjaan kami hari ini. 🤲",
    sumber: "Doa",
  },
  {
    teks: "Rezeki yang berkah bukan yang paling banyak, melainkan yang mencukupi dan menenangkan.",
    sumber: "Anonim",
  },
  {
    teks: "Awali pekerjaan dengan niat baik, jalani dengan sabar, akhiri dengan syukur.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Syukur mengubah yang cukup menjadi lebih dari cukup.",
    sumber: "Anonim",
  },
  {
    teks: "Berbuat baiklah, karena kebaikan sekecil apa pun tidak pernah sia-sia.",
    sumber: "Anonim",
  },
  {
    teks: "Doa terbaik hari ini: semoga tangan kami membawa manfaat dan hati kami penuh ketulusan.",
    sumber: "Doa",
  },
  {
    teks: "Keberkahan datang pada pekerjaan yang dikerjakan dengan jujur dan ikhlas.",
    sumber: "Anonim",
  },
  {
    teks: "Tanpa cinta, kecerdasan itu berbahaya; tanpa kecerdasan, cinta itu tak cukup.",
    sumber: "B.J. Habibie",
  },
  {
    teks: "Ilmu itu bukan yang dihafal, melainkan yang memberi manfaat.",
    sumber: "Imam Syafi’i",
  },
  {
    teks: "Bersyukur di pagi hari membuka pintu kebaikan sepanjang hari.",
    sumber: "Anonim",
  },
  {
    teks: "Berbuat baik kepada orang lain adalah cara terbaik berbuat baik pada diri sendiri.",
    sumber: "Anonim",
  },
  {
    teks: "Setiap kebaikan adalah sedekah, termasuk senyum tulusmu kepada rekan kerja.",
    sumber: "HR. Tirmidzi",
  },
  {
    teks: "Ketulusan hati lebih bernilai daripada kesempurnaan hasil.",
    sumber: "Anonim",
  },
  {
    teks: "Semoga setiap suapan dari dapur ini menjadi energi dan doa baik bagi yang memakannya.",
    sumber: "Doa",
  },

  // --- Kebersihan & keamanan pangan ---
  {
    teks: "Kesucian adalah sebagian dari iman; jaga kebersihan diri dan dapur kita.",
    sumber: "HR. Muslim",
  },
  {
    teks: "Cuci tangan sebelum bekerja, tanda cinta pada kesehatan anak-anak kita. 🧼",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Dapur yang bersih adalah awal dari makanan yang sehat.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Kebersihan bukan tugas satu orang, tapi kebiasaan seluruh tim.",
    sumber: "Anonim",
  },
  {
    teks: "Bahan segar, tangan bersih, hati senang: resep makanan bergizi yang sempurna.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Menjaga kebersihan pangan berarti menjaga senyum anak-anak yang menyantapnya.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Sedikit teliti dalam kebersihan, banyak manfaat untuk kesehatan bersama.",
    sumber: "Anonim",
  },
  {
    teks: "Peralatan bersih, makanan aman; ketelitian kecil menyelamatkan banyak orang.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Higienis itu kebiasaan, bukan beban. Mulai dari mencuci tangan dengan sabun.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Simpan bahan dengan benar, olah dengan bersih, sajikan dengan aman.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Tangan yang bersih menyalurkan makanan yang penuh berkah.",
    sumber: "Anonim",
  },
  {
    teks: "Menjaga suhu dan kebersihan makanan adalah wujud tanggung jawab dan kasih sayang.",
    sumber: "Tim Dapur MBG",
  },

  // --- Kutipan inspiratif tokoh terkenal ---
  {
    teks: "Pendidikan adalah senjata paling ampuh untuk mengubah dunia.",
    sumber: "Nelson Mandela",
  },
  {
    teks: "Ing ngarsa sung tuladha, ing madya mangun karsa, tut wuri handayani.",
    sumber: "Ki Hajar Dewantara",
  },
  {
    teks: "Habis gelap terbitlah terang.",
    sumber: "R.A. Kartini",
  },
  {
    teks: "Bermimpilah, karena Tuhan akan memeluk mimpi-mimpimu.",
    sumber: "Andrea Hirata",
  },
  {
    teks: "Keberanian bukanlah tidak adanya rasa takut, melainkan kemenangan atas rasa takut itu.",
    sumber: "Nelson Mandela",
  },
  {
    teks: "Kebahagiaan bukan sesuatu yang sudah jadi; ia lahir dari tindakanmu sendiri.",
    sumber: "Dalai Lama",
  },
  {
    teks: "Lakukan hal-hal kecil dengan cinta yang besar.",
    sumber: "Bunda Teresa",
  },
  {
    teks: "Masa depan milik mereka yang percaya pada keindahan mimpi-mimpinya.",
    sumber: "Anonim",
  },
  {
    teks: "Cara memulai adalah dengan berhenti berbicara dan mulai melakukan.",
    sumber: "Walt Disney",
  },
  {
    teks: "Mimpi tidak menjadi nyata dengan sihir; ia butuh keringat, tekad, dan kerja keras.",
    sumber: "Colin Powell",
  },
  {
    teks: "Kualitas bukanlah suatu kebetulan; ia selalu hasil dari usaha yang cerdas.",
    sumber: "John Ruskin",
  },
  {
    teks: "Jangan menilai setiap hari dari panen yang kau tuai, tapi dari benih yang kau tanam.",
    sumber: "Anonim",
  },
  {
    teks: "Kita hidup dari apa yang kita dapatkan, tapi kita membangun hidup dari apa yang kita berikan.",
    sumber: "Anonim",
  },

  // --- Pepatah & penutup yang menyemangati ---
  {
    teks: "Tak ada gading yang tak retak; berbuat salah itu wajar, memperbaikinya itu luar biasa.",
    sumber: "Pepatah",
  },
  {
    teks: "Sekali layar terkembang, pantang biduk surut ke pantai.",
    sumber: "Pepatah Melayu",
  },
  {
    teks: "Sekecil apa pun peranmu hari ini, ia bagian penting dari kebaikan yang besar.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Semangat yang menular adalah hadiah terbaik untuk rekan satu tim.",
    sumber: "Anonim",
  },
  {
    teks: "Bekerja dengan senyum membuat hari terasa lebih ringan dan hasil lebih bermakna.",
    sumber: "Anonim",
  },
  {
    teks: "Hargai prosesnya, nikmati kebersamaannya, syukuri hasilnya.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Kebaikan itu seperti aroma masakan: menyebar tanpa perlu diminta.",
    sumber: "Anonim",
  },
  {
    teks: "Jadilah alasan seseorang tersenyum hari ini, dimulai dari dapur kita.",
    sumber: "Anonim",
  },
  {
    teks: "Setiap hari adalah lembar baru; tulislah dengan kerja dan kebaikan terbaikmu.",
    sumber: "Anonim",
  },
  {
    teks: "Air cucuran atap jatuhnya ke pelimbahan juga; teladan yang baik akan ditiru.",
    sumber: "Pepatah",
  },
  {
    teks: "Berakit-rakit ke hulu, berenang ke tepian; bersakit dahulu, bersenang kemudian.",
    sumber: "Pepatah",
  },
  {
    teks: "Kerja keras jarang mengkhianati hasil; teruslah melangkah dengan sabar.",
    sumber: "Anonim",
  },
  {
    teks: "Melayani anak-anak Indonesia dengan gizi terbaik adalah kehormatan, bukan sekadar tugas.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Nikmatnya hasil kerja terletak pada ketulusan saat mengerjakannya.",
    sumber: "Anonim",
  },
  {
    teks: "Sabar dalam proses, ikhlas dalam kerja, syukur dalam hasil.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Bangun pagi, niat baik, tebar manfaat: rumus sederhana hari yang berkah. ☀️",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Tangan yang bekerja untuk kebaikan tak pernah kehilangan berkahnya.",
    sumber: "Anonim",
  },
  {
    teks: "Satu dapur, ribuan senyum anak-anak; itulah upah yang paling manis.",
    sumber: "Tim Dapur MBG",
  },
  {
    teks: "Bekerja itu ibadah bila diniatkan untuk kebaikan dan dikerjakan dengan jujur.",
    sumber: "Anonim",
  },
  {
    teks: "Semakin tulus kita memberi, semakin penuh rasa cukup di dalam hati.",
    sumber: "Anonim",
  },
];

export function quoteAcak(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
