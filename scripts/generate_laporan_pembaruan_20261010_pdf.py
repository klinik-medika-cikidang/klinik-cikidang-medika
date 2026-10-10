"""Render the 2026-10-10 clinic update report as a black-and-white PDF.

Content mirrors docs/data/laporan-pembaruan-2026-10-10.md. Appendices 1 and 2
contain patient names, so the file is written to the user's Downloads folder and to
docs/data (gitignored) for the clinic, and is never committed.

Usage:
    python scripts/generate_laporan_pembaruan_20261010_pdf.py
"""

import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

BLACK = colors.HexColor("#000000")
BODY = colors.HexColor("#333333")
MUTED = colors.HexColor("#666666")
RULE = colors.HexColor("#D4D4D4")
FILL_LIGHT = colors.HexColor("#F5F5F5")
WHITE = colors.HexColor("#FFFFFF")

DOC_TITLE = "Laporan Pembaruan Sistem Aplikasi Klinik"
DOC_SUBTITLE = "Klinik Pratama Cikidang Medika"
DOC_RUNNING = "Laporan Pembaruan Sistem - Klinik Pratama Cikidang Medika"

OUT_PATH = os.path.join("docs", "data", "Laporan_Pembaruan_Sistem_2026-10-10.pdf")
DOWNLOADS_NAME = "Laporan-Pembaruan-Sistem-Klinik-Cikidang-Medika-2026-10-10.pdf"


def output_paths():
    return [OUT_PATH, os.path.join(os.path.expanduser("~"), "Downloads", DOWNLOADS_NAME)]


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_decorations(page_count)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def _draw_decorations(self, page_count):
        self.saveState()
        self.setFillColor(MUTED)
        self.setStrokeColor(RULE)
        self.setLineWidth(0.5)
        if self._pageNumber > 1:
            self.line(1.8 * cm, 28.5 * cm, 19.2 * cm, 28.5 * cm)
            self.setFont("Helvetica", 7.5)
            self.drawString(1.8 * cm, 28.7 * cm, DOC_RUNNING)
        self.line(1.8 * cm, 1.6 * cm, 19.2 * cm, 1.6 * cm)
        self.setFont("Helvetica", 7.5)
        self.drawString(1.8 * cm, 1.2 * cm, "Klinik Pratama Cikidang Medika")
        self.drawRightString(19.2 * cm, 1.2 * cm, "Halaman %d dari %d" % (self._pageNumber, page_count))
        self.restoreState()


S = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=BLACK, spaceAfter=2),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=10.5, leading=14, textColor=MUTED, spaceAfter=8),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=BLACK, spaceBefore=10, spaceAfter=3, keepWithNext=True),
    "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=9.5, leading=13, textColor=BLACK, spaceBefore=6, spaceAfter=2, keepWithNext=True),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9, leading=13, textColor=BODY, alignment=TA_LEFT, spaceAfter=4),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=BODY),
    "cellhead": ParagraphStyle("cellhead", fontName="Helvetica-Bold", fontSize=8.5, leading=11.5, textColor=WHITE),
    "answer": ParagraphStyle("answer", fontName="Helvetica-Oblique", fontSize=8.5, leading=15, textColor=MUTED, spaceBefore=2, spaceAfter=5),
}


def h2(text):
    return [Spacer(1, 3), Paragraph(text, S["h2"]), HRFlowable(width="100%", thickness=0.5, color=RULE, spaceAfter=5)]


def body(text):
    return Paragraph(text, S["body"])


def bullets(items, numbered=False):
    flow = []
    for index, item in enumerate(items, start=1):
        prefix = "%d. " % index if numbered else "\u2022  "
        flow.append(Paragraph(prefix + item, S["body"]))
    return flow


