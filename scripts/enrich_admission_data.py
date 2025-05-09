import csv
import os
import json # Added for treatmentsJSON
from datetime import datetime, timedelta

def parse_datetime_flexible(datetime_str):
    """Tries to parse a datetime string that might or might not have milliseconds."""
    if not datetime_str or not datetime_str.strip():
        return None
    try:
        return datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S.%f')
    except ValueError:
        try:
            return datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            print(f"Warning: Could not parse datetime string: {datetime_str}")
            return None

def format_datetime_iso(dt_obj):
    """Formats a datetime object to a string consistent with other date strings, including milliseconds."""
    if dt_obj is None:
        return ""
    return dt_obj.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3] # Keep 3 decimal places for ms

# Define mock data for the three specific UPCOMING demo admissions
# This data will be added to the main admissions list.
DEMO_UPCOMING_ADMISSIONS_DATA = [
    {
        "PatientID": "1", "AdmissionID": "demo-upcoming-1", 
        "ScheduledStartDateTime": "2026-02-15 10:00:00.000", "ScheduledEndDateTime": "2026-02-15 10:40:00.000",
        "ActualStartDateTime": "", "ActualEndDateTime": "",
        "ReasonForVisit": "Follow-up appointment",
        "transcript": "Dr.: How have you been feeling since your last visit?\nMaria: Still tired all the time and my hands ache in the morning.\nDr.: Any swelling or redness in the joints?\nMaria: Some swelling, yes.",
        "soapNote": "S: 38-year-old female with 6-month history of symmetric hand pain and morning stiffness (90 min). Denies fever or rash.\nO: MCP and PIP joints tender on palpation, mild edema. ESR 38 mm/h, CRP 18 mg/L, RF positive, anti-CCP strongly positive.\nA: Early rheumatoid arthritis highly likely [1].\nP: Initiate methotrexate 15 mg weekly with folic acid 1 mg daily. Order baseline LFTs, schedule ultrasound of hands in 6 weeks. Discuss exercise and smoking cessation.",
        "treatmentsJSON": json.dumps([
            { "drug": "Methotrexate 15 mg weekly", "status": "Proposed", "rationale": "First-line csDMARD per ACR 2023 guidelines after NSAID failure [3]" },
            { "drug": "Folic acid 1 mg daily", "status": "Supportive", "rationale": "Reduces MTX-induced GI adverse effects [4]" },
        ]),
        "priorAuthJustification": "Failed NSAIDs, elevated CRP 18 mg/L and positive RF/anti-CCP. Methotrexate is first-line DMARD."
    },
    {
        "PatientID": "2", "AdmissionID": "demo-upcoming-2", 
        "ScheduledStartDateTime": "2026-03-18 11:30:00.000", "ScheduledEndDateTime": "2026-03-18 12:10:00.000",
        "ActualStartDateTime": "", "ActualEndDateTime": "",
        "ReasonForVisit": "Pulmonary check",
        "transcript": "", "soapNote": "", "treatmentsJSON": "[]", "priorAuthJustification": ""
    },
    {
        "PatientID": "3", "AdmissionID": "demo-upcoming-3", 
        "ScheduledStartDateTime": "2026-04-12 14:00:00.000", "ScheduledEndDateTime": "2026-04-12 14:40:00.000",
        "ActualStartDateTime": "", "ActualEndDateTime": "",
        "ReasonForVisit": "Weight-loss follow-up",
        "transcript": "", "soapNote": "", "treatmentsJSON": "[]", "priorAuthJustification": ""
    }
]

