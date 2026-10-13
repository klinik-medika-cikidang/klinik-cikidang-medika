"""Render two PDFs for dr. Ade Sofyan (dr. Ovan) after the 13 October 2026 finance fix.

1. Jawaban-Pembaruan-Buku-Kas-13-Okt-2026.pdf answers the three questions the doctor raised.
2. Panduan-Rumus-Kartu-Keuangan.pdf explains every finance card with the formula the app runs
   (src/app/page.tsx, src/app/buku-kas/page.tsx, src/app/laporan/page.tsx). Card names must
   match the labels on screen, so update this file whenever a card label changes.

Real numbers in document 1 come from production records checked on 13 October 2026. Document 2
uses labelled illustration numbers only.

Usage:
    python scripts/generate_keuangan_update_20261013_pdf.py
"""

import os

from reportlab.graphics.shapes import Circle, Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

FONT_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")


def register_fonts():
    # Segoe UI covers the minus sign and arrows that the built-in Helvetica cannot draw.
    try:
        pdfmetrics.registerFont(TTFont("Body", os.path.join(FONT_DIR, "segoeui.ttf")))
        pdfmetrics.registerFont(TTFont("Body-Bold", os.path.join(FONT_DIR, "segoeuib.ttf")))
        pdfmetrics.registerFont(TTFont("Body-Italic", os.path.join(FONT_DIR, "segoeuii.ttf")))
        pdfmetrics.registerFont(TTFont("Body-BoldItalic", os.path.join(FONT_DIR, "segoeuiz.ttf")))
        addMapping("Body", 0, 0, "Body")
        addMapping("Body", 1, 0, "Body-Bold")
        addMapping("Body", 0, 1, "Body-Italic")
        addMapping("Body", 1, 1, "Body-BoldItalic")
        return "Body", "Body-Bold", "Body-Italic", "\u2212", "\u2192"
    except Exception:
        return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "-", "->"


F, FB, FI, MINUS, ARROW = register_fonts()

INK = colors.HexColor("#0F172A")
BODY = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748B")
RULE = colors.HexColor("#E2E8F0")
WHITE = colors.white
TEAL = colors.HexColor("#0F766E")
TEAL_SOFT = colors.HexColor("#F0FDFA")
TEAL_LINE = colors.HexColor("#99F6E4")
EMERALD = colors.HexColor("#047857")
EMERALD_SOFT = colors.HexColor("#ECFDF5")
ROSE = colors.HexColor("#BE123C")
ROSE_SOFT = colors.HexColor("#FFF1F2")
INDIGO = colors.HexColor("#4338CA")
INDIGO_SOFT = colors.HexColor("#EEF2FF")
AMBER = colors.HexColor("#B45309")
AMBER_SOFT = colors.HexColor("#FFFBEB")
SLATE_SOFT = colors.HexColor("#F8FAFC")

DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads")
PAGE_W, PAGE_H = A4
MARGIN = 1.7 * cm
WIDTH = PAGE_W - 2 * MARGIN

S = {
    "h1": ParagraphStyle("h1", fontName=FB, fontSize=11.5, leading=15, textColor=INK, spaceBefore=10, spaceAfter=5, keepWithNext=True),
    "h2": ParagraphStyle("h2", fontName=FB, fontSize=9.6, leading=13, textColor=TEAL, spaceBefore=6, spaceAfter=3, keepWithNext=True),
    "body": ParagraphStyle("body", fontName=F, fontSize=9, leading=13.2, textColor=BODY, spaceAfter=4),
    "lead": ParagraphStyle("lead", fontName=F, fontSize=9.8, leading=14.2, textColor=INK, spaceAfter=6),
    "small": ParagraphStyle("small", fontName=F, fontSize=7.8, leading=11, textColor=MUTED),
    "cell": ParagraphStyle("cell", fontName=F, fontSize=8.3, leading=11.6, textColor=BODY),
    "cell_b": ParagraphStyle("cell_b", fontName=FB, fontSize=8.3, leading=11.6, textColor=INK),
    "head": ParagraphStyle("head", fontName=FB, fontSize=8, leading=11, textColor=WHITE),
    "quote": ParagraphStyle("quote", fontName=FI, fontSize=8.6, leading=12.2, textColor=MUTED),
    "label": ParagraphStyle("label", fontName=FB, fontSize=7.4, leading=9.6, textColor=MUTED),
    "big": ParagraphStyle("big", fontName=FB, fontSize=10.4, leading=13.6, textColor=INK),
    "chip_t": ParagraphStyle("chip_t", fontName=FB, fontSize=9, leading=12, textColor=INK),
    "chip_b": ParagraphStyle("chip_b", fontName=F, fontSize=8, leading=11, textColor=BODY),
    "box_t": ParagraphStyle("box_t", fontName=FB, fontSize=8.2, leading=10.8, textColor=INK, alignment=1),
    "box_s": ParagraphStyle("box_s", fontName=F, fontSize=7.2, leading=9.4, textColor=BODY, alignment=1),
    "op": ParagraphStyle("op", fontName=FB, fontSize=14, leading=16, textColor=MUTED, alignment=1),
}


