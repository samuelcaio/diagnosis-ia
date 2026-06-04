import os

root_dir = r"c:\Users\samue\Downloads\diagnosis-ia-clinical-fullstack (1)\diagnosis-ia\diagnosis-mvp\frontend"
for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith('.tsx'):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f, 1):
                        if ('fixed' in line or 'absolute' in line) and ('z-' in line or 'bg-opacity' in line or 'bg-black' in line or 'bg-slate' in line or 'inset-0' in line):
                            print(f"{filename}:{i} -> {line.strip()}")
            except Exception as e:
                pass
