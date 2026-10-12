/**
 * ICD-10 Disease Codes & Standard FKTP BPJS Diagnoses
 * Klinik Pratama Cikidang Medika
 * Sesuai Standar Kompetensi Dokter di Faskes Primer (144 Diagnosa FKTP BPJS Kesehatan / Permenkes No. 5 Th 2014)
 */

export interface Icd10Item {
  code: string;
  name: string;
  category?: string;
}

/**
 * 8 Diagnosa Teratas Klinik Cikidang Medika
 * Berdasarkan frekuensi kunjungan historis tertinggi (> 4.000+ kasus)
 */
export const POPULAR_ICD10: readonly Icd10Item[] = [
  { code: 'J00', name: 'ISPA / Nasopharyngitis Akut', category: 'Respirasi' },
  { code: 'K30', name: 'Dispepsia / Sakit Lambung', category: 'Pencernaan' },
  { code: 'Z34', name: 'Pemeriksaan Kehamilan Normal (ANC)', category: 'Kebidanan' },
  { code: 'L23', name: 'Dermatitis Kontak Alergi', category: 'Kulit' },
  { code: 'R50', name: 'Demam / Observasi Febris', category: 'Gejala Umum' },
  { code: 'E11', name: 'Diabetes Mellitus Tipe 2 (DM)', category: 'Endokrin' },
  { code: 'A09', name: 'Gastroenteritis / Diare Akut', category: 'Pencernaan' },
  { code: 'Z00', name: 'Pemeriksaan Kesehatan Umum / Kontrol Rutin', category: 'Pemeriksaan' },
] as const;

/**
 * Katalog Diagnosa Standar FKTP BPJS Kesehatan (144 Penyakit Tingkat Kemampuan 4A)
 * Lengkap dengan kode ICD-10 standar e-Klaim / P-Care dan pengelompokan klinis.
 */
