#!/usr/bin/env python3
import json
import re

def extract_subset():
    with open('public/data/synthetic-data3.json', 'r') as f:
        content = f.read()
    
    # Find the start of each record
    record_starts = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        if '"patient_supabase_id":' in line:
            record_starts.append(i)
    
    print(f"Found {len(record_starts)} records")
    
    # Extract first 10 complete records
    if len(record_starts) >= 10:
        # Find where the 10th record ends
        start_line = 0
        end_line = record_starts[10] if len(record_starts) > 10 else len(lines)
        
        # Build the subset
        subset_lines = ['{\n  "synthetic_data": [']
        
        # Add records 1-10
        for i in range(10):
            start = record_starts[i]
            end = record_starts[i+1] if i+1 < len(record_starts) else len(lines)
            
            if i > 0:
                subset_lines.append('    },')
            
            # Add the record
            for j in range(start, min(end, len(lines))):
                if lines[j].strip() and not lines[j].strip().startswith('}'):
                    subset_lines.append(lines[j])
                elif lines[j].strip() == '}' and j < end - 1:
                    subset_lines.append(lines[j])
                    break
        
        subset_lines.append('    }')
        subset_lines.append('  ]')
        subset_lines.append('}')
        
        with open('public/data/synthetic-data3-subset.json', 'w') as f:
            f.write('\n'.join(subset_lines))
        
        print("Created subset file")
    else:
        print("Not enough records found")

if __name__ == "__main__":
    extract_subset() 