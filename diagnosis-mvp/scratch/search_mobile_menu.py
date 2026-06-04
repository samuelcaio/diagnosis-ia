filepath = r"c:\Users\samue\Downloads\diagnosis-ia-clinical-fullstack (1)\diagnosis-ia\diagnosis-mvp\frontend\src\layouts\DashboardLayout.tsx"
try:
    with open(filepath, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            if 'mobileMenuOpen' in line:
                print(f"{i}: {line.strip()}")
except Exception as e:
    print(e)
