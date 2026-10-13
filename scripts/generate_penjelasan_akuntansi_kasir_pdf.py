"""Render the standalone executive explanation PDF for cashier drawer reconciliation,
owner deposit accounting, and nominal precision for dr. Ade Sofyan (dr. Ovan).

Writes to docs/documentation and directly to user's Downloads folder.

Usage:
    python scripts/generate_penjelasan_akuntansi_kasir_pdf.py
"""

import os
import sys
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
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

BLACK = colors.HexColor("#0F172A")
INK = colors.HexColor("#1E293B")
BODY = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748B")
RULE = colors.HexColor("#CBD5E1")
TEAL_DARK = colors.HexColor("#0F766E")
TEAL_MED = colors.HexColor("#0D9488")
TEAL_LIGHT = colors.HexColor("#F0FDFA")
FILL_LIGHT = colors.HexColor("#F8FAFC")
FILL_MED = colors.HexColor("#F1F5F9")
EMERALD_BG = colors.HexColor("#ECFDF5")
EMERALD_TEXT = colors.HexColor("#065F46")
WHITE = colors.HexColor("#FFFFFF")
INDIGO_BG = colors.HexColor("#EEF2FF")
INDIGO_TEXT = colors.HexColor("#3730A3")
AMBER_BG = colors.HexColor("#FFFBEB")
AMBER_TEXT = colors.HexColor("#92400E")

DOC_TITLE = "Penjelasan Akuntansi Setoran Pemilik, Kas Kecil, & Rekonsiliasi Laci Kasir"
DOC_SUBTITLE = "Klinik Pratama Cikidang Medika"
DOC_RUNNING = "Akuntansi Setoran & Rekonsiliasi Laci Kasir \u2022 Klinik Pratama Cikidang Medika"

OUT_PATH = os.path.join("docs", "documentation", "Penjelasan-Akuntansi-Setoran-Dan-Rekonsiliasi-Laci-Kasir.pdf")
DOWNLOADS_NAME = "Penjelasan-Akuntansi-Setoran-Dan-Rekonsiliasi-Laci-Kasir.pdf"


def output_paths():
    paths = [OUT_PATH]
    user_downloads = os.path.join(os.path.expanduser("~"), "Downloads", DOWNLOADS_NAME)
    paths.append(user_downloads)
    return paths


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
            self.line(1.6 * cm, 28.5 * cm, 19.4 * cm, 28.5 * cm)
            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(TEAL_DARK)
            self.drawString(1.6 * cm, 28.7 * cm, DOC_RUNNING)
            self.setFillColor(MUTED)
        self.line(1.6 * cm, 1.35 * cm, 19.4 * cm, 1.35 * cm)
        self.setFont("Helvetica", 7.5)
        self.drawString(1.6 * cm, 1.0 * cm, "Klinik Pratama Cikidang Medika \u2022 Sistem Informasi Manajemen Klinik")
        self.drawRightString(19.4 * cm, 1.0 * cm, "Halaman %d dari %d" % (self._pageNumber, page_count))
        self.restoreState()


S = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=14.5, leading=18.5, textColor=BLACK, spaceAfter=2),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=9.2, leading=12.5, textColor=TEAL_DARK, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=10.2, leading=13.5, textColor=TEAL_DARK, spaceBefore=6, spaceAfter=2.5, keepWithNext=True),
    "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=8.6, leading=11.5, textColor=INK, spaceBefore=4, spaceAfter=1.5, keepWithNext=True),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=8.0, leading=11.4, textColor=BODY, alignment=TA_LEFT, spaceAfter=2.5),
    "body_bold": ParagraphStyle("body_bold", fontName="Helvetica-Bold", fontSize=8.0, leading=11.4, textColor=BLACK, spaceAfter=1.5),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=7.2, leading=10.0, textColor=MUTED),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=7.5, leading=10.4, textColor=BODY),
    "cell_bold": ParagraphStyle("cell_bold", fontName="Helvetica-Bold", fontSize=7.5, leading=10.4, textColor=BLACK),
    "cellhead": ParagraphStyle("cellhead", fontName="Helvetica-Bold", fontSize=7.5, leading=10.4, textColor=WHITE),
    "quote": ParagraphStyle("quote", fontName="Helvetica-Oblique", fontSize=7.8, leading=11.0, textColor=TEAL_DARK),
}


