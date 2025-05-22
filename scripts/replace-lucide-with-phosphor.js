#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Mapping from lucide icon names to Phosphor icon names
const mapping = {
  Mic: 'Microphone',
  Save: 'FloppyDisk',
  Pause: 'Pause',
  Play: 'Play',
  Bold: 'TextBold',
  Italic: 'TextItalic',
  List: 'ListBullets',
  Undo: 'ArrowCounterClockwise',
  Redo: 'ArrowClockwise',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  PlusCircle: 'PlusCircle',
  Plus: 'Plus',
  Users: 'Users',
  ChevronLeft: 'CaretLeft',
  ChevronRight: 'CaretRight',
  ChevronUp: 'CaretUp',
  ChevronDown: 'CaretDown',
  Trash2: 'Trash',
  Home: 'House',
  BellRing: 'BellRinging',
  Zap: 'Lightning',
  PlayCircle: 'PlayCircle',
  PauseCircle: 'PauseCircle',
  Search: 'MagnifyingGlass',
  X: 'X',
  UserPlus: 'UserPlus',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Check: 'Check',
  Circle: 'Circle',
  MoreHorizontal: 'DotsThreeOutlineHorizontal',
  Upload: 'Upload',
  Minus: 'Minus',
  Bell: 'Bell',
  Send: 'PaperPlaneRight',
  BookOpen: 'BookOpen',
  Sparkles: 'Sparkle',
  Waves: 'WaveSine',
  AlertTriangle: 'WarningCircle',
  GripVertical: 'GripVertical',
  PanelLeftClose: 'ArrowSquareLeft',
  PanelLeftOpen: 'ArrowSquareRight',
  PanelLeft: 'ArrowSquareLeft',
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (/\.(tsx|ts|jsx|js)$/.test(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes("lucide-react")) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s*\{([^}]*)\}\s*from\s*['\"]lucide-react['\"];?/;
  const match = content.match(importRegex);
  if (!match) return;
  const importsList = match[1].split(',').map((item) => item.trim()).filter(Boolean);
  const mappedImports = importsList.map((spec) => {
    let [orig, alias] = spec.split(/\s+as\s+/).map(s => s.trim());
    const localName = alias || orig;
    const phosName = mapping[orig];
    if (!phosName) {
      console.warn(`No mapping for icon ${orig} in ${filePath}`);
      return orig;
    }
    if (phosName === localName) {
      return phosName;
    }
    return `${phosName} as ${localName}`;
  });
  const newImport = `import { ${mappedImports.join(', ')} } from '@phosphor-icons/react';`;
  content = content.replace(importRegex, newImport);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated icons in: ${filePath}`);
}

function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const files = walk(srcDir);
  files.forEach(processFile);
  console.log('Icon import replacement complete.');
}

main(); 