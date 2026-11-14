import json
import re

with open(r'C:\PBL6\docs\kiem-thu\all_tcs.json', 'r', encoding='utf-8') as f:
    tcs = json.load(f)

for tc in tcs:
    if tc['id'] in ['U03', 'U17']:
        print(f"ID: {tc['id']}")
        print(f"Sheet: {tc['sheet']}")
        print(f"Desc: {tc['desc']}")
        print(f"Procedure: {tc['procedure']}")
        print(f"Expected: {tc['expected']}")
        print(f"R1: {tc['r1_status']} | Tester: {tc['r1_tester']}")
        print(f"R2: {tc['r2_status']} | Tester: {tc['r2_tester']}")
        print(f"R3: {tc['r3_status']} | Tester: {tc['r3_tester']}")
        print(f"Note: {tc['note']}")
        print("="*60)
