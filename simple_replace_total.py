import os
import sys

# Set UTF-8 encoding for stdout
sys.stdout.reconfigure(encoding='utf-8')

files = [
    'src/components/expenses/ConsumptionInput.js',
    'src/components/expenses/ExpenseList.js',
    'src/components/expenses/shared/DifferenceCalculations.js',
    'src/components/expenses/shared/ConsumptionComponents.js',
    'src/components/modals/ExpenseConfigModal.js',
    'src/components/modals/ExpenseEntryModal.js',
]

for filepath in files:
    fullpath = os.path.join('C:\\blocapp', filepath)
    if os.path.exists(fullpath):
        with open(fullpath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        # Replace all 'total' with 'per_association' for receptionMode
        content = content.replace("=== 'total'", "=== 'per_association'")
        content = content.replace('=== "total"', '=== "per_association"')
        content = content.replace("!== 'total'", "!== 'per_association'")
        content = content.replace('!== "total"', '!== "per_association"')

        if content != original:
            with open(fullpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'OK: {filepath}')
        else:
            print(f'SKIP: {filepath}')

print('Done!')
