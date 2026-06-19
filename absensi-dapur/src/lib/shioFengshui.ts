/* eslint-disable */
// @ts-nocheck
/**
 * ENGINE SHIO & FENGSHUI — di-port verbatim dari sistem buatan pengguna
 * ("Pusaka Shio & Fengshui — Sistem Perwatakan"). Blok logika + data tidak
 * diubah sedikit pun agar hasil identik dengan aplikasi aslinya.
 *   analisaShioFengshui("Nama", "1990-05-17", "pria" | "wanita" | null)
 */

const ShioFengshui = (() => {

/* ── 1. BATAS TAHUN BARU IMLEK (penentu tahun lunar / shio) ──
   Format: tahun → "BB-TT" (bulan-tanggal Imlek). Lahir SEBELUM tanggal ini =
   masih dihitung shio tahun sebelumnya. Sumber: tabel Imlek 1912–2070. */
const IMLEK = {
1912:"02-18",1913:"02-06",1914:"01-26",1915:"02-14",1916:"02-03",1917:"01-23",1918:"02-11",1919:"02-01",
1920:"02-20",1921:"02-08",1922:"01-28",1923:"02-16",1924:"02-05",1925:"01-24",1926:"02-13",1927:"02-02",
1928:"01-23",1929:"02-10",1930:"01-30",1931:"02-17",1932:"02-06",1933:"01-26",1934:"02-14",1935:"02-04",
1936:"01-24",1937:"02-11",1938:"01-31",1939:"02-19",1940:"02-08",1941:"01-27",1942:"02-15",1943:"02-05",
1944:"01-25",1945:"02-13",1946:"02-02",1947:"01-22",1948:"02-10",1949:"01-29",1950:"02-17",1951:"02-06",
1952:"01-27",1953:"02-14",1954:"02-03",1955:"01-24",1956:"02-12",1957:"01-31",1958:"02-18",1959:"02-08",
1960:"01-28",1961:"02-15",1962:"02-05",1963:"01-25",1964:"02-13",1965:"02-02",1966:"01-21",1967:"02-09",
1968:"01-30",1969:"02-17",1970:"02-06",1971:"01-27",1972:"02-15",1973:"02-03",1974:"01-23",1975:"02-11",
1976:"01-31",1977:"02-18",1978:"02-07",1979:"01-28",1980:"02-16",1981:"02-05",1982:"01-25",1983:"02-13",
1984:"02-02",1985:"02-20",1986:"02-09",1987:"01-29",1988:"02-17",1989:"02-06",1990:"01-27",1991:"02-15",
1992:"02-04",1993:"01-23",1994:"02-10",1995:"01-31",1996:"02-19",1997:"02-07",1998:"01-28",1999:"02-16",
2000:"02-05",2001:"01-24",2002:"02-12",2003:"02-01",2004:"01-22",2005:"02-09",2006:"01-29",2007:"02-18",
2008:"02-07",2009:"01-26",2010:"02-14",2011:"02-03",2012:"01-23",2013:"02-10",2014:"01-31",2015:"02-19",
2016:"02-08",2017:"01-28",2018:"02-16",2019:"02-05",2020:"01-25",2021:"02-12",2022:"02-01",2023:"01-22",
2024:"02-10",2025:"01-29",2026:"02-17",2027:"02-06",2028:"01-26",2029:"02-13",2030:"02-03",2031:"01-23",
2032:"02-11",2033:"01-31",2034:"02-19",2035:"02-08",2036:"01-28",2037:"02-15",2038:"02-04",2039:"01-24",
2040:"02-12",2041:"02-01",2042:"01-22",2043:"02-10",2044:"01-30",2045:"02-17",2046:"02-06",2047:"01-26",
2048:"02-14",2049:"02-02",2050:"01-23",2051:"02-11",2052:"02-01",2053:"02-19",2054:"02-08",2055:"01-28",
2056:"02-15",2057:"02-04",2058:"01-24",2059:"02-12",2060:"02-02",2061:"01-21",2062:"02-09",2063:"01-29",
2064:"02-17",2065:"02-05",2066:"01-26",2067:"02-14",2068:"02-03",2069:"01-23",2070:"02-11"
};

/* ── 2. LIMA ELEMEN (Wu Xing 五行) ── */
const ELEMEN = {
  kayu:{nama:"Kayu",han:"木",en:"Wood",warna:"#5FA383",hex:"#3E7A5E",arah:"Timur",musim:"Semi",
    sifat:["pertumbuhan","kreatif","idealis","gemar kerja sama","welas asih","visioner"],
    pengaruh:"Memberi watak hangat, suka tumbuh & berkembang, mudah bekerja sama dan berempati; sisi lemahnya kadang kurang tegas dan terlalu mengalah."},
  api:{nama:"Api",han:"火",en:"Fire",warna:"#E0654F",hex:"#C2402E",arah:"Selatan",musim:"Panas",
    sifat:["bersemangat","pemimpin","dinamis","ekspresif","berani","karismatik"],
    pengaruh:"Menyalakan energi, gairah, dan jiwa kepemimpinan yang kuat; sisi lemahnya impulsif, mudah panas hati, dan kurang sabar."},
  tanah:{nama:"Tanah",han:"土",en:"Earth",warna:"#D8B26A",hex:"#B0863F",arah:"Tengah",musim:"Pancaroba",
    sifat:["stabil","praktis","sabar","setia","dapat diandalkan","membumi"],
    pengaruh:"Menanamkan kestabilan, kesabaran, dan rasa tanggung jawab; sisi lemahnya kaku, keras kepala, dan lambat menerima perubahan."},
  logam:{nama:"Logam",han:"金",en:"Metal",warna:"#E4C66B",hex:"#C9A227",arah:"Barat",musim:"Gugur",
    sifat:["tegas","disiplin","ambisius","mandiri","berprinsip","terorganisir"],
    pengaruh:"Menempa ketegasan, disiplin, dan ambisi tinggi; sisi lemahnya dingin, kaku, dan terlalu perfeksionis."},
  air:{nama:"Air",han:"水",en:"Water",warna:"#6FA8D6",hex:"#3E72A6",arah:"Utara",musim:"Dingin",
    sifat:["bijaksana","fleksibel","komunikatif","intuitif","cerdik","diplomatis"],
    pengaruh:"Mengalirkan kebijaksanaan, fleksibilitas, dan intuisi tajam; sisi lemahnya plin-plan, mudah terbawa arus, dan kurang konsisten."}
};
// siklus produktif (相生) & destruktif (相克)
const PRODUKTIF = {kayu:"api",api:"tanah",tanah:"logam",logam:"air",air:"kayu"};
const DESTRUKTIF = {kayu:"tanah",tanah:"air",air:"api",api:"logam",logam:"kayu"};

/* ── 3. SEPULUH BATANG LANGIT (天干) → elemen + yin/yang ── */
const BATANG = [
  {han:"甲",p:"Jiǎ",el:"kayu",yy:"Yang"},{han:"乙",p:"Yǐ",el:"kayu",yy:"Yin"},
  {han:"丙",p:"Bǐng",el:"api",yy:"Yang"},{han:"丁",p:"Dīng",el:"api",yy:"Yin"},
  {han:"戊",p:"Wù",el:"tanah",yy:"Yang"},{han:"己",p:"Jǐ",el:"tanah",yy:"Yin"},
  {han:"庚",p:"Gēng",el:"logam",yy:"Yang"},{han:"辛",p:"Xīn",el:"logam",yy:"Yin"},
  {han:"壬",p:"Rén",el:"air",yy:"Yang"},{han:"癸",p:"Guǐ",el:"air",yy:"Yin"}
];

/* ── 4. DUA BELAS SHIO / CABANG BUMI (地支) ── */
const SHIO = [
{id:"tikus",nama:"Tikus",en:"Rat",han:"鼠",cabang:"子 Zǐ",glyph:"鼠",urutan:1,yy:"Yang",elTetap:"air",
 jam:"23.00–01.00",arah:"Utara",musim:"Pertengahan musim dingin",
 positif:["cerdas & cepat tanggap","pandai melihat peluang","hemat & pandai mengatur uang","adaptif","supel & pandai bergaul","penuh akal"],
 negatif:["mudah curiga","oportunis","gelisah / serakah bila berlebihan","suka berhitung untung-rugi","keras kepala diam-diam"],
 watak:"Orang shio Tikus dikenal cerdas, lincah, dan tajam membaca situasi. Ia pandai memanfaatkan kesempatan sekecil apa pun, sangat hemat, dan punya naluri bertahan hidup yang kuat. Di balik keramahannya, ia perhitungan dan selalu menyiapkan rencana cadangan.",
 karier:"Cocok di bisnis, keuangan, akuntansi, perdagangan, analis, riset, marketing, dan wirausaha.",
 keuangan:"Sangat pandai mengumpulkan dan menyimpan kekayaan; rezeki lancar asal tidak terlalu pelit.",
 cinta:"Setia dan penuh perhatian pada pasangan, namun butuh rasa aman. Romantis tetapi kadang posesif.",
 kesehatan:"Cenderung kuat, tetapi rawan stres dan gangguan pencernaan karena pikiran yang tak pernah berhenti.",
 warna:[["Biru","#3E72A6"],["Emas","#C9A227"],["Hijau","#3E7A5E"]], angka:[2,3], arahHoki:["Utara","Barat","Tenggara"],
 bunga:["Lily","Anggrek"], batu:"Garnet / Batu Delima"},

{id:"kerbau",nama:"Kerbau",en:"Ox",han:"牛",cabang:"丑 Chǒu",glyph:"牛",urutan:2,yy:"Yin",elTetap:"tanah",
 jam:"01.00–03.00",arah:"Timur Laut",musim:"Akhir musim dingin",
 positif:["pekerja keras","sabar & tekun","jujur & dapat dipercaya","disiplin","teguh pendirian","bertanggung jawab"],
 negatif:["keras kepala","kaku","sulit berkompromi","kurang luwes bergaul","pendendam diam"],
 watak:"Shio Kerbau adalah lambang ketekunan dan kerja keras. Ia tenang, sabar, dapat diandalkan, dan tidak suka jalan pintas. Sekali menetapkan tujuan, ia akan menggarapnya pelan tapi pasti hingga tuntas, meski kadang terlalu kaku menerima ide baru.",
 karier:"Cocok di pertanian, manufaktur, real estate, hukum, militer, engineering, manajemen, dan bidang yang butuh ketelatenan.",
 keuangan:"Stabil dan aman lewat kerja keras serta tabungan; bukan tipe spekulatif.",
 cinta:"Setia, serius, dan bertanggung jawab. Kurang romantis tetapi sangat bisa diandalkan sebagai pasangan hidup.",
 kesehatan:"Fisik kuat dan tahan banting, tetapi perlu hati-hati pada kelelahan kronis karena terlalu memforsir diri.",
 warna:[["Kuning","#C9A227"],["Putih","#EFE7D6"],["Hijau","#3E7A5E"]], angka:[1,4], arahHoki:["Timur Laut","Selatan","Barat"],
 bunga:["Tulip","Bunga Persik"], batu:"Giok / Jade"},

{id:"macan",nama:"Macan",en:"Tiger",han:"虎",cabang:"寅 Yín",glyph:"虎",urutan:3,yy:"Yang",elTetap:"kayu",
 jam:"03.00–05.00",arah:"Timur Laut",musim:"Awal musim semi",
 positif:["berani & pemberani","karismatik","penuh percaya diri","jiwa pemimpin","murah hati","penuh semangat"],
 negatif:["impulsif","keras kepala","temperamental","suka memberontak","kurang sabar"],
 watak:"Shio Macan adalah pemberani sejati — penuh percaya diri, karismatik, dan tak gentar menghadapi tantangan. Ia natural leader yang melindungi orang lemah dan benci ketidakadilan. Namun emosinya mudah meledak dan ia sering bertindak dulu, berpikir kemudian.",
 karier:"Cocok jadi pemimpin, pengusaha, militer/polisi, atlet, aktor, politikus, dan profesi yang menantang.",
 keuangan:"Rezeki datang dalam gelombang besar; berani ambil risiko, kadang boros saat menang.",
 cinta:"Penuh gairah dan romantis, tetapi butuh kebebasan. Tidak suka dikekang atau didikte.",
 kesehatan:"Energik dan vital, tetapi rawan cedera dan kelelahan karena gaya hidup yang ngebut.",
 warna:[["Merah","#C2402E"],["Emas","#C9A227"],["Abu Biru","#3E72A6"]], angka:[1,3,4], arahHoki:["Timur","Selatan","Tenggara"],
 bunga:["Lily Kuning","Pohon Plum"], batu:"Safir / Blue Sapphire"},

{id:"kelinci",nama:"Kelinci",en:"Rabbit",han:"兔",cabang:"卯 Mǎo",glyph:"兔",urutan:4,yy:"Yin",elTetap:"kayu",
 jam:"05.00–07.00",arah:"Timur",musim:"Pertengahan musim semi",
 positif:["lembut & sopan","elegan & berselera tinggi","diplomatis","bijaksana","penyayang","hati-hati"],
 negatif:["mudah cemas","menghindari konflik","kurang tegas","sensitif berlebihan","suka menyembunyikan perasaan"],
 watak:"Shio Kelinci halus, sopan, dan penuh ketenangan. Ia bijak, diplomatis, menyukai keindahan, dan pandai menjaga keharmonisan. Lebih memilih damai daripada bertengkar, tetapi sikap menghindari konflik kadang membuatnya terlihat ragu dan kurang tegas.",
 karier:"Cocok di seni, desain, diplomasi, pendidikan, kesehatan, hukum, hubungan masyarakat, dan kuratorial.",
 keuangan:"Cermat, hati-hati, dan tidak suka berutang; kekayaan tumbuh perlahan namun aman.",
 cinta:"Romantis, lembut, dan penuh perhatian. Mendambakan hubungan yang tenang, hangat, dan stabil.",
 kesehatan:"Cenderung sensitif; perlu menjaga kestabilan emosi, pencernaan, dan istirahat cukup.",
 warna:[["Hijau","#3E7A5E"],["Pink","#E0654F"],["Biru","#3E72A6"]], angka:[3,4,6], arahHoki:["Timur","Selatan","Barat Laut"],
 bunga:["Snapdragon","Lily","Jasmine"], batu:"Mutiara / Pearl"},

{id:"naga",nama:"Naga",en:"Dragon",han:"龙",cabang:"辰 Chén",glyph:"龍",urutan:5,yy:"Yang",elTetap:"tanah",
 jam:"07.00–09.00",arah:"Tenggara",musim:"Akhir musim semi",
 positif:["karismatik & berwibawa","penuh percaya diri","ambisius","cerdas","beruntung","berjiwa besar"],
 negatif:["sombong","keras kepala","tidak suka dikritik","perfeksionis","mudah bosan"],
 watak:"Shio Naga adalah simbol keberuntungan, kekuatan, dan kehormatan dalam budaya Tionghoa. Ia berwibawa, ambisius, cerdas, dan memancarkan aura pemimpin alami. Penuh energi dan visi besar, tetapi egonya tinggi dan ia tak suka diatur atau dikritik.",
 karier:"Cocok jadi pemimpin, pengusaha besar, politikus, public figure, inovator, sutradara, dan visioner.",
 keuangan:"Magnet rezeki dan peluang besar; sukses finansial datang dari keberanian dan ambisi.",
 cinta:"Memikat dan penuh gairah, namun mandiri. Butuh pasangan yang mengagumi sekaligus menghormati kebebasannya.",
 kesehatan:"Vitalitas tinggi, tetapi rawan stres dan burnout karena terlalu memaksakan ambisi.",
 warna:[["Emas","#C9A227"],["Merah","#C2402E"],["Kuning","#D8B26A"]], angka:[1,6,7], arahHoki:["Timur","Utara","Barat"],
 bunga:["Bunga Naga","Hyacinth"], batu:"Ametis / Amethyst"},

{id:"ular",nama:"Ular",en:"Snake",han:"蛇",cabang:"巳 Sì",glyph:"蛇",urutan:6,yy:"Yin",elTetap:"api",
 jam:"09.00–11.00",arah:"Tenggara",musim:"Awal musim panas",
 positif:["bijaksana & cerdas","intuitif tajam","misterius & elegan","tenang","penuh perhitungan","berkemauan kuat"],
 negatif:["tertutup","pencemburu","penuh kecurigaan","perhitungan dingin","pendendam"],
 watak:"Shio Ular cerdas, bijak, dan penuh misteri. Ia berpikir mendalam, intuitif, elegan, dan tenang dalam menghadapi masalah. Pandai menyimpan rahasia dan membaca orang lain, namun sifat tertutup dan posesifnya bisa menjadi sumber kecemburuan.",
 karier:"Cocok di riset, filsafat, psikologi, hukum, sains, investasi, spiritualitas, dan strategi.",
 keuangan:"Pandai mengelola dan menumbuhkan kekayaan dengan perhitungan matang; jarang gegabah.",
 cinta:"Memikat, sensual, dan setia, tetapi pencemburu dan menuntut kesetiaan penuh dari pasangan.",
 kesehatan:"Perlu menjaga keseimbangan istirahat; rawan masalah karena banyak memendam pikiran dan stres.",
 warna:[["Merah","#C2402E"],["Hitam","#16110F"],["Kuning","#C9A227"]], angka:[2,8,9], arahHoki:["Tenggara","Barat Daya","Selatan"],
 bunga:["Kaktus","Anggrek","Orchid"], batu:"Opal"},

{id:"kuda",nama:"Kuda",en:"Horse",han:"马",cabang:"午 Wǔ",glyph:"馬",urutan:7,yy:"Yang",elTetap:"api",
 jam:"11.00–13.00",arah:"Selatan",musim:"Pertengahan musim panas",
 positif:["enerjik & dinamis","mandiri","ceria & optimis","cinta kebebasan","ramah & populer","cekatan"],
 negatif:["tidak sabar","mudah bosan","kurang konsisten","impulsif","plin-plan"],
 watak:"Shio Kuda penuh energi, bebas, dan bersemangat. Ia mandiri, optimis, mudah bergaul, dan menyukai petualangan serta kebebasan. Selalu bergerak dan tidak betah diam, tetapi kurang sabar dan mudah bosan dengan rutinitas yang monoton.",
 karier:"Cocok di sales, travel, hiburan, olahraga, jurnalistik, marketing lapangan, dan wirausaha dinamis.",
 keuangan:"Rezeki mengalir dari kerja keras dan jaringan luas; perlu belajar menabung dan tidak impulsif.",
 cinta:"Hangat, ekspresif, dan romantis, tetapi sangat menghargai kebebasan dan tak suka dikekang.",
 kesehatan:"Aktif dan bugar, tetapi rawan kelelahan dan cedera karena gaya hidup yang serba cepat.",
 warna:[["Merah","#C2402E"],["Kuning","#C9A227"],["Hijau","#3E7A5E"]], angka:[2,3,7], arahHoki:["Selatan","Timur","Barat Daya"],
 bunga:["Calla Lily","Jasmine","Marigold"], batu:"Topaz"},

{id:"kambing",nama:"Kambing",en:"Goat",han:"羊",cabang:"未 Wèi",glyph:"羊",urutan:8,yy:"Yin",elTetap:"tanah",
 jam:"13.00–15.00",arah:"Barat Daya",musim:"Akhir musim panas",
 positif:["lembut & penyayang","kreatif & artistik","sabar","penuh empati","tenang","murah hati"],
 negatif:["mudah cemas","kurang percaya diri","bergantung pada orang lain","pesimistis","sulit mengambil keputusan"],
 watak:"Shio Kambing lembut, penyayang, dan berjiwa seni. Ia penuh empati, sabar, kreatif, dan mencintai keindahan serta kedamaian. Hatinya hangat dan suka menolong, tetapi cenderung kurang percaya diri dan terlalu bergantung pada dukungan orang lain.",
 karier:"Cocok di seni, desain, kuliner, mode, pendidikan anak, terapi, dan bidang kreatif lain.",
 keuangan:"Beruntung mendapat bantuan dan rezeki tak terduga; perlu lebih mandiri mengatur keuangan.",
 cinta:"Setia, lembut, dan penuh kasih. Mendambakan pasangan yang melindungi dan memberi rasa aman.",
 kesehatan:"Sensitif secara emosi; perlu menjaga ketenangan batin dan lingkungan yang mendukung.",
 warna:[["Hijau","#3E7A5E"],["Merah","#C2402E"],["Ungu","#7A5E9A"]], angka:[2,7], arahHoki:["Barat Daya","Selatan","Timur"],
 bunga:["Carnation","Primrose","Anyelir"], batu:"Safir / Emerald"},

{id:"monyet",nama:"Monyet",en:"Monkey",han:"猴",cabang:"申 Shēn",glyph:"猴",urutan:9,yy:"Yang",elTetap:"logam",
 jam:"15.00–17.00",arah:"Barat Daya",musim:"Awal musim gugur",
 positif:["cerdas & jenaka","kreatif & inovatif","lincah","pandai bergaul","cepat belajar","fleksibel"],
 negatif:["licik bila berlebihan","gelisah","mudah bosan","kurang serius","manipulatif"],
 watak:"Shio Monyet cerdas, jenaka, dan penuh akal. Ia inovatif, lincah, pandai memecahkan masalah, dan ahli beradaptasi di situasi apa pun. Kepribadiannya menghibur dan disukai banyak orang, tetapi sifat usil dan mudah bosannya kadang membuatnya kurang fokus.",
 karier:"Cocok di teknologi, kreatif, entertainment, sains, bisnis, marketing, dan profesi yang butuh inovasi.",
 keuangan:"Pandai mencari peluang dan menghasilkan uang dengan cara cerdik; perlu menghindari spekulasi berlebihan.",
 cinta:"Menyenangkan, jenaka, dan penuh kejutan, tetapi mudah bosan dan butuh pasangan yang menarik secara intelektual.",
 kesehatan:"Lincah dan aktif, tetapi rawan gelisah dan gangguan saraf karena pikiran yang selalu aktif.",
 warna:[["Putih","#EFE7D6"],["Emas","#C9A227"],["Biru","#3E72A6"]], angka:[1,7,8], arahHoki:["Barat","Utara","Barat Laut"],
 bunga:["Chrysanthemum","Crape Myrtle"], batu:"Peridot"},

{id:"ayam",nama:"Ayam",en:"Rooster",han:"鸡",cabang:"酉 Yǒu",glyph:"雞",urutan:10,yy:"Yin",elTetap:"logam",
 jam:"17.00–19.00",arah:"Barat",musim:"Pertengahan musim gugur",
 positif:["rajin & teliti","jujur & blak-blakan","percaya diri","terorganisir","setia","berani tampil"],
 negatif:["perfeksionis","kritis & cerewet","keras kepala","suka pamer","sensitif terhadap kritik"],
 watak:"Shio Ayam rajin, teliti, dan penuh percaya diri. Ia jujur, blak-blakan, terorganisir, dan bangga pada penampilan serta hasil kerjanya. Suka menjadi pusat perhatian dan sangat memperhatikan detail, tetapi sifat perfeksionis dan kritisnya bisa terasa cerewet bagi orang lain.",
 karier:"Cocok di militer, administrasi, public speaking, jurnalistik, kecantikan, kuliner, dan manajemen detail.",
 keuangan:"Cermat dan rajin menabung; rezeki datang dari kerja keras dan perencanaan yang teliti.",
 cinta:"Setia, perhatian, dan terbuka, tetapi suka mengkritik. Butuh pasangan yang menghargai kejujurannya.",
 kesehatan:"Umumnya bugar; perlu menjaga agar tidak terlalu cemas dan perfeksionis yang menguras energi.",
 warna:[["Emas","#C9A227"],["Cokelat","#B0863F"],["Kuning","#D8B26A"]], angka:[5,7,8], arahHoki:["Barat","Barat Daya","Timur Laut"],
 bunga:["Gladiol","Cockscomb","Impatiens"], batu:"Topaz / Citrine"},

{id:"anjing",nama:"Anjing",en:"Dog",han:"狗",cabang:"戌 Xū",glyph:"狗",urutan:11,yy:"Yang",elTetap:"tanah",
 jam:"19.00–21.00",arah:"Barat Laut",musim:"Akhir musim gugur",
 positif:["setia & jujur","adil & berprinsip","pelindung","dapat dipercaya","berani membela","tulus"],
 negatif:["mudah cemas & curiga","pesimistis","keras kepala","terlalu kritis","sulit percaya orang baru"],
 watak:"Shio Anjing adalah lambang kesetiaan dan keadilan. Ia jujur, tulus, melindungi orang yang disayang, dan punya rasa keadilan yang kuat. Bisa sangat diandalkan dan loyal, tetapi cenderung pencemas, waspada berlebihan, dan sulit langsung mempercayai orang baru.",
 karier:"Cocok di hukum, sosial, keamanan, medis, aktivisme, pendidikan, dan profesi yang melayani orang banyak.",
 keuangan:"Tidak materialistis; mengelola uang dengan bijak dan tidak boros, lebih mementingkan rasa aman.",
 cinta:"Sangat setia, jujur, dan penuh pengabdian, tetapi butuh waktu untuk benar-benar membuka hati.",
 kesehatan:"Umumnya kuat; perlu mengelola kecemasan dan stres agar tidak memengaruhi kesehatan.",
 warna:[["Hijau","#3E7A5E"],["Merah","#C2402E"],["Ungu","#7A5E9A"]], angka:[3,4,9], arahHoki:["Timur","Selatan","Barat Laut"],
 bunga:["Mawar","Oncidium","Cymbidium"], batu:"Giok / Emerald"},

{id:"babi",nama:"Babi",en:"Pig",han:"猪",cabang:"亥 Hài",glyph:"豬",urutan:12,yy:"Yin",elTetap:"air",
 jam:"21.00–23.00",arah:"Barat Laut",musim:"Awal musim dingin",
 positif:["tulus & jujur","murah hati & dermawan","santai & ramah","penyayang","optimis","pekerja keras tanpa pamrih"],
 negatif:["terlalu polos / mudah ditipu","boros","malas bila terlena","naif","keras kepala diam-diam"],
 watak:"Shio Babi tulus, murah hati, dan berhati besar. Ia jujur, ramah, menikmati hidup, dan tak segan menolong sesama tanpa pamrih. Kebaikan dan keluguannya membuatnya disayangi, tetapi sifat terlalu percaya dan boros bisa membuatnya mudah dimanfaatkan.",
 karier:"Cocok di kuliner, hiburan, sosial, hospitality, kesehatan, seni, dan bisnis yang melayani orang.",
 keuangan:"Beruntung soal rezeki dan menikmati kemakmuran; perlu lebih disiplin agar tidak boros.",
 cinta:"Hangat, setia, dan penuh kasih sayang. Pasangan yang romantis, tulus, dan suka memanjakan.",
 kesehatan:"Suka menikmati hidup; perlu menjaga pola makan agar terhindar dari masalah berat badan.",
 warna:[["Kuning","#C9A227"],["Abu","#A39A8B"],["Cokelat","#B0863F"]], angka:[2,5,8], arahHoki:["Tenggara","Timur Laut","Barat Daya"],
 bunga:["Hydrangea","Pitcher Plant","Daisy"], batu:"Rubi / Ruby"}
];

/* ── 5. RELASI ANTAR SHIO ──
   San He (segitiga harmoni), Liu He (sahabat rahasia/enam serasi),
   Liu Chong (enam tabrakan/musuh), Liu Hai (enam pelanggar/kurang serasi). */
const SAN_HE = [["tikus","naga","monyet"],["kerbau","ular","ayam"],["macan","kuda","anjing"],["kelinci","kambing","babi"]];
const LIU_HE = {tikus:"kerbau",kerbau:"tikus",macan:"babi",babi:"macan",kelinci:"anjing",anjing:"kelinci",naga:"ayam",ayam:"naga",ular:"monyet",monyet:"ular",kuda:"kambing",kambing:"kuda"};
const CHONG = {tikus:"kuda",kuda:"tikus",kerbau:"kambing",kambing:"kerbau",macan:"monyet",monyet:"macan",kelinci:"ayam",ayam:"kelinci",naga:"anjing",anjing:"naga",ular:"babi",babi:"ular"};
const HAI = {tikus:"kambing",kambing:"tikus",kerbau:"kuda",kuda:"kerbau",macan:"ular",ular:"macan",kelinci:"naga",naga:"kelinci",monyet:"babi",babi:"monyet",ayam:"anjing",anjing:"ayam"};

/* ── 6. FENGSHUI — DELAPAN ISTANA (Ba Zhai 八宅) per angka Kua ──
   Arah ID: U=Utara, TL=Timur Laut, T=Timur, TG=Tenggara, S=Selatan,
            BD=Barat Daya, B=Barat, BL=Barat Laut. */
const ARAH_NAMA = {U:"Utara",TL:"Timur Laut",T:"Timur",TG:"Tenggara",S:"Selatan",BD:"Barat Daya",B:"Barat",BL:"Barat Laut"};
const KUA = {
 1:{istana:"Kan 坎",el:"air",grup:"Timur",
    baik:{ShengQi:"TG",TianYi:"T",YanNian:"S",FuWei:"U"},
    buruk:{HuoHai:"B",WuGui:"TL",LiuSha:"BL",JueMing:"BD"}},
 2:{istana:"Kun 坤",el:"tanah",grup:"Barat",
    baik:{ShengQi:"TL",TianYi:"B",YanNian:"BL",FuWei:"BD"},
    buruk:{HuoHai:"T",WuGui:"TG",LiuSha:"S",JueMing:"U"}},
 3:{istana:"Zhen 震",el:"kayu",grup:"Timur",
    baik:{ShengQi:"S",TianYi:"U",YanNian:"TG",FuWei:"T"},
    buruk:{HuoHai:"BD",WuGui:"BL",LiuSha:"TL",JueMing:"B"}},
 4:{istana:"Xun 巽",el:"kayu",grup:"Timur",
    baik:{ShengQi:"U",TianYi:"S",YanNian:"T",FuWei:"TG"},
    buruk:{HuoHai:"BL",WuGui:"BD",LiuSha:"B",JueMing:"TL"}},
 6:{istana:"Qian 乾",el:"logam",grup:"Barat",
    baik:{ShengQi:"B",TianYi:"TL",YanNian:"BD",FuWei:"BL"},
    buruk:{HuoHai:"TG",WuGui:"T",LiuSha:"U",JueMing:"S"}},
 7:{istana:"Dui 兑",el:"logam",grup:"Barat",
    baik:{ShengQi:"BL",TianYi:"BD",YanNian:"TL",FuWei:"B"},
    buruk:{HuoHai:"U",WuGui:"S",LiuSha:"TG",JueMing:"T"}},
 8:{istana:"Gen 艮",el:"tanah",grup:"Barat",
    baik:{ShengQi:"BD",TianYi:"BL",YanNian:"B",FuWei:"TL"},
    buruk:{HuoHai:"S",WuGui:"U",LiuSha:"T",JueMing:"TG"}},
 9:{istana:"Li 离",el:"api",grup:"Timur",
    baik:{ShengQi:"T",TianYi:"TG",YanNian:"U",FuWei:"S"},
    buruk:{HuoHai:"TL",WuGui:"B",LiuSha:"BD",JueMing:"BL"}}
};
const ARTI_ARAH = {
 ShengQi:{nama:"Sheng Chi 生气",arti:"Napas Kehidupan — arah TERBAIK: rezeki, kesuksesan, karier, vitalitas",letak:"pintu utama, meja kerja, ruang tamu",q:"good"},
 TianYi:{nama:"Tian Yi 天医",arti:"Tabib Langit — kesehatan, penyembuhan, sahabat penolong",letak:"kepala tempat tidur, dapur",q:"good"},
 YanNian:{nama:"Yan Nian 延年",arti:"Umur Panjang — cinta, pernikahan, harmoni, relasi",letak:"kamar tidur, ruang keluarga",q:"good"},
 FuWei:{nama:"Fu Wei 伏位",arti:"Kestabilan Diri — ketenangan, fokus, pertumbuhan pribadi",letak:"ruang belajar, meditasi, kerja",q:"good"},
 HuoHai:{nama:"Huo Hai 祸害",arti:"Celaka Kecil — kesialan ringan, perselisihan, kecelakaan kecil",letak:"hindari untuk pintu & ranjang",q:"bad"},
 WuGui:{nama:"Wu Gui 五鬼",arti:"Lima Hantu — kebakaran, pencurian, pengkhianatan, kehilangan",letak:"hindari untuk pintu & kompor",q:"bad"},
 LiuSha:{nama:"Liu Sha 六煞",arti:"Enam Pembunuh — masalah hukum, skandal, gangguan relasi & kesehatan",letak:"hindari untuk area utama",q:"bad"},
 JueMing:{nama:"Jue Ming 绝命",arti:"Bencana Total — arah TERBURUK: kesehatan parah, kebangkrutan",letak:"tempatkan toilet/gudang di sini",q:"bad"}
};

/* ── 7. NUMEROLOGI NAMA (bintang angka, gaya Pythagoras) ── */
const HURUF = {A:1,J:1,S:1,B:2,K:2,T:2,C:3,L:3,U:3,D:4,M:4,V:4,E:5,N:5,W:5,F:6,O:6,X:6,G:7,P:7,Y:7,H:8,Q:8,Z:8,I:9,R:9};
const ANGKA_MAKNA = {
 1:{judul:"Sang Pemimpin",teks:"Mandiri, inovatif, dan ambisius. Berbakat memimpin, memulai hal baru, dan berdiri di garis depan. Tantangannya: ego dan kurang sabar mendengar orang lain."},
 2:{judul:"Sang Diplomat",teks:"Peka, penuh kerja sama, dan penyeimbang. Pandai menjembatani konflik dan menjadi mitra setia. Tantangannya: terlalu bergantung dan kurang tegas."},
 3:{judul:"Sang Ekspresif",teks:"Kreatif, komunikatif, dan optimis. Bersinar dalam seni, bicara, dan ide. Tantangannya: mudah teralih dan kurang fokus."},
 4:{judul:"Sang Pembangun",teks:"Pekerja keras, terstruktur, dan dapat diandalkan. Pondasi yang kokoh bagi siapa pun. Tantangannya: kaku dan terlalu hati-hati."},
 5:{judul:"Sang Petualang",teks:"Dinamis, bebas, dan menyukai perubahan. Cepat belajar dan beradaptasi. Tantangannya: gelisah dan sulit berkomitmen."},
 6:{judul:"Sang Pengasuh",teks:"Bertanggung jawab, harmonis, dan penuh kasih. Pelindung keluarga dan komunitas. Tantangannya: terlalu mengurus dan ikut campur."},
 7:{judul:"Sang Pemikir",teks:"Analitis, spiritual, dan pencari kebenaran. Mendalam dan bijak. Tantangannya: menyendiri dan sulit terbuka."},
 8:{judul:"Sang Eksekutif",teks:"Berkuasa, ambisius, dan berorientasi sukses materi. Magnet kekayaan dan otoritas. Tantangannya: workaholic dan terlalu mengejar status."},
 9:{judul:"Sang Humanis",teks:"Idealis, dermawan, dan berjiwa besar. Peduli kemanusiaan dan visi luas. Tantangannya: terlalu mengorbankan diri."},
 11:{judul:"Master Intuitif",teks:"Visioner spiritual dan inspirator. Intuisi sangat tajam dan kepekaan tinggi terhadap energi sekitar. Tantangannya: tegangan batin dan idealisme tinggi."},
 22:{judul:"Master Pembangun",teks:"Arsitek mimpi besar — mampu mengubah visi raksasa menjadi kenyataan nyata. Tantangannya: tekanan dan tanggung jawab yang berat."},
 33:{judul:"Master Guru",teks:"Pengabdi kasih universal dan pembimbing. Energi penyembuh dan pelayanan tulus. Tantangannya: beban emosional yang besar."}
};

/* ── HELPER ── */
function reduceNum(n){ // pertahankan master 11/22/33
  while(n>9 && n!==11 && n!==22 && n!==33){ n = String(n).split("").reduce((a,b)=>a+(+b),0); }
  return n;
}
function ekspresiNama(nama){
  const huruf = nama.toUpperCase().replace(/[^A-Z]/g,"").split("");
  if(!huruf.length) return null;
  const total = huruf.reduce((a,c)=>a+(HURUF[c]||0),0);
  return {total, angka:reduceNum(total)};
}
function jalanHidup(y,m,d){
  const total = String(y).split("").reduce((a,b)=>a+(+b),0)+reduceNum(m)+reduceNum(d);
  return {total, angka:reduceNum(total)};
}
// hitung Kua dari tahun lunar efektif + gender
function hitungKua(tahunLunar, gender){
  const dua = tahunLunar % 100;
  let s = reduceNum(Math.floor(dua/10)+(dua%10)); s = reduceNum(s);
  let k;
  if(tahunLunar < 2000){
    k = (gender==="pria") ? reduceNum(10 - s) : reduceNum(5 + s);
  } else {
    k = (gender==="pria") ? reduceNum(9 - s) : reduceNum(6 + s);
  }
  if(k===0) k = (gender==="pria")?9:6;
  if(k===5) k = (gender==="pria")?2:8; // Kua 5 → 2 (pria) / 8 (wanita)
  return k;
}
function elemenRelasi(a,b){
  if(a===b) return {label:"Sejenis — saling menguatkan & nyaman",t:"netral+"};
  if(PRODUKTIF[a]===b) return {label:`${ELEMEN[a].nama} menghidupi ${ELEMEN[b].nama} — kamu memberi/mendukung`,t:"baik"};
  if(PRODUKTIF[b]===a) return {label:`${ELEMEN[b].nama} menghidupi ${ELEMEN[a].nama} — kamu didukung/diberi rezeki`,t:"baik"};
  if(DESTRUKTIF[a]===b) return {label:`${ELEMEN[a].nama} mengatasi ${ELEMEN[b].nama} — kamu mendominasi/menguras`,t:"tegang"};
  if(DESTRUKTIF[b]===a) return {label:`${ELEMEN[b].nama} mengatasi ${ELEMEN[a].nama} — kamu tertekan/perlu waspada`,t:"tegang"};
  return {label:"Netral",t:"netral"};
}
function relasiShio(a,b){
  if(a===b) return {jenis:"Tahun Shio Sendiri (Ben Ming Nian 本命年)",t:"hati2",
    ket:"Tahun penuh perubahan & ujian bagi shio sendiri. Disarankan banyak memakai warna merah dan menjaga diri."};
  if(SAN_HE.some(g=>g.includes(a)&&g.includes(b))) return {jenis:"Segitiga Harmoni (San He 三合)",t:"sangat baik",
    ket:"Sangat serasi & saling mendukung — keberuntungan, kerja sama, dan rezeki mengalir lancar."};
  if(LIU_HE[a]===b) return {jenis:"Sahabat Rahasia (Liu He 六合)",t:"baik",
    ket:"Pasangan enam serasi — saling melengkapi, mendukung diam-diam, dan membawa keberuntungan."};
  if(CHONG[a]===b) return {jenis:"Tabrakan (Liu Chong 六冲)",t:"menantang",
    ket:"Energi berlawanan — penuh tantangan, gesekan, dan perubahan. Perlu ekstra sabar dan kompromi."};
  if(HAI[a]===b) return {jenis:"Kurang Serasi (Liu Hai 六害)",t:"kurang",
    ket:"Sedikit berbenturan — rawan salah paham dan friksi kecil; butuh komunikasi yang baik."};
  return {jenis:"Netral",t:"netral",ket:"Hubungan biasa — tidak terlalu mendukung, tidak pula menghambat."};
}

/* ── PARSER TAHUN LUNAR ── */
function tahunLunarEfektif(y,m,d){
  const batas = IMLEK[y];
  if(!batas) return y; // di luar tabel: pakai tahun gregorian apa adanya
  const [bm,bd] = batas.split("-").map(Number);
  const sebelumImlek = (m < bm) || (m===bm && d < bd);
  return sebelumImlek ? y-1 : y;
}
function shioDariTahun(tahunLunar){
  const bi = ((tahunLunar-4)%12+12)%12;
  return SHIO[bi];
}
function batangDariTahun(tahunLunar){
  const si = ((tahunLunar-4)%10+10)%10;
  return BATANG[si];
}

/* ── FUNGSI UTAMA ── */
function analisaShioFengshui(nama, tglLahir, gender){
  // tglLahir: "YYYY-MM-DD"
  const [y,m,d] = tglLahir.split("-").map(Number);
  const tahunLunar = tahunLunarEfektif(y,m,d);
  const shio = shioDariTahun(tahunLunar);
  const batang = batangDariTahun(tahunLunar);
  const elTahun = ELEMEN[batang.el];          // elemen tahun (batang langit) = elemen shio yang terkenal
  const elTetap = ELEMEN[shio.elTetap];       // elemen tetap shio (cabang bumi)
  const kuaNo = gender ? hitungKua(tahunLunar, gender) : null;
  const kua = kuaNo ? KUA[kuaNo] : null;

  // kompatibilitas shio
  const sanheGroup = SAN_HE.find(g=>g.includes(shio.id)).filter(x=>x!==shio.id);
  const sahabat = LIU_HE[shio.id];
  const musuh = CHONG[shio.id];
  const kurang = HAI[shio.id];

  // numerologi
  const eks = ekspresiNama(nama);
  const jh = jalanHidup(y,m,d);

  // peruntungan tahun berjalan
  const now = new Date();
  const tahunLunarKini = tahunLunarEfektif(now.getFullYear(), now.getMonth()+1, now.getDate());
  const shioKini = shioDariTahun(tahunLunarKini);
  const batangKini = batangDariTahun(tahunLunarKini);
  const relTahun = relasiShio(shio.id, shioKini.id);
  const relElTahun = elemenRelasi(shio.elTetap, batangKini.el);

  return {
    input:{nama,tglLahir,gender,tahunGregorian:y,tahunLunar},
    shio, batang, elemenTahun:elTahun, elemenTetap:elTetap,
    ganzhi:`${batang.han}${shio.cabang.split(" ")[0]} · ${batang.p} ${shio.cabang.split(" ")[1]}`,
    headline:`${shio.nama} ${elTahun.nama}`,
    yinyang:batang.yy,
    kompatibilitas:{
      sanhe:sanheGroup.map(id=>SHIO.find(s=>s.id===id)),
      sahabat:SHIO.find(s=>s.id===sahabat),
      musuh:SHIO.find(s=>s.id===musuh),
      kurang:SHIO.find(s=>s.id===kurang)
    },
    fengshui: kua ? {
      kuaNo, istana:kua.istana, grup:kua.grup, elemenKua:ELEMEN[kua.el],
      baik:Object.entries(kua.baik).map(([k,v])=>({...ARTI_ARAH[k],arahKode:v,arah:ARAH_NAMA[v]})),
      buruk:Object.entries(kua.buruk).map(([k,v])=>({...ARTI_ARAH[k],arahKode:v,arah:ARAH_NAMA[v]}))
    } : null,
    numerologi:{
      ekspresi:{...eks, makna:ANGKA_MAKNA[eks ? eks.angka : 1]},
      jalanHidup:{...jh, makna:ANGKA_MAKNA[jh.angka]}
    },
    tahunBerjalan:{
      tahun:now.getFullYear(), shio:shioKini, elemen:ELEMEN[batangKini.el],
      relasiShio:relTahun, relasiElemen:relElTahun
    }
  };
}

return {analisaShioFengshui, SHIO, ELEMEN, KUA, ARAH_NAMA, ARTI_ARAH};
})();

