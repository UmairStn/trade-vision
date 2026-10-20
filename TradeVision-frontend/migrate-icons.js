import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

const ICON_MAP = {
  "LineChart": "ChartLine",
  "Mail": "Envelope",
  "Lock": "Lock",
  "User": "User",
  "ShieldCheck": "ShieldCheck",
  "KeyRound": "Key",
  "Activity": "Activity",
  "RefreshCw": "ArrowsClockwise",
  "Search": "MagnifyingGlass",
  "TrendingDown": "TrendDown",
  "TrendingUp": "TrendUp",
  "WifiOff": "WifiSlash",
  "BrainCircuit": "Brain",
  "CalendarClock": "Calendar",
  "Eye": "Eye",
  "ExternalLink": "ArrowSquareOut",
  "Newspaper": "Newspaper",
  "ShieldAlert": "Warning",
  "Sparkles": "Sparkle",
  "TriangleAlert": "Warning",
  "BellRing": "Bell",
  "LayoutDashboard": "SquaresFour",
  "LogOut": "SignOut",
  "Plus": "Plus",
  "Trash2": "Trash",
  "Wallet": "Wallet",
  "Bot": "Robot",
  "ArrowDownToLine": "DownloadSimple",
  "ArrowUpFromLine": "UploadSimple",
  "Pause": "Pause",
  "Play": "Play",
  "Loader2": "CircleNotch",
  "X": "X",
  "Moon": "Moon",
  "Sun": "Sun",
  "ArrowDown": "ArrowDown",
  "ArrowUp": "ArrowUp",
  "ChevronsUpDown": "CaretUpDown",
  "Minus": "Minus",
  "EyeOff": "EyeClosed",
  "AlertTriangle": "Warning",
  "Info": "Info",
  "RotateCcw": "ArrowCounterClockwise",
  "Maximize2": "ArrowsOut",
  "MessageCircle": "ChatCircle",
  "Send": "PaperPlaneRight",
  "AlertCircle": "WarningCircle",
  "Wrench": "Wrench",
  "AreaChart": "ChartLine",
  "CandlestickChart": "ChartBar",
  "Table": "Table",
  "HomeIcon": "House",
  "Home": "House",
  "BarChart3": "ChartBar",
  "Compass": "Compass",
  "MenuIcon": "List",
  "Menu": "List",
  "MessagesSquare": "ChatCircleText",
  "PieChart": "ChartPieSlice",
  "Receipt": "Receipt",
  "Layers": "Stack",
  "CircleDot": "Circle",
  "ArrowRight": "ArrowRight",
  "Check": "Check",
  "ChevronLeft": "CaretLeft",
  "ChevronRight": "CaretRight",
  "MoreHorizontal": "DotsThree"
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('lucide-react')) return;

  // Replace import
  let importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"];?/m);
  if (!importMatch) return;

  let importedIcons = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  
  let newImports = [];
  let nameReplacements = [];

  importedIcons.forEach(iconRaw => {
    let oldName = iconRaw;
    let alias = null;
    
    if (iconRaw.includes(' as ')) {
      let parts = iconRaw.split(' as ').map(s => s.trim());
      oldName = parts[0];
      alias = parts[1]; // e.g. Home as HomeIcon -> alias = HomeIcon
    }

    let newName = ICON_MAP[oldName] || oldName;
    
    if (alias) {
      newImports.push(`${newName} as ${alias}`);
    } else {
      newImports.push(newName);
      // We need to replace usages in JSX!
      nameReplacements.push({ old: oldName, new: newName });
    }
  });

  // Replace the import statement
  let newImportStr = `import { ${newImports.join(', ')} } from '@phosphor-icons/react';`;
  content = content.replace(importMatch[0], newImportStr);

  // Replace JSX usages of old names that were not aliased
  nameReplacements.forEach(({old, new: newName}) => {
    if (old !== newName) {
      // Regex to find <OldName and </OldName
      let tagStartRegex = new RegExp(`<${old}(?=[\\s>])`, 'g');
      let tagEndRegex = new RegExp(`</${old}>`, 'g');
      content = content.replace(tagStartRegex, `<${newName}`);
      content = content.replace(tagEndRegex, `</${newName}>`);
    }
  });

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${filePath}`);
}

walkDir(SRC_DIR, processFile);
