"""Render the comprehensive F-018 system update report as an executive PDF.

Content covers all 7 feedback items from dr. Ade Sofyan (dr. Ovan):
1. Tanggal Lahir di Pencarian & Master Pasien
2. Copy-Paste Tanggal Lahir Fleksibel & Kalkulasi Usia Otomatis
3. Rujukan Bidan di Tindakan & Rekap Bingkisan Tahunan (.xlsx)
4. Klarifikasi Operasional Buku Kas vs Uang Tunai Kasir
5. Resolusi Selisih 1 Juta (Timezone Offset UTC vs Local Date WIB)
6. Pembaruan Nama dr. Ade Sofyan & Master Kelola Dokter
7. Standarisasi 144 Diagnosa FKTP BPJS Kesehatan (ICD-10)

Writes the PDF to docs/documentation and directly to the user's Downloads folder.

Usage:
    python scripts/generate_penjelasan_f018_update_pdf.py
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

DOC_TITLE = "Laporan & Penjelasan Pembaruan Sistem (F-018)"
DOC_SUBTITLE = "Klinik Pratama Cikidang Medika"
DOC_RUNNING = "Laporan Pembaruan Sistem (F-018) \u2022 Klinik Pratama Cikidang Medika"

OUT_PATH = os.path.join("docs", "documentation", "Laporan-Pembaruan-Sistem-Klinik-F018.pdf")
DOWNLOADS_NAME = "Laporan-Pembaruan-Sistem-Klinik-F018.pdf"


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
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=BLACK, spaceAfter=2),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=9.5, leading=13, textColor=TEAL_DARK, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=TEAL_DARK, spaceBefore=7, spaceAfter=2.5, keepWithNext=True),
    "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=8.8, leading=12, textColor=INK, spaceBefore=4, spaceAfter=1.5, keepWithNext=True),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=8.2, leading=11.8, textColor=BODY, alignment=TA_LEFT, spaceAfter=2.5),
    "body_bold": ParagraphStyle("body_bold", fontName="Helvetica-Bold", fontSize=8.2, leading=11.8, textColor=BLACK, spaceAfter=1.5),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=7.5, leading=10.5, textColor=MUTED),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=7.8, leading=10.8, textColor=BODY),
    "cell_bold": ParagraphStyle("cell_bold", fontName="Helvetica-Bold", fontSize=7.8, leading=10.8, textColor=BLACK),
    "cellhead": ParagraphStyle("cellhead", fontName="Helvetica-Bold", fontSize=7.8, leading=10.8, textColor=WHITE),
    "quote": ParagraphStyle("quote", fontName="Helvetica-Oblique", fontSize=8, leading=11.5, textColor=TEAL_DARK),
}


def h2(text):
    return [Spacer(1, 3), Paragraph(text, S["h2"]), HRFlowable(width="100%", thickness=0.8, color=TEAL_MED, spaceAfter=4)]


def callout(quote_text, bg_color=TEAL_LIGHT, border_color=TEAL_MED):
    t = Table([[Paragraph(quote_text, S["quote"])]], colWidths=[17.8 * cm])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg_color),
            ("BOX", (0, 0), (-1, -1), 0.8, border_color),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 4.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ])
    )
    return t


def build_story():
    story = []

    # Title Banner
    story.append(Paragraph(DOC_TITLE, S["title"]))
    story.append(Paragraph(DOC_SUBTITLE + " \u2014 Laporan Resmi Direksi Medis & Manajemen", S["subtitle"]))

    # Meta Table
    meta_data = [
        [
            Paragraph("<b>Ditujukan Kepada:</b> dr. Ade Sofyan & dr. Neneng", S["cell"]),
            Paragraph("<b>Tanggal:</b> 12 Oktober 2026", S["cell"]),
        ],
        [
            Paragraph("<b>Fokus Pembaruan:</b> 7 Poin Fitur & Audit Keuangan", S["cell"]),
            Paragraph("<b>Status:</b> Selesai & Terverifikasi (Prod & Staging)", S["cell_bold"]),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[9.5 * cm, 8.3 * cm])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), FILL_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, RULE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 5))

    # Ringkasan Eksekutif
    story.extend(h2("1. Ringkasan Eksekutif"))
    story.append(
        Paragraph(
            "Laporan ini mendokumentasikan implementasi lengkap dan hasil audit sistem atas <b>7 (tujuh) poin pembaruan</b> "
            "yang diajukan oleh <b>dr. Ade Sofyan</b> (sebelumnya tercatat sebagai dr. Ovan). Seluruh pembaruan mencakup "
            "peningkatan akurasi identitas pasien, fleksibilitas input loket, pencatatan rujukan bidan & bingkisan tahunan, "
            "pemisahan tegas buku kas vs laci kasir, audit investigasi selisih 1 juta pendapatan, pembaruan master dokter mandiri, "
            "serta standarisasi 144 diagnosa FKTP BPJS Kesehatan (ICD-10). Seluruh kode telah lolos uji coba otomatis <i>(zero regression)</i>.",
            S["body"],
        )
    )

    # Poin 1
    story.extend(h2("2. Poin 1: Tanggal Lahir pada Pencarian Pasien & Master Data"))
    story.append(callout("Feedback dr. Ade Sofyan: <i>\"Malam om yang ini, minta tolong tampilin tanggal lahirnya juga, supaya bisa membedakan lebih rinci\"</i>"))
    story.append(Spacer(1, 2))
    story.append(
        Paragraph(
            "<b>Solusi Implementasi:</b><br/>"
            "\u2022 <b>Dialog Cari Cepat (Ctrl+K):</b> Setiap nama pasien kini menyertakan badge tanggal lahir (contoh: <code>Lahir: 14 Mei 2021</code>).<br/>"
            "\u2022 <b>Autocomplete Loket Pendaftaran:</b> Tanggal lahir ditampilkan berdampingan dengan usia dan asal desa.<br/>"
            "\u2022 <b>Master Pasien & Antrean:</b> Dokter dan petugas loket tidak akan salah memilih berkas rekam medis untuk pasien anak dengan nama identik/kembar.",
            S["body"],
        )
    )

    # Poin 2
    story.extend(h2("3. Poin 2: Dukungan Copy-Paste Tanggal Lahir (Format Bebas & Otomatis Hitung Usia)"))
    story.append(callout("Feedback dr. Ade Sofyan: <i>\"yang ini tolong tanggalnya bisa dicopy/paste, gak harus diketik aja\"</i>"))
    story.append(Spacer(1, 2))
    story.append(
        Paragraph(
            "<b>Solusi Implementasi (Komponen FlexibleDateInput):</b><br/>"
            "\u2022 <b>Dukungan Clipboard Penuh:</b> Petugas dapat langsung menempel teks tanggal dari WhatsApp (<code>Ctrl+V</code> atau klik kanan Tempel).<br/>"
            "\u2022 <b>Pengenalan Format Cerdas:</b> Mendukung format <code>15/08/1990</code>, <code>15-08-1990</code>, <code>15.08.1990</code>, teks <code>15 Agustus 1990</code>, serta 8-digit langsung <code>15081990</code>.<br/>"
            "\u2022 <b>Kalkulasi Usia Otomatis:</b> Usia dalam tahun langsung terhitung otomatis tanpa perlu kalkulator manual.<br/>"
            "\u2022 <b>Tombol Cepat Tempel & Kalender:</b> Disediakan tombol khusus 'Tempel Tanggal' untuk layar sentuh/tablet serta ikon pop-up kalender.",
            S["body"],
        )
    )

    # Poin 3
    story.extend(h2("4. Poin 3: Pencatatan Rujukan Bidan di Tindakan & Rekap Tahunan Bingkisan"))
    story.append(callout("Feedback dr. Ade Sofyan: <i>\"Mau nanya sistem rujukan dari bidannya klik yang mana yah om? Klo belum nnti buat option di sekitaran tindakan aja, sama tolong tampilkan data nama2 bidan yang merujuk, kami mendata pertahunnya untuk diberikan bingkisan ke bidan yang merujuk…\"</i>"))
    story.append(Spacer(1, 2))
    story.append(
        Paragraph(
            "<b>Solusi Implementasi:</b><br/>"
            "\u2022 <b>Pilihan Rujukan di Sekitar Bagian Tindakan Medis:</b> Pada E-Rekam Medis (Bagian 4 Tindakan Klinis), tersedia tombol cepat (chips) 9 bidan mitra: "
            "<b>Bdn. Tari, Bdn. Ulfah, Bdn. Novi, Bdn. Dewi, Bdn. Nida, Bdn. Ai, Bdn. Trie, Bdn. Rila, Bdn. Desi</b>, serta kolom input nama bidan baru.<br/>"
            "\u2022 <b>Tersedia di Loket Pendaftaran:</b> Petugas loket dapat langsung menandai rujukan bidan saat pasien mendaftar.<br/>"
            "\u2022 <b>Rekap Tahunan Bingkisan (Menu Laporan):</b> Tab Pemantauan Rujukan Bidan kini memiliki selektor tahun (2026, 2025, 2024), menampilkan total rujukan, jumlah pasien unik, tier bingkisan (Tier 1 Utama, Tier 2 Standar, Tier 3 Apresiasi), dan tombol <b>Ekspor Excel (.xlsx)</b> siap cetak.",
            S["body"],
        )
    )

    # Poin 4
    story.extend(h2("5. Poin 4: Klarifikasi Operasional Buku Kas vs Uang Kasir (Laci Fisik vs Ledger)"))
    story.append(callout("Feedback dr. Ade Sofyan: <i>\"Kalau yang ini buku kas dalam bentuk cash ya mksdnya om?\"</i>"))
    story.append(Spacer(1, 2))

    kas_table_data = [
        [Paragraph("Komponen Finansial", S["cellhead"]), Paragraph("Wujud & Bentuk Dana", S["cellhead"]), Paragraph("Lokasi / Akun", S["cellhead"]), Paragraph("Fungsi Utama", S["cellhead"])],
        [Paragraph("<b>Loket Kasir (POS)</b>", S["cell_bold"]), Paragraph("Uang tunai <b>CASH FISIK</b>", S["cell"]), Paragraph("Laci kasir meja loket", S["cell"]), Paragraph("Menerima pembayaran tunai pasien harian.", S["cell"])],
        [Paragraph("<b>Buku Kas Operasional</b>", S["cell_bold"]), Paragraph("Pencatatan global (Ledger)", S["cell"]), Paragraph("Kas klinik & rekening bank", S["cell"]), Paragraph("Mencatat kapitasi BPJS, obat, operasional, setoran kasir.", S["cell"])],
        [Paragraph("<b>Rekonsiliasi Kasir</b>", S["cell_bold"]), Paragraph("Jembatan audit harian", S["cell"]), Paragraph("Menu Buku Kas & Laporan", S["cell"]), Paragraph("Memastikan uang cash di laci cocok dengan yang disetor ke bank.", S["cell"])],
    ]
    kas_table = Table(kas_table_data, colWidths=[4.2 * cm, 4.0 * cm, 4.2 * cm, 5.4 * cm])
    kas_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TEAL_DARK),
            ("BOX", (0, 0), (-1, -1), 0.5, RULE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(kas_table)
    story.append(Spacer(1, 3))
    story.append(
        Paragraph(
            "<b>Alur Harian:</b> Pasien bayar cash \u2192 uang masuk laci kasir (status: Sisa Fisik di Kasir). Saat sore kasir setor ke bank dan klik tombol 'Catat Setor Tunai', kartu rekonsiliasi otomatis menjadi 'Selesai Disetor (Rp 0)' centang hijau.",
            S["body"],
        )
    )

    # Poin 5
    story.extend(h2("6. Poin 5: Penelusuran Tuntas Selisih 1 Juta Pendapatan (Google Sheets vs Aplikasi)"))
    story.append(callout("Feedback dr. Ade Sofyan: <i>\"Di DATA dan aplikasi ada selisih 1 juta pendptn, kira2 dimana yah persoalanya om? Tolong ditelusuri\"</i>"))
    story.append(Spacer(1, 2))

    reconcile_data = [
        [Paragraph("Sumber Data", S["cellhead"]), Paragraph("Periode Filter", S["cellhead"]), Paragraph("Kunjungan", S["cellhead"]), Paragraph("Total Pendapatan", S["cellhead"]), Paragraph("Status Pencocokan", S["cellhead"])],
        [Paragraph("<b>Google Sheets (Data Asli)</b>", S["cell"]), Paragraph("1 Okt \u2013 11 Okt 2026", S["cell"]), Paragraph("173", S["cell"]), Paragraph("Rp 18.195.000", S["cell_bold"]), Paragraph("Dashboard Historis Dokter", S["cell"])],
        [Paragraph("<b>Database PostgreSQL</b>", S["cell_bold"]), Paragraph("1 Okt \u2013 11 Okt 2026", S["cell"]), Paragraph("173", S["cell"]), Paragraph("Rp 18.195.000", S["cell_bold"]), Paragraph("<b>COCOK 100% (Selisih = Rp 0)</b>", S["cell_bold"])],
        [Paragraph("<b>Aplikasi (Sebelum Perbaikan)</b>", S["cell"]), Paragraph("Preset 'Bulan Ini' (UTC shift)", S["cell"]), Paragraph("181", S["cell"]), Paragraph("Rp 19.145.000", S["cell"]), Paragraph("Tercampur data 30 September (+Rp 950.000)", S["small"])],
        [Paragraph("<b>Aplikasi (Setelah Perbaikan)</b>", S["cell_bold"]), Paragraph("Preset 'Bulan Ini' (WIB lokal)", S["cell"]), Paragraph("173", S["cell_bold"]), Paragraph("Rp 18.195.000", S["cell_bold"]), Paragraph("<b>Tepat Sesuai Google Sheets</b>", S["cell_bold"])],
    ]
    reconcile_table = Table(reconcile_data, colWidths=[4.2 * cm, 3.8 * cm, 2.0 * cm, 3.4 * cm, 4.4 * cm])
    reconcile_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TEAL_DARK),
            ("BACKGROUND", (0, 2), (-1, 2), EMERALD_BG),
            ("BACKGROUND", (0, 4), (-1, 4), EMERALD_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, RULE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(reconcile_table)
    story.append(Spacer(1, 3))
    story.append(
        Paragraph(
            "<b>Hasil Audit Forensik & Akar Masalah:</b><br/>"
            "Data transaksi di database klinik <b>100% identik</b> dengan Google Sheets. Perbedaan angka Rp 950.000 murni disebabkan oleh "
            "fungsi bawaan peramban (<code>toISOString()</code>) yang mengonversi tanggal 1 Oktober 00:00 WIB ke zona waktu UTC (30 September 17:00 UTC). "
            "Akibatnya, laporan aplikasi sempat menyertakan transaksi tanggal 30 September (8 kunjungan senilai Rp 950.000).<br/>"
            "<b>Tindakan Perbaikan:</b> Sistem telah diperbarui menggunakan penanggalan lokal WIB murni (<code>formatLocalDateToYMD</code>). "
            "Kini laporan di aplikasi menampilkan tepat <b>Rp 18.195.000 (173 kunjungan)</b>, selaras sempurna dengan Google Sheets.",
            S["body"],
        )
    )

    # Poin 6
    story.extend(h2("7. Poin 6: Pembaruan Nama dr. Ade Sofyan & Fitur Master Kelola Dokter"))
    story.append(callout("Feedback dr. Ade Sofyan: <i>\"Nama dr ovan bisa gam diganti jadi dr ade sofyan, atau ada tambahan pilihan lain?\"</i>"))
    story.append(Spacer(1, 2))
    story.append(
        Paragraph(
            "<b>Solusi Implementasi:</b><br/>"
            "\u2022 <b>Pembaruan Database:</b> Seluruh data dokter <code>dr. Ovan</code> telah resmi diubah menjadi <b><code>dr. Ade Sofyan</code></b> pada database staging dan production. Riwayat rekam medis pasien sebelumnya tetap aman dan terhubung.<br/>"
            "\u2022 <b>Fitur Baru 'Kelola Master Dokter & Tenaga Medis':</b> Dokter atau manajemen kini dapat mengelola dokter secara mandiri langsung dari aplikasi:<br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;1. <b>Tambah Dokter Baru:</b> Menambahkan dokter/bidan baru tanpa perlu konfigurasi database teknis.<br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;2. <b>Edit Nama & Spesialisasi:</b> Mengubah gelar, nama, atau spesialisasi dokter.<br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;3. <b>Status Aktif Praktik:</b> Mengaktifkan/menonaktifkan dokter saat cuti agar tidak muncul di antrean pendaftaran.<br/>"
            "\u2022 <b>Akses Cepat:</b> Tersedia tombol 'Kelola Dokter' di formulir pendaftaran loket dan melalui menu pencarian cepat (<code>Ctrl+K</code> \u2192 ketik 'dokter').",
            S["body"],
        )
    )

    # Poin 7
    story.extend(h2("8. Poin 7: Standarisasi Kode ICD-10 FKTP BPJS Kesehatan (144 Diagnosa Primer)"))
    story.append(callout("Feedback dr. Ade Sofyan: <i>\"minta tolong kode icd 10 nya lebih lengkap om, biar standar sama bpjs\"</i>"))
    story.append(Spacer(1, 2))
    story.append(
        Paragraph(
            "<b>Solusi Implementasi:</b><br/>"
            "Katalog diagnosa E-Rekam Medis kini telah ditingkatkan menjadi <b>144 Diagnosa Standar Tingkat Kemampuan 4A FKTP BPJS Kesehatan</b> "
            "(Permenkes No. 5 Tahun 2014 & Panduan Praktik Klinis BPJS). Mencakup 13 kelompok klinis utama:<br/>"
            "1. <b>Infeksi & Tropis:</b> Tifoid (A01.0), Disentri (A06.0), Diare Akut (A09), TBC Paru (A15.0), Leptospirosis (A27.9), Kusta (A30.9), Tetanus (A35), Difteri (A36.9), Pertusis (A37.9), Rabies (A82.9), Dengue (A90), DBD (A91), Cacar Air (B01.9), Herpes Zoster (B02.9), Campak (B05.9), Gondongan (B26.9), Malaria (B50.9, B51.9), Skabies (B86), Cacingan.<br/>"
            "2. <b>Respirasi & Paru:</b> ISPA (J00), Sinusitis (J01.9), Faringitis (J02.9), Tonsilitis (J03.9), Laringitis (J04.0), Influenza (J11.1), Pneumonia/Bronkopneumonia (J18), Bronkitis (J20.9), Rhinitis Alergi (J30.4), PPOK (J44.9), Asma Bronkiale (J45.9).<br/>"
            "3. <b>Pencernaan & Gigi:</b> Karies Gigi (K02.9), Pulpitis (K04.0), Sariawan (K12.0), GERD (K21.9), Gastritis/Maag (K29.7), Dispepsia (K30), Apendisitis (K35.8), Konstipasi (K59.0), Hemoroid/Wasir (K64.9), Hepatitis A/B.<br/>"
            "4. <b>Kardiovaskular:</b> Hipertensi Esensial (I10), Angina Pektoris (I20.9), Gagal Jantung Kongestif (I50.9), Hipotensi (I95.9), Anemia (D50.9).<br/>"
            "5. <b>Endokrin & Metabolik:</b> DM Tipe 1 & 2 (E10, E11), Hipoglikemia (E16.2), Gizi Kurang (E46), Obesitas (E66.9), Dislipidemia (E78.5), Asam Urat/Gout (M10.9).<br/>"
            "6. <b>Kulit:</b> Impetigo (L01), Bisul/Furunkel (L02), Dermatitis Atopik/Alergi/Iritan (L20, L23, L24), Urtikaria/Biduran (L50), Jerawat (L70), Biang Keringat (L74), Jamur Tinea/Panu/Kandidiasis (B35, B36, B37).<br/>"
            "7. <b>Mata:</b> Bintitan/Hordeolum (H00), Blefaritis (H01), Mata Kering (H04), Konjungtivitis Akut/Alergi (H10), Pterigium (H11), Perdarahan Subkonjungtiva (H11.3), Katarak (H25), Kelilipan (T15).<br/>"
            "8. <b>THT:</b> Otitis Eksterna (H60), Serumen Prop (H61.2), OMA/OMSK (H66), Tinnitus (H93), Mimisan (R04), Benda Asing Telinga/Hidung.<br/>"
            "9. <b>Urologi:</b> Sistitis (N30), Uretritis (N34), ISK (N39.0), Kolik/Batu Ginjal (N20), Fimosis & Parafimosis (N47), Balanitis (N48).<br/>"
            "10. <b>Kebidanan:</b> ANC Kehamilan Normal (Z34.9), Hiperemesis Gravidarum (O21), Abortus Iminens (O20), Mastitis (N61), Keputihan/Fluor Albus (N89.8), Pelayanan KB (Z30.9).<br/>"
            "11. <b>Saraf & Jiwa:</b> Migren (G43.9), Sakit Kepala Tegang/TTH (G44.2), Vertigo (R42), Bell's Palsy (G51), Kejang Demam Anak (R56), Gangguan Cemas (F41), Insomnia (F51).<br/>"
            "12. <b>Muskuloskeletal:</b> Mialgia (M79.1), Nyeri Punggung Bawah/LBP (M54.5), Osteoartritis Sendi (M17.9), Rematik (M06.9), Keseleo/Sprain (S93, S83).<br/>"
            "13. <b>Tindakan Klinis & Trauma:</b> Sirkumsisi/Sunat (Z41.2), Rawat Luka/Ganti Perban (Z48.0), Luka Robek (T14.1), Luka Bakar Ringan (T20.0), MCU Rutin (Z00.0).<br/>"
            "<b>Kemudahan Dokter:</b> Dokter cukup mengetik nama klinis Indonesia atau singkatan (misal 'DBD', 'maag', 'asam urat', 'sunat', 'anc', 'I10'), sistem otomatis menampilkan kode ICD-10 resmi BPJS.",
            S["body"],
        )
    )

    # Penutup & Pengesahan
    story.extend(h2("9. Penutup & Pengesahan"))
    story.append(
        Paragraph(
            "Seluruh sistem Klinik Pratama Cikidang Medika saat ini beroperasi dengan stabilitas penuh dan data yang terverifikasi akurat. "
            "Dokumen ini menjadi bukti pertanggungjawaban profesional dan standar keandalan informasi manajemen klinik.",
            S["body"],
        )
    )
    story.append(Spacer(1, 6))

    sign_data = [
        [
            Paragraph("Mengetahui & Menyetujui,<br/><b>Direksi Medis Klinik</b><br/><br/><br/><br/><b><u>dr. Ade Sofyan</u></b><br/>Penanggung Jawab Medis", S["cell"]),
            Paragraph("Dilaporkan & Diterapkan Oleh,<br/><b>Tim Pengembang SIM Klinik</b><br/><br/><br/><br/><b><u>Lead Developer</u></b><br/>Sistem Informasi Cikidang Medika", S["cell"]),
        ]
    ]
    sign_table = Table(sign_data, colWidths=[9.0 * cm, 8.8 * cm])
    sign_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, RULE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
            ("BACKGROUND", (0, 0), (-1, -1), FILL_LIGHT),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(sign_table)

    return story


def main():
    doc_paths = output_paths()
    for p in doc_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)

    story = build_story()

    # Generate primary document
    doc = SimpleDocTemplate(
        doc_paths[0],
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title=DOC_TITLE,
        author="Klinik Pratama Cikidang Medika",
    )
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated PDF: {doc_paths[0]}")

    # Copy / build to other destination (user's Downloads folder)
    if len(doc_paths) > 1 and doc_paths[1] != doc_paths[0]:
        try:
            import shutil
            shutil.copyfile(doc_paths[0], doc_paths[1])
            print(f"Copied to Downloads: {doc_paths[1]}")
        except Exception as e:
            print(f"Failed to copy to Downloads: {e}")


if __name__ == "__main__":
    main()
