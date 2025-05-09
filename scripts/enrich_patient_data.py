import csv
import random
import os
import json # Import json module

# Define more extensive lists for better name generation
MALE_FIRST_NAMES = [
    "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", 
    "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark",
    "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian",
    "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob",
    "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott",
    "Brandon", "Benjamin", "Samuel", "Gregory", "Frank", "Alexander", "Patrick",
    "Raymond", "Jack", "Dennis", "Jerry"
]
FEMALE_FIRST_NAMES = [
    "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", 
    "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Margaret", "Betty", "Sandra",
    "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Dorothy", "Carol",
    "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura",
    "Cynthia", "Kathleen", "Amy", "Shirley", "Angela", "Helen", "Anna", "Brenda",
    "Pamela", "Nicole", "Emma", "Samantha", "Katherine", "Christine", "Debra",
    "Rachel", "Catherine", "Carolyn", "Janet"
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Martin", "Lee", "Perez", "Thompson", "White",
    "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
    "Allen", "King", "Wright", "Scott", "Green", "Baker", "Adams", "Nelson",
    "Hill", "Campbell", "Mitchell", "Roberts", "Carter", "Phillips", "Evans",
    "Turner", "Torres", "Parker", "Collins"
]

# Pastel color palette (hex without #)
PASTEL_COLORS = [
    "AFCBFF",  # light blue
    "FFE5B4",  # peach
    "D0F0C0",  # tea green
    "FFDFD3",  # light pink
    "E6E6FA"   # lavender
]

# Define the mock alerts data (ensure structure matches ComplexCaseAlert type as closely as possible)
# Note: patientId will be set when assigning to a specific patient row.
MOCK_ALERTS_DEFINITIONS = [
    {
        "id": "ALR-017",
        "msg": "Possible vasculitis – refer to rheumatology",
        "date": "Today 08:11", 
        "severity": "High",
        "confidence": 0.87,
        "type": "autoimmune", # Example type
        "triggeringFactors": ["Persistent fever", "Elevated ESR"],
        "suggestedActions": ["Rheumatology consult", "Check ANCA levels"],
        "createdAt": "2023-10-26T08:11:00Z", # Example ISO date
        "acknowledged": False
    },
    {
        "id": "ALR-018",
        "msg": "Consider lung CT – persistent cough 6 mo",
        "date": "Yesterday 17:40",
        "severity": "Medium",
        "confidence": 0.71,
        "type": "oncology", # Example type
        "triggeringFactors": ["Chronic cough", "History of smoking"],
        "suggestedActions": ["Chest X-Ray if not done", "Pulmonology referral", "Low-dose CT scan"],
        "createdAt": "2023-10-25T17:40:00Z",
        "acknowledged": False
    },
]

# Patient IDs to assign these alerts to (these should exist in your PatientCorePopulatedTable.txt)
ASSIGN_ALERT_TO_PATIENT_IDS = [
    'FB2ABB23-C9D0-4D09-8464-49BF0B982F0F',
    '64182B95-EB72-4E2B-BE77-8050B71498CE'
]

DEMO_PATIENT_PHOTOS = {
    '1': 'https://i.pravatar.cc/60?u=mg',
    '2': 'https://i.pravatar.cc/60?u=jl',
    '3': 'https://i.pravatar.cc/60?u=pp'
}

# Core data for patients 1, 2, 3 to ensure they exist
CORE_DEMO_PATIENTS_DATA = {
    '1': {
        "PatientID": "1", "PatientGender": "Female", "PatientDateOfBirth": "1988-04-17",
        "firstName": "Maria", "lastName": "Gomez", "name": "Maria Gomez",
        "photo": "https://i.pravatar.cc/60?u=mg",
        "PatientRace": "Unknown", "PatientMaritalStatus": "Unknown", "PatientLanguage": "English", "PatientPopulationPercentageBelowPoverty": "0"
    },
    '2': {
        "PatientID": "2", "PatientGender": "Male", "PatientDateOfBirth": "1972-11-05",
        "firstName": "James", "lastName": "Lee", "name": "James Lee",
        "photo": "https://i.pravatar.cc/60?u=jl",
        "PatientRace": "Unknown", "PatientMaritalStatus": "Unknown", "PatientLanguage": "English", "PatientPopulationPercentageBelowPoverty": "0"
    },
    '3': {
        "PatientID": "3", "PatientGender": "Female", "PatientDateOfBirth": "1990-07-09",
        "firstName": "Priya", "lastName": "Patel", "name": "Priya Patel",
        "photo": "https://i.pravatar.cc/60?u=pp",
        "PatientRace": "Unknown", "PatientMaritalStatus": "Unknown", "PatientLanguage": "English", "PatientPopulationPercentageBelowPoverty": "0"
    }
}

