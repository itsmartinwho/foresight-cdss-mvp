#!/usr/bin/env python3
"""Transform AdmissionsCorePopulatedTable.txt to new consultation schema.

For every row:
• Rename AdmissionStartDate -> ConsultationActualStart
• Rename AdmissionEndDate   -> ConsultationActualEnd
• Add ConsultationScheduledStart  (same as AdmissionStartDate for 100-patient data)
• Add ConsultationScheduledEnd    (same as AdmissionEndDate   for 100-patient data)
• Add ConsultationScheduledDuration (minutes difference between scheduled end and start)

The original file is backed up with .bak3 extension.
"""
import csv
from datetime import datetime
from pathlib import Path
import shutil

DATA_DIR = Path("data/100-patients")
FILE_PATH = DATA_DIR / "AdmissionsCorePopulatedTable.txt"
BACKUP_PATH = FILE_PATH.with_suffix(".txt.bak3")

FORMAT = "%Y-%m-%d %H:%M:%S.%f"  # existing format with milliseconds


def main():
    shutil.copy2(FILE_PATH, BACKUP_PATH)
    rows = []
    with FILE_PATH.open() as f:
        raw_header = f.readline().lstrip("\ufeff").rstrip("\n")
        headers = raw_header.split("\t")

        # Determine whether file is already in new format
        has_old_cols = "AdmissionStartDate" in headers
        if not has_old_cols:
            print("File already appears to be transformed – no action taken.")
            return

        reader = csv.DictReader(f, fieldnames=headers, delimiter="\t")
        for r in reader:
            start = r["AdmissionStartDate"].strip()
            end = r["AdmissionEndDate"].strip()
            # Duration in minutes
            try:
                dt_start = datetime.strptime(start, FORMAT)
                dt_end = datetime.strptime(end, FORMAT)
                duration_min = int((dt_end - dt_start).total_seconds() / 60)
            except Exception:
                duration_min = ""

            rows.append({
                "PatientID": r["PatientID"],
                "AdmissionID": r["AdmissionID"],
                "ConsultationActualStart": start,
                "ConsultationActualEnd": end,
                "ConsultationScheduledStart": start,  # for 100-patient dataset scheduled == actual
                "ConsultationScheduledEnd": end,
                "ConsultationScheduledDuration": duration_min,
            })

    fieldnames = [
        "PatientID",
        "AdmissionID",
        "ConsultationActualStart",
        "ConsultationActualEnd",
        "ConsultationScheduledStart",
        "ConsultationScheduledEnd",
        "ConsultationScheduledDuration",
    ]
    with FILE_PATH.open("w", newline="") as f:
        writer = csv.DictWriter(f, delimiter="\t", fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print("Admissions table transformed. Backup at", BACKUP_PATH)


if __name__ == "__main__":
    main() 