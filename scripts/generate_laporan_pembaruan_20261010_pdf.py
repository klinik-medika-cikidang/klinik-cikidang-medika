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
            self.line(1.5 * cm, 28.6 * cm, 19.5 * cm, 28.6 * cm)
            self.setFont("Helvetica", 7.5)
            self.drawString(1.5 * cm, 28.8 * cm, DOC_RUNNING)
        self.line(1.5 * cm, 1.6 * cm, 19.5 * cm, 1.6 * cm)
        self.setFont("Helvetica", 7.5)
        self.drawString(1.5 * cm, 1.2 * cm, "Klinik Pratama Cikidang Medika")
        self.drawRightString(19.5 * cm, 1.2 * cm, "Halaman %d dari %d" % (self._pageNumber, page_count))
        self.restoreState()


S = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=BLACK, spaceAfter=2),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=11, leading=15, textColor=MUTED, spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=BLACK, spaceBefore=12, spaceAfter=5),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=BODY, alignment=TA_LEFT, spaceAfter=4),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=8.6, leading=11.5, textColor=BODY),
    "cellhead": ParagraphStyle("cellhead", fontName="Helvetica-Bold", fontSize=8.6, leading=11.5, textColor=WHITE),
    "answer": ParagraphStyle("answer", fontName="Helvetica-Oblique", fontSize=9, leading=16, textColor=MUTED, spaceBefore=2, spaceAfter=6),
}


