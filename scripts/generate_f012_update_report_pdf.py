"""Render the F-012 Paket Terapi update report as a strictly black-and-white PDF.

Content mirrors docs/product/laporan-pembaruan-f012-paket-terapi-2026-10-09.md.
No patient data appears in this document.

Usage:
    python scripts/generate_f012_update_report_pdf.py
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
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Grayscale only, so the report prints cleanly on a clinic printer.
BLACK = colors.HexColor("#000000")
BODY = colors.HexColor("#333333")
MUTED = colors.HexColor("#666666")
RULE = colors.HexColor("#D4D4D4")
FILL_LIGHT = colors.HexColor("#F5F5F5")
WHITE = colors.HexColor("#FFFFFF")

DOC_TITLE = "Laporan Pembaruan Sistem: Paket Terapi (F-012)"
DOC_SUBTITLE = "Klinik Pratama Cikidang Medika"
DOC_RUNNING = "Laporan Pembaruan Sistem F-012 - Klinik Pratama Cikidang Medika"

OUT_PATH = os.path.join("docs", "product", "Laporan_Pembaruan_Sistem_F012.pdf")
DOWNLOADS_NAME = "Laporan-Pembaruan-Sistem-F012-Paket-Terapi-2026-10-09.pdf"


def output_paths():
    """Canonical copy in the repo plus a shareable copy in the user's Downloads folder."""
    return [OUT_PATH, os.path.join(os.path.expanduser("~"), "Downloads", DOWNLOADS_NAME)]


class NumberedCanvas(canvas.Canvas):
    """Plain running header and footer with page numbering on every page."""

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
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=BLACK, spaceAfter=2),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=11, leading=15, textColor=MUTED, spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=BLACK, spaceBefore=12, spaceAfter=5),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=BODY, alignment=TA_LEFT, spaceAfter=4),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=8.8, leading=12, textColor=BODY),
    "cellhead": ParagraphStyle("cellhead", fontName="Helvetica-Bold", fontSize=8.8, leading=12, textColor=WHITE),
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
    data = [[Paragraph(cell, S["cellhead"]) for cell in header]]
    for row in rows:
        data.append([Paragraph(cell, S["cell"]) for cell in row])

    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            style.append(("BACKGROUND", (0, row_index), (-1, row_index), FILL_LIGHT))
    table.setStyle(TableStyle(style))
    return table