export const analisaShioFengshui = ShioFengshui.analisaShioFengshui;
export const SHIO = ShioFengshui.SHIO;
export const ELEMEN = ShioFengshui.ELEMEN;
export const KUA = ShioFengshui.KUA;
export const ARAH_NAMA = ShioFengshui.ARAH_NAMA;
export const ARTI_ARAH = ShioFengshui.ARTI_ARAH;
export default ShioFengshui;

/* ── Tipe hasil untuk konsumen (komponen React) ── */
export type Gender = "pria" | "wanita";
export interface SfElemen {
  nama: string; han: string; en: string; warna: string; hex: string;
  arah: string; musim: string; sifat: string[]; pengaruh: string;
}
export interface SfShio {
  id: string; nama: string; en: string; han: string; cabang: string; glyph: string;
  urutan: number; yy: string; elTetap: string; jam: string; arah: string; musim: string;
  positif: string[]; negatif: string[]; watak: string; karier: string; keuangan: string;
  cinta: string; kesehatan: string; warna: [string, string][]; angka: number[];
  arahHoki: string[]; bunga: string[]; batu: string;
}
export interface SfBatang { han: string; p: string; el: string; yy: string; }
export interface SfArahItem {
  nama: string; arti: string; letak: string; q: "good" | "bad"; arahKode: string; arah: string;
}
export interface SfAngkaMakna { judul: string; teks: string; }
export interface SfNumer { total?: number; angka?: number; makna: SfAngkaMakna; }
export interface SfFengshui {
  kuaNo: number; istana: string; grup: string; elemenKua: SfElemen;
  baik: SfArahItem[]; buruk: SfArahItem[];
}
export interface SfRelasiShio { jenis: string; t: string; ket: string; }
export interface SfRelasiElemen { label: string; t: string; }
export interface ShioFengshuiResult {
  input: { nama: string; tglLahir: string; gender: string | null; tahunGregorian: number; tahunLunar: number };
  shio: SfShio; batang: SfBatang; elemenTahun: SfElemen; elemenTetap: SfElemen;
  ganzhi: string; headline: string; yinyang: string;
  kompatibilitas: { sanhe: SfShio[]; sahabat: SfShio; musuh: SfShio; kurang: SfShio };
  fengshui: SfFengshui | null;
  numerologi: { ekspresi: SfNumer; jalanHidup: SfNumer };
  tahunBerjalan: {
    tahun: number; shio: SfShio; elemen: SfElemen;
    relasiShio: SfRelasiShio; relasiElemen: SfRelasiElemen;
  };
}
