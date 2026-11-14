with open(r'C:\PBL6\docs\kiem-thu\rebuild_162_with_realistic_lifecycle.py', 'r', encoding='utf-8') as f:
    text = f.read()

for tid in ['U03', 'U17']:
    target = f"'{tid}'"
    idx = text.find(target)
    if idx != -1:
        print(f"=== Found {target} in rebuild_162 at {idx} ===")
        print(text[max(0, idx-50):min(len(text), idx+600)])
        print("="*60)
