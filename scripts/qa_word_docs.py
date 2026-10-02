"""Render exported Word PDFs to page PNGs and compact review sheets.

QA artifacts stay in the temporary directory and are not deliverables.
"""

from __future__ import annotations

import csv
import os
import sys
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw, ImageFont, ImageOps


PDF_DIR = Path(os.environ["TEMP"]) / "pbl6-word-qa" / "pdf"
OUT_DIR = Path(os.environ["TEMP"]) / "pbl6-word-qa" / "pages"
SHEET_DIR = Path(os.environ["TEMP"]) / "pbl6-word-qa" / "sheets"
OUT_DIR.mkdir(parents=True, exist_ok=True)
SHEET_DIR.mkdir(parents=True, exist_ok=True)


def render_document(path: Path, writer: csv.writer) -> tuple[int, int]:
    doc = pdfium.PdfDocument(str(path))
    page_count = len(doc)
    stem = path.stem
    page_dir = OUT_DIR / stem
    page_dir.mkdir(exist_ok=True)
    for stale in page_dir.glob("page-*.png"):
        stale.unlink()
    for stale in SHEET_DIR.glob(f"{stem}-*.png"):
        stale.unlink()
    page_imgs: list[Path] = []
    suspect = 0
    for number in range(page_count):
        page = doc[number]
        image = page.render(scale=1.5).to_pil().convert("RGB")
        image_path = page_dir / f"page-{number + 1}.png"
        image.save(image_path, optimize=True)
        page_imgs.append(image_path)
        text_page = page.get_textpage()
        chars = text_page.count_chars()
        # Only flag extremely sparse pages; diagrams often legitimately have
        # few characters. The contact sheets are the visual QA authority.
        is_suspect = chars < 12
        suspect += int(is_suspect)
        writer.writerow([stem, number + 1, page_count, chars, int(is_suspect)])
        text_page.close()
        page.close()

    thumb_width, thumb_height = 710, 970
    gap, label_height = 20, 30
    for start in range(0, page_count, 4):
        sheet = Image.new(
            "RGB", (thumb_width * 2 + gap * 3, (thumb_height + label_height) * 2 + gap * 3), "#E8ECEF"
        )
        draw = ImageDraw.Draw(sheet)
        for local, png in enumerate(page_imgs[start : start + 4]):
            with Image.open(png) as full:
                thumb = ImageOps.contain(full, (thumb_width, thumb_height), Image.Resampling.LANCZOS)
            x = gap + (local % 2) * (thumb_width + gap)
            y = gap + (local // 2) * (thumb_height + label_height + gap)
            draw.rectangle((x - 1, y - 1, x + thumb_width + 1, y + thumb_height + 1), fill="white", outline="#A8ADB3")
            sheet.paste(thumb, (x + (thumb_width - thumb.width) // 2, y + (thumb_height - thumb.height) // 2))
            draw.text((x + 6, y + thumb_height + 5), f"{stem} — page {start + local + 1}", fill="black")
        sheet.save(SHEET_DIR / f"{stem}-{start//4 + 1:02d}.png", optimize=True)
    doc.close()
    return page_count, suspect


def main() -> None:
    total_pages = 0
    total_suspect = 0
    with (SHEET_DIR / "page-stats.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["document", "page", "page_count", "characters", "sparse"])
        paths = sorted(PDF_DIR.glob("*.pdf"))
        if len(sys.argv) > 1:
            selected = set(sys.argv[1:])
            paths = [path for path in paths if path.stem in selected]
        for path in paths:
            pages, suspect = render_document(path, writer)
            total_pages += pages
            total_suspect += suspect
            print(f"{path.stem}: {pages} pages, {suspect} sparse")
    print(f"TOTAL: {total_pages} pages, {total_suspect} sparse")


if __name__ == "__main__":
    main()