def build(out_path):
    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title=DOC_TITLE,
        author="Pengembang Klinik Cikidang Medika",
    )

    story = []
    story.append(Paragraph(DOC_TITLE, S["title"]))
    story.append(Paragraph(DOC_SUBTITLE, S["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.0, color=BLACK, spaceAfter=8))
    story.append(data_table(
        ["Keterangan", "Isi"],
        [
            ["Tanggal", "9 Oktober 2026"],
            ["Untuk", "dr. Ovan, dr. Neneng, dan staf klinik"],
            ["Dari", "Pengembang"],
            ["Status", "Selesai diuji di staging. Belum ada perubahan pada data produksi."],
            ["Versi", "1 (hitam putih, siap cetak)"],
        ],
        [3.2 * cm, 13.6 * cm],
    ))

    story += h2("1. Ringkasan")
    story.append(body(
        "Fitur Paket Terapi menyatukan tindakan dan obat yang sering dipakai klinik menjadi satu paket. "
        "Saat pasien dilayani, staf cukup memilih paket dan seluruh rinciannya langsung masuk ke tagihan "
        "kunjungan. Fitur sudah dipasang dan diuji di staging, lengkap dengan sepuluh paket awal yang "
        "diambil dari data rekam medis dan daftar harga obat klinik."
    ))

    story += h2("2. Apa Itu Paket Terapi")
    story.append(body(
        "Paket Terapi adalah sekumpulan item yang diberi satu nama. Setiap item dapat berupa Tindakan, "
        "Obat, atau Lainnya, dengan jumlah dan harga satuan. Harga total paket dihitung otomatis dari "
        "seluruh item, sehingga tidak pernah diketik manual. Saat paket diterapkan ke sebuah kunjungan:"
    ))
    story += bullets([
        "Item bertipe Obat mengisi kolom terapi pada kunjungan.",
        "Item bertipe Tindakan mengisi kolom tindakan kunjungan.",
        "Nilai total paket ditambahkan ke pendapatan lain kunjungan, dan nama paket dicatat pada "
        "keterangan pendapatan.",
        "Biaya pemeriksaan tidak diubah, termasuk untuk pasien BPJS yang biaya pemeriksaannya nol.",
    ])
    story.append(Spacer(1, 4))
    story.append(body(
        "Setiap penerapan juga dicatat pada riwayat tersendiri. Riwayat ini bersifat catatan tetap: bila "
        "definisi paket diubah di kemudian hari, kunjungan yang sudah tercatat tidak ikut berubah."
    ))

    story += h2("3. Paket Awal yang Sudah Dipasang")
    story.append(body(
        "Sepuluh paket awal dibuat dari pola terapi yang paling sering muncul pada data rekam medis klinik. "
        "Harga obat mengacu pada daftar harga obat klinik. Paket yang harganya belum diisi berarti tarifnya "
        "masih kosong dan mohon disesuaikan."
    ))
    story.append(data_table(
        ["Kode", "Nama Paket", "Item", "Harga Total"],
        [
            ["PKT-ISPA-DW", "Paket Terapi ISPA Dewasa", "3", "Rp 37.368"],
            ["PKT-BATUK-AN", "Paket Terapi Batuk Pilek Anak", "2", "Belum diisi"],
            ["PKT-INFEKSI-BAKTERI", "Paket Terapi Infeksi Bakteri", "2", "Rp 121.460"],
            ["PKT-DISPEPSIA", "Paket Terapi Dispepsia", "2", "Rp 38.225"],
            ["PKT-ASAM-LAMBUNG", "Paket Terapi Asam Lambung", "1", "Rp 99.000"],
            ["PKT-SUNTIK-NYERI", "Paket Suntik Nyeri dan Radang", "3", "Rp 33.953"],
            ["PKT-SUNTIK-MUAL", "Paket Suntik Mual dan Muntah", "3", "Rp 37.200"],
            ["PKT-NEBU", "Paket Terapi Nebulizer", "2", "Belum diisi"],
            ["PKT-INFUS", "Paket Terapi Infus", "2", "Belum diisi"],
            ["PKT-USG", "Paket Pemeriksaan USG", "1", "Belum diisi"],
        ],
        [4.4 * cm, 7.0 * cm, 1.4 * cm, 4.0 * cm],
    ))
    story.append(Spacer(1, 4))
    story.append(body(
        "Catatan: paket tindakan seperti nebulizer, infus, dan USG belum memiliki tarif karena tarif "
        "tindakan tidak ada di berkas harga obat. Tarif tersebut diisi oleh klinik melalui menu Paket Terapi."
    ))

    story += h2("4. Yang Bisa Dilakukan")
    story.append(Paragraph("Pemilik (Owner) dapat:", S["body"]))
    story += bullets([
        "Membuat paket baru beserta kode, deskripsi, dan daftar itemnya.",
        "Mengubah nama, kode, deskripsi, dan setiap item, termasuk menambah, menghapus, dan mengatur "
        "urutan item.",
        "Menonaktifkan paket agar tidak muncul lagi sebagai pilihan, lalu mengaktifkannya kembali.",
        "Menghapus paket secara permanen hanya bila paket tersebut belum pernah diterapkan pada kunjungan "
        "mana pun.",
    ])
    story.append(Spacer(1, 4))
    story.append(body(
        "Pada halaman kasir, staf dapat menekan tombol Terapkan Paket Terapi, memilih paket aktif, melihat "
        "rincian item, lalu menerapkannya. Bila paket yang sama sudah pernah diterapkan pada kunjungan itu, "
        "sistem menampilkan peringatan dan meminta konfirmasi sebelum menambah lagi. Alur penagihan manual "
        "yang lama tetap berjalan seperti biasa."
    ))

    story += h2("5. Hasil Pengujian")
    story += bullets([
        "Pemeriksaan tipe TypeScript lulus.",
        "Uji otomatis lulus, termasuk perhitungan harga paket dan matriks hak akses.",
        "Proses build aplikasi lulus dan halaman Paket Terapi terbentuk.",
        "Di staging: ketiga tabel baru terbentuk, sepuluh paket dengan dua puluh satu item terpasang.",
        "Di staging: simulasi penerapan paket berhasil menambah pendapatan lain, mengisi keterangan, dan "
        "menulis riwayat, tanpa mengubah biaya pemeriksaan pasien BPJS.",
    ])

    story += h2("6. Batasan dan Catatan")
    story += bullets([
        "Untuk saat ini menu Paket Terapi hanya tersedia untuk Owner. Pertanyaan mengenai peran lain ada di "
        "Bagian 7.",
        "Harga paket awal mengacu pada daftar harga obat klinik dan tarif jual masih perlu disesuaikan.",
        "Paket yang sudah pernah diterapkan pada minimal satu kunjungan tidak dihapus permanen, hanya "
        "dinonaktifkan, agar rincian kunjungan lama tetap utuh.",
        "Belum ada perubahan pada proyek produksi.",
    ])

    story += h2("7. Pertanyaan untuk Dokter")
    story.append(data_table(
        ["No", "Pertanyaan"],
        [
            ["1", "Apakah menu Paket Terapi sebaiknya hanya untuk Owner, atau dokter juga perlu akses? "
                  "Bila perlu, apakah dokter hanya melihat daftar, atau ikut mengelola paket?"],
            ["2", "Apakah sepuluh paket awal sudah sesuai kebutuhan klinik, dan apakah harga serta nama "
                  "paketnya sudah tepat? Mohon ditandai paket yang perlu diubah."],
        ],
        [1.0 * cm, 15.8 * cm],
    ))

    story += h2("8. Langkah Berikutnya")
    story += bullets([
        "Klinik meninjau daftar paket, menyesuaikan harga, dan menjawab pertanyaan pada Bagian 7.",
        "Pengembang melakukan pemeriksaan tampilan pada staging (ponsel, tablet, dan komputer).",
        "Setelah disetujui, perubahan diterapkan ke produksi dengan pencadangan data lebih dahulu.",
    ], numbered=True)

    story += h2("9. Keterangan Istilah")
    story.append(data_table(
        ["Istilah", "Arti"],
        [
            ["Staging", "Lingkungan uji, tempat mencoba perubahan tanpa menyentuh data asli"],
            ["Produksi", "Aplikasi asli yang dipakai klinik sehari-hari"],
            ["Paket Terapi", "Sekumpulan tindakan dan obat yang diberi satu nama dan satu harga"],
            ["Owner", "Pemilik klinik yang memegang akses penuh"],
        ],
        [3.6 * cm, 13.2 * cm],
    ))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=RULE, spaceAfter=6))
    story.append(Paragraph("<b>Belum ada tindakan pada data produksi.</b>", S["body"]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF dibuat:", out_path)


if __name__ == "__main__":
    for path in output_paths():
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        build(path)