def generate_unique_name(existing_names, gender):
    attempts = 0
    while attempts < 1000: # Max attempts to find a unique name
        first = random.choice(MALE_FIRST_NAMES if gender.lower() == 'male' else FEMALE_FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        full_name = f"{first} {last}"
        if full_name not in existing_names:
            existing_names.add(full_name)
            return first, last, full_name
        attempts += 1
    # Fallback if unique name not found after many attempts
    timestamp = random.randint(1000,9999)
    first = random.choice(MALE_FIRST_NAMES if gender.lower() == 'male' else FEMALE_FIRST_NAMES)
    last = f"Unique{timestamp}"
    full_name = f"{first} {last}"
    existing_names.add(full_name)
    return first, last, full_name

def compute_pastel_avatar_url(first: str, last: str, patient_id: str) -> str:
    """Return a deterministic ui-avatars.com URL with a pastel background."""
    import hashlib
    idx = int(hashlib.sha256(patient_id.encode()).hexdigest(), 16) % len(PASTEL_COLORS)
    bg = PASTEL_COLORS[idx]
    initials = (first[:1] + last[:1]).upper()
    return f"https://ui-avatars.com/api/?name={initials}&background={bg}&color=ffffff&size=60&rounded=true"

def enrich_patients(input_file_path, output_file_path):
    enriched_rows_map = {} # Use a map to easily update/add patients by ID
    existing_full_names = set()
    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)

    patient_alerts_map = {}
    for i, patient_id_to_assign in enumerate(ASSIGN_ALERT_TO_PATIENT_IDS):
        if i < len(MOCK_ALERTS_DEFINITIONS):
            alert_data_copy = MOCK_ALERTS_DEFINITIONS[i].copy()
            alert_data_copy['patientId'] = patient_id_to_assign
            patient_alerts_map[patient_id_to_assign] = [alert_data_copy]
        else: break

    header_from_file = []
    with open(input_file_path, 'r', newline='', encoding='utf-8-sig') as infile:
        reader = csv.reader(infile, delimiter='\t')
        raw_header = next(reader)
        header_from_file = [h.strip().replace('\ufeff', '') for h in raw_header]
        
        for row_values in reader:
            patient_data_dict = dict(zip(header_from_file, row_values))
            current_patient_id = patient_data_dict.get('PatientID')
            if not current_patient_id: continue

            # Generate names if not already present (e.g. for non-1,2,3 IDs or if they were in file without names)
            if not patient_data_dict.get('firstName') or not patient_data_dict.get('lastName'):
                gender = patient_data_dict.get('PatientGender', 'Unknown')
                if not gender: gender = 'Unknown'
                first_name, last_name, full_name = generate_unique_name(existing_full_names, gender)
                patient_data_dict['firstName'] = first_name
                patient_data_dict['lastName'] = last_name
                patient_data_dict['name'] = full_name
            else:
                existing_full_names.add(patient_data_dict['name']) # Add existing name to set

            enriched_rows_map[current_patient_id] = patient_data_dict

    # Ensure patients 1, 2, 3 are present and have their core demo data
    for demo_id, demo_data in CORE_DEMO_PATIENTS_DATA.items():
        if demo_id in enriched_rows_map:
            # Overlay/update specific fields, keep existing name if generated by unique logic unless demo is more specific
            enriched_rows_map[demo_id].update(demo_data) 
        else:
            # If patient 1,2,3 not in input file at all, create them fully
            enriched_rows_map[demo_id] = demo_data.copy()
            existing_full_names.add(demo_data['name']) # Add their name to the set

    # Assign pastel avatar photos deterministically where missing
    for pid, pdata in enriched_rows_map.items():
        if not pdata.get('photo'):
            # Ensure names exist to build initials
            first = pdata.get('firstName') or ''
            last = pdata.get('lastName') or ''
            avatar_url = compute_pastel_avatar_url(first, last, pid)
            pdata['photo'] = avatar_url

    # Define final output header, ensuring all necessary columns are present
    final_output_header = list(header_from_file) # Start with original file header
    extra_cols = ['firstName', 'lastName', 'name', 'photo', 'alertsJSON']
    for col in extra_cols:
        if col not in final_output_header: final_output_header.append(col)
    
    final_data_to_write = [final_output_header]
    for patient_id, patient_data in enriched_rows_map.items():
        patient_data['alertsJSON'] = json.dumps(patient_alerts_map.get(patient_id, [])) # Assign alerts, default to empty list string
        # Ensure photo is present, defaulting from CORE_DEMO_PATIENTS_DATA if this is a demo ID
        if patient_id in CORE_DEMO_PATIENTS_DATA and not patient_data.get('photo'):
             patient_data['photo'] = CORE_DEMO_PATIENTS_DATA[patient_id].get('photo','')
        
        output_row = [str(patient_data.get(col_name, '')) for col_name in final_output_header] # Ensure all are strings for writer
        final_data_to_write.append(output_row)

        # Specific debug for patients 1, 2, 3 before writing
        if patient_id in ['1', '2', '3']:
            print(f"PYTHON DEBUG: Final data for Patient {patient_id} before write: {output_row}")
            # Also print the dict form for easier field checking
            print(f"PYTHON DEBUG: Final dict for Patient {patient_id}: {patient_data}")

    with open(output_file_path, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.writer(outfile, delimiter='\t')
        writer.writerows(final_data_to_write)
    print(f"Enriched patient data (unified, with photos, alertsJSON) written to {output_file_path}")

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_data_dir = os.path.join(base_dir, 'public', 'data', '100-patients')
    os.makedirs(output_data_dir, exist_ok=True)
    patient_input_file = os.path.join(base_dir, 'data', '100-patients', 'PatientCorePopulatedTable.txt')
    patient_output_file = os.path.join(output_data_dir, 'Enriched_Patients.tsv')
    enrich_patients(patient_input_file, patient_output_file) 