def h2(text):
    return [Spacer(1, 2.5), Paragraph(text, S["h2"]), HRFlowable(width="100%", thickness=0.8, color=TEAL_MED, spaceAfter=3.5)]


def callout(quote_text, bg_color=TEAL_LIGHT, border_color=TEAL_MED):
    t = Table([[Paragraph(quote_text, S["quote"])]], colWidths=[17.8 * cm])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg_color),
            ("BOX", (0, 0), (-1, -1), 0.8, border_color),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    return t


def build_story():
    story = []

    # Title Banner
    story.append(Paragraph(DOC_TITLE, S["title"]))
    story.append(Paragraph(DOC_SUBTITLE + " \u2014 Panduan & Penjelasan Resmi Manajemen Keuangan", S["subtitle"]))

    # Meta Table
    meta_data = [
        [
            Paragraph("<b>Ditujukan Kepada:</b> dr. Ade Sofyan (dr. Ovan) & Manajemen Klinik", S["cell"]),
            Paragraph("<b>Tanggal Rilis:</b> 13 Oktober 2026", S["cell"]),
        ],
        [
            Paragraph("<b>Fokus Analisis:</b> Akuntansi Setoran Pemilik, Kas Kecil, & Laci Kasir", S["cell"]),
            Paragraph("<b>Status Sistem:</b> Selesai, Terverifikasi & Live di Produksi", S["cell_bold"]),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[10.0 * cm, 7.8 * cm])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), FILL_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, RULE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 4))

    # 1. Ringkasan Eksekutif
    story.extend(h2("1. Ringkasan Eksekutif"))
    story.append(
        Paragraph(
            "Dokumen ini menyajikan penjelasan resmi atas <b>3 (tiga) penyempurnaan krusial</b> pada modul keuangan "
            "dan kasir SIM Klinik Pratama Cikidang Medika guna menanggapi masukan langsung dari <b>dr. Ade Sofyan</b>. "
            "Pembaruan ini memastikan bahwa setiap rupiah uang tunai di laci loket, belanja operasional harian, "
            "dan penyerahan kas ke pemilik tercatat dengan akuntabilitas 100% tanpa distorsi pada laporan laba rugi.",
            S["body"],
        )
    )

    # 2. Poin 1
    story.extend(h2("2. Poin 1: Perlakuan Akuntansi 'Setor ke Rekening Pemilik' (Rp 2.400.000 & Rp 50.000)"))
    story.append(callout("<b>Pertanyaan dr. Ade Sofyan:</b> <i>\"Ini teh sudah masuk setor tunai ke pemilik, apakah bisa tidak dimasukkan ke pengeluaran, yang 2.400.000?\"</i>"))
    story.append(Spacer(1, 3))
    story.append(
        Paragraph(
            "<b>Akar Masalah:</b> Pada 12 Oktober 2026, staf kasir mencatat <b>Rp 2.400.000</b> (keterangan <i>'stor tunai'</i>) "
            "dan <b>Rp 50.000</b> (keterangan <i>'amel tuker cash'</i>) melalui menu <b>Kas Keluar \u2192 Setor ke Rekening Pemilik</b>. "
            "Versi sistem terdahulu menjumlahkan seluruh transaksi berjenis <i>'Keluar'</i> ke pos <b>Pengeluaran Operasional & Obat</b>, "
            "sehingga beban operasional membengkak dari Rp 5.735.000 menjadi Rp 8.185.000 dan grafik harian 12 Oktober tampak "
            "seolah-olah mengalami <b>Defisit (-Rp 1.252.000)</b>.",
            S["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Kaidah Akuntansi Medis:</b> Penyerahan uang tunai laci kasir kepada pemilik klinik (dr. Ade Sofyan) adalah "
            "<b>perpindahan fisik aset kas</b> (dari laci kasir ke rekening/dompet pemilik), <b>BUKAN</b> beban biaya operasional "
            "klinik. Uang tersebut tidak berkurang/habis terpakai belanja.",
            S["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Solusi Permanen yang Telah Diterapkan:</b><br/>"
            "\u2022 Transaksi <b>Setor ke Rekening Pemilik</b> (serta <b>Setor Tunai</b>) otomatis <b>dikeluarkan dari beban pengeluaran operasional</b>.<br/>"
            "\u2022 Beban pengeluaran operasional riil 1\u201312 Oktober kembali normal di angka <b>Rp 5.735.000</b> (murni obat, listrik, dan operasional).<br/>"
            "\u2022 <b>Grafik Keuangan Harian (12 Okt):</b> Kas Masuk Rp 1.435.000 vs Kas Keluar Operasional Rp 237.000 \u2192 <b>Surplus +Rp 1.198.000</b> (grafik kembali hijau, tidak lagi defisit).<br/>"
            "\u2022 Transaksi Rp 2.450.000 kini masuk ke kartu <b>Setor Tunai & Pemilik</b> dengan total akumulasi <b>Rp 6.865.000</b>.<br/>"
            "\u2022 Di tabel Buku Kas, baris transaksi ini diberi badge khusus berwarna indigo/biru <b>\"Setoran Laci ke Pemilik/Bank (Bukan Pengeluaran)\"</b>.",
            S["body"],
        )
    )

    # 3. Poin 2
    story.extend(h2("3. Poin 2: Perbaikan Input Nominal Kas Kecil (< Rp 10.000 Tidak Lagi Terkalikan)"))
    story.append(callout("<b>Pertanyaan dr. Ade Sofyan:</b> <i>\"Dan ini teh kas keluar gak bisa di bawah 10.000, kalau di bawah itu jadinya 1 juta.\"</i>"))
    story.append(Spacer(1, 3))
    story.append(
        Paragraph(
            "<b>Akar Masalah:</b> Saat migrasi data Google Sheets lama, terdapat fungsi otomatis yang mengalikan nilai "
            "<code>&lt; 10000</code> dengan 1.000 (karena file lama mencatat singkatan angka ribuan seperti 15 = 15.000 atau 150 = 150.000). "
            "Fungsi ini sebelumnya ikut terpanggil pada form kas keluar baru, sehingga ketika staf mengetik <b>1000</b> langsung berubah menjadi <b>Rp 1.000.000</b>, "
            "atau mengetik <b>5000</b> berubah menjadi <b>Rp 5.000.000</b>.",
            S["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Solusi Permanen yang Telah Diterapkan:</b><br/>"
            "\u2022 Perkalian otomatis pada formulir input baru telah <b>dinonaktifkan sepenuhnya</b>. Nominal berapapun yang diketik staf (seperti Rp 1.000, Rp 2.500, Rp 5.000) tersimpan <b>100% persis sesuai angka yang diketik</b>.<br/>"
            "\u2022 Batas normalisasi data lama diturunkan hanya untuk angka di bawah 1.000 (<code>&lt; 1000</code>), sehingga angka ribuan asli tidak pernah terkalikan.<br/>"
            "\u2022 Disediakan tombol nominal instan kas kecil: <b>Rp 2.000, Rp 5.000, Rp 10.000, Rp 25.000, Rp 50.000, dan Rp 100.000</b> untuk mempercepat pencatatan staf kasir.",
            S["body"],
        )
    )

    # 4. Poin 3
    story.extend(h2("4. Poin 3: Mekanisme 4 Pilar Sisa Fisik di Laci Kasir (Rekonsiliasi Kasir)"))
    story.append(callout("<b>Pertanyaan dr. Ade Sofyan:</b> <i>\"Yang ini ada pengeluaran, tapi tidak mempengaruhi sisa fisik di laci om, gimana caranya biar sesuai om?\"</i>"))
    story.append(Spacer(1, 3))
    story.append(
        Paragraph(
            "<b>Akar Masalah:</b> Sebelumnya kartu Rekonsiliasi Kasir hanya menghitung <code>Tunai Pasien - Setor Tunai</code> tanpa "
            "memotong pengeluaran operasional tunai yang diambil langsung dari laci kasir (seperti Rp 10.000 gorengan dokter, "
            "Rp 213.000 token listrik & obat, atau Rp 14.000 kopi & biaya admin). Akibatnya angka sisa fisik laci di layar tidak berkurang saat uang kasir dipakai belanja.",
            S["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Formula 4 Pilar Rekonsiliasi Laci Baru:</b><br/>"
            "Setiap pengeluaran operasional tunai dan setoran pemilik kini <b>otomatis memotong sisa fisik laci kasir</b> secara seketika:",
            S["body"],
        )
    )

    # Formula Box
    formula_text = (
        "<b>RUMUS BAKU FISIK LACI KASIR:</b><br/>"
        "<b>Sisa Fisik di Laci</b> = <b>Penerimaan Tunai Pasien Loket</b> &minus; "
        "<b>Pengeluaran Tunai Laci (Operasional)</b> &minus; <b>Disetor ke Pemilik/Bank</b>"
    )
    story.append(callout(formula_text, bg_color=EMERALD_BG, border_color=TEAL_MED))
    story.append(Spacer(1, 4))

    # Table 4 Pilar
    pilar_data = [
        [
            Paragraph("<b>Pilar Rekonsiliasi</b>", S["cellhead"]),
            Paragraph("<b>Definisi Operasional</b>", S["cellhead"]),
            Paragraph("<b>Arus Kas</b>", S["cellhead"]),
            Paragraph("<b>Angka Riil (1\u201312 Okt 2026)</b>", S["cellhead"]),
        ],
        [
            Paragraph("<b>1. Tunai Masuk Laci</b>", S["cell_bold"]),
            Paragraph("Pembayaran tunai pasien umum di loket kasir.", S["cell"]),
            Paragraph("<b>+ Masuk Laci</b>", S["cell"]),
            Paragraph("<b>+ Rp 18.895.000</b> (171 Pasien)", S["cell_bold"]),
        ],
        [
            Paragraph("<b>2. Pengeluaran Tunai Laci</b>", S["cell_bold"]),
            Paragraph("Belanja obat, token listrik, ATK, konsumsi dokter dari laci.", S["cell"]),
            Paragraph("<b>&minus; Keluar Laci</b>", S["cell"]),
            Paragraph("<b>&minus; Rp 5.735.000</b> (Beban Operasional)", S["cell"]),
        ],
        [
            Paragraph("<b>3. Disetor ke Pemilik/Bank</b>", S["cell_bold"]),
            Paragraph("Uang laci disetor ke bank atau diserahkan ke pemilik.", S["cell"]),
            Paragraph("<b>&minus; Keluar Laci</b>", S["cell"]),
            Paragraph("<b>&minus; Rp 6.865.000</b> (Setor Tunai & Pemilik)", S["cell"]),
        ],
        [
            Paragraph("<b>4. Sisa Fisik di Laci Kasir</b>", S["cell_bold"]),
            Paragraph("<b>Uang cash fisik yang wajib ada di dalam laci saat ini.</b>", S["cell_bold"]),
            Paragraph("<b>= Saldo Laci</b>", S["cell_bold"]),
            Paragraph("<b>Rp 6.295.000</b> (Tersisa di Laci Loket)", S["cell_bold"]),
        ],
    ]
    t_pilar = Table(pilar_data, colWidths=[4.2 * cm, 6.4 * cm, 2.7 * cm, 4.5 * cm])
    t_pilar.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TEAL_DARK),
            ("BOX", (0, 0), (-1, -1), 0.5, RULE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("BACKGROUND", (0, 4), (-1, 4), AMBER_BG),
        ])
    )
    story.append(t_pilar)
    story.append(Spacer(1, 4))

    # 5. Bukti Keseimbangan
    story.extend(h2("5. Bukti Keseimbangan & Konservasi Kas Riil Klinik"))
    story.append(
        Paragraph(
            "Berikut adalah pembuktian matematis bahwa seluruh uang klinik terkunci sempurna sampai ke rupiah terakhir:<br/>"
            "\u2022 <b>Sisa Fisik di Laci Kasir:</b> Rp 6.295.000<br/>"
            "\u2022 <b>Dana di Rekening Bank & Pemilik:</b> Rp 7.500.000 <i>(Transfer Pasien Rp 635.000 + Setoran Kasir Rp 6.865.000)</i><br/>"
            "\u2022 <b>Total Saldo Kas Bersih Klinik:</b> Rp 6.295.000 + Rp 7.500.000 = <b>Rp 13.795.000</b><br/>"
            "Angka ini <b>cocok 100%</b> dengan kalkulasi laba bersih pada Dashboard Eksekutif:<br/>"
            "<code>Omzet Pasien Umum (Rp 19.530.000) &minus; Pengeluaran Operasional (Rp 5.735.000) = <b>Rp 13.795.000</b></code>",
            S["body"],
        )
    )

    # 6. Panduan Staf Kasir
    story.extend(h2("6. Panduan Praktis Alur Pencatatan untuk Staf Kasir"))
    panduan_data = [
        [
            Paragraph("<b>Kebutuhan Transaksi</b>", S["cellhead"]),
            Paragraph("<b>Menu</b>", S["cellhead"]),
            Paragraph("<b>Jenis</b>", S["cellhead"]),
            Paragraph("<b>Kategori yang Dipilih</b>", S["cellhead"]),
            Paragraph("<b>Pengaruh ke Sistem</b>", S["cellhead"]),
        ],
        [
            Paragraph("Beli obat darurat, BHP, reagen", S["cell"]),
            Paragraph("+ Kas Keluar", S["cell_bold"]),
            Paragraph("Keluar", S["cell"]),
            Paragraph("Pengeluaran Obat / Operasional", S["cell"]),
            Paragraph("Memotong uang laci & masuk beban obat.", S["cell"]),
        ],
        [
            Paragraph("Token PLN, WiFi, PDAM", S["cell"]),
            Paragraph("+ Kas Keluar", S["cell_bold"]),
            Paragraph("Keluar", S["cell"]),
            Paragraph("Operasional & Listrik/Air", S["cell"]),
            Paragraph("Memotong uang laci & masuk beban operasional.", S["cell"]),
        ],
        [
            Paragraph("Konsumsi dokter, makan, ATK", S["cell"]),
            Paragraph("+ Kas Keluar", S["cell_bold"]),
            Paragraph("Keluar", S["cell"]),
            Paragraph("Pengeluaran Non Klinik", S["cell"]),
            Paragraph("Memotong uang laci & masuk beban operasional.", S["cell"]),
        ],
        [
            Paragraph("Serah uang laci ke dr. Ade Sofyan", S["cell_bold"]),
            Paragraph("+ Kas Keluar", S["cell_bold"]),
            Paragraph("Keluar", S["cell_bold"]),
            Paragraph("<b>Setor ke Rekening Pemilik</b>", S["cell_bold"]),
            Paragraph("<b>Memotong uang laci, TIDAK memotong laba klinik.</b>", S["cell_bold"]),
        ],
        [
            Paragraph("Setor uang laci ke bank klinik", S["cell"]),
            Paragraph("+ Kas Masuk/Keluar", S["cell"]),
            Paragraph("Keluar/Masuk", S["cell"]),
            Paragraph("Setor Tunai", S["cell"]),
            Paragraph("Memotong uang laci, menambah saldo bank klinik.", S["cell"]),
        ],
    ]
    t_panduan = Table(panduan_data, colWidths=[4.2 * cm, 2.5 * cm, 1.8 * cm, 4.3 * cm, 5.0 * cm])
    t_panduan.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TEAL_DARK),
            ("BOX", (0, 0), (-1, -1), 0.5, RULE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4.5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4.5),
            ("BACKGROUND", (0, 4), (-1, 4), INDIGO_BG),
        ])
    )
    story.append(t_panduan)
    story.append(Spacer(1, 5))

    # Penutup & Pengesahan
    story.extend(h2("7. Kesimpulan & Komitmen Kualitas"))
    story.append(
        Paragraph(
            "Dengan berlakunya pembaruan ini, seluruh pencatatan arus kas dan rekonsiliasi kasir Klinik Pratama Cikidang Medika "
            "berjalan dengan prinsip akuntansi yang sehat, transparan, dan dapat dipertanggungjawabkan kapan saja. "
            "Seluruh perbaikan telah lulus uji verifikasi otomatis dan langsung aktif pada sistem yang sedang berjalan.",
            S["body"],
        )
    )
    story.append(Spacer(1, 6))

    sign_data = [
        [
            Paragraph("Disiapkan Oleh:<br/><b>Tim Pengembang SIM Klinik</b><br/>Sistem Informasi Cikidang Medika", S["cell"]),
            Paragraph("Diverifikasi & Diketahui Oleh:<br/><b>dr. Ade Sofyan (dr. Ovan)</b><br/>Direktur Klinis / Pimpinan Klinik", S["cell"]),
        ]
    ]
    sign_table = Table(sign_data, colWidths=[9.0 * cm, 8.8 * cm])
    sign_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, RULE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
            ("BACKGROUND", (0, 0), (-1, -1), FILL_LIGHT),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(sign_table)

    return story


def main():
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    story = build_story()
    first_path = OUT_PATH

    doc = SimpleDocTemplate(
        first_path,
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
    )
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated PDF: {first_path}")

    # Copy / build to Downloads folder as well
    targets = output_paths()
    if len(targets) > 1:
        downloads_path = targets[1]
        try:
            import shutil
            shutil.copyfile(first_path, downloads_path)
            print(f"Copied PDF to Downloads: {downloads_path}")
        except Exception as e:
            print(f"Warning: could not copy to downloads: {e}")


if __name__ == "__main__":
    main()
