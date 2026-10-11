"""Render the standalone F-017 No RM explanation document as an executive grayscale PDF.

Content mirrors docs/documentation/PENJELASAN_KONSEP_PENOMORAN_OTOMATIS_RM_F017.md.
Writes the PDF to docs/documentation and directly to the user's Downloads folder.

Usage:
    python scripts/generate_penjelasan_no_rm_f017_pdf.py
"""

import os
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
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
INK = colors.HexColor("#1A1A1A")
BODY = colors.HexColor("#333333")
MUTED = colors.HexColor("#666666")
RULE = colors.HexColor("#D4D4D4")
FILL_LIGHT = colors.HexColor("#F8F9FA")
FILL_MED = colors.HexColor("#E9ECEF")
WHITE = colors.HexColor("#FFFFFF")

DOC_TITLE = "Penjelasan Konsep Penomoran Otomatis Rekam Medis (F-017)"
DOC_SUBTITLE = "Klinik Pratama Cikidang Medika"
DOC_RUNNING = "Penomoran Otomatis RM Berkelanjutan (F-017) \u2014 Klinik Pratama Cikidang Medika"

OUT_PATH = os.path.join("docs", "documentation", "Penjelasan-Konsep-Penomoran-Otomatis-RM-F017.pdf")
DOWNLOADS_NAME = "Penjelasan-Konsep-Penomoran-Otomatis-RM-F017.pdf"


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
            self.line(1.6 * cm, 28.5 * cm, 19.4 * cm, 28.5 * cm)
            self.setFont("Helvetica", 7.5)
            self.drawString(1.6 * cm, 28.7 * cm, DOC_RUNNING)
        self.line(1.6 * cm, 1.35 * cm, 19.4 * cm, 1.35 * cm)
        self.setFont("Helvetica", 7.5)
        self.drawString(1.6 * cm, 1.0 * cm, "Klinik Pratama Cikidang Medika \u2022 Dokumentasi Resmi F-017")
        self.drawRightString(19.4 * cm, 1.0 * cm, "Halaman %d dari %d" % (self._pageNumber, page_count))
        self.restoreState()


S = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=14.5, leading=18, textColor=BLACK, spaceAfter=2),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=9.5, leading=13, textColor=MUTED, spaceAfter=5),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=10, leading=13.5, textColor=BLACK, spaceBefore=7, spaceAfter=2.5, keepWithNext=True),
    "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=8.5, leading=12, textColor=INK, spaceBefore=4, spaceAfter=1.5, keepWithNext=True),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=8.2, leading=11.8, textColor=BODY, alignment=TA_LEFT, spaceAfter=2.5),
    "body_bold": ParagraphStyle("body_bold", fontName="Helvetica-Bold", fontSize=8.2, leading=11.8, textColor=BLACK, spaceAfter=1.5),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=7.5, leading=10.5, textColor=MUTED),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=7.8, leading=10.8, textColor=BODY),
    "cell_bold": ParagraphStyle("cell_bold", fontName="Helvetica-Bold", fontSize=7.8, leading=10.8, textColor=BLACK),
    "cellhead": ParagraphStyle("cellhead", fontName="Helvetica-Bold", fontSize=7.8, leading=10.8, textColor=WHITE),
    "callout": ParagraphStyle("callout", fontName="Helvetica-Oblique", fontSize=8.2, leading=11.8, textColor=INK),
    "code_badge": ParagraphStyle("code_badge", fontName="Courier-Bold", fontSize=8.5, leading=11, textColor=BLACK, alignment=TA_CENTER),
}


def h2(text):
    return [Spacer(1, 2), Paragraph(text, S["h2"]), HRFlowable(width="100%", thickness=0.5, color=RULE, spaceAfter=3)]


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
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2),
        ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, FILL_LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, RULE),
    ]))
    return table


def callout_box(text, width=17.8 * cm):
    content = [[Paragraph(text, S["callout"])]]
    box = Table(content, colWidths=[width], hAlign="LEFT")
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), FILL_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#A0A0A0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return box


