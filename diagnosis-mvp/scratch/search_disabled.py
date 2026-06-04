import os

root_dir = r"c:\Users\samue\Downloads\diagnosis-ia-clinical-fullstack (1)\diagnosis-ia\diagnosis-mvp\frontend"
for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith('.tsx'):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'pointer-events' in content or 'disable' in content or 'opacity' in content:
                        print(f"Found in {filename}")
            except Exception as e:
                pass
