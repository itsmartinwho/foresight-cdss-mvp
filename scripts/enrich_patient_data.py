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


def enrich_patients(input_file_path, output_file_path):
    enriched_patients_data = []
    existing_full_names = set()

    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)

    patient_alerts_map = {}
    for i, patient_id_to_assign in enumerate(ASSIGN_ALERT_TO_PATIENT_IDS):
        if i < len(MOCK_ALERTS_DEFINITIONS):
            alert_data_copy = MOCK_ALERTS_DEFINITIONS[i].copy()
            alert_data_copy['patientId'] = patient_id_to_assign
            patient_alerts_map[patient_id_to_assign] = [alert_data_copy]
        else:
            break

    with open(input_file_path, 'r', newline='', encoding='utf-8-sig') as infile: # Added utf-8-sig
        reader = csv.reader(infile, delimiter='\t')
        raw_header = next(reader)
        header = [h.strip() for h in raw_header] # Strip whitespace from headers
        
        output_header = header + ['firstName', 'lastName', 'name', 'alertsJSON']
        enriched_patients_data.append(output_header)
        
        try:
            patient_id_col_index = header.index('PatientID') 
        except ValueError:
            print(f"Error: 'PatientID' column not found in header: {header}")
            print("Please ensure the first column in PatientCorePopulatedTable.txt is PatientID and tab-separated.")
            return # Stop processing if header is wrong

        for row_idx, row in enumerate(reader):
            while len(row) < len(header):
                row.append('')
            # Use the cleaned header for creating the dictionary
            patient_data_dict = dict(zip(header, row)) 
            current_patient_id = patient_data_dict.get('PatientID')
            gender = patient_data_dict.get('PatientGender', 'Unknown') 
            if not gender: 
                 print(f"Warning: PatientID {current_patient_id} at source row {row_idx+2} has empty gender. Defaulting to 'Unknown'.")
                 gender = 'Unknown'

            first_name, last_name, full_name = generate_unique_name(existing_full_names, gender)
            
            alerts_for_this_patient_json = "[]"
            if current_patient_id in patient_alerts_map:
                alerts_for_this_patient_json = json.dumps(patient_alerts_map[current_patient_id])
            
            enriched_patients_data.append(row + [first_name, last_name, full_name, alerts_for_this_patient_json])

    with open(output_file_path, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.writer(outfile, delimiter='\t')
        writer.writerows(enriched_patients_data)
    print(f"Enriched patient data (with alertsJSON) written to {output_file_path}")

if __name__ == '__main__':
    # Assuming script is in a 'scripts' directory at workspace root
    # and data is in 'data/100-patients/' relative to workspace root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Get workspace root
    
    patient_input_file = os.path.join(base_dir, 'data', '100-patients', 'PatientCorePopulatedTable.txt')
    patient_output_file = os.path.join(base_dir, 'data', '100-patients', 'Enriched_Patients.tsv')
    
    enrich_patients(patient_input_file, patient_output_file) 