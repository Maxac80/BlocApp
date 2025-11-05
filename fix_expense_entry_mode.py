import re
import os

# Pattern pentru blocul de cod care mapează expenseEntryMode
pattern = r'''    if \(expense\.expenseEntryMode\) \{
      if \(expense\.expenseEntryMode === 'building'\) receptionMode = 'per_block';
      else if \(expense\.expenseEntryMode === 'staircase'\) receptionMode = 'per_stair';
      else if \(expense\.expenseEntryMode === 'total'\) receptionMode = 'total';
    \} else if \(receptionMode === 'per_blocuri'\) \{
      receptionMode = 'per_block';
    \} else if \(receptionMode === 'per_scari'\) \{
      receptionMode = 'per_stair';
    \}'''

replacement = '''    // Backward compatibility
    if (receptionMode === 'per_blocuri') {
      receptionMode = 'per_block';
    } else if (receptionMode === 'per_scari') {
      receptionMode = 'per_stair';
    }'''

# Pattern simplificat (fără else if per_blocuri)
pattern_simple = r'''    if \(expense\.expenseEntryMode\) \{
      if \(expense\.expenseEntryMode === 'building'\) receptionMode = 'per_block';
      else if \(expense\.expenseEntryMode === 'staircase'\) receptionMode = 'per_stair';
      else if \(expense\.expenseEntryMode === 'total'\) receptionMode = 'total';
    \}'''

replacement_simple = '''    // expenseEntryMode removed - using receptionMode directly'''

files = [
    'src/components/expenses/ConsumptionInput.js',
    'src/components/expenses/shared/ConsumptionComponents.js',
    'src/components/expenses/shared/DifferenceCalculations.js',
    'src/components/modals/MaintenanceBreakdownModal.js'
]

for filepath in files:
    fullpath = os.path.join('C:\\blocapp', filepath)
    if os.path.exists(fullpath):
        with open(fullpath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Înlocuire pattern complet
        content = re.sub(pattern, replacement, content)

        # Înlocuire pattern simplificat
        content = re.sub(pattern_simple, replacement_simple, content)

        with open(fullpath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f'Actualizat: {filepath}')
    else:
        print(f'Nu există: {filepath}')

print('\\nGata!')