def P(text, style="body"):
    return Paragraph(text, S[style])


def doc_header(title, subtitle, meta):
    def draw(c, _doc):
        c.saveState()
        c.setFillColor(TEAL)
        c.rect(0, PAGE_H - 4.1 * cm, PAGE_W, 4.1 * cm, stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#CCFBF1"))
        c.setFont(FB, 8)
        c.drawString(MARGIN, PAGE_H - 1.25 * cm, "KLINIK PRATAMA CIKIDANG MEDIKA")
        c.setFillColor(WHITE)
        c.setFont(FB, 17)
        c.drawString(MARGIN, PAGE_H - 2.15 * cm, title)
        c.setFont(F, 9.5)
        c.drawString(MARGIN, PAGE_H - 2.85 * cm, subtitle)
        c.setFillColor(colors.HexColor("#CCFBF1"))
        c.setFont(F, 8)
        c.drawString(MARGIN, PAGE_H - 3.45 * cm, meta)
        c.restoreState()

    return draw


def make_canvas(running_title):
    class NumberedCanvas(canvas.Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._pages = []

        def showPage(self):
            self._pages.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            total = len(self._pages)
            for state in self._pages:
                self.__dict__.update(state)
                self.saveState()
                if self._pageNumber > 1:
                    self.setFillColor(TEAL)
                    self.setFont(FB, 7.6)
                    self.drawString(MARGIN, PAGE_H - 1.1 * cm, running_title)
                    self.setStrokeColor(RULE)
                    self.line(MARGIN, PAGE_H - 1.25 * cm, PAGE_W - MARGIN, PAGE_H - 1.25 * cm)
                self.setStrokeColor(RULE)
                self.line(MARGIN, 1.3 * cm, PAGE_W - MARGIN, 1.3 * cm)
                self.setFillColor(MUTED)
                self.setFont(F, 7.4)
                self.drawString(MARGIN, 0.95 * cm, "Sistem Informasi Manajemen Klinik Cikidang Medika")
                self.drawRightString(PAGE_W - MARGIN, 0.95 * cm, "Halaman %d dari %d" % (self._pageNumber, total))
                self.restoreState()
                canvas.Canvas.showPage(self)
            canvas.Canvas.save(self)

    return NumberedCanvas


def boxed(flowables, bg, line, pad=9):
    t = Table([[flowables]], colWidths=[WIDTH])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 3, line),
        ("LEFTPADDING", (0, 0), (-1, -1), pad + 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), pad - 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad - 1),
    ]))
    return t


def note(title, text, tone="amber"):
    bg, line = {"amber": (AMBER_SOFT, AMBER), "teal": (TEAL_SOFT, TEAL), "indigo": (INDIGO_SOFT, INDIGO)}[tone]
    return boxed([P("<b>%s</b> %s" % (title, text), "cell")], bg, line)


def table(header, rows, widths, first_bold=True):
    data = [[P(h, "head") for h in header]]
    for row in rows:
        data.append([P(v, "cell_b" if (i == 0 and first_bold) else "cell") for i, v in enumerate(row)])
    t = Table(data, colWidths=[w * WIDTH for w in widths], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SLATE_SOFT]),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def formula(parts, caption=None):
    """parts: list of (title, subtitle, tone) boxes joined by operator strings."""
    tones = {
        "emerald": (EMERALD_SOFT, EMERALD), "rose": (ROSE_SOFT, ROSE), "indigo": (INDIGO_SOFT, INDIGO),
        "teal": (TEAL, TEAL), "slate": (SLATE_SOFT, MUTED),
    }
    cells, widths, styles = [], [], []
    box_count = sum(1 for p in parts if isinstance(p, tuple))
    op_w = 0.045 * WIDTH
    box_w = (WIDTH - op_w * (len(parts) - box_count)) / box_count
    for i, part in enumerate(parts):
        if isinstance(part, tuple):
            title, sub, tone = part
            bg, line = tones[tone]
            if tone == "teal":
                cells.append([Paragraph(title, ParagraphStyle("bt", parent=S["box_t"], textColor=WHITE)),
                              Paragraph(sub, ParagraphStyle("bs", parent=S["box_s"], textColor=colors.HexColor("#CCFBF1")))])
            else:
                cells.append([P(title, "box_t"), P(sub, "box_s")])
            widths.append(box_w)
            styles += [("BACKGROUND", (i, 0), (i, 0), bg), ("BOX", (i, 0), (i, 0), 0.9, line)]
        else:
            cells.append(P(part, "op"))
            widths.append(op_w)
    t = Table([cells], colWidths=widths)
    t.setStyle(TableStyle(styles + [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    items = [t]
    if caption:
        items += [Spacer(1, 3), P(caption, "small")]
    return KeepTogether(items)


def before_after(before, after):
    t = Table(
        [[P("SEBELUM", "label"), P("SEKARANG", "label")], [P(before, "cell"), P(after, "cell")]],
        colWidths=[WIDTH / 2 - 4, WIDTH / 2 - 4],
        spaceBefore=2,
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), ROSE_SOFT),
        ("BACKGROUND", (1, 0), (1, -1), EMERALD_SOFT),
        ("TEXTCOLOR", (0, 0), (0, 0), ROSE),
        ("LINEABOVE", (0, 0), (0, 0), 2, ROSE),
        ("LINEABOVE", (1, 0), (1, 0), 2, EMERALD),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 7),
        ("COLUMNGAP", (0, 0), (-1, -1), 8),
    ]))
    return t


