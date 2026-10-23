"""Convert bookleaf_sample_data.json into Bubble-importable CSVs.

Usage: python3 tools/build_csv.py <path/to/bookleaf_sample_data.json>

Bubble's importer wants one CSV per data type, dates as MM/DD/YYYY and list
fields as comma-separated values inside one cell.

`overdue_after` is pre-computed (last payout date, or publication date if the
book was never paid, + 90 days) because Bubble searches can't do date
arithmetic on a field: storing the threshold lets "is this book overdue?"
become a plain search constraint `overdue_after < Current date/time`.
"""
import csv
import json
import sys
from datetime import date, timedelta
from pathlib import Path

OVERDUE_DAYS = 90
OUT = Path(__file__).resolve().parent.parent / "data"


def us_date(iso):
    return date.fromisoformat(iso).strftime("%m/%d/%Y") if iso else ""


def overdue_after(book):
    since = book["last_royalty_payout_date"] or book["publication_date"]
    if not since or book["royalty_pending"] <= 0:
        return ""
    return (date.fromisoformat(since) + timedelta(days=OVERDUE_DAYS)).strftime("%m/%d/%Y")


def blank_if_none(v):
    return "" if v is None else v


def main(src):
    data = json.loads(Path(src).read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=True)

    with open(OUT / "authors.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["author_code", "name", "email", "phone", "city", "joined_date"])
        for a in data["authors"]:
            w.writerow([a["author_id"], a["name"], a["email"], a["phone"], a["city"], us_date(a["joined_date"])])

    with open(OUT / "books.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([
            "book_code", "author_code", "title", "isbn", "genre", "status", "publication_date", "mrp",
            "royalty_per_copy", "copies_sold", "royalty_earned", "royalty_paid", "royalty_pending",
            "last_payout_date", "overdue_after", "print_partner", "available_on",
        ])
        for a in data["authors"]:
            for b in a["books"]:
                w.writerow([
                    b["book_id"], a["author_id"], b["title"], b["isbn"], b["genre"], b["status"],
                    us_date(b["publication_date"]), blank_if_none(b["mrp"]), blank_if_none(b["author_royalty_per_copy"]),
                    b["total_copies_sold"], b["total_royalty_earned"], b["royalty_paid"], b["royalty_pending"],
                    us_date(b["last_royalty_payout_date"]), overdue_after(b), blank_if_none(b["print_partner"]),
                    ",".join(b["available_on"]),
                ])

    # Sanity: earned = paid + pending for every book
    bad = [b["book_id"] for a in data["authors"] for b in a["books"]
           if b["total_royalty_earned"] != b["royalty_paid"] + b["royalty_pending"]]
    print(f"authors={len(data['authors'])} books={sum(len(a['books']) for a in data['authors'])} mismatched={bad or 'none'}")


if __name__ == "__main__":
    main(sys.argv[1])
