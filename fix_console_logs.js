const fs = require('fs');
const path = require('path');

function fixConsoleLogsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix multiline console.log statements by commenting each line
    // Pattern: // console.log('...', { followed by lines and ending with });
    const lines = content.split('\n');
    let inMultilineConsole = false;
    let fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line starts a multiline console.log
      if (line.trim().match(/^\/\/ console\.log\([^)]*\{$/)) {
        inMultilineConsole = true;
        fixedLines.push(line);
        continue;
      }
      
      // If we're in a multiline console.log
      if (inMultilineConsole) {
        // Check if this line ends the console.log
        if (line.trim().match(/^\s*\}\);?\s*$/)) {
          // Add comment prefix if not already commented
          if (!line.trim().startsWith('//')) {
            const indent = line.match(/^(\s*)/)[1];
            fixedLines.push(indent + '// ' + line.trim());
          } else {
            fixedLines.push(line);
          }
          inMultilineConsole = false;
        } else {
          // Comment out the line if not already commented
          if (!line.trim().startsWith('//') && line.trim() !== '') {
            const indent = line.match(/^(\s*)/)[1];
            fixedLines.push(indent + '// ' + line.trim());
          } else {
            fixedLines.push(line);
          }
        }
      } else {
        fixedLines.push(line);
      }
    }
    
    const newContent = fixedLines.join('\n');
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      fixedCount += walkDirectory(fullPath);
    } else if (file.endsWith('.js')) {
      if (fixConsoleLogsInFile(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

// Start from src directory
const srcDir = path.join(__dirname, 'src');
const fixedCount = walkDirectory(srcDir);
console.log(`Total files fixed: ${fixedCount}`);