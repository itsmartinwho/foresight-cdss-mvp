import csv
import random
import os

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
    header = []
    existing_full_names = set()

    # Ensure the output directory exists
    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)

    with open(input_file_path, 'r', newline='', encoding='utf-8') as infile:
        reader = csv.reader(infile, delimiter='\t')
        header = next(reader)
        # Add new columns to the header
        output_header = header + ['firstName', 'lastName', 'name']
        enriched_patients_data.append(output_header)
        
        for row_idx, row in enumerate(reader):
            # Pad row with empty strings if it's shorter than header
            while len(row) < len(header):
                row.append('')
            patient_data = dict(zip(header, row))
            gender = patient_data.get('PatientGender', 'Unknown') 
            if not gender: # Handle empty gender string
                 print(f"Warning: PatientID {patient_data.get('PatientID', 'N/A')} at source row {row_idx+2} has empty gender. Defaulting to 'Unknown'.")
                 gender = 'Unknown'

            first_name, last_name, full_name = generate_unique_name(existing_full_names, gender)
            
            enriched_patients_data.append(row + [first_name, last_name, full_name])

    with open(output_file_path, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.writer(outfile, delimiter='\t')
        writer.writerows(enriched_patients_data)
    print(f"Enriched patient data written to {output_file_path}")

if __name__ == '__main__':
    # Assuming script is in a 'scripts' directory at workspace root
    # and data is in 'data/100-patients/' relative to workspace root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Get workspace root
    
    patient_input_file = os.path.join(base_dir, 'data', '100-patients', 'PatientCorePopulatedTable.txt')
    patient_output_file = os.path.join(base_dir, 'data', '100-patients', 'Enriched_Patients.tsv')
    
    enrich_patients(patient_input_file, patient_output_file) 