def question_block(number, title, quote):
    size = 22
    badge = Drawing(size, size)
    badge.add(Circle(size / 2, size / 2, size / 2, fillColor=TEAL, strokeColor=TEAL))
    badge.add(String(size / 2, size / 2 - 4.2, number, fontName=FB, fontSize=11.5, fillColor=WHITE, textAnchor="middle"))
    title_style = ParagraphStyle("qt", parent=S["h1"], spaceBefore=0, spaceAfter=2)
    t = Table([[badge, [Paragraph(title, title_style), P("Masukan dokter: \u201c%s\u201d" % quote, "quote")]]],
              colWidths=[1.0 * cm, WIDTH - 1.0 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def question_section(number, title, quote, before, after):
    return [Spacer(1, 12), KeepTogether([question_block(number, title, quote), before_after(before, after)])]


def chips(items):
    cells = []
    for title, text in items:
        cells.append([P(title, "chip_t"), Spacer(1, 2), P(text, "chip_b")])
    gap = 6
    w = (WIDTH - gap * (len(items) - 1)) / len(items)
    t = Table([cells], colWidths=[w] * len(items))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TEAL_SOFT),
        ("LINEABOVE", (0, 0), (-1, 0), 2.5, TEAL),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("INNERGRID", (0, 0), (-1, -1), 3, WHITE),
    ]))
    return t


def legend(rows):
    data = []
    for color_bg, color_line, badge, meaning in rows:
        swatch = Table([[P("<b>%s</b>" % badge, "cell")]], colWidths=[0.36 * WIDTH])
        swatch.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), color_bg),
            ("BOX", (0, 0), (-1, -1), 0.8, color_line),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        data.append([swatch, P(meaning, "cell")])
    t = Table(data, colWidths=[0.38 * WIDTH, 0.62 * WIDTH])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


def money_flow_diagram():
    w, h = WIDTH, 168
    d = Drawing(w, h)
    bw, bh = 128, 40

    def node(x, y, title, sub, fill, line, text_color=INK):
        d.add(Rect(x, y, bw, bh, rx=5, ry=5, fillColor=fill, strokeColor=line, strokeWidth=1))
        d.add(String(x + bw / 2, y + bh - 16, title, fontName=FB, fontSize=8.6, fillColor=text_color, textAnchor="middle"))
        d.add(String(x + bw / 2, y + 9, sub, fontName=F, fontSize=7, fillColor=text_color, textAnchor="middle"))

    def arrow(x1, y1, x2, y2, color, label=None, lx=None, ly=None):
        d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=1.4))
        if x1 == x2:
            sign = -1 if y2 < y1 else 1
            d.add(Polygon([x2, y2, x2 - 4, y2 - 7 * sign, x2 + 4, y2 - 7 * sign], fillColor=color, strokeColor=color))
        else:
            d.add(Polygon([x2, y2, x2 - 7, y2 + 4, x2 - 7, y2 - 4], fillColor=color, strokeColor=color))
        if label:
            d.add(String(lx, ly, label, fontName=FB, fontSize=7.2, fillColor=color, textAnchor="middle"))

    col = [0, (w - bw) / 2, w - bw]
    top, bottom = h - bh - 6, 14

    node(col[0], top, "Pasien bayar tunai", "uang fisik", EMERALD_SOFT, EMERALD)
    node(col[1], top, "Laci Kasir", "dihitung di kartu laci", TEAL, TEAL, WHITE)
    node(col[2], top, "Belanja operasional", "biaya, mengurangi laba", ROSE_SOFT, ROSE)
    node(col[0], bottom, "Transfer, Kapitasi BPJS", "dan kas masuk lain", EMERALD_SOFT, EMERALD)
    node(col[1], bottom, "Rekening / Pemilik", "di luar laci", INDIGO_SOFT, INDIGO)

    mid_top = top + bh / 2
    mid_bottom = bottom + bh / 2
    arrow(col[0] + bw, mid_top, col[1] - 2, mid_top, EMERALD)
    arrow(col[1] + bw, mid_top, col[2] - 2, mid_top, ROSE, "Belanja", (col[1] + bw + col[2]) / 2, mid_top + 6)
    arrow(col[0] + bw, mid_bottom, col[1] - 2, mid_bottom, EMERALD)
    cx = col[1] + bw / 2
    arrow(cx, top - 1, cx, bottom + bh + 2, INDIGO)
    d.add(String(cx + 8, (top + bottom + bh) / 2 + 2, "Setoran", fontName=FB, fontSize=7.4, fillColor=INDIGO))
    d.add(String(cx + 8, (top + bottom + bh) / 2 - 8, "pindah tempat, bukan biaya", fontName=F, fontSize=7, fillColor=INDIGO))
    return d