export const COMMON_ICD10_LIST: readonly Icd10Item[] = [
  // 1. INFEKSI & PENYAKIT TROPIS
  { code: 'A01.0', name: 'Demam Tifoid (Typhoid Fever)', category: 'Infeksi Tropis' },
  { code: 'A01.1', name: 'Demam Paratifoid', category: 'Infeksi Tropis' },
  { code: 'A06.0', name: 'Disentri Amuba Akut (Amoebiasis)', category: 'Infeksi Tropis' },
  { code: 'A03.9', name: 'Disentri Basiler (Shigellosis)', category: 'Infeksi Tropis' },
  { code: 'A09', name: 'Gastroenteritis Akut / Diare Akut', category: 'Infeksi Tropis' },
  { code: 'A15.0', name: 'Tuberkulosis Paru (TBC Paru)', category: 'Infeksi Tropis' },
  { code: 'A18.2', name: 'Tuberkulosis Limfadenitis (TBC Kelenjar)', category: 'Infeksi Tropis' },
  { code: 'A27.9', name: 'Leptospirosis', category: 'Infeksi Tropis' },
  { code: 'A30.9', name: 'Kusta / Morbus Hansen', category: 'Infeksi Tropis' },
  { code: 'A35', name: 'Tetanus', category: 'Infeksi Tropis' },
  { code: 'A36.9', name: 'Difteri', category: 'Infeksi Tropis' },
  { code: 'A37.9', name: 'Pertusis / Batuk Rejan', category: 'Infeksi Tropis' },
  { code: 'A82.9', name: 'Rabies', category: 'Infeksi Tropis' },
  { code: 'A90', name: 'Demam Dengue (Dengue Fever)', category: 'Infeksi Tropis' },
  { code: 'A91', name: 'Demam Berdarah Dengue (DBD / DHF)', category: 'Infeksi Tropis' },
  { code: 'B01.9', name: 'Varisela / Cacar Air (Chickenpox)', category: 'Infeksi Tropis' },
  { code: 'B02.9', name: 'Herpes Zoster', category: 'Infeksi Tropis' },
  { code: 'B05.9', name: 'Campak / Morbili / Measles', category: 'Infeksi Tropis' },
  { code: 'B26.9', name: 'Gondongan / Parotitis Epidemika', category: 'Infeksi Tropis' },
  { code: 'B50.9', name: 'Malaria Falciparum', category: 'Infeksi Tropis' },
  { code: 'B51.9', name: 'Malaria Vivax', category: 'Infeksi Tropis' },
  { code: 'B54', name: 'Malaria Klinis', category: 'Infeksi Tropis' },
  { code: 'B74.9', name: 'Filariasis / Kaki Gajah', category: 'Infeksi Tropis' },
  { code: 'B76.0', name: 'Ancylostomiasis / Infeksi Cacing Tambang', category: 'Infeksi Tropis' },
  { code: 'B77.9', name: 'Askariasis / Infeksi Cacing Gelang', category: 'Infeksi Tropis' },
  { code: 'B79', name: 'Trikuriasis / Infeksi Cacing Cambuk', category: 'Infeksi Tropis' },
  { code: 'B80', name: 'Enterobiasis / Infeksi Cacing Kremi', category: 'Infeksi Tropis' },
  { code: 'B86', name: 'Skabies (Kudis)', category: 'Infeksi Tropis' },

  // 2. SISTEM RESPIRASI & PARU
  { code: 'J00', name: 'ISPA / Nasofaringitis Akut (Common Cold)', category: 'Respirasi' },
  { code: 'J01.9', name: 'Sinusitis Akut', category: 'Respirasi' },
  { code: 'J02.9', name: 'Faringitis Akut', category: 'Respirasi' },
  { code: 'J03.9', name: 'Tonsilitis Akut', category: 'Respirasi' },
  { code: 'J04.0', name: 'Laringitis Akut', category: 'Respirasi' },
  { code: 'J04.1', name: 'Trakeitis Akut', category: 'Respirasi' },
  { code: 'J06.9', name: 'Infeksi Saluran Napas Atas Akut Lainnya', category: 'Respirasi' },
  { code: 'J11.1', name: 'Influenza (Flu)', category: 'Respirasi' },
  { code: 'J18.0', name: 'Bronkopneumonia', category: 'Respirasi' },
  { code: 'J18.9', name: 'Pneumonia Komunitas', category: 'Respirasi' },
  { code: 'J20.9', name: 'Bronkitis Akut', category: 'Respirasi' },
  { code: 'J30.4', name: 'Rhinitis Alergi', category: 'Respirasi' },
  { code: 'J30.0', name: 'Rhinitis Vasomotor', category: 'Respirasi' },
  { code: 'J42', name: 'Bronkitis Kronis', category: 'Respirasi' },
  { code: 'J44.9', name: 'Penyakit Paru Obstruktif Kronik (PPOK)', category: 'Respirasi' },
  { code: 'J45.9', name: 'Asma Bronkiale', category: 'Respirasi' },
  { code: 'J46', name: 'Status Asmatikus Akut', category: 'Respirasi' },
  { code: 'R05', name: 'Batuk Simtomatik', category: 'Respirasi' },

  // 3. SISTEM PENCERNAAN & GIGI MULUT
  { code: 'K02.9', name: 'Karies Gigi / Gigi Berlubang', category: 'Pencernaan' },
  { code: 'K04.0', name: 'Pulpitis Akut / Gigi Ngilu', category: 'Pencernaan' },
  { code: 'K04.7', name: 'Abses Periapikal Gigi Tanpa Sinus', category: 'Pencernaan' },
  { code: 'K05.0', name: 'Gingivitis Akut', category: 'Pencernaan' },
  { code: 'K05.3', name: 'Periodontitis Kronis', category: 'Pencernaan' },
  { code: 'K12.0', name: 'Stomatitis Aftosa Rekuren / Sariawan', category: 'Pencernaan' },
  { code: 'K12.1', name: 'Stomatitis Lain / Ulkus Mulut', category: 'Pencernaan' },
  { code: 'K21.9', name: 'GERD / Refluks Gastroesofageal', category: 'Pencernaan' },
  { code: 'K29.7', name: 'Gastritis Akut / Sakit Maag', category: 'Pencernaan' },
  { code: 'K30', name: 'Dispepsia Fungsional', category: 'Pencernaan' },
  { code: 'K35.8', name: 'Apendisitis Akut', category: 'Pencernaan' },
  { code: 'K59.0', name: 'Konstipasi / Sembelit', category: 'Pencernaan' },
  { code: 'K64.9', name: 'Hemoroid / Wasir Interna & Eksterna', category: 'Pencernaan' },
  { code: 'B15.9', name: 'Hepatitis A Akut', category: 'Pencernaan' },
  { code: 'B16.9', name: 'Hepatitis B Akut', category: 'Pencernaan' },
  { code: 'R11', name: 'Nausea dan Vomiting (Mual Muntah)', category: 'Pencernaan' },

  // 4. SISTEM KARDIOVASKULAR & SIRKULASI
  { code: 'I10', name: 'Hipertensi Esensial (Primer)', category: 'Kardiovaskular' },
  { code: 'I11.9', name: 'Penyakit Jantung Hipertensi', category: 'Kardiovaskular' },
  { code: 'I20.9', name: 'Angina Pektoris Stabil', category: 'Kardiovaskular' },
  { code: 'I50.9', name: 'Gagal Jantung Kongestif (CHF)', category: 'Kardiovaskular' },
  { code: 'I95.9', name: 'Hipotensi Simtomatik', category: 'Kardiovaskular' },
  { code: 'D50.9', name: 'Anemia Defisiensi Besi', category: 'Kardiovaskular' },
  { code: 'D64.9', name: 'Anemia Lain / Tak Terspesifikasi', category: 'Kardiovaskular' },
  { code: 'L04.9', name: 'Limfadenitis Akut Non-spesifik', category: 'Kardiovaskular' },

  // 5. SISTEM ENDOKRIN, NUTRISI & METABOLISME
  { code: 'E10.9', name: 'Diabetes Melitus Tipe 1', category: 'Endokrin' },
  { code: 'E11.9', name: 'Diabetes Melitus Tipe 2', category: 'Endokrin' },
  { code: 'E16.2', name: 'Hipoglikemia', category: 'Endokrin' },
  { code: 'E46', name: 'Malnutrisi Protein Energi / Gizi Kurang', category: 'Endokrin' },
  { code: 'E50.9', name: 'Defisiensi Vitamin A / Xerophthalmia', category: 'Endokrin' },
  { code: 'E66.9', name: 'Obesitas', category: 'Endokrin' },
  { code: 'E78.5', name: 'Dislipidemia / Hiperkolesterolemia', category: 'Endokrin' },
  { code: 'M10.9', name: 'Gout Arthritis / Asam Urat Tinggi', category: 'Endokrin' },

  // 6. SISTEM KULIT & JARINGAN SUBKUTAN
  { code: 'L01.0', name: 'Impetigo Krustosa & Bulosa', category: 'Kulit' },
  { code: 'L02.9', name: 'Furunkel / Karbunkel / Bisul Kulit', category: 'Kulit' },
  { code: 'L03.9', name: 'Selulitis / Erisipelas', category: 'Kulit' },
  { code: 'L08.0', name: 'Pioderma Kulit', category: 'Kulit' },
  { code: 'L08.1', name: 'Eritrasma', category: 'Kulit' },
  { code: 'L20.9', name: 'Dermatitis Atopik / Eksim Bayi & Anak', category: 'Kulit' },
  { code: 'L21.9', name: 'Dermatitis Seboroik', category: 'Kulit' },
  { code: 'L23.9', name: 'Dermatitis Kontak Alergi (DKA)', category: 'Kulit' },
  { code: 'L24.9', name: 'Dermatitis Kontak Iritan (DKI)', category: 'Kulit' },
  { code: 'L25.9', name: 'Dermatitis Kontak Tak Spesifik', category: 'Kulit' },
  { code: 'L30.0', name: 'Dermatitis Numularis', category: 'Kulit' },
  { code: 'L30.1', name: 'Dishidrosis / Pomfoliks', category: 'Kulit' },
  { code: 'L40.9', name: 'Psoriasis Vulgaris', category: 'Kulit' },
  { code: 'L42', name: 'Pitiriasis Rosea', category: 'Kulit' },
  { code: 'L50.9', name: 'Urtikaria Akut / Biduran', category: 'Kulit' },
  { code: 'L70.0', name: 'Akne Vulgaris / Jerawat', category: 'Kulit' },
  { code: 'L73.2', name: 'Hidradenitis Supurativa', category: 'Kulit' },
  { code: 'L73.9', name: 'Folikulitis', category: 'Kulit' },
  { code: 'L74.3', name: 'Miliaria Rubra / Biang Keringat', category: 'Kulit' },
  { code: 'B00.9', name: 'Herpes Simpleks (Labialis / Genitalis)', category: 'Kulit' },
  { code: 'B07', name: 'Veruka Vulgaris / Kutil Kulit', category: 'Kulit' },
  { code: 'B08.1', name: 'Moluskum Kontagiosum', category: 'Kulit' },
  { code: 'B35.0', name: 'Tinea Kapitis / Jamur Kulit Kepala', category: 'Kulit' },
  { code: 'B35.4', name: 'Tinea Korporis / Jamur Tubuh', category: 'Kulit' },
  { code: 'B35.6', name: 'Tinea Kruris / Jamur Selangkangan', category: 'Kulit' },
  { code: 'B35.3', name: 'Tinea Pedis / Kutu Air', category: 'Kulit' },
  { code: 'B35.1', name: 'Tinea Unguium / Jamur Kuku', category: 'Kulit' },
  { code: 'B36.0', name: 'Pitiriasis Versikolor / Panu', category: 'Kulit' },
  { code: 'B37.2', name: 'Kandidiasis Kulit & Lipatan (Intertrigo)', category: 'Kulit' },
  { code: 'B85.0', name: 'Pedikulosis Kapitis / Kutu Rambut', category: 'Kulit' },
  { code: 'B76.9', name: 'Cutaneous Larva Migrans (Cacing Kulit)', category: 'Kulit' },

  // 7. SISTEM MATA & INDERA PENGLIHATAN
  { code: 'H00.0', name: 'Hordeolum Internum & Eksternum / Bintitan', category: 'Mata' },
  { code: 'H00.1', name: 'Kalazion', category: 'Mata' },
  { code: 'H01.0', name: 'Blefaritis Akut / Radang Kelopak Mata', category: 'Mata' },
  { code: 'H04.1', name: 'Dry Eye Syndrome / Mata Kering', category: 'Mata' },
  { code: 'H10.9', name: 'Konjungtivitis Akut (Mata Merah / Belekan)', category: 'Mata' },
  { code: 'H10.1', name: 'Konjungtivitis Alergi', category: 'Mata' },
  { code: 'H11.0', name: 'Pterigium Stadium 1-2', category: 'Mata' },
  { code: 'H11.3', name: 'Perdarahan Subkonjungtiva', category: 'Mata' },
  { code: 'H15.1', name: 'Episkleritis', category: 'Mata' },
  { code: 'H25.9', name: 'Katarak Senilis Matur & Imatur', category: 'Mata' },
  { code: 'T15.9', name: 'Corpus Alienum / Benda Asing Mata Luar', category: 'Mata' },

  // 8. SISTEM TELINGA, HIDUNG & TENGGOROKAN (THT)
  { code: 'H60.9', name: 'Otitis Eksterna Difusa / Sirkumskripta', category: 'THT' },
  { code: 'H61.2', name: 'Serumen Prop / Kotoran Telinga Menyumbat', category: 'THT' },
  { code: 'H66.0', name: 'Otitis Media Supuratif Akut (OMA)', category: 'THT' },
  { code: 'H66.3', name: 'Otitis Media Supuratif Kronis (OMSK)', category: 'THT' },
  { code: 'H93.1', name: 'Tinnitus / Dengung Telinga', category: 'THT' },
  { code: 'T16', name: 'Benda Asing Liang Telinga', category: 'THT' },
  { code: 'J34.0', name: 'Furunkel Lubang Hidung', category: 'THT' },
  { code: 'R04.0', name: 'Epistaksis / Mimisan Anterior', category: 'THT' },
  { code: 'T17.1', name: 'Benda Asing Saluran Hidung', category: 'THT' },

  // 9. SISTEM GINJAL, UROLOGI & KELAMIN
  { code: 'N30.9', name: 'Sistitis Akut / Infeksi Kandung Kemih', category: 'Urologi' },
  { code: 'N34.1', name: 'Uretritis Non-Gonore', category: 'Urologi' },
  { code: 'N39.0', name: 'Infeksi Saluran Kemih (ISK)', category: 'Urologi' },
  { code: 'N20.9', name: 'Batu Saluran Kemih / Kolik Ginjal', category: 'Urologi' },
  { code: 'N47', name: 'Fimosis dan Parafimosis', category: 'Urologi' },
  { code: 'N48.1', name: 'Balanitis / Balanopostitis Akut', category: 'Urologi' },
  { code: 'R32', name: 'Enuresis / Mengompol', category: 'Urologi' },

  // 10. KANDUNGAN, KEBIDANAN & KESEHATAN WANITA
  { code: 'Z34.9', name: 'Pemeriksaan Kehamilan Normal (ANC Trimester 1-3)', category: 'Kebidanan' },
  { code: 'O21.0', name: 'Hiperemesis Gravidarum Ringan', category: 'Kebidanan' },
  { code: 'O99.0', name: 'Anemia pada Kehamilan', category: 'Kebidanan' },
  { code: 'O20.0', name: 'Abortus Iminens (Ancaman Keguguran)', category: 'Kebidanan' },
  { code: 'N61', name: 'Mastitis / Radang Payudara Masa Nifas', category: 'Kebidanan' },
  { code: 'O92.1', name: 'Cracked Nipple / Puting Susu Lecet', category: 'Kebidanan' },
  { code: 'N89.8', name: 'Fluor Albus / Keputihan Patologis & Fisiologis', category: 'Kebidanan' },
  { code: 'N76.0', name: 'Vaginitis / Vulvovaginitis Akut', category: 'Kebidanan' },
  { code: 'Z30.9', name: 'Pelayanan Kontrasepsi / Suntik KB / Pil KB', category: 'Kebidanan' },

  // 11. SISTEM SARAF & PSIKIATRI
  { code: 'G43.9', name: 'Migren Tanpa Aura', category: 'Saraf' },
  { code: 'G44.2', name: 'Tension-Type Headache (TTH / Sakit Kepala Tegang)', category: 'Saraf' },
  { code: 'R42', name: 'Vertigo / Pusing Berputar (BPPV / Vestibular)', category: 'Saraf' },
  { code: 'G51.0', name: 'Bell’s Palsy / Kelumpuhan Saraf Wajah', category: 'Saraf' },
  { code: 'R56.0', name: 'Kejang Demam Sederhana (KDS Anak)', category: 'Saraf' },
  { code: 'F41.1', name: 'Gangguan Cemas Menyeluruh (GAD)', category: 'Psikiatri' },
  { code: 'F41.0', name: 'Gangguan Panik', category: 'Psikiatri' },
  { code: 'F32.0', name: 'Episode Depresif Ringan', category: 'Psikiatri' },
  { code: 'F51.0', name: 'Insomnia Non-organik', category: 'Psikiatri' },

  // 12. SISTEM MUSKULOSKELETAL & SENDI
  { code: 'M79.1', name: 'Mialgia / Nyeri Otot Tubuh', category: 'Muskuloskeletal' },
  { code: 'M54.5', name: 'Low Back Pain (LBP / Nyeri Punggung Bawah)', category: 'Muskuloskeletal' },
  { code: 'M15.9', name: 'Poliosteoartritis', category: 'Muskuloskeletal' },
  { code: 'M17.9', name: 'Osteoartritis Genu / Nyeri Sendi Lutut', category: 'Muskuloskeletal' },
  { code: 'M06.9', name: 'Artritis Reumatoid (Rheumatoid Arthritis)', category: 'Muskuloskeletal' },
  { code: 'M77.9', name: 'Entesopati / Tendinitis / Tennis Elbow', category: 'Muskuloskeletal' },
  { code: 'S93.4', name: 'Sprain & Strain Ankle / Keseleo Pergelangan Kaki', category: 'Muskuloskeletal' },
  { code: 'S83.6', name: 'Sprain & Strain Sendi Lutut', category: 'Muskuloskeletal' },

  // 13. GEJALA UMUM, CEDERA, LUKA & TINDAKAN KLINIS
  { code: 'R50.9', name: 'Demam Tanpa Sebab Jelas (Febris Observasi)', category: 'Gejala Umum' },
  { code: 'R51', name: 'Cephalgia / Sakit Kepala Akut', category: 'Gejala Umum' },
  { code: 'R53', name: 'Malaise / Kelelahan & Lemas Umum', category: 'Gejala Umum' },
  { code: 'T14.1', name: 'Vulnus Laceratum / Luka Robek Terbuka', category: 'Trauma & Tindakan' },
  { code: 'T14.0', name: 'Vulnus Excoriatum / Luka Lecet & Memar', category: 'Trauma & Tindakan' },
  { code: 'T20.0', name: 'Luka Bakar Derajat 1-2 (Combustio Ringan)', category: 'Trauma & Tindakan' },
  { code: 'W57', name: 'Vulnus Morsum / Gigitan Serangga & Binatang', category: 'Trauma & Tindakan' },
  { code: 'Z41.2', name: 'Sirkumsisi Rutin / Khitanan / Sunat', category: 'Trauma & Tindakan' },
  { code: 'Z48.0', name: 'Perawatan Pasca Bedah / Jahitan / Ganti Perban', category: 'Trauma & Tindakan' },
  { code: 'Z00.0', name: 'Pemeriksaan Kesehatan Umum / Medical Check-Up', category: 'Pemeriksaan' },
] as const;