def data_table(header, rows, widths):
    data = [[Paragraph(str(cell), S["cellhead"]) for cell in header]]
    for row in rows:
        data.append([Paragraph(str(cell), S["cell"]) for cell in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            style.append(("BACKGROUND", (0, row_index), (-1, row_index), FILL_LIGHT))
    table.setStyle(TableStyle(style))
    return table


def question(number, text):
    return KeepTogether([
        Paragraph("%d. %s" % (number, text), S["body"]),
        Paragraph("Jawaban: ____________________________________________________________________________", S["answer"]),
    ])


PAKET = [
    ("PKT-ISPA-DW", "Paket Terapi ISPA Dewasa", "3", "Rp 37.368"),
    ("PKT-BATUK-AN", "Paket Terapi Batuk Pilek Anak", "2", "Belum diisi"),
    ("PKT-INFEKSI-BAKTERI", "Paket Terapi Infeksi Bakteri", "2", "Rp 121.460"),
    ("PKT-DISPEPSIA", "Paket Terapi Dispepsia", "2", "Rp 38.225"),
    ("PKT-ASAM-LAMBUNG", "Paket Terapi Asam Lambung", "1", "Rp 99.000"),
    ("PKT-SUNTIK-NYERI", "Paket Suntik Nyeri dan Radang", "3", "Rp 33.953"),
    ("PKT-SUNTIK-MUAL", "Paket Suntik Mual dan Muntah", "3", "Rp 37.200"),
    ("PKT-NEBU", "Paket Terapi Nebulizer", "2", "Belum diisi"),
    ("PKT-INFUS", "Paket Terapi Infus", "2", "Belum diisi"),
    ("PKT-USG", "Paket Pemeriksaan USG", "1", "Belum diisi"),
]

REVIEW_ROWS = [
    (1933, "020200408", "nurhasanah", "020101037", "Nama cocok ke lebih dari satu pasien. Mohon dipastikan pasien yang benar."),
    (2087, "020200408", "nurhasanah", "020101037", "Nama cocok ke lebih dari satu pasien."),
    (2452, "020200408", "nurhasanah", "020101037", "Nama cocok ke lebih dari satu pasien."),
    (3011, "020200408", "nurhasanah", "020101037", "Nama cocok ke lebih dari satu pasien."),
    (3197, "020200408", "nurhasanah", "020101037", "Nama cocok ke lebih dari satu pasien."),
    (3608, "020200408", "nurhasanah", "020101037", "Nama cocok ke lebih dari satu pasien."),
    (6050, "021003068", "Anisa", "020203611", "Nama cocok ke lebih dari satu pasien."),
    (1700, "011001089", "Sukatna", "011001089", "Nama di kunjungan kosong atau beda dari berkas."),
    (1948, "020100557", "(kosong)", "020100557", "Nama di kunjungan kosong."),
    (2127, "020101305", "Nutjanah", "020101305", "Ejaan nama berbeda dari berkas."),
    (2323, "020201403", "(kosong)", "020201403", "Nama di kunjungan kosong."),
    (2657, "010201612", "Hanif fahri", "010201612", "Ejaan nama berbeda dari berkas."),
    (3563, "010201612", "Hanif fahri", "010201612", "Ejaan nama berbeda dari berkas."),
    (4328, "020302360", "Irmawati", "020302360", "Ejaan nama berbeda dari berkas."),
    (5264, "020902738", "Naurez", "020902738", "Ejaan nama berbeda dari berkas."),
    (5516, "010402856", "Bindin", "010402856", "Ejaan nama berbeda dari berkas."),
    (5559, "010201612", "Hanif fahri", "010201612", "Ejaan nama berbeda dari berkas."),
    (5702, "020302935", "Ntin", "020302935", "Ejaan nama berbeda dari berkas."),
]

SUNAT_ROWS = [
    ("010103728", "MUHAMMAD ALWI", "22/12/2023", "Cikidang"),
    ("010103729", "M. BILAL Azriky", "29/05/2022", "Cikidang"),
    ("010103730", "MUHAMMAD NIFTAHUL FAUZY", "25/4/2023", "Cikidang"),
    ("010103731", "ILHAM BAKTIAR", "5/9/2021", "Cikidang"),
    ("010103732", "MUHAMMAD KAMIL LUDIN", "30/07/2023", "Cikidang"),
    ("010103733", "RAFA MAULANA", "09/03/2022", "Cikidang"),
    ("010103734", "MUHAMMAD RASYA ALFATIH", "12/12/2022", "Cikidang"),
    ("010103735", "MUHAMMAD RAKA SAPUTRA", "19/01/2023", "Cikidang"),
    ("010103736", "RIVKI RIYANDI", "22/06/2022", "Cikidang"),
    ("010103737", "RAFLI RADILA AKBAR", "17/07/2015", "Cikidang"),
    ("010103738", "RAFA SAPUTRA", "21/10/2017", "Cikidang"),
    ("010103739", "MUHAMMAD RAFA AZKA", "9/10/2020", "Cikidang"),
    ("010103740", "ATHARRAZKA FATHAN", "15/11/2023", "Cikidang"),
    ("010203729", "ADAM WARDIANSYAH", "28/05/2024", "Pangkalan"),
    ("010203730", "MUHAMMAD HUSAIN AL FARIZI", "25/2/2023", "Pangkalan"),
    ("010203731", "MUHAMMAD SYAKIR SULAIMAN", "30/08/2022", "Pangkalan"),
    ("010203732", "MUHAMMAD AZKA SAPUTRA", "10/05/2023", "Pangkalan"),
    ("010203733", "ALFIANSYAH", "09/10/2023", "Pangkalan"),
    ("010701749", "MUHAMMAD RAMDANI ADITIA", "16/03/2023", "Sampora"),
    ("011303727", "MUHAMMAD ILYAS ABDUSOBUR", "18/8/2022", "Pelabuhan Ratu"),
    ("011303728", "RAZAN AL FATIH", "1/6/2023", "Cicareuh"),
    ("011303729", "NABIHAN KHALIQ", "24/10/2013", "Parungkuda"),
    ("011303730", "NAUFAL ALFARIQI", "07/06/2016", "Parungkuda"),
]


def build(out_path):
    doc = SimpleDocTemplate(
        out_path, pagesize=A4, leftMargin=1.8 * cm, rightMargin=1.8 * cm,
        topMargin=2.0 * cm, bottomMargin=2.0 * cm, title=DOC_TITLE,
        author="Pengembang Sistem Klinik Cikidang Medika",
    )

    story = []
    story.append(Paragraph(DOC_TITLE, S["title"]))
    story.append(Paragraph(DOC_SUBTITLE, S["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.0, color=BLACK, spaceAfter=6))
    story.append(data_table(
        ["Keterangan", "Isi"],
        [
            ["Tanggal", "10 Oktober 2026"],
            ["Untuk", "dr. Ovan, dr. Neneng, dan Staf Klinik Pratama Cikidang Medika"],
            ["Dari", "Pengembang Sistem"],
            ["Isi Laporan", "Penataan No RM, Paket Terapi, Batal Antrean, Laporan Puskesmas & Register KB, Fitur Bebas Biaya (Free 100%), Penyempurnaan Sistem, dan Ketentuan Layanan Pasca Go-Live"],
            ["Perlu Tindakan", "Pemeriksaan dan konfirmasi dokter pada Bagian I"],
        ],
        [3.4 * cm, 14.0 * cm],
    ))

    story += h2("Ringkasan Singkat Pembaruan")
    story += bullets([
        "Nomor RM pasien di aplikasi telah diselaraskan penuh dengan berkas resmi DATAPASIEN dan REKAMMEDIS (3.750 pasien aktif, tanpa nomor ganda).",
        "Fitur Paket Terapi telah terpasang dan terintegrasi ke formulir rekam medis dokter serta meja kasir.",
        "Fitur Pembatalan Antrean Pasien (F-014) telah aktif: melayani pencatatan alasan batal dan opsi pemulihan antrean.",
        "Format Laporan Puskesmas & Register KB (F-015) disesuaikan penuh untuk pelaporan bulanan ke PKM (filter bulan, Tanggal, No RM, Desa, Triple Eliminasi, ANC GPA, dan PTM Hipertensi & Diabetes). Kolom Jenis KB dan Kunjungan Kembali tetap dipertahankan penuh pada tabel serta ekspor Excel, disertai pemulihan 31 data akseptor KB historis.",
        "Fitur Pembebasan Biaya Pasien Umum / Free 100% (F-016): Tombol pintas 1-klik untuk dokter & kasir, pilihan alasan bebas biaya, kuitansi diskon 100%, serta pembukuan keuangan bersih tanpa saldo tunai semu.",
        "Penyempurnaan Formulir Pendaftaran: Sinkronisasi sapaan (Nn./Ny.) dan jenis kelamin perempuan tanpa kendala reset.",
        "Ketentuan Layanan Pasca Go-Live: Jaminan bebas biaya perbaikan bug, dan kebijakan penambahan fitur baru berbayar (Rp 150.000 per fitur) setelah sistem aktif digunakan untuk operasional harian klinik.",
        "Seluruh data riil klinik dicadangkan menyeluruh sebelum pembaruan diterapkan ke sistem produksi.",
    ], numbered=True)

    story += h2("Bagian A. Nomor RM Pasien Sudah Dirapikan")
    story.append(body(
        "<b>Masalah sebelumnya:</b> Nomor RM beberapa pasien tidak sama dengan berkas DATAPASIEN, "
        "sehingga muncul nomor ganda dan nama bertukar. Contoh yang dokter temukan: Septiani auleria "
        "dan Reny nurdiany di Desa Nangka Koneng. Septiani muncul dua kali, dan nomor RM Reny bergeser "
        "menjadi 020802710."
    ))
    story.append(body(
        "<b>Yang kami lakukan:</b> Aplikasi dibangun ulang agar sumber nomor RM adalah berkas "
        "DATAPASIEN, dan daftar kunjungan diambil dari REKAMMEDIS. Dicoba dulu di lingkungan uji, baru "
        "diterapkan ke data produksi, dan seluruh data produksi dicadangkan lebih dahulu."
    ))
    story.append(Spacer(1, 2))
    story.append(data_table(
        ["Keterangan", "Sebelum", "Sesudah"],
        [
            ["Jumlah pasien", "4.703", "3.750"],
            ["Jumlah kunjungan", "7.672", "7.827"],
            ["Nomor RM ganda (dua pasien satu nomor)", "ada", "0"],
            ["Pasien dengan nomor RM tidak seragam", "849 kelompok", "43 kelompok"],
            ["Kunjungan tanpa pasien", "ada", "0"],
        ],
        [8.0 * cm, 4.7 * cm, 4.7 * cm],
    ))
    story.append(Spacer(1, 3))
    story.append(body(
        "Jumlah pasien turun dari 4.703 ke 3.750 karena catatan ganda (satu orang tercatat dua kali) "
        "digabung menjadi satu, sesuai berkas DATAPASIEN. Tidak ada data orang yang hilang; yang hilang "
        "hanyalah salinan duplikatnya."
    ))
    story.append(Spacer(1, 2))
    story.append(data_table(
        ["Nomor RM", "Nama", "Jumlah Kunjungan"],
        [["020802708", "Septiani auleria", "3"], ["020802709", "Reny nurdiany", "6"]],
        [4.2 * cm, 8.7 * cm, 4.5 * cm],
    ))
    story.append(Spacer(1, 2))
    story.append(body("Nomor 020802710 sudah dinonaktifkan. Kedua pasien kini sama persis dengan berkas yang dokter kirim."))

    story += h2("Bagian B. Fitur Baru: Paket Terapi")
    story.append(body(
        "Paket Terapi menyatukan tindakan dan obat yang sering dipakai klinik menjadi satu paket. Saat "
        "pasien dilayani, staf cukup memilih paket, dan seluruh rinciannya langsung masuk ke tagihan "
        "kunjungan. Tindakan, obat, dan harga total ikut terisi otomatis."
    ))
    story.append(Paragraph("Cara memakai paket saat pembayaran / pemeriksaan:", S["body"]))
    story += bullets([
        "Buka menu Loket & Kasir atau Rekam Medis, lalu pilih pasien.",
        "Tekan tombol Terapkan Paket Terapi.",
        "Pilih paket, periksa rincian item dan totalnya, lalu konfirmasi.",
    ], numbered=True)
    story.append(Spacer(1, 2))
    story.append(body(
        "Sepuluh paket awal dibuat dari pola terapi yang paling sering muncul di rekam medis. Harga obat "
        "mengacu daftar harga obat klinik. Paket yang harganya masih kosong, berarti tarif tindakannya belum diisi "
        "dan dapat disesuaikan langsung melalui menu Paket Terapi."
    ))
    story.append(data_table(
        ["Kode", "Nama Paket", "Item", "Harga Total"],
        [list(row) for row in PAKET],
        [4.2 * cm, 7.3 * cm, 1.4 * cm, 4.5 * cm],
    ))
    story.append(Spacer(1, 3))
    story.append(body(
        "Paket ini dipasang dalam status nonaktif dan dapat diaktifkan melalui menu Paket Terapi setelah "
        "tarifnya ditinjau oleh pihak manajemen klinik."
    ))

    story += h2("Bagian C. Fitur Pembatalan Antrean Pasien (F-014)")
    story.append(body(
        "<b>Kebutuhan operasional:</b> Sering terjadi pasien yang sudah mendaftar di loket terpaksa membatalkan "
        "pemeriksaan karena urusan mendadak, waktu tunggu, atau salah input. Sebelumnya antrean tersebut menggantung."
    ))
    story += bullets([
        "<b>Tombol Batalkan Antrean:</b> Disediakan tombol batalkan pada antrean loket pendaftaran dan antrean dokter.",
        "<b>Pencatatan Alasan Pembatalan:</b> Dialog pilihan alasan terstruktur (pulang sendiri, waktu tunggu, salah input loket, atau alasan lainnya).",
        "<b>Keamanan Data (Soft Cancel):</b> Data antrean tidak dihapus permanen, melainkan berstatus Dibatalkan demi menjaga akuntabilitas nomor urut antrean.",
        "<b>Opsi Pemulihan (Restore):</b> Staf dapat memulihkan kembali antrean ke antrean aktif jika pasien ternyata kembali atau terjadi salah pencet.",
    ])

    story += h2("Bagian D. Penyesuaian Format Laporan Puskesmas & Register KB (F-015)")
    story.append(body(
        "Menindaklanjuti arahan dokter untuk pelaporan bulanan ke Puskesmas Cikidang (PKM) per akhir bulan, "
        "sistem register program kesehatan telah disempurnakan secara menyeluruh:"
    ))
    story += bullets([
        "<b>Penyaring Periode Bulanan:</b> Pilihan filter bulan (contoh: Oktober 2026) pada menu Program Khusus dan Laporan Puskesmas, menyajikan data dan unduhan Excel yang otomatis teragregasi per bulan pelaporan.",
        "<b>Kolom Dasar Lengkap:</b> Setiap lembar laporan wajib memuat Tanggal Periksa, Nomor Rekam Medis (No RM), dan Desa/Alamat Domisili Pasien.",
        "<b>Register Triple Eliminasi Bumil:</b> Parameter hasil laboratorium mandiri untuk HBsAg, HIV, dan Sifilis (Non-Reaktif / Reaktif), dilengkapi tombol pintas 'Set Semua Non-Reaktif'.",
        "<b>Register ANC (Pemeriksaan Kehamilan):</b> Ditambahkan kotak isian manual notasi GPA bumil (contoh: G3P2A0 untuk Gravida 3, Para 2, Abortus 0).",
        "<b>Register PTM (Penyakit Tidak Menular):</b> Penambahan sub-kategori spesifik untuk Hipertensi (kardiovaskular) dan Diabetes Melitus sesuai format baku Puskesmas.",
        "<b>Pemeliharaan Register KB (Keluarga Berencana):</b> Kolom Jenis KB dan Kunjungan Kembali dipastikan tetap dipertahankan penuh pada tampilan tabel serta berkas ekspor Excel Puskesmas. Sebanyak 31 data akseptor KB historis dari rekam medis klinik telah disinkronkan kembali ke database sistem.",
        "<b>Format Unduhan Excel Rapi:</b> Berkas Excel otomatis terbagi ke lembar kerja (sheet) per program dengan format judul berstempel bulan yang siap dikirim ke Puskesmas.",
    ])

    story += h2("Bagian E. Fitur Baru: Pembebasan Biaya Pasien Umum / Free 100% (F-016)")
    story.append(body(
        "<b>Latar belakang operasional:</b> Dalam pelayanan sehari-hari, dokter dan kasir kerap membebaskan biaya "
        "untuk pasien umum tertentu (misalnya kontrol pasca tindakan, keluarga staf, bakti sosial, dhuafa, atau diskon khusus). "
        "Sebelumnya, pengaturan biaya Rp 0 oleh dokter masih memunculkan alur berbayar di kasir."
    ))
    story += bullets([
        "<b>Tombol Pintas di Ruang Periksa Dokter:</b> Tepat di samping kolom Biaya Periksa pada modul rekam medis, disediakan tombol chip [ Free 100% / Gratis ]. Sekali klik, tarif periksa dan tindakan langsung otomatis diatur menjadi Rp 0.",
        "<b>Tombol Bebaskan Biaya di Meja Kasir:</b> Pada modal pembayaran kasir, tersedia tombol [ Bebaskan Biaya (Rp 0) ] disertai pilihan alasan terstandar (Kontrol Pasca Tindakan, Keluarga Dokter/Staf, Bakti Sosial/Dhuafa, Instruksi Dokter, atau alasan lainnya).",
        "<b>Kuitansi Resmi Bebas Biaya:</b> Lembar kuitansi pembayaran mencantumkan keterangan resmi 'Lunas (Bebas Biaya / Diskon 100%)' lengkap dengan alasan pembebasan, sehingga pasien menerima bukti administrasi yang jelas dan rapi.",
        "<b>Pembukuan Keuangan Bersih (Zero Phantom Cash):</b> Transaksi bebas biaya tidak mencatatkan uang masuk semu ke Buku Kas klinik, menjaga laporan keuangan tetap akurat dan seimbang untuk diaudit oleh Owner.",
    ])

    story += h2("Bagian F. Perbaikan & Penyempurnaan Aplikasi Lainnya")
    story += bullets([
        "Pencarian pasien di menu Loket & Kasir sekarang menjangkau seluruh 3.750 pasien (tidak lagi terbatas pada 300 data terbaru).",
        "Daftar pasien kini dibagi bertahap per halaman (paginasi), sehingga penelusuran data tetap cepat dan ringan.",
        "Tombol Daftarkan Kunjungan dari kartu cepat pasien langsung membuka formulir kunjungan baru secara instan.",
        "Halaman pengelolaan Paket Terapi untuk membuat, mengubah tarif, mengaktifkan, dan menonaktifkan paket.",
        "Perbaikan Formulir Pendaftaran Pasien Baru: Pilihan sapaan (Nn. atau Ny.) dan jenis kelamin perempuan kini otomatis tersinkronisasi tanpa kendala reset formulir.",
    ])

    story += h2("Bagian G. Ketentuan Layanan Pemeliharaan & Pengembangan Pasca Go-Live")
    story.append(body(
        "Tahap implementasi awal, migrasi ribuan data historis, serta penyesuaian kebutuhan khusus klinik telah "
        "kami selesaikan penuh. Seiring dengan masuknya aplikasi ke tahap <b>penggunaan operasional harian secara aktif (go-live)</b>, "
        "berikut adalah ketentuan pemeliharaan dan pengembangan lanjutan yang disepakati:"
    ))
    story += bullets([
        "<b>Jaminan Stabilitas Sistem (Bebas Biaya Perbaikan Bug):</b> Seluruh modul yang telah diserahkan (pendaftaran, rekam medis, kasir, buku kas, paket terapi, batal antrean, fitur bebas biaya, dan laporan Puskesmas) dijamin beroperasi dengan baik. Apabila di kemudian hari ditemukan kendala teknis atau eror program (bug) pada fitur yang ada, perbaikan tetap menjadi tanggung jawab pengembang tanpa biaya tambahan (gratis).",
        "<b>Kebijakan Pembaruan Fitur Baru (Pembaruan Berbayar):</b> Setelah sistem aktif digunakan untuk operasional harian di klinik, masa pembaruan fitur gratis telah berakhir. Permintaan penambahan fitur baru, pembuatan modul baru, atau perubahan alur di luar ruang lingkup yang telah disepakati dikenakan biaya pengembangan standar sebesar Rp 150.000,- per fitur (atau disesuaikan secara transparan apabila memiliki kompleksitas teknis yang lebih luas).",
        "<b>Prosedur Pengajuan Fitur Baru:</b> Pihak klinik dapat menghimpun daftar kebutuhan fitur baru, kemudian menyampaikannya kepada pengembang untuk ditinjau estimasi dan kesiapan teknisnya sebelum dikerjakan.",
    ], numbered=True)
    story.append(Spacer(1, 2))
    story.append(body(
        "<i>Ketentuan ini bertujuan menjaga kepastian batasan kerja, menjamin fokus perawatan sistem yang prima, "
        "serta memastikan keberlanjutan dukungan teknis profesional jangka panjang bagi Klinik Cikidang Medika.</i>"
    ))

    story += h2("Bagian H. Informasi Penting untuk Dibaca Dokter")
    story += bullets([
        "Nomor RM pasien baru ke depan mengikuti pola resmi klinik: jenis kelamin, desa, lalu nomor urut. Sistem menghitung nomornya secara otomatis.",
        "Ada 18 baris kunjungan lama yang perlu dipastikan karena nama pada kunjungan berbeda dari berkas DATAPASIEN (daftarnya di Lampiran 1). Ini hanya konfirmasi data lama, bukan kunjungan baru.",
        "Ada 23 anak sunat yang belum ada di berkas DATAPASIEN, sehingga sistem membuatkan nomor RM baru otomatis (daftarnya di Lampiran 2).",
        "Harga paket terapi masih berupa nilai acuan dan dapat disesuaikan manajemen sebelum diaktifkan.",
    ])

    story += h2("Bagian I. Pertanyaan & Konfirmasi Dokter")
    story.append(question(1, "Menu Paket Terapi sebaiknya hanya untuk Owner, atau dokter pemeriksa juga perlu akses mengelola paket?"))
    story.append(question(2, "Apakah tarif acuan paket terapi pada Bagian B sudah sesuai untuk diaktifkan di sistem kasir?"))
    story.append(question(3, "Terkait 18 baris kunjungan pada Lampiran 1, apakah cukup dikonfirmasi di lembar ini, atau dokter menghendaki berkas Excel terpisah?"))
    story.append(question(4, "Mohon konfirmasi nama dan nomor RM pada 23 anak pasien sunat di Lampiran 2."))
    story.append(question(5, "Bila ada pasien dalam daftar yang merupakan dua orang berbeda dengan nama yang sama, mohon ditandai agar nomor RM tetap dipisahkan."))

    story += h2("Bagian J. Langkah Berikutnya")
    story += bullets([
        "Dokter meninjau paket terapi dan memberikan jawaban konfirmasi pada Bagian I.",
        "Pengembang mengaktifkan paket terapi yang telah disetujui pihak klinik.",
        "Pengembang menindaklanjuti catatan konfirmasi dari Lampiran 1 dan Lampiran 2.",
        "Sistem mulai dijalankan secara penuh untuk melayani operasional harian klinik.",
    ], numbered=True)

    story += h2("Lampiran 1. Daftar 18 Kunjungan yang Perlu Dipastikan")
    story.append(body(
        "Nomor baris mengacu pada berkas REKAMMEDIS yang dokter kirimkan. Kolom terakhir menjelaskan catatan pemeriksaannya."
    ))
    story.append(data_table(
        ["Baris", "No RM Kunjungan", "Nama Kunjungan", "No RM Hasil", "Catatan Verifikasi"],
        [[str(r[0]), r[1], r[2], r[3], r[4]] for r in REVIEW_ROWS],
        [1.3 * cm, 2.7 * cm, 3.2 * cm, 2.7 * cm, 7.5 * cm],
    ))

    story += h2("Lampiran 2. Daftar 23 Pasien Sunat yang Dibuatkan Nomor Baru")
    story.append(body(
        "Pasien berikut tercatat pada berkas tindakan sunat tetapi belum terdaftar di berkas DATAPASIEN, "
        "sehingga sistem membuatkan nomor RM baru otomatis. Mohon konfirmasi kesesuaiannya."
    ))
    story.append(data_table(
        ["Nomor RM", "Nama Pasien", "Tanggal Lahir", "Desa"],
        [list(r) for r in SUNAT_ROWS],
        [3.0 * cm, 7.0 * cm, 2.8 * cm, 4.6 * cm],
    ))

    story += h2("Lampiran 3. Keterangan Istilah Teknis")
    story.append(data_table(
        ["Istilah", "Penjelasan Sederhana"],
        [
            ["Nomor RM", "Nomor rekam medis resmi (9 digit), kode unik pengenal pasien di klinik"],
            ["Data Produksi", "Sistem utama yang digunakan aktif oleh staf klinik setiap hari"],
            ["Lingkungan Uji", "Salinan sistem untuk mencoba fitur pembaruan tanpa menyentuh data asli"],
            ["Pencadangan (Backup)", "Salinan data yang disimpan aman untuk berjaga-jaga bila diperlukan"],
            ["Paket Terapi", "Kombinasi tindakan medis dan obat yang diberi satu nama dan satu tarif"],
            ["Soft Cancel", "Pembatalan antrean tanpa menghapus data agar riwayat register tetap rapi"],
            ["Triple Eliminasi", "Program skrining bumil Kemenkes meliputi HBsAg, HIV, dan Sifilis"],
            ["ANC & GPA", "Pemeriksaan kehamilan dengan notasi Gravida (hamil), Para (lahir), Abortus (keguguran)"],
            ["Free 100% / Bebas Biaya", "Pembebasan biaya periksa & tindakan untuk kontrol pasca tindakan atau keluarga staf tanpa kas semu"],
        ],
        [3.8 * cm, 13.6 * cm],
    ))

    story += h2("Catatan Teknis & Kerahasiaan")
    story += bullets([
        "Seluruh data produksi dicadangkan sebelum setiap perubahan diterapkan ke sistem.",
        "Data kunjungan uji coba yang sempat tersimpan selama pengujian telah dibersihkan sepenuhnya.",
        "Dokumen ini memuat nama pasien pada Lampiran 1 dan Lampiran 2 khusus untuk validasi internal klinik dan dilarang disebarluaskan ke pihak luar.",
    ])

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF dibuat:", out_path)


if __name__ == "__main__":
    for path in output_paths():
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        build(path)
