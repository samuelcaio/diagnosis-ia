import os

root_dir = r"c:\Users\samue\Downloads\diagnosis-ia-clinical-fullstack (1)\diagnosis-ia\diagnosis-mvp"
for dirpath, dirnames, filenames in os.walk(root_dir):
    if "node_modules" in dirpath or "target" in dirpath or ".git" in dirpath:
        continue
    for filename in filenames:
        if filename.endswith(('.tsx', '.ts')):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'JSON.parse' in content:
                        print(f"Found JSON.parse in {filepath}")
            except Exception as e:
                pass
