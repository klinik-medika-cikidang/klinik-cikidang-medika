"""Render the F-010 validation appendix from the single source JSON.

Reads docs/data/f010-review-lists.json and writes two artifacts from the same data:
  1. docs/data/f010-lampiran-validasi-2026-10-08.md   (PII, gitignored)
  2. <Downloads>/Lampiran-Validasi-Data-Klinik-Cikidang-Medika-2026-10-08.pdf

The appendix lists the exact spreadsheet rows the clinic must check: visits with no
exam date, the 18 visits needing review, and the 23 circumcision patients. It carries
patient names and No RM, so it is never written into a tracked file.

Usage:
    python scripts/generate_f010_lampiran_pdf.py
"""

import json
import os
from xml.sax.saxutils import escape

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

BLACK = colors.HexColor("#000000")
BODY = colors.HexColor("#333333")
MUTED = colors.HexColor("#666666")
RULE = colors.HexColor("#D4D4D4")
FILL_LIGHT = colors.HexColor("#F5F5F5")
WHITE = colors.HexColor("#FFFFFF")

DOC_DATE = "8 Oktober 2026"
DOC_TITLE = "Lampiran Validasi Data"
DOC_SUBTITLE = "Klinik Pratama Cikidang Medika"
DOC_RUNNING = "Lampiran Validasi Data - Klinik Pratama Cikidang Medika"
PDF_NAME = "Lampiran-Validasi-Data-Klinik-Cikidang-Medika-2026-10-08.pdf"

SOURCE_JSON = os.path.join("docs", "data", "f010-review-lists.json")
MD_PATH = os.path.join("docs", "data", "f010-lampiran-validasi-2026-10-08.md")

RULE_NOTE = {
    "RM_SAJA": "Nama pada kunjungan kosong. Nama diambil dari data pasien dengan No RM yang sama.",
    "NAMA_AMBIGU": "Nama pada kunjungan cocok ke lebih dari satu pasien. Pasien hasil ditentukan otomatis dan bisa berbeda dari No RM di baris ini; mohon dipastikan pasien yang benar.",
}


def esc(value):
    return escape(str(value if value not in (None, "") else "-"))


def downloads_dir():
    return os.path.join(os.path.expanduser("~"), "Downloads")


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
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=BLACK, spaceAfter=2),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=11, leading=15, textColor=MUTED, spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=BLACK, spaceBefore=12, spaceAfter=5),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=BODY, alignment=TA_LEFT, spaceAfter=4),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=8.5, leading=11, textColor=BODY),
    "cellhead": ParagraphStyle("cellhead", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=WHITE),
}


def h2(text):
    return [Spacer(1, 2), Paragraph(text, S["h2"]), HRFlowable(width="100%", thickness=0.5, color=RULE, spaceAfter=6)]


