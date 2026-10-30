"""Shared look for the clinic's client-facing PDFs (reports and the handbook).

Screenshots are re-encoded as JPEG at a moderate width so a document with many
figures stays small enough to send over WhatsApp.
"""

import os
import tempfile

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import HRFlowable, Image, KeepTogether, Paragraph, Spacer, Table, TableStyle

BLACK = colors.HexColor("#0F172A")
INK = colors.HexColor("#1E293B")
BODY = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748B")
RULE = colors.HexColor("#CBD5E1")
GRID = colors.HexColor("#E2E8F0")
TEAL_DARK = colors.HexColor("#0F766E")
TEAL_MED = colors.HexColor("#0D9488")
TEAL_LIGHT = colors.HexColor("#F0FDFA")
TEAL_BORDER = colors.HexColor("#99F6E4")
AMBER_BG = colors.HexColor("#FFFBEB")
AMBER_BORDER = colors.HexColor("#F59E0B")
AMBER_TEXT = colors.HexColor("#92400E")
EMERALD = colors.HexColor("#047857")
WHITE = colors.white

CONTENT_WIDTH = 17.8 * cm

S = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=BLACK, spaceAfter=2),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=9.5, leading=13, textColor=TEAL_DARK, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11, leading=14.5, textColor=TEAL_DARK, spaceBefore=8, spaceAfter=2.5, keepWithNext=True),
    "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=9.2, leading=12.5, textColor=INK, spaceBefore=6, spaceAfter=2, keepWithNext=True),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=8.8, leading=12.8, textColor=BODY, alignment=TA_LEFT, spaceAfter=3),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=8.8, leading=12.6, textColor=BODY, leftIndent=11, firstLineIndent=-8, spaceAfter=2),
    "step": ParagraphStyle("step", fontName="Helvetica", fontSize=8.8, leading=12.6, textColor=BODY, leftIndent=14, firstLineIndent=-12, spaceAfter=2.2),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=7.6, leading=10.5, textColor=MUTED),
    "caption": ParagraphStyle("caption", fontName="Helvetica-Oblique", fontSize=7.6, leading=10.5, textColor=MUTED, alignment=TA_CENTER, spaceBefore=2, spaceAfter=6),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=8, leading=11, textColor=BODY),
    "cell_bold": ParagraphStyle("cell_bold", fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=BLACK),
    "cellhead": ParagraphStyle("cellhead", fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=WHITE),
    "callout": ParagraphStyle("callout", fontName="Helvetica", fontSize=8.4, leading=12, textColor=TEAL_DARK),
    "warn": ParagraphStyle("warn", fontName="Helvetica", fontSize=8.4, leading=12, textColor=AMBER_TEXT),
}


def numbered_canvas(running_title):
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
                self._decorate(page_count)
                canvas.Canvas.showPage(self)
            canvas.Canvas.save(self)

        def _decorate(self, page_count):
            self.saveState()
            self.setStrokeColor(RULE)
            self.setLineWidth(0.5)
            if self._pageNumber > 1:
                self.line(1.6 * cm, 28.5 * cm, 19.4 * cm, 28.5 * cm)
                self.setFont("Helvetica-Bold", 7.5)
                self.setFillColor(TEAL_DARK)
                self.drawString(1.6 * cm, 28.7 * cm, running_title)
            self.line(1.6 * cm, 1.35 * cm, 19.4 * cm, 1.35 * cm)
            self.setFont("Helvetica", 7.5)
            self.setFillColor(MUTED)
            self.drawString(1.6 * cm, 1.0 * cm, "Klinik Pratama Cikidang Medika • Sistem Informasi Manajemen Klinik")
            self.drawRightString(19.4 * cm, 1.0 * cm, "Halaman %d dari %d" % (self._pageNumber, page_count))
            self.restoreState()

    return NumberedCanvas


def h2(text):
    return [Spacer(1, 2), Paragraph(text, S["h2"]), HRFlowable(width="100%", thickness=0.8, color=TEAL_MED, spaceAfter=4)]


def boxed(paragraph_text, kind="info"):
    style, bg, border = (S["callout"], TEAL_LIGHT, TEAL_MED) if kind == "info" else (S["warn"], AMBER_BG, AMBER_BORDER)
    t = Table([[Paragraph(paragraph_text, style)]], colWidths=[CONTENT_WIDTH])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.8, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def table(header, rows, widths, bold_first_col=True):
    data = [[Paragraph(h, S["cellhead"]) for h in header]]
    for row in rows:
        data.append([
            Paragraph(str(c), S["cell_bold"] if (i == 0 and bold_first_col) else S["cell"]) for i, c in enumerate(row)
        ])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TEAL_DARK),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


_TMP = tempfile.mkdtemp(prefix="clinic-pdf-")


def figure(png_path, caption, width=CONTENT_WIDTH, max_height=11.5 * cm):
    """A bordered screenshot with a caption, re-encoded as JPEG and scaled to fit."""
    im = PILImage.open(png_path).convert("RGB")
    if im.width > 1800:
        im = im.resize((1800, int(im.height * 1800 / im.width)), PILImage.LANCZOS)
    out = os.path.join(_TMP, os.path.splitext(os.path.basename(png_path))[0] + ".jpg")
    im.save(out, "JPEG", quality=84, optimize=True)
    w = width
    h = w * im.height / im.width
    if h > max_height:
        h = max_height
        w = h * im.width / im.height
    img = Image(out, width=w, height=h)
    frame = Table([[img]], colWidths=[w + 6])
    frame.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    frame.hAlign = "CENTER"
    return KeepTogether([frame, Paragraph(caption, S["caption"])])


def bullets(items, style="bullet", marker="•"):
    return [Paragraph(f"{marker}&nbsp;&nbsp;{t}", S[style]) for t in items]


def steps(items):
    return [Paragraph(f"<b>{i}.</b>&nbsp;&nbsp;{t}", S["step"]) for i, t in enumerate(items, 1)]


def info_grid(rows, widths=(8.9 * cm, 8.9 * cm)):
    """Two-column box of label/value pairs for a document header or sign-off."""
    data = [[Paragraph(c, S["cell"]) for c in row] for row in rows]
    t = Table(data, colWidths=list(widths))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def build(story, out_path, title, running_title, copies=()):
    """Render the story to out_path, then copy the file to each path in copies."""
    import shutil

    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=1.6 * cm, rightMargin=1.6 * cm, topMargin=1.8 * cm, bottomMargin=1.8 * cm,
        title=title, author="Klinik Pratama Cikidang Medika",
    )
    doc.build(story, canvasmaker=numbered_canvas(running_title))
    print("Generated", out_path, "%.0f KB" % (os.path.getsize(out_path) / 1024))
    for c in copies:
        os.makedirs(os.path.dirname(c), exist_ok=True)
        shutil.copyfile(out_path, c)
        print("Copied to", c)