def build(out_path):
    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title=DOC_TITLE,
        author="Pengembang Sistem Informasi Klinik",
    )

    story = []

    # Title & Metadata
    story.append(Paragraph(DOC_TITLE, S["title"]))
    story.append(Paragraph(DOC_SUBTITLE, S["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.0, color=BLACK, spaceAfter=5))

    story.append(data_table(
        ["Keterangan", "Isi Dokumen"],
        [
            ["Tanggal Dokumen", "11 Oktober 2026"],
            ["Sasaran Pembaca", "dr. Ovan, dr. Neneng, Penanggung Jawab Medis, & Staf Loket"],
            ["Penyusun", "Tim Pengembang Sistem Informasi Klinik"],
            ["Topik Bahasan", "Penjelasan Konsep & Alur Teknis Penomoran Otomatis RM Berkelanjutan (F-017)"],
            ["Tujuan Dokumen", "Menjawab masukan dokter & memastikan kesamaan pemahaman alur kerja rekam medis"],
        ],
        [3.6 * cm, 14.2 * cm],
    ))
    story.append(Spacer(1, 3))

    # SECTION 1
    story += h2("1. Menjawab Masukan & Pertanyaan dr. Ovan")
    story.append(body(
        "Dokumen ini disusun khusus untuk memberikan penjelasan yang mudah dipahami tentang cara kerja "
        "fitur <b>Penomoran Otomatis Rekam Medis (F-017)</b>, menjawab langsung pesan dari <b>dr. Ovan</b>:"
    ))
    story.append(Spacer(1, 2))
    story.append(callout_box(
        "<i>\"Om punten satu lagi, untuk no rm otomatisnya bisa dari no urut DATA google sheet gak yah? "
        "Biar gak ke campur no rm yang saat ini. Apa gimana baiknya?\"</i>"
    ))
    story.append(Spacer(1, 2.5))
    story.append(body(
        "<b>Jawaban:</b> <b>Bisa, dan sistem di web sudah dirancang persis seperti yang dokter harapkan.</b> "
        "Sistem menerapkan prinsip <b>Estafet Berkelanjutan (Continuous Auto-Generation)</b>. Artinya, sistem web tidak "
        "memulai penomoran dari nol atau angka 1, melainkan <b>langsung melanjutkan nomor urut terakhir di Google Sheet klinik</b>. "
        "Dengan konsep ini, berkas pasien baru dijamin <b>100% tidak akan pernah bertabrakan, tertukar, atau menimpa</b> "
        "3.750 data pasien lama yang sudah tercatat di Google Sheet maupun kartu berobat fisik."
    ))

    # SECTION 2
    story += h2("2. Struktur Format Baku No RM Klinik (9 Digit Tanpa Strip)")
    story.append(body(
        "Sesuai standar operasional resmi Klinik Pratama Cikidang Medika, setiap Nomor Rekam Medis tersusun dari "
        "<b>9 digit angka murni</b> (tanpa spasi dan tanpa tanda strip) dengan pembagian 3 bagian:"
    ))
    story.append(Spacer(1, 2))

    # Anatomy Table
    story.append(data_table(
        ["Bagian", "Posisi Digit", "Arti & Fungsi", "Contoh Kode", "Keterangan"],
        [
            ["Bagian 1", "Digit 1 \u2013 2", "Kode Jenis Kelamin", "01 = Laki-laki<br/>02 = Perempuan", "Otomatis terpilih saat memilih sapaan (Tn./Ny./Nn.)"],
            ["Bagian 2", "Digit 3 \u2013 4", "Kode Wilayah Desa", "01 = Cikidang<br/>02 = Pangkalan<br/>... s/d 13", "Sesuai daftar 13 desa/wilayah domisili pasien"],
            ["Bagian 3", "Digit 5 \u2013 9", "Nomor Urut Pendaftaran", "03741, 03742,<br/>03743, dst.", "Nomor urut estafet 5 digit menyambung dari Google Sheet"],
        ],
        [2.0 * cm, 2.4 * cm, 3.4 * cm, 3.8 * cm, 6.2 * cm],
    ))
    story.append(Spacer(1, 2.5))

    story.append(body("<b>Daftar 13 Kode Wilayah Desa Resmi Klinik:</b>"))
    story.append(data_table(
        ["Kode", "Nama Desa / Wilayah", "Kode", "Nama Desa / Wilayah", "Kode", "Nama Desa / Wilayah"],
        [
            ["01", "Cikidang", "06", "Cicareuh", "11", "Cikiray"],
            ["02", "Pangkalan", "07", "Tamansari", "12", "Wilayah Khusus / Cibunar"],
            ["03", "Sampora", "08", "Nangka Koneng", "13", "Luar Wilayah (Pelabuhan Ratu, Cibadak, dll.)"],
            ["04", "Gunung Malang", "09", "Cijambe", "", ""],
            ["05", "Bumisari", "10", "Mekarnangka", "", ""],
        ],
        [1.2 * cm, 4.7 * cm, 1.2 * cm, 4.7 * cm, 1.2 * cm, 4.8 * cm],
    ))

    # SECTION 3
    story += h2("3. Konsep \"Estafet Nomor Urut\": Mengapa Dimulai dari 3741?")
    story.append(body(
        "<b>Situasi Data Historis di Google Sheet:</b> Berkas <i>DATAPASIEN</i> dan <i>REKAMMEDIS</i> klinik yang "
        "telah dimigrasikan mencatat total <b>3.750 pasien aktif</b>. Berdasarkan audit nomor urut tertinggi, berkas lama klinik "
        "berakhir pada nomor urut pendaftaran <b>3740</b> (tercatat pada berkas sunat dan pasien umum terdahulu)."
    ))
    story.append(body(
        "<b>Batas Awal Sistem Web Baru:</b> Agar tidak terjadi kerancuan, sistem web baru menetapkan "
        "lantai dasar pendaftaran pasien baru pada angka <b>3741</b>."
    ))
    story.append(Spacer(1, 2))

    # Diagram Table
    diagram_rows = [
        ["Data Lama Klinik (Google Sheet & Berkas Fisik)", "Pasien Urut 00001 s/d 03740 (Tersimpan Aman & Terkunci Rapi)"],
        ["Estafet Bersambung Otomatis", "Titik potong aman: Urutan dilanjutkan ke nomor 3741"],
        ["Pasien Baru ke-1 di Web", "Mendapat Nomor Urut 03741 (Contoh: 010103741 untuk Laki-laki Desa Cikidang)"],
        ["Pasien Baru ke-2 di Web", "Mendapat Nomor Urut 03742 (Contoh: 020203742 untuk Perempuan Desa Pangkalan)"],
        ["Pasien Baru ke-3 di Web", "Mendapat Nomor Urut 03743 (Contoh: 011303743 untuk Laki-laki Luar Wilayah)"],
    ]
    story.append(data_table(
        ["Tahapan Estafet", "Keterangan Penomoran"],
        diagram_rows,
        [5.6 * cm, 12.2 * cm],
    ))
    story.append(Spacer(1, 2.5))

    story.append(body(
        "<b>Keuntungan Konsep Ini:</b> Tidak ada penomoran yang mulai dari 1 lagi di web. Pasien baru yang mendaftar "
        "hari ini langsung melanjutkan silsilah data klinik secara runtut, rapi, dan mudah ditelusuri."
    ))

    # SECTION 4
    story += h2("4. Dua Skenario Praktis di Loket Pendaftaran")
    story.append(body(
        "Dalam pelayanan sehari-hari, petugas loket akan melayani dua tipe kedatangan pasien:"
    ))
    story += bullets([
        "<b>Skenario 1: Pasien Baru (Belum Pernah Berobat):</b> Petugas klik tombol <i>+ Pasien Baru</i>, "
        "pilih Sapaan (Tn./Ny./Nn.), lalu pilih Desa. Kolom No RM <b>otomatis terisi instan</b> (misal: 010103741). "
        "Petugas tidak perlu menghitung atau membuka buku register manual lagi.",
        "<b>Skenario 2: Pasien Lama Datang Berobat Kembali:</b> Pasien lama <b>TIDAK PERLU</b> dibuatkan nomor RM baru. "
        "Petugas cukup mencari nama atau nomor lama di kolom pencarian (sudah mencakup 3.750 data pasien lama). "
        "Bila pasien memegang kartu fisik lama bertahun-tahun lalu yang belum masuk sistem, petugas loket "
        "<b>tetap dapat mengetikkan nomor lama secara manual</b> tanpa dibatasi.",
    ])

    # SECTION 5
    story += h2("5. Sistem Pengaman: Anti-Duplikasi & Keandalan Data")
    story += bullets([
        "<b>Pemeriksaan Real-Time (Anti-Duplicate Check):</b> Sesaat sebelum nomor ditampilkan di layar, sistem memeriksa "
        "seluruh database. Jika nomor 3741 sudah digunakan oleh staf lain beberapa detik sebelumnya, sistem otomatis "
        "melompat ke nomor berikutnya (3742) yang masih kosong.",
        "<b>Kunci Unik Database (Unique Constraint):</b> Di tingkat database PostgreSQL, kolom No RM diproteksi aturan "
        "ketat sehingga secara teknis mustahil ada dua pasien berbeda memiliki nomor RM yang persis sama.",
        "<b>Tombol Sinkronisasi Cepat (Ikon Petir):</b> Apabila petugas mengubah pilihan desa, tersedia tombol ikon petir "
        "di samping kolom No RM untuk menghitung ulang kode wilayah secara instan.",
    ])

    # SECTION 6
    story += h2("6. Tanya Jawab Praktis (FAQ) untuk dr. Ovan & Tim Klinik")
    story.append(KeepTogether([
        Paragraph("<b>Q1: Apakah dokter saat memeriksa pasien perlu menghafal rumus 9 digit ini?</b>", S["body_bold"]),
        Paragraph("<i>Jawaban:</i> <b>Sama sekali tidak perlu, Dok.</b> Di ruang periksa rekam medis, dokter hanya fokus pada keluhan, riwayat penyakit, diagnosis, tindakan, dan resep obat. Seluruh proses pembentukan nomor berjalan otomatis di loket pendaftaran depan.", S["body"]),
    ]))
    story.append(Spacer(1, 2))

    story.append(KeepTogether([
        Paragraph("<b>Q2: Bagaimana jika pasien berpindah alamat atau desa di kemudian hari?</b>", S["body_bold"]),
        Paragraph("<i>Jawaban:</i> Sesuai standar Permenkes, No RM adalah identitas tetap pasien seumur hidup. Jika pasien pindah rumah, cukup kolom alamatnya yang diperbarui di profil pasien. Nomor RM tidak diubah agar riwayat rekam medis terdahulu tetap menyatu.", S["body"]),
    ]))
    story.append(Spacer(1, 2))

    story.append(KeepTogether([
        Paragraph("<b>Q3: Apakah format nomor 9 digit ini cocok untuk pelaporan bulanan ke Puskesmas?</b>", S["body_bold"]),
        Paragraph("<i>Jawaban:</i> <b>Sangat cocok, Dok.</b> Format 9 digit baku tanpa strip ini seragam di seluruh aplikasi (pendaftaran, rekam medis, kasir, register KB, ANC, PTM, hingga berkas unduhan Excel bulanan). Pelaporan ke Puskesmas menjadi tertib dan rapi.", S["body"]),
    ]))

    # SECTION 7
    story += h2("7. Kesimpulan & Penutup")
    story.append(body(
        "Penerapan Fitur Penomoran Otomatis Berkelanjutan (F-017) ini adalah jalan tengah yang paling aman dan praktis:"
    ))
    story += bullets([
        "<b>Menghormati dan mengamankan 3.750 data pasien lama</b> dari Google Sheet klinik tanpa risiko tertimpa.",
        "<b>Mempercepat pelayanan loket</b> karena nomor terbuat otomatis dalam 1 klik tanpa perhitungan manual.",
        "<b>Menjaga standar operasional klinik</b> sesuai arahan dr. Ovan dan manajemen Klinik Pratama Cikidang Medika.",
    ])
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=0.5, color=RULE, spaceAfter=4))
    story.append(Paragraph(
        "<i>Dokumen ini diterbitkan oleh Pengembang Sistem sebagai panduan resmi arsitektur dan operasional "
        "penomoran rekam medis Klinik Pratama Cikidang Medika.</i>",
        S["small"]
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF dibuat:", out_path)


if __name__ == "__main__":
    for path in output_paths():
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        build(path)
