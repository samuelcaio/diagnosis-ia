import os

root_dir = r"c:\Users\samue\Downloads\diagnosis-ia-clinical-fullstack (1)\diagnosis-ia\diagnosis-mvp\frontend"
for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith(('.tsx', '.ts')):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'inset-0' in content or 'fixed bg-' in content or 'bg-opacity' in content or 'z-50' in content or 'backdrop-blur' in content:
                        print(f"Found overlay keyword in {filepath}")
            except Exception as e:
                pass