def enrich_admissions(admissions_file_path, diagnoses_file_path, output_file_path):
    admissions_from_file_map = {}
    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)

    with open(admissions_file_path, 'r', newline='', encoding='utf-8-sig') as adm_file:
        reader = csv.DictReader(adm_file, delimiter='\t')
        for row in reader:
            if 'PatientID' not in row or 'AdmissionID' not in row: continue
            key = (row['PatientID'], row['AdmissionID'])
            admissions_from_file_map[key] = row

    diagnoses_reason_map = {}
    with open(diagnoses_file_path, 'r', newline='', encoding='utf-8-sig') as diag_file:
        reader = csv.DictReader(diag_file, delimiter='\t')
        for row in reader:
            if 'PatientID' not in row or 'AdmissionID' not in row: continue
            key = (row['PatientID'], row['AdmissionID'])
            if key not in diagnoses_reason_map: # Get first diagnosis desc as reason
                 diagnoses_reason_map[key] = row.get('PrimaryDiagnosisDescription', 'N/A')

    all_enriched_admissions_data = []
    # Define the full output header including new JSON fields for complex objects
    output_header = [
        'PatientID', 'AdmissionID', 
        'ScheduledStartDateTime', 'ScheduledEndDateTime', 
        'ActualStartDateTime', 'ActualEndDateTime', 
        'ReasonForVisit', 
        'transcript', 'soapNote', 'treatmentsJSON', 'priorAuthJustification'
    ]
    all_enriched_admissions_data.append(output_header)

    # Process admissions from the core file
    for key, admin_row_from_file in admissions_from_file_map.items():
        patient_id, admission_id = key
        reason = diagnoses_reason_map.get(key, 'No diagnosis description found.')
        
        actual_start_dt = parse_datetime_flexible(admin_row_from_file.get('ConsultationActualStart', ''))
        actual_end_dt = parse_datetime_flexible(admin_row_from_file.get('ConsultationActualEnd', ''))
        
        scheduled_start_dt_str = admin_row_from_file.get('ConsultationScheduledDate', '')
        scheduled_duration_str = admin_row_from_file.get('ConsultationScheduledDuration', '')
        
        scheduled_start_dt_obj = parse_datetime_flexible(scheduled_start_dt_str)
        final_scheduled_start_output = ""
        final_scheduled_end_output = ""

        if scheduled_start_dt_obj and scheduled_duration_str.isdigit():
            try:
                duration_minutes = int(scheduled_duration_str)
                final_scheduled_start_output = format_datetime_iso(scheduled_start_dt_obj)
                final_scheduled_end_output = format_datetime_iso(scheduled_start_dt_obj + timedelta(minutes=duration_minutes))
            except ValueError: # Fallback to actuals if duration causes issue
                final_scheduled_start_output = format_datetime_iso(actual_start_dt)
                final_scheduled_end_output = format_datetime_iso(actual_end_dt)
        else: # If ConsultationScheduledDate is not a full datetime or duration is invalid, use actuals
            final_scheduled_start_output = format_datetime_iso(actual_start_dt)
            final_scheduled_end_output = format_datetime_iso(actual_end_dt)

        output_dict = {
            'PatientID': patient_id, 'AdmissionID': admission_id,
            'ScheduledStartDateTime': final_scheduled_start_output,
            'ScheduledEndDateTime': final_scheduled_end_output,
            'ActualStartDateTime': format_datetime_iso(actual_start_dt),
            'ActualEndDateTime': format_datetime_iso(actual_end_dt),
            'ReasonForVisit': reason,
            'transcript': '', 'soapNote': '', 'treatmentsJSON': '[]', 'priorAuthJustification': '' # Defaults for file-based admissions
        }
        all_enriched_admissions_data.append([output_dict.get(h, '') for h in output_header])

    # Add/Update with specific demo upcoming admissions
    for demo_adm_data in DEMO_UPCOMING_ADMISSIONS_DATA:
        # Check if this demo admission already processed (it shouldn't be, but as a safeguard)
        # This simple append assumes demo admission IDs are unique and not in the core file with same ID.
        # If an ID collision strategy is needed, it would go here.
        all_enriched_admissions_data.append([demo_adm_data.get(h, '') for h in output_header])

    with open(output_file_path, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.writer(outfile, delimiter='\t')
        writer.writerows(all_enriched_admissions_data)
    print(f"Enriched admissions data (including demo upcoming) written to {output_file_path}")

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Ensure the target directory within 'public' exists
    output_data_dir = os.path.join(base_dir, 'public', 'data', '100-patients')
    os.makedirs(output_data_dir, exist_ok=True)

    admissions_input_file = os.path.join(base_dir, 'data', '100-patients', 'AdmissionsCorePopulatedTable.txt')
    diagnoses_input_file = os.path.join(base_dir, 'data', '100-patients', 'AdmissionsDiagnosesCorePopulatedTable.txt')
    # Output to public/data/100-patients/
    admissions_output_file = os.path.join(output_data_dir, 'Enriched_Admissions.tsv')
    
    enrich_admissions(admissions_input_file, diagnoses_input_file, admissions_output_file) 