def build_answer_story():
    s = [Spacer(1, 2.2 * cm)]
    s.append(P(
        "Terima kasih atas masukan Dokter. Ketiga hal yang Dokter sampaikan sudah kami perbaiki dan sudah aktif di "
        "aplikasi. Ringkasnya:", "lead"))
    s.append(chips([
        ("Setoran bukan pengeluaran", "Uang yang disetor ke pemilik tidak lagi mengurangi laba."),
        ("Nominal kecil tersimpan persis", "Ketik 5.000, tersimpan Rp 5.000. Tidak lagi berubah jadi jutaan."),
        ("Sisa laci ikut berkurang", "Belanja dari laci dan setoran langsung memotong sisa uang laci."),
    ]))

    s.extend(question_section(
        "1", "Setoran ke pemilik tidak lagi dihitung sebagai pengeluaran",
        "Ini teh sudah masuk setor tunai ke pemilik, apakah bisa tidak dimasukkan ke pengeluaran, yang 2.400.000?",
        "Semua kas keluar dijumlahkan sebagai pengeluaran, termasuk setoran Rp 2.400.000. Laba terlihat lebih kecil "
        "dan grafik harian bisa tampak defisit.",
        "Setoran dipisahkan. Uangnya hanya pindah dari laci ke pemilik, jadi tidak mengurangi laba. Setoran muncul "
        "di kartu <b>Setor Tunai &amp; Pemilik</b>, ditandai khusus di tabel Buku Kas, dan bisa difilter lewat "
        "tombol <b>Setoran Pemilik/Bank</b>.",
    ))
    s.append(Spacer(1, 6))
    s.append(P("<b>Contoh tanggal 12 Oktober 2026</b>", "h2"))
    s.append(table(
        ["Transaksi", "Dicatat sebagai", "Nominal"],
        [
            ("Gorengan dokter", "Pengeluaran operasional", "Rp 10.000"),
            ("Token listrik dan obat amox", "Pengeluaran operasional", "Rp 213.000"),
            ("Kopi dan biaya admin", "Pengeluaran operasional", "Rp 14.000"),
            ("<b>Total pengeluaran hari itu</b>", "", "<b>Rp 237.000</b>"),
            ("Stor tunai ke pemilik", "Setoran (bukan pengeluaran)", "Rp 2.400.000"),
        ],
        [0.46, 0.32, 0.22], first_bold=False,
    ))
    s.append(Spacer(1, 4))
    s.append(P("Setoran tetap mengurangi uang di laci, karena uangnya memang keluar dari laci. Yang berubah hanya: "
               "setoran tidak lagi dianggap biaya klinik."))

    s.extend(question_section(
        "2", "Kas keluar di bawah Rp 10.000 tersimpan sesuai yang diketik",
        "Dan ini teh kas keluar gak bisa di bawah 10.000, kalau di bawah itu jadinya 1 juta.",
        "Data lama dari Google Sheets ditulis dalam ribuan (150 artinya Rp 150.000). Aplikasi mengalikan angka "
        "kecil dengan 1.000 supaya data lama terbaca benar, tapi aturan itu ikut kena ke input baru. Ketik 5.000, "
        "tersimpan Rp 5.000.000.",
        "Semua data, lama dan baru, sekarang disimpan dalam rupiah penuh. Aplikasi tidak lagi mengalikan angka. "
        "Ketik 5.000, tersimpan Rp 5.000.",
    ))
    s.append(Spacer(1, 5))
    s.append(P(
        "Sudah terbukti di data tanggal 13 Oktober: biaya admin setor tunai <b>Rp 5.000</b> dan teh <b>Rp 8.000</b> "
        "tersimpan persis seperti yang diketik. Form Kas Keluar juga sekarang punya tombol cepat Rp 2.000, Rp 5.000, "
        "Rp 10.000, Rp 25.000, Rp 50.000, dan Rp 100.000."))
    s.append(note(
        "Pengaman tambahan di form tarif pasien.",
        "Kalau di form Rekam Medis atau Pembayaran ada yang mengetik di bawah Rp 1.000 (misalnya 150, kebiasaan dari "
        "Google Sheets), aplikasi akan bertanya \u201cMaksudnya Rp 150.000?\u201d dan menyediakan tombol koreksi. Data "
        "baru bisa disimpan setelah nominalnya benar.", "teal"))

    s.extend(question_section(
        "3", "Belanja dan setoran sekarang memotong sisa uang di laci",
        "Yang ini ada pengeluaran, tapi tidak mempengaruhi sisa fisik di laci om, gimana caranya biar sesuai om?",
        "Sisa laci hanya dihitung dari uang tunai pasien dikurangi setor tunai. Uang yang diambil dari laci untuk "
        "belanja (gorengan, token listrik, obat) tidak ikut dikurangi.",
        "Setiap belanja dari laci dan setiap setoran langsung mengurangi sisa laci. Kartu "
        "<b>Rekonsiliasi Fisik Laci Kasir</b> di halaman Buku Kas memakai rumus di bawah.",
    ))
    s.append(Spacer(1, 8))
    s.append(formula([
        ("Tunai Masuk Laci", "pembayaran tunai pasien yang sudah lunas", "emerald"), MINUS,
        ("Pengeluaran Tunai Laci", "belanja obat, listrik, konsumsi, ATK", "rose"), MINUS,
        ("Disetor ke Pemilik / Bank", "setor tunai dan setor ke pemilik", "indigo"), "=",
        ("Sisa Fisik di Laci Kasir", "uang yang seharusnya ada di laci", "teal"),
    ], "Pasien yang masih antre, belum bayar, atau batal tidak dihitung. Pembayaran transfer tidak masuk laci."))
    s.append(Spacer(1, 8))
    s.append(P("<b>Arti warna dan label di kartu</b>", "h2"))
    s.append(legend([
        (EMERALD_SOFT, EMERALD, "Laci Seimbang (Rp 0)", "Semua uang tunai sudah terpakai belanja atau sudah disetor."),
        (AMBER_SOFT, AMBER, "Ada Sisa Kas di Laci", "Masih ada uang yang seharusnya ada di laci. Angkanya bisa dicocokkan dengan uang fisik."),
        (ROSE_SOFT, ROSE, "Setoran Melebihi Kas Masuk Periode Ini", "Angka minus. Biasanya karena hari itu kasir menyetor uang yang terkumpul dari hari sebelumnya."),
    ]))
    s.append(Spacer(1, 6))
    s.append(P(
        "Kartu punya dua tampilan. <b>Akumulasi</b> menghitung satu bulan penuh, cocok untuk mencocokkan uang di laci "
        "saat ini. <b>Per Tanggal</b> menghitung satu hari, cocok untuk memeriksa transaksi hari tertentu."))

    s.append(P("Satu koreksi tambahan dari kami", "h1"))
    s.append(P(
        "Setelah pembaruan 13 Oktober siang, angka data lama (sebelum 10 Oktober, hasil pindahan dari Google Sheets) "
        "sempat tampil lebih kecil dari aslinya selama beberapa jam. Contohnya, pendapatan Rp 2.605.000 tampil sebagai "
        "Rp 2.605. Data di database tidak berubah dan tidak ada yang hilang; yang keliru hanya cara aplikasi "
        "membacanya."))
    s.append(P(
        "Di hari yang sama kami mencadangkan seluruh data, lalu mengubah data lama ke rupiah penuh secara permanen. "
        "Transaksi yang dicatat lewat aplikasi sejak 10 Oktober tidak ikut diubah. Hasilnya kami cocokkan dengan "
        "Google Sheets asli:"))
    s.append(table(
        ["Oktober 2024", "Di aplikasi sekarang", "Di Google Sheets"],
        [("Pendapatan pasien", "Rp 25.020.000", "Rp 25.020.000"), ("Pengeluaran", "Rp 4.970.000", "Rp 4.970.000")],
        [0.4, 0.3, 0.3],
    ))
    s.append(Spacer(1, 4))
    s.append(P("Dashboard, Buku Kas, dan Laporan juga sekarang memakai aturan yang sama: pendapatan hanya dihitung "
               "dari pasien yang sudah lunas di kasir."))

    s.append(P("Panduan singkat untuk kasir", "h1"))
    s.append(table(
        ["Kalau kasir...", "Pilih menu", "Pilih kategori"],
        [
            ("Membeli obat darurat, reagen, BHP", "Kas Keluar", "Pengeluaran Obat / Operasional"),
            ("Membeli token listrik, air, WiFi", "Kas Keluar", "Operasional &amp; Listrik/Air"),
            ("Membeli konsumsi atau ATK", "Kas Keluar", "Pengeluaran Non Klinik"),
            ("Membayar biaya admin bank saat setor", "Kas Keluar", "Pengeluaran Non Klinik"),
            ("Menyerahkan uang laci ke pemilik", "Kas Keluar", "Setor ke Rekening Pemilik"),
            ("Menyetor uang laci ke rekening klinik", "Kas Masuk", "Setor Tunai"),
            ("Menukar uang pecahan", "Tidak perlu dicatat", "Jumlah uang di laci tidak berubah"),
        ],
        [0.44, 0.2, 0.36],
    ))
    s.append(Spacer(1, 4))
    s.append(P("Nominal selalu diketik dalam rupiah penuh: <b>5000</b> untuk lima ribu rupiah, <b>150000</b> untuk "
               "seratus lima puluh ribu rupiah."))

    s.append(P("Mohon bantuan Dokter untuk memastikan", "h1"))
    s.append(table(
        ["Transaksi", "Yang perlu dipastikan"],
        [
            ("13 Oktober, stor tunai Rp 1.000.000 (dicatat sekitar pukul 12.35 WIB)",
             "Transaksi ini tercatat sebelum perbaikan aktif. Mohon dipastikan ke kasir: yang disetor memang Rp 1.000.000, "
             "atau maksudnya Rp 1.000? Kalau Rp 1.000, transaksinya perlu dikoreksi."),
            ("12 Oktober, Rp 50.000 dengan keterangan tukar uang",
             "Saat ini tercatat sebagai setoran. Kalau sebenarnya tukar uang pecahan, uangnya kembali ke laci, jadi "
             "transaksi ini sebaiknya dihapus."),
        ],
        [0.36, 0.64],
    ))
    s.append(Spacer(1, 8))
    s.append(note(
        "Dua hal yang belum dihitung otomatis.",
        "(1) Sisa uang laci dari akhir bulan sebelumnya belum ikut dihitung, sehingga di awal bulan angka akumulasi "
        "bisa minus. (2) Semua belanja dianggap dibayar dari laci. Kalau ada belanja yang dibayar lewat transfer "
        "pemilik, sisa laci di aplikasi akan lebih kecil dari uang fisik. Penjelasan lengkap setiap angka ada di "
        "dokumen <i>Panduan Rumus Kartu Keuangan</i>."))
    return s