def data_table(header, rows, widths):
    data = [[Paragraph(esc(cell), S["cellhead"]) for cell in header]]
    for row in rows:
        data.append([Paragraph(esc(cell), S["cell"]) for cell in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
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


def build_pdf(data, out_path):
    no_date = data["noDateRows"]
    review = sorted(data["reviewRows"], key=lambda row: row["baris"] or 0)
    sunat = data["sunatPatients"]

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
            ["Tanggal", DOC_DATE],
            ["Untuk", "dr. Ovan, dr. Neneng, dan staf klinik"],
            ["Dari", "Pengembang"],
            ["Isi", "Tiga daftar baris untuk dicek langsung di berkas Excel"],
            ["Sifat", "Internal. Memuat nama pasien dan No RM, hanya untuk validasi klinik."],
        ],
        [3.2 * cm, 13.6 * cm],
    ))

    story += h2("Cara Memakai Lampiran Ini")
    story.append(Paragraph(
        "Buka berkas rekam medis yang Bapak/Ibu kirim di Excel, lalu lihat nomor baris "
        "(Baris Excel) pada setiap daftar di bawah. Cocokkan No RM dan nama pasien. "
        "Baris 1 pada Excel adalah judul kolom, sehingga data pertama ada di baris 2.",
        S["body"],
    ))

    story += h2("A. Kunjungan tanpa tanggal periksa (%d baris)" % len(no_date))
    story.append(Paragraph(
        "Baris ini tidak memiliki tanggal periksa. Mohon ditentukan apakah tanggalnya dilengkapi "
        "atau barisnya diabaikan.", S["body"],
    ))
    story.append(data_table(
        ["Baris Excel", "No RM", "Nama", "Tgl Lahir", "Desa", "Dokter", "Diagnosa"],
        [[r["baris"], r["noRm"], r["nama"], r["tglLahir"], r["desa"], r["dokter"], r["diagnosa"]] for r in no_date],
        [1.7 * cm, 2.1 * cm, 3.7 * cm, 2.1 * cm, 2.3 * cm, 2.1 * cm, 3.4 * cm],
    ))

    story += h2("B. Kunjungan yang perlu ditinjau (%d baris)" % len(review))
    story.append(Paragraph(
        "Nomor RM pada baris ini sudah cocok, tetapi nama pada kunjungan perlu dipastikan. "
        "Kolom terakhir menjelaskan alasan baris tersebut ditandai.", S["body"],
    ))
    story.append(data_table(
        ["Baris Excel", "No RM di Kunjungan", "Nama di Kunjungan", "No RM Pasien Hasil", "Nama Pasien Hasil", "Catatan"],
        [[r["baris"], r["noRmSumber"], r["namaSumber"], r["noRmHasil"], r["namaHasil"], RULE_NOTE.get(r["aturan"], r["aturan"])] for r in review],
        [1.5 * cm, 2.1 * cm, 3.2 * cm, 2.1 * cm, 3.5 * cm, 5.0 * cm],
    ))

    story += h2("C. Anak sunat yang dibuatkan nomor baru (%d pasien)" % len(sunat))
    story.append(Paragraph(
        "Pasien ini tercatat pada berkas tindakan sunat tetapi belum ada di data pasien, sehingga "
        "sistem membuatkan nomor RM baru. Mohon dipastikan nomor dan namanya benar.", S["body"],
    ))
    story.append(data_table(
        ["No RM", "Nama", "Tgl Lahir", "Desa"],
        [[r["noRm"], r["nama"], r["tglLahir"], r["desa"]] for r in sunat],
        [2.6 * cm, 7.0 * cm, 2.8 * cm, 5.0 * cm],
    ))

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=0.5, color=RULE, spaceAfter=6))
    story.append(Paragraph(
        "Lampiran ini memuat data pasien. Mohon tidak disebarkan ke luar keperluan validasi klinik.",
        S["small"],
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    return out_path


def build_markdown(data, out_path):
    no_date = data["noDateRows"]
    review = sorted(data["reviewRows"], key=lambda row: row["baris"] or 0)
    sunat = data["sunatPatients"]

    lines = []
    lines.append("# Lampiran Validasi Data")
    lines.append("")
    lines.append("**Klinik Pratama Cikidang Medika**  ")
    lines.append("Tanggal: %s  " % DOC_DATE)
    lines.append("Untuk: dr. Ovan, dr. Neneng, dan staf klinik")
    lines.append("")
    lines.append("Berisi data pasien. Berkas ini tidak di-commit ke repositori, hanya untuk validasi klinik.")
    lines.append("")
    lines.append("## Cara Memakai")
    lines.append("")
    lines.append("Buka berkas rekam medis di Excel, lalu lihat nomor baris pada setiap daftar. "
                 "Baris 1 Excel adalah judul kolom, jadi data pertama ada di baris 2.")
    lines.append("")

    lines.append("## A. Kunjungan tanpa tanggal periksa (%d baris)" % len(no_date))
    lines.append("")
    lines.append("| Baris Excel | No RM | Nama | Tgl Lahir | Desa | Dokter | Diagnosa |")
    lines.append("|---|---|---|---|---|---|---|")
    for r in no_date:
        lines.append("| %s | %s | %s | %s | %s | %s | %s |" % (
            r["baris"], r["noRm"], r["nama"], r["tglLahir"], r["desa"], r["dokter"], r["diagnosa"]))
    lines.append("")

    lines.append("## B. Kunjungan yang perlu ditinjau (%d baris)" % len(review))
    lines.append("")
    lines.append("| Baris Excel | No RM di Kunjungan | Nama di Kunjungan | No RM Pasien Hasil | Nama Pasien Hasil | Catatan |")
    lines.append("|---|---|---|---|---|---|")
    for r in review:
        lines.append("| %s | %s | %s | %s | %s | %s |" % (
            r["baris"], r["noRmSumber"], r["namaSumber"], r["noRmHasil"], r["namaHasil"],
            RULE_NOTE.get(r["aturan"], r["aturan"])))
    lines.append("")

    lines.append("## C. Anak sunat yang dibuatkan nomor baru (%d pasien)" % len(sunat))
    lines.append("")
    lines.append("| No RM | Nama | Tgl Lahir | Desa |")
    lines.append("|---|---|---|---|")
    for r in sunat:
        lines.append("| %s | %s | %s | %s |" % (r["noRm"], r["nama"], r["tglLahir"], r["desa"]))
    lines.append("")

    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    return out_path


def main():
    with open(SOURCE_JSON, "r", encoding="utf-8") as handle:
        data = json.load(handle)

    pdf_dir = downloads_dir()
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = build_pdf(data, os.path.join(pdf_dir, PDF_NAME))
    md_path = build_markdown(data, MD_PATH)

    print("PDF  :", pdf_path)
    print("MD   :", md_path)
    print("Baris: tanpa tanggal=%d, perlu ditinjau=%d, anak sunat=%d" % (
        len(data["noDateRows"]), len(data["reviewRows"]), len(data["sunatPatients"])))


if __name__ == "__main__":
    main()
