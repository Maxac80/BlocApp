import re
import os

# Fișierele care trebuie actualizate
files = [
    'src/hooks/useExpenseConfigurations.js',
    'src/hooks/useMaintenanceCalculation.js',
    'src/components/modals/MaintenanceBreakdownModal.js',
    'src/components/expenses/shared/DifferenceCalculations.js',
    'src/components/expenses/shared/ConsumptionComponents.js',
    'src/components/expenses/ConsumptionInput.js',
    'src/components/expenses/ExpenseList.js',
    'src/components/views/ExpensesViewNew.js',
    'src/components/modals/ExpenseConfigModal.js',
    'src/components/modals/ExpenseEntryModal.js'
]

def update_file(filepath):
    fullpath = os.path.join('C:\\blocapp', filepath)
    if not os.path.exists(fullpath):
        print(f'Nu există: {filepath}')
        return False

    with open(fullpath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = []

    # 1. Actualizează backward compatibility existentă și adaugă 'total'
    old_compat = """    // Backward compatibility: mapează valorile vechi la cele noi
    if (receptionMode === 'per_blocuri') {
      receptionMode = 'per_block';
    } else if (receptionMode === 'per_scari') {
      receptionMode = 'per_stair';
    }"""

    new_compat = """    // Backward compatibility: mapează valorile vechi la cele noi
    if (receptionMode === 'per_blocuri') {
      receptionMode = 'per_block';
    } else if (receptionMode === 'per_scari') {
      receptionMode = 'per_stair';
    } else if (receptionMode === 'total') {
      receptionMode = 'per_association';
    }"""

    if old_compat in content:
        content = content.replace(old_compat, new_compat)
        changes.append("Actualizat backward compatibility")

    # 2. Înlocuiește valorile default 'total' cu 'per_association'
    # Doar pentru assignment-uri, NU pentru comparații
    patterns = [
        (r"receptionMode\s*=\s*'total'", "receptionMode = 'per_association'"),
        (r"receptionMode:\s*'total'", "receptionMode: 'per_association'"),
        (r'receptionMode\s*=\s*"total"', 'receptionMode = "per_association"'),
        (r'receptionMode:\s*"total"', 'receptionMode: "per_association"'),
        (r"\|\|\s*'total'", "|| 'per_association'"),
        (r'\|\|\s*"total"', '|| "per_association"'),
    ]

    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            changes.append(f"Înlocuit pattern: {pattern}")
            content = new_content

    # 3. Actualizează comparațiile să folosească 'per_association'
    # DOAR pentru partea din dreapta a comparației (valoarea constantă)
    comparison_patterns = [
        # === și !==
        (r"===\s*'total'", "=== 'per_association'"),
        (r'===\s*"total"', '=== "per_association"'),
        (r"!==\s*'total'", "!== 'per_association'"),
        (r'!==\s*"total"', '!== "per_association"'),
    ]

    for pattern, replacement in comparison_patterns:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            changes.append(f"Actualizat comparație: {pattern}")
            content = new_content

    if content != original_content:
        with open(fullpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'OK Actualizat: {filepath}')
        for change in changes:
            print(f'  - {change}')
        return True
    else:
        print(f'- Neschimbat: {filepath}')
        return False

print("Actualizare 'total' -> 'per_association'...\n")

updated_count = 0
for filepath in files:
    if update_file(filepath):
        updated_count += 1

print(f'\nOK Finalizat! {updated_count}/{len(files)} fisiere actualizate.')