def build_formula_story():
    s = [Spacer(1, 2.2 * cm)]
    s.append(P(
        "Dokumen ini menjelaskan arti setiap angka keuangan di aplikasi dan cara menghitungnya. Nama kartu ditulis "
        "persis seperti yang tampil di layar, supaya mudah dicocokkan.", "lead"))

    s.append(P("1. Alur uang di klinik", "h1"))
    s.append(P("Semua kartu keuangan mengikuti alur ini. Uang tunai pasien masuk laci. Dari laci, uang bisa keluar "
               "untuk belanja (biaya) atau disetor (pindah tempat). Transfer dan kapitasi langsung masuk rekening."))
    s.append(money_flow_diagram())
    s.append(Spacer(1, 6))
    s.append(table(
        ["Istilah", "Artinya"],
        [
            ("Pasien lunas", "Kunjungan yang sudah dibayar di kasir. Pasien yang masih antre, menunggu dokter, menunggu kasir, belum bayar, atau batal tidak dihitung sebagai pendapatan."),
            ("Tagihan pasien", "Biaya periksa ditambah biaya tindakan atau obat tambahan. Pasien BPJS: biaya periksa Rp 0, tetapi biaya tambahan yang dibayar sendiri tetap dihitung."),
            ("Kas masuk lain", "Kas Masuk selain kapitasi dan setoran, misalnya Pendapatan Lain dan Rujukan USG / Lab."),
            ("Pengeluaran operasional", "Semua Kas Keluar kecuali setoran."),
            ("Setoran", "Kategori Setor Tunai dan Setor ke Rekening Pemilik."),
        ],
        [0.24, 0.76],
    ))

    s.append(P("2. Dashboard", "h1"))
    s.append(P("Semua angka mengikuti periode yang dipilih di bagian atas Dashboard."))
    s.append(table(
        ["Kartu di layar", "Artinya", "Rumus"],
        [
            ("Total Kunjungan", "Banyaknya kunjungan pasien.", "Jumlah kunjungan pada periode, tanpa yang batal"),
            ("Pendapatan Umum", "Uang dari pasien umum.", "Jumlah tagihan pasien umum yang lunas, tunai dan transfer"),
            ("Kapitasi BPJS", "Dana kapitasi dari BPJS.", "Jumlah Kas Masuk kategori Kapitasi BPJS"),
            ("Total Pengeluaran", "Biaya operasional klinik.", "Jumlah pengeluaran operasional (setoran tidak termasuk)"),
            ("Saldo Kas Bersih", "Hasil bersih klinik pada periode.",
             "Tagihan pasien lunas (tunai + transfer) + Kapitasi BPJS + Kas masuk lain %s Total Pengeluaran" % MINUS),
            ("Sisa Fisik Laci Loket", "Uang yang seharusnya ada di laci.",
             "Tagihan pasien lunas tunai %s Pengeluaran operasional %s Setoran" % (MINUS, MINUS)),
            ("Rekening &amp; Setoran Pemilik", "Uang yang ada di luar laci.",
             "Kapitasi BPJS + Tagihan pasien lunas transfer + Kas masuk lain + Setoran"),
            ("Rasio Pembayaran", "Porsi uang pasien yang dibayar tunai.", "Tagihan lunas tunai / (tunai + transfer) x 100%"),
            ("Tren Finansial &amp; Arus Kas", "Grafik harian dan bulanan.",
             "Kas masuk = tagihan pasien lunas + Kapitasi + Kas masuk lain. Pengeluaran = pengeluaran operasional. Setoran tidak tampil."),
        ],
        [0.23, 0.27, 0.5],
    ))
    s.append(Spacer(1, 6))
    s.append(formula([
        ("Sisa Fisik Laci Loket", "uang di laci", "teal"), "+",
        ("Rekening &amp; Setoran Pemilik", "uang di luar laci", "indigo"), "=",
        ("Saldo Kas Bersih", "hasil bersih klinik", "emerald"),
    ], "Cara cek cepat: kedua kartu di kiri, kalau dijumlahkan, harus sama dengan Saldo Kas Bersih. Kalau tidak sama, ada data yang perlu diperiksa."))

    s.append(P("3. Buku Kas", "h1"))
    s.append(P("Semua angka mengikuti bulan dan tahun yang dipilih. Kartu ringkasan dan kartu laci hanya tampil untuk pemilik."))
    s.append(table(
        ["Kartu di layar", "Artinya", "Rumus"],
        [
            ("Total Penerimaan Kas", "Uang masuk bulan itu, tanpa transfer pasien.", "Tagihan pasien lunas tunai + Kapitasi BPJS + Kas masuk lain"),
            ("Pengeluaran Operasional", "Biaya operasional bulan itu.", "Jumlah pengeluaran operasional (setoran tidak termasuk)"),
            ("Selisih Kas Bulan Ini", "Penerimaan dikurangi biaya.", "Total Penerimaan Kas %s Pengeluaran Operasional" % MINUS),
            ("Setor Tunai &amp; Pemilik", "Uang yang sudah diserahkan.", "Jumlah semua setoran"),
        ],
        [0.23, 0.32, 0.45],
    ))
    s.append(Spacer(1, 8))
    s.append(P("<b>Kartu Rekonsiliasi Fisik Laci Kasir</b>", "h2"))
    s.append(formula([
        ("Tunai Masuk Laci", "tagihan pasien lunas tunai", "emerald"), MINUS,
        ("Pengeluaran Tunai Laci", "pengeluaran operasional", "rose"), MINUS,
        ("Disetor ke Pemilik / Bank", "semua setoran", "indigo"), "=",
        ("Sisa Fisik di Laci Kasir", "uang yang seharusnya di laci", "teal"),
    ], "Tampilan Akumulasi memakai satu bulan penuh. Tampilan Per Tanggal memakai satu hari di bulan yang sama."))
    s.append(Spacer(1, 6))
    s.append(legend([
        (EMERALD_SOFT, EMERALD, "Laci Seimbang (Rp 0)", "Sisa tepat Rp 0."),
        (AMBER_SOFT, AMBER, "Ada Sisa Kas di Laci", "Sisa lebih dari Rp 0."),
        (ROSE_SOFT, ROSE, "Setoran Melebihi Kas Masuk Periode Ini", "Sisa minus. Biasanya setoran memakai uang dari hari atau bulan sebelumnya."),
        (SLATE_SOFT, MUTED, "Belum Ada Mutasi", "Belum ada uang masuk, belanja, atau setoran pada periode itu."),
    ]))

    s.append(P("4. Laporan", "h1"))
    s.append(P("Angka mengikuti rentang tanggal dan filter yang dipilih (jenis pasien, program, dokter)."))
    s.append(table(
        ["Kartu di layar", "Artinya", "Rumus"],
        [
            ("Volume Kunjungan", "Banyaknya kunjungan, dipecah Umum dan BPJS.", "Jumlah kunjungan sesuai filter, tanpa yang batal"),
            ("Akumulasi Billing Kasir", "Uang dari pasien.", "Jumlah tagihan pasien lunas, tunai dan transfer. Rata-rata per kunjungan = Billing / Volume Kunjungan"),
            ("Arus Kas Bersih (Net Flow)", "Hasil bersih pada rentang itu.",
             "(Billing + Kapitasi BPJS + Kas masuk lain) %s Pengeluaran operasional" % MINUS),
        ],
        [0.23, 0.3, 0.47],
    ))
    s.append(Spacer(1, 4))
    s.append(P("Di file Excel, kunjungan yang belum lunas tetap tercantum untuk keperluan data medis, dengan biaya Rp 0. "
               "Kunjungan batal tidak ikut diekspor."))

    s.append(P("5. Kenapa angka di dua halaman bisa berbeda", "h1"))
    s.append(table(
        ["Angka yang dibandingkan", "Penjelasan"],
        [
            ("Saldo Kas Bersih (Dashboard) dan Selisih Kas Bulan Ini (Buku Kas)",
             "Dashboard memasukkan pembayaran transfer pasien, Buku Kas tidak. Selisih keduanya sama dengan total "
             "transfer pasien pada bulan itu."),
            ("Saldo Kas Bersih (Dashboard) dan Arus Kas Bersih (Laporan)",
             "Hasilnya sama kalau periodenya sama dan Laporan tidak difilter. Filter jenis pasien, program, atau dokter "
             "hanya mengubah Billing."),
            ("Periode", "Dashboard dan Laporan memakai rentang tanggal bebas. Buku Kas selalu satu bulan penuh."),
        ],
        [0.36, 0.64],
    ))

    s.append(P("6. Contoh hitungan", "h1"))
    s.append(note("Angka ilustrasi, bukan data klinik.",
                  "Satu hari dengan tagihan pasien lunas tunai Rp 1.000.000, transfer Rp 200.000, kapitasi dan kas "
                  "masuk lain Rp 0, belanja operasional Rp 100.000, dan setoran ke pemilik Rp 500.000.", "indigo"))
    s.append(Spacer(1, 5))
    s.append(table(
        ["Kartu", "Hitungan", "Hasil"],
        [
            ("Sisa Fisik di Laci Kasir", "1.000.000 %s 100.000 %s 500.000" % (MINUS, MINUS), "Rp 400.000"),
            ("Rekening &amp; Setoran Pemilik", "0 + 200.000 + 0 + 500.000", "Rp 700.000"),
            ("Saldo Kas Bersih (Dashboard)", "1.000.000 + 200.000 + 0 + 0 %s 100.000" % MINUS, "Rp 1.100.000"),
            ("Cara cek cepat", "400.000 + 700.000", "Rp 1.100.000, sama"),
            ("Selisih Kas Bulan Ini (Buku Kas)", "1.000.000 + 0 %s 100.000" % MINUS, "Rp 900.000, tanpa transfer"),
        ],
        [0.34, 0.4, 0.26],
    ))
    s.append(Spacer(1, 8))
    s.append(note(
        "Batasan saat ini.",
        "Kartu laci belum memakai sisa uang dari akhir bulan sebelumnya, dan semua belanja dianggap dibayar dari "
        "laci. Kalau ada belanja yang dibayar lewat transfer pemilik, sisa laci di aplikasi akan lebih kecil dari "
        "uang fisik."))
    return s