def h2(text):
    return [Spacer(1, 2), Paragraph(text, S["h2"]), HRFlowable(width="100%", thickness=0.5, color=RULE, spaceAfter=6)]


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
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
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
        Paragraph("Jawaban: ______________________________________________________", S["answer"]),
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
        author="Pengembang Klinik Cikidang Medika",
    )

    story = []
    story.append(Paragraph(DOC_TITLE, S["title"]))
    story.append(Paragraph(DOC_SUBTITLE, S["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.0, color=BLACK, spaceAfter=8))
    story.append(data_table(
        ["Keterangan", "Isi"],
        [
            ["Tanggal", "10 Oktober 2026"],
            ["Untuk", "dr. Ovan, dr. Neneng, dan staf klinik"],
            ["Dari", "Pengembang"],
            ["Isi", "Perbaikan data No RM, fitur Paket Terapi, dan perbaikan aplikasi"],
            ["Perlu tindakan", "Ada pertanyaan untuk dokter pada Bagian E"],
        ],
        [3.4 * cm, 13.4 * cm],
    ))

    story += h2("Ringkasan Singkat")
    story += bullets([
        "Nomor RM pasien di aplikasi sudah dirapikan seluruhnya dan sekarang mengikuti berkas "
        "DATAPASIEN dan REKAMMEDIS yang dokter perbarui.",
        "Fitur baru Paket Terapi sudah dipasang. Sepuluh paket awal tersedia dan siap ditinjau.",
        "Pencarian pasien di menu Loket & Kasir sekarang menjangkau seluruh data pasien.",
        "Data lama tidak ada yang hilang. Semua data produksi dicadangkan sebelum perubahan.",
    ], numbered=True)

    story += h2("Bagian A. Nomor RM Pasien Sudah Dirapikan")
    story.append(body(
        "<b>Masalah sebelumnya.</b> Nomor RM beberapa pasien tidak sama dengan berkas DATAPASIEN, "
        "sehingga muncul nomor ganda dan nama bertukar. Contoh yang dokter temukan: Septiani auleria "
        "dan Reny nurdiany di Desa Nangka Koneng. Septiani muncul dua kali, dan nomor RM Reny bergeser "
        "menjadi 020802710."
    ))
    story.append(body(
        "<b>Yang kami lakukan.</b> Aplikasi dibangun ulang agar sumber nomor RM adalah berkas "
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
        [7.6 * cm, 4.6 * cm, 4.6 * cm],
    ))
    story.append(Spacer(1, 4))
    story.append(body(
        "Jumlah pasien turun dari 4.703 ke 3.750 karena catatan ganda (satu orang tercatat dua kali) "
        "digabung menjadi satu, sesuai berkas DATAPASIEN. Tidak ada orang yang hilang; yang hilang "
        "hanyalah salinan gandanya."
    ))
    story.append(Spacer(1, 2))
    story.append(data_table(
        ["Nomor RM", "Nama", "Jumlah kunjungan"],
        [["020802708", "Septiani auleria", "3"], ["020802709", "Reny nurdiany", "6"]],
        [4.0 * cm, 8.4 * cm, 4.4 * cm],
    ))
    story.append(Spacer(1, 3))
    story.append(body("Nomor 020802710 sudah tidak dipakai lagi. Kedua pasien kini sama persis dengan berkas yang dokter kirim."))

    story += h2("Bagian B. Fitur Baru: Paket Terapi")
    story.append(body(
        "Paket Terapi menyatukan tindakan dan obat yang sering dipakai klinik menjadi satu paket. Saat "
        "pasien dilayani, staf cukup memilih paket, dan seluruh rinciannya langsung masuk ke tagihan "
        "kunjungan. Tindakan, obat, dan harga total ikut terisi otomatis."
    ))
    story.append(Paragraph("Cara memakai paket saat pembayaran:", S["body"]))
    story += bullets([
        "Buka menu Loket & Kasir, lalu pilih pasien.",
        "Tekan tombol Terapkan Paket Terapi.",
        "Pilih paket, periksa rincian item dan totalnya, lalu konfirmasi.",
    ], numbered=True)
    story.append(Spacer(1, 2))
    story.append(body(
        "Sepuluh paket awal dibuat dari pola terapi yang paling sering muncul di rekam medis. Harga obat "
        "mengacu daftar harga obat klinik. Paket yang harganya masih kosong, berarti tarifnya belum diisi "
        "dan mohon disesuaikan."
    ))
    story.append(data_table(
        ["Kode", "Nama paket", "Item", "Harga total"],
        [list(row) for row in PAKET],
        [4.3 * cm, 7.0 * cm, 1.4 * cm, 4.1 * cm],
    ))
    story.append(Spacer(1, 4))
    story.append(body(
        "Catatan: paket tindakan seperti nebulizer, infus, dan USG belum punya tarif karena tarif "
        "tindakan tidak ada di berkas harga obat. Tarifnya diisi klinik melalui menu Paket Terapi."
    ))
    story.append(body(
        "Sepuluh paket ini dipasang dalam status nonaktif. Paket belum bisa dipilih di kasir sampai "
        "ditinjau harganya lalu diaktifkan. Menu Paket Terapi saat ini hanya tersedia untuk akun Owner. "
        "Pertanyaan soal peran ada di Bagian E."
    ))

    story += h2("Bagian C. Perbaikan Aplikasi")
    story += bullets([
        "Pencarian pasien di menu Loket & Kasir sekarang menjangkau seluruh 3.750 pasien. Sebelumnya "
        "pencarian hanya mencakup 300 pasien terbaru, sehingga pasien lama sulit ditemukan.",
        "Daftar pasien kini dibagi per halaman, sehingga bisa ditelusuri sampai pasien terakhir.",
        "Tombol Daftarkan Kunjungan dari kartu cepat pasien sekarang langsung membuka formulir pendaftaran.",
        "Halaman baru Paket Terapi untuk membuat, mengubah, menonaktifkan, dan menghapus paket.",
    ])

    story += h2("Bagian D. Informasi Penting untuk Dibaca Dokter")
    story += bullets([
        "Nomor RM pasien baru ke depan mengikuti pola resmi klinik: jenis kelamin, desa, lalu urutan. "
        "Aplikasi menghitung nomornya otomatis.",
        "Ada 18 baris kunjungan lama yang perlu dipastikan karena nama pada kunjungan berbeda dari berkas "
        "DATAPASIEN (daftarnya di Lampiran 1). Ini hanya perlu dipastikan, bukan kunjungan baru.",
        "Ada 23 anak sunat yang belum ada di berkas DATAPASIEN, sehingga aplikasi membuatkan nomor RM "
        "baru otomatis (daftarnya di Lampiran 2). Mohon dipastikan nama dan nomornya.",
        "Harga paket terapi masih berupa acuan dan perlu ditinjau sebelum dipakai menagih pasien.",
        "Seluruh data produksi dicadangkan sebelum perubahan, sehingga bisa dikembalikan bila ada kekeliruan.",
    ])

    story += h2("Bagian E. Pertanyaan untuk Dokter")
    story.append(question(1, "Menu Paket Terapi sebaiknya hanya untuk Owner, atau dokter juga perlu akses? Bila perlu, apakah dokter hanya melihat daftar, atau ikut mengelola paket?"))
    story.append(question(2, "Harga paket terapi ditetapkan siapa, dan apakah kami boleh mengaktifkan paket setelah harganya diisi dokter?"))
    story.append(question(3, "Mohon dipastikan 18 baris kunjungan pada Lampiran 1. Apakah cukup dikonfirmasi di sini, atau dokter ingin kami kirimkan daftarnya dalam bentuk Excel untuk dicentang?"))
    story.append(question(4, "Mohon dipastikan nama dan nomor RM pada 23 anak sunat di Lampiran 2."))
    story.append(question(5, "Bila ada pasien dalam daftar yang memang orang berbeda dengan nama yang sama, mohon ditandai, karena sistem tidak pernah menggabungkan dua orang secara otomatis."))

    story += h2("Bagian F. Langkah Berikutnya")
    story += bullets([
        "Dokter meninjau paket terapi dan menjawab pertanyaan pada Bagian E.",
        "Pengembang mengaktifkan paket terapi yang sudah disetujui.",
        "Pengembang menindaklanjuti koreksi dari Lampiran 1 dan Lampiran 2 sesuai jawaban dokter.",
        "Pemeriksaan tampilan pada ponsel, tablet, dan komputer dijadwalkan menyusul.",
    ], numbered=True)

    story += h2("Lampiran 1. Daftar 18 Kunjungan yang Perlu Dipastikan")
    story.append(body(
        "Nomor pada kolom pertama adalah nomor baris pada berkas REKAMMEDIS yang dokter kirim. Kolom "
        "terakhir menjelaskan alasannya."
    ))
    story.append(data_table(
        ["Baris", "No RM kunjungan", "Nama kunjungan", "No RM hasil", "Catatan"],
        [[str(r[0]), r[1], r[2], r[3], r[4]] for r in REVIEW_ROWS],
        [1.3 * cm, 2.6 * cm, 3.2 * cm, 2.6 * cm, 7.1 * cm],
    ))

    story += h2("Lampiran 2. Daftar 23 Anak Sunat yang Dibuatkan Nomor Baru")
    story.append(body(
        "Anak berikut tercatat pada berkas tindakan sunat tetapi belum ada di berkas DATAPASIEN, "
        "sehingga aplikasi membuatkan nomor RM baru. Mohon dipastikan nama dan nomornya."
    ))
    story.append(data_table(
        ["Nomor RM", "Nama", "Tanggal lahir", "Desa"],
        [list(r) for r in SUNAT_ROWS],
        [2.8 * cm, 6.8 * cm, 2.8 * cm, 4.4 * cm],
    ))

    story += h2("Lampiran 3. Keterangan Istilah")
    story.append(data_table(
        ["Istilah", "Arti"],
        [
            ["Nomor RM", "Nomor rekam medis, kode identitas pasien di klinik"],
            ["Data produksi", "Data asli yang dipakai klinik sehari-hari"],
            ["Lingkungan uji", "Salinan data untuk mencoba perubahan tanpa menyentuh data asli"],
            ["Pencadangan", "Salinan data yang disimpan untuk berjaga bila perlu dikembalikan"],
            ["Paket Terapi", "Sekumpulan tindakan dan obat yang diberi satu nama dan satu harga"],
        ],
        [3.6 * cm, 13.2 * cm],
    ))

    story += h2("Catatan Teknis")
    story += bullets([
        "Seluruh data produksi dicadangkan sebelum perubahan. Cadangan disimpan di luar aplikasi dan "
        "tidak dibagikan.",
        "Satu data kunjungan uji yang tidak sengaja tersimpan di aplikasi sudah dibersihkan.",
        "Dokumen ini memuat nama pasien pada Lampiran 1 dan Lampiran 2. Mohon dipakai hanya untuk "
        "keperluan validasi klinik dan tidak disebarkan ke luar.",
    ])

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF dibuat:", out_path)


if __name__ == "__main__":
    for path in output_paths():
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        build(path)
