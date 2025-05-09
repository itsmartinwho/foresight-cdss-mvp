import csv
import os
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

def enrich_admissions(admissions_file_path, diagnoses_file_path, output_file_path):
    admissions_data_map = {} 
    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)

    with open(admissions_file_path, 'r', newline='', encoding='utf-8-sig') as adm_file:
        reader = csv.DictReader(adm_file, delimiter='\t')
        for row in reader:
            if 'PatientID' not in row or 'AdmissionID' not in row:
                print(f"Skipping malformed row in admissions file: {row}")
                continue
            key = (row['PatientID'], row['AdmissionID'])
            admissions_data_map[key] = row

    diagnoses_reason_map = {}
    with open(diagnoses_file_path, 'r', newline='', encoding='utf-8-sig') as diag_file:
        reader = csv.DictReader(diag_file, delimiter='\t')
        for row in reader:
            if 'PatientID' not in row or 'AdmissionID' not in row:
                print(f"Skipping malformed row in diagnoses file: {row}")
                continue
            key = (row['PatientID'], row['AdmissionID'])
            if key not in diagnoses_reason_map:
                 diagnoses_reason_map[key] = row.get('PrimaryDiagnosisDescription', 'N/A')

    enriched_admissions_list = []
    output_header = [
        'PatientID', 'AdmissionID', 
        'ScheduledStartDateTime', 'ScheduledEndDateTime', 
        'ActualStartDateTime', 'ActualEndDateTime', 
        'ReasonForVisit'
    ]
    enriched_admissions_list.append(output_header)

    for key, admission_row in admissions_data_map.items():
        patient_id, admission_id = key
        reason = diagnoses_reason_map.get(key, 'No diagnosis description found.')
        
        actual_start_str = admission_row.get('ConsultationActualStart', '')
        actual_end_str = admission_row.get('ConsultationActualEnd', '')
        
        actual_start_dt_obj = parse_datetime_flexible(actual_start_str)
        actual_end_dt_obj = parse_datetime_flexible(actual_end_str)

        final_actual_start_output = format_datetime_iso(actual_start_dt_obj)
        final_actual_end_output = format_datetime_iso(actual_end_dt_obj)

        scheduled_date_orig_str = admission_row.get('ConsultationScheduledDate', '')
        scheduled_duration_orig_str = admission_row.get('ConsultationScheduledDuration', '')

        final_scheduled_start_dt_output = ""
        final_scheduled_end_dt_output = ""

        parsed_scheduled_start_orig_dt_obj = parse_datetime_flexible(scheduled_date_orig_str)

        if parsed_scheduled_start_orig_dt_obj and scheduled_duration_orig_str.isdigit():
            try:
                duration_minutes = int(scheduled_duration_orig_str)
                parsed_scheduled_end_orig_dt_obj = parsed_scheduled_start_orig_dt_obj + timedelta(minutes=duration_minutes)
                
                final_scheduled_start_dt_output = format_datetime_iso(parsed_scheduled_start_orig_dt_obj)
                final_scheduled_end_dt_output = format_datetime_iso(parsed_scheduled_end_orig_dt_obj)
            except ValueError: 
                print(f"Warning: Invalid duration for PatientID {patient_id}, AdmissionID {admission_id}. Using actuals for scheduled times.")
                final_scheduled_start_dt_output = final_actual_start_output
                final_scheduled_end_dt_output = final_actual_end_output
        else: 
            final_scheduled_start_dt_output = final_actual_start_output
            final_scheduled_end_dt_output = final_actual_end_output
            if not scheduled_date_orig_str :
                 pass 
            elif not scheduled_duration_orig_str.isdigit() and parsed_scheduled_start_orig_dt_obj :
                 print(f"Warning: Invalid or missing duration for PatientID {patient_id}, AdmissionID {admission_id} (ScheduledDate: {scheduled_date_orig_str}, Duration: '{scheduled_duration_orig_str}'). Using actuals for scheduled times.")


        output_dict = {
            'PatientID': patient_id,
            'AdmissionID': admission_id,
            'ScheduledStartDateTime': final_scheduled_start_dt_output,
            'ScheduledEndDateTime': final_scheduled_end_dt_output,
            'ActualStartDateTime': final_actual_start_output,
            'ActualEndDateTime': final_actual_end_output,
            'ReasonForVisit': reason
        }
        enriched_admissions_list.append([output_dict.get(h, '') for h in output_header])

    with open(output_file_path, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.writer(outfile, delimiter='\t')
        writer.writerows(enriched_admissions_list)
    print(f"Enriched admissions data written to {output_file_path}")

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 

    admissions_input_file = os.path.join(base_dir, 'data', '100-patients', 'AdmissionsCorePopulatedTable.txt')
    diagnoses_input_file = os.path.join(base_dir, 'data', '100-patients', 'AdmissionsDiagnosesCorePopulatedTable.txt')
    admissions_output_file = os.path.join(base_dir, 'data', '100-patients', 'Enriched_Admissions.tsv')
    
    enrich_admissions(admissions_input_file, diagnoses_input_file, admissions_output_file) 