def render(filename, story, title, subtitle, meta, running_title):
    path = os.path.join(DOWNLOADS, filename)
    doc = SimpleDocTemplate(
        path, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=1.8 * cm, bottomMargin=1.8 * cm,
        title=title, author="Klinik Pratama Cikidang Medika",
    )
    doc.build(story, onFirstPage=doc_header(title, subtitle, meta), canvasmaker=make_canvas(running_title))
    print(f"Generated PDF: {path}")


def main():
    os.makedirs(DOWNLOADS, exist_ok=True)
    render(
        "Jawaban-Pembaruan-Buku-Kas-13-Okt-2026.pdf",
        build_answer_story(),
        "Jawaban atas Masukan Dokter",
        "Buku Kas dan Laci Kasir",
        "Untuk dr. Ade Sofyan (dr. Ovan)  \u2022  13 Oktober 2026  \u2022  Sudah aktif di aplikasi",
        "Jawaban atas Masukan Dokter: Buku Kas dan Laci Kasir",
    )
    render(
        "Panduan-Rumus-Kartu-Keuangan.pdf",
        build_formula_story(),
        "Panduan Rumus Kartu Keuangan",
        "Arti dan cara menghitung setiap angka di Dashboard, Buku Kas, dan Laporan",
        "Untuk dr. Ade Sofyan (dr. Ovan), pemilik, dan kasir  \u2022  Berlaku sejak 13 Oktober 2026",
        "Panduan Rumus Kartu Keuangan",
    )


if __name__ == "__main__":
    main()
