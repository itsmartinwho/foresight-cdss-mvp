#!/usr/bin/env python3
import json
import re
import sys
import os

def repair_json_file(input_path, output_path):
    """Repair malformed JSON file by fixing common issues"""
    print(f"Repairing JSON file: {input_path}")
    
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("Applying JSON repairs...")
        
        # Fix missing quotes around property names
        content = re.sub(r'(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', content)
        
        # Fix missing quotes around verification_status values
        content = re.sub(r'"verification_status":\s*([a-zA-Z_][a-zA-Z0-9_]*)', r'"verification_status": "\1"', content)
        
        # Fix missing quotes around reference_range values
        content = re.sub(r'"reference_range":\s*([^",\n\r\}]+)', r'"reference_range": "\1"', content)
        
        # Remove duplicate patient_id fields
        content = re.sub(r'"patient_id":\s*"[^"]*",\s*"patient_id":', '"patient_id":', content)
        
        # Remove unwanted id fields
        content = re.sub(r',?\s*"id":\s*"[^"]*"', '', content)
        
        # Fix trailing commas before closing braces/brackets
        content = re.sub(r',(\s*[\}\]])', r'\1', content)
        
        # Fix empty objects with commas
        content = re.sub(r'\{\s*,', '{', content)
        
        # Fix missing commas between objects
        content = re.sub(r'\}\s*\{', '},\n{', content)
        
        # Try to parse and validate
        try:
            parsed = json.loads(content)
            print("✅ JSON repaired successfully!")
            
            # Write repaired content
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(parsed, f, indent=2)
            
            print(f"Repaired JSON saved to: {output_path}")
            
            if 'synthetic_data' in parsed:
                print(f"Found {len(parsed['synthetic_data'])} records in repaired data.")
            
            return True
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON still malformed after basic repairs: {e}")
            
            # Try more aggressive line-by-line repair
            print("Attempting line-by-line repair...")
            return repair_line_by_line(content, output_path)
            
    except Exception as e:
        print(f"Error repairing JSON: {e}")
        return False

def repair_line_by_line(content, output_path):
    """Attempt to repair JSON line by line"""
    lines = content.split('\n')
    repaired_lines = []
    
    for i, line in enumerate(lines):
        original_line = line
        
        # Skip empty lines
        if not line.strip():
            repaired_lines.append(line)
            continue
        
        # Fix common line-level issues
        line = re.sub(r'(\s*)"([^"]+)"\s*:\s*([^",\n\r\}\]]+)(\s*[,\}\]])', 
                     lambda m: f'{m.group(1)}"{m.group(2)}": "{m.group(3).strip()}"{m.group(4)}' 
                     if not re.match(r'^-?\d+(\.\d+)?$|^(true|false|null)$', m.group(3).strip()) 
                     else original_line, line)
        
        repaired_lines.append(line)
    
    repaired_content = '\n'.join(repaired_lines)
    
    try:
        parsed = json.loads(repaired_content)
        print("✅ JSON repaired with line-by-line approach!")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(parsed, f, indent=2)
        
        print(f"Repaired JSON saved to: {output_path}")
        
        if 'synthetic_data' in parsed:
            print(f"Found {len(parsed['synthetic_data'])} records in repaired data.")
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Line-by-line repair also failed: {e}")
        
        # As a last resort, try to extract individual records
        return extract_individual_records(content, output_path)

def extract_individual_records(content, output_path):
    """Extract individual valid records from malformed JSON"""
    print("Attempting to extract individual valid records...")
    
    # Find all potential record blocks
    record_pattern = r'\{\s*"patient_supabase_id"[^}]*(?:\{[^}]*\}[^}]*)*\}'
    potential_records = re.findall(record_pattern, content, re.DOTALL)
    
    valid_records = []
    
    for i, record_text in enumerate(potential_records):
        try:
            # Try to parse each record individually
            record = json.loads(record_text)
            valid_records.append(record)
            print(f"✅ Extracted record {i+1}")
        except json.JSONDecodeError:
            print(f"❌ Skipped malformed record {i+1}")
    
    if valid_records:
        final_data = {"synthetic_data": valid_records}
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, indent=2)
        
        print(f"✅ Extracted {len(valid_records)} valid records to: {output_path}")
        return True
    else:
        print("❌ No valid records could be extracted")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python repair_malformed_json.py <input_file> <output_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} does not exist")
        sys.exit(1)
    
    success = repair_json_file(input_file, output_file)
    sys.exit(0 if success else 1) 