"""Render the client confirmation document as a strictly black-and-white PDF.

Content mirrors docs/product/konfirmasi-update-2026-10-08.md. Only neutral
grayscale values are used, and every table header is solid black with white text.
No patient data appears in this document.

Usage:
    python scripts/generate_konfirmasi_update_pdf.py
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

# Grayscale only. A single hue would break the black-and-white requirement.
BLACK = colors.HexColor("#000000")
INK = colors.HexColor("#1A1A1A")
BODY = colors.HexColor("#333333")
MUTED = colors.HexColor("#666666")
RULE = colors.HexColor("#D4D4D4")
FILL_LIGHT = colors.HexColor("#F5F5F5")
FILL_MED = colors.HexColor("#E8E8E8")
WHITE = colors.HexColor("#FFFFFF")

DOC_TITLE = "Dokumen Konfirmasi Update Aplikasi"
DOC_SUBTITLE = "Klinik Pratama Cikidang Medika"
DOC_RUNNING = "Dokumen Konfirmasi Update - Klinik Pratama Cikidang Medika"

OUT_PATH = os.path.join("docs", "product", "konfirmasi-update-2026-10-08.pdf")
DOWNLOADS_NAME = "Konfirmasi-Update-Aplikasi-Klinik-Cikidang-Medika-2026-10-08.pdf"


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


def styles():
    return {
        "title": ParagraphStyle(
            "title", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=BLACK, spaceAfter=2
        ),
        "subtitle": ParagraphStyle(
            "subtitle", fontName="Helvetica", fontSize=11, leading=15, textColor=MUTED, spaceAfter=10
        ),
        "h2": ParagraphStyle(
            "h2", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=BLACK,
            spaceBefore=12, spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "body", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=BODY,
            alignment=TA_LEFT, spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "small", fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED
        ),
        "cell": ParagraphStyle(
            "cell", fontName="Helvetica", fontSize=8.8, leading=12, textColor=BODY
        ),
        "cellhead": ParagraphStyle(
            "cellhead", fontName="Helvetica-Bold", fontSize=8.8, leading=12, textColor=WHITE
        ),
    }


S = styles()


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
            ["Tanggal", "8 Oktober 2026"],
            ["Untuk", "dr. Ovan, dr. Neneng, dan staf klinik"],
            ["Dari", "Pengembang"],
            ["Status", "DRAFT untuk dikonfirmasi. Belum ada perubahan pada data produksi."],
            ["Versi", "3 (hitam putih, siap cetak)"],
        ],
        [3.2 * cm, 13.6 * cm],
    ))

    story += h2("1. Maksud Dokumen Ini")
    story.append(body(
        "Dokumen ini dibuat supaya Bapak/Ibu tahu persis apa yang sedang kami kerjakan pada aplikasi "
        "setelah notulensi revisi tanggal 8 Oktober 2026. Dokumen sengaja hitam putih dan ringkas agar "
        "mudah dibaca dan dicetak."
    ))

    story += h2("2. Ringkasan Singkat")
    story += bullets([
        "Data klinik terbaru sudah kami periksa dan pasang ke sistem pengujian.",
        "Keluhan 'No RM tidak sesuai dengan nama pasien' berasal dari berkas data yang lama. Klinik sudah "
        "memperbaiki berkasnya, dan hasilnya jauh lebih bersih.",
        "Kami menyusun rencana perubahan untuk empat hal, sebagian siap diuji, satu ditahan dulu.",
        "Belum ada satu pun perubahan yang dijalankan pada data produksi.",
    ], numbered=True)

    story += h2("3. Keputusan yang Sudah Disepakati")
    story.append(data_table(
        ["No", "Pertanyaan", "Keputusan"],
        [
            ["1", "Uji skema di staging", "Simpan, karena staging dipakai untuk uji coba lebih dulu"],
            ["2", "Satu dokumen rencana atau dipecah", "Dipecah per fitur"],
            ["3", "Kolom kategori program Umum", "Disetujui"],
            ["4", "Batas akses Dokter/Admin di buku kas", "Disetujui, dicatat untuk dikonfirmasi klinik"],
            ["5", "Fitur Paket Terapi", "Ditahan dulu, tetap direncanakan"],
            ["6", "Akses pemeriksaan database", "Sudah diperbarui dan berfungsi"],
        ],
        [1.0 * cm, 6.4 * cm, 9.4 * cm],
    ))

    story += h2("4. Hasil Pemeriksaan Data")
    story.append(body(
        "Data klinik lama dibandingkan dengan data terbaru yang dikirim pada 8 Oktober 2026."
    ))
    story.append(data_table(
        ["Pemeriksaan", "Data lama", "Data baru"],
        [
            ["Jumlah data pasien (master)", "3.669", "3.725"],
            ["Jumlah kunjungan (rekam medis)", "7.671", "7.817"],
            ["Nomor RM pada kunjungan yang formatnya tidak seragam", "1.619", "1"],
            ["Nomor RM kunjungan yang tidak ada di data pasien", "1.009", "0"],
            ["Nomor RM yang dipakai lebih dari satu nama (di kunjungan)", "76", "42"],
            ["Nama pada kunjungan yang tidak cocok dengan data pasien", "112", "33"],
            ["Nama pada kunjungan yang ejaannya berbeda dari data pasien", "58", "30"],
        ],
        [9.4 * cm, 3.4 * cm, 3.4 * cm],
    ))
    story.append(Spacer(1, 6))
    story.append(body(
        "Artinya: perbaikan yang dilakukan berhasil. Seluruh nomor RM pada kunjungan kini 9 digit dan "
        "semuanya cocok dengan data pasien. Setelah diproses, semua kunjungan berhasil dihubungkan ke "
        "pasien; 18 baris di antaranya perlu ditinjau karena nomornya cocok tetapi namanya perlu "
        "dipastikan. Daftar rinci (baris Excel, No RM, dan nama) ada di Lampiran Validasi Data."
    ))

    story += h2("5. Kondisi Sistem Saat Ini")
    story.append(data_table(
        ["Sistem", "Keterangan"],
        [
            ["Staging (lingkungan uji)", "Berisi salinan data, dipakai untuk mencoba perubahan lebih dulu"],
            ["Produksi (aplikasi yang dipakai klinik)", "Aktif dipakai. Ada 1 kunjungan baru pada 8 Oktober 2026"],
        ],
        [6.4 * cm, 9.8 * cm],
    ))
    story.append(Spacer(1, 6))
    story.append(body(
        "Karena produksi sudah mulai dipakai, setiap perubahan harus dicadangkan lebih dulu dan diuji "
        "di staging. Data baru tidak boleh hilang. Data terkoreksi sudah siap di staging untuk "
        "Bapak/Ibu validasi."
    ))

    story += h2("6. Perubahan yang Direncanakan")
    story.append(Paragraph("F-010 Perbaikan No RM dan Nama Pasien", S["body"]))
    story += bullets([
        "Data pasien dan nomor RM diambil dari berkas DATA (master), bukan dari catatan kunjungan.",
        "Setiap kunjungan dihubungkan ke pasien yang benar, dan setiap keputusan dicatat serta dapat diperiksa.",
        "Tidak ada lagi dua orang berbeda yang tercampur menjadi satu.",
    ])
    story.append(Spacer(1, 4))
    story.append(Paragraph("F-011 Hak Akses dan Alur Kategorisasi", S["body"]))
    story += bullets([
        "Dokter/Admin dapat bekerja dari pendaftaran, pemeriksaan, tindakan, pelunasan, sampai pencatatan "
        "pendapatan tambahan dan pengeluaran medis maupun non medis.",
        "Dokter/Admin tidak dapat melihat dashboard dan pemantauan biaya.",
        "Owner tetap dapat melihat seluruh menu, data, transaksi, laporan, dan dashboard.",
        "Kategori program kesehatan dan agenda observasi dipilih di langkah terakhir, setelah dokter selesai "
        "memeriksa. Pasien non-program tetap berkategori Umum.",
        "Triple Eliminasi berarti ANC ditambah pemeriksaan lab HIV, HBsAg, dan Sipilis.",
        "Nama menu Pemantauan Pos Rawat diganti menjadi Observasi.",
    ])
    story.append(Spacer(1, 4))
    story.append(Paragraph("F-013 Surat Keterangan Sakit", S["body"]))
    story += bullets([
        "Ditambahkan kolom alamat tambahan yang dapat diedit pada surat.",
        "Kolom ini opsional dan hanya tercetak bila diisi.",
    ])
    story.append(Spacer(1, 4))
    story.append(Paragraph("F-012 Paket Terapi (DITAHAN)", S["body"]))
    story += bullets([
        "Fitur ini direncanakan dan akan dikerjakan, tetapi ditahan dulu untuk sementara waktu.",
        "Kami fokus menyelesaikan perbaikan data dan fitur lain lebih dulu.",
        "Tidak ada pekerjaan yang dilakukan untuk fitur ini saat ini.",
    ])

    story += h2("7. Yang Perlu Dikonfirmasi Klinik")
    story.append(data_table(
        ["No", "Pertanyaan", "Menghambat?"],
        [
            ["1", "Ada 18 baris kunjungan yang perlu ditinjau (nomor cocok, nama perlu dipastikan). Rincian barisnya ada di Lampiran Validasi Data.", "Tidak"],
            ["2", "Ada 26 baris kunjungan lama tanpa tanggal periksa. Rincian barisnya ada di Lampiran. Dilengkapi atau diabaikan?", "Tidak"],
            ["3", "Ada 23 anak sunat yang belum ada di data pasien; sistem membuatkan nomor otomatis. Rincian nama dan nomornya ada di Lampiran. Mohon dicek kebenarannya.", "Tidak"],
            ["4", "Di buku kas, batas pengertian transaksi dan pemantauan untuk Dokter/Admin?", "Ya"],
            ["5", "Apakah cukup kategori Umum, atau perlu kategori lain untuk pasien non-program?", "Tidak"],
            ["6", "Apakah istilah Observasi juga dipakai pada laporan Puskesmas?", "Tidak"],
            ["7", "Apakah fitur Paket Terapi tetap ditahan, atau mulai disiapkan?", "Ya"],
        ],
        [1.0 * cm, 13.0 * cm, 2.8 * cm],
    ))

    story += h2("8. Rencana Langkah Berikutnya")
    story += bullets([
        "Klinik membaca dokumen ini dan menjawab pertanyaan pada Bagian 7.",
        "Kami menyesuaikan rencana sesuai jawaban klinik.",
        "Kami mencoba perubahan di staging lebih dulu sampai aman.",
        "Kami mencadangkan data produksi sebelum menyentuh produksi.",
        "Baru setelah aman, perubahan diterapkan ke produksi.",
    ], numbered=True)

    story += h2("9. Yang Tidak Berubah")
    story += bullets([
        "Aplikasi tetap dapat dipakai seperti biasa.",
        "Data pasien dan kunjungan tidak dihapus.",
        "Tidak ada biaya atau gangguan layanan pada tahap ini.",
    ])

    story += h2("10. Keterangan Istilah")
    story.append(data_table(
        ["Istilah", "Arti"],
        [
            ["RM", "Rekam Medis, kode identitas pasien di klinik"],
            ["Staging", "Lingkungan uji, tempat mencoba perubahan tanpa menyentuh data asli"],
            ["Produksi", "Aplikasi asli yang dipakai klinik sehari-hari"],
            ["Spesifikasi", "Dokumen rencana tertulis sebelum perubahan dikerjakan"],
        ],
        [3.6 * cm, 13.2 * cm],
    ))

    story += h2("11. Lampiran Validasi Data")
    story.append(body(
        "Untuk memudahkan pemeriksaan, kami menyiapkan berkas terpisah bernama Lampiran Validasi Data "
        "(format PDF). Berkas ini memuat daftar baris yang perlu dicek langsung di Excel, lengkap dengan "
        "nomor baris, No RM, dan nama pasien."
    ))
    story.append(data_table(
        ["Bagian", "Isi", "Jumlah"],
        [
            ["A", "Baris kunjungan tanpa tanggal periksa", "26 baris"],
            ["B", "Baris kunjungan yang perlu ditinjau (nomor cocok, nama perlu dipastikan)", "18 baris"],
            ["C", "Anak sunat yang dibuatkan nomor baru", "23 pasien"],
        ],
        [1.6 * cm, 11.4 * cm, 4.4 * cm],
    ))
    story.append(Spacer(1, 6))
    story.append(body(
        "Cara pakai: buka berkas rekam medis di Excel, lalu lihat nomor baris (Baris Excel) pada setiap "
        "daftar. Baris 1 Excel adalah judul kolom, sehingga data pertama ada di baris 2. Karena lampiran "
        "memuat nama pasien dan No RM, berkas tersebut diserahkan terpisah kepada klinik dan tidak "
        "dilampirkan pada dokumen ini."
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
