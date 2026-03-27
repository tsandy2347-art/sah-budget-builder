const fs = require('fs');
const filePath = process.cwd() + '/src/app/budget/[id]/sign/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add relationship labels
content = content.replace(
  '  const [jbcSignatureDataUrl, setJbcSignatureDataUrl] = useState<string | null>(null);',
  '  const [jbcSignatureDataUrl, setJbcSignatureDataUrl] = useState<string | null>(null);\n\n  const relationshipLabels: Record<string, string> = {\n    self: "Self",\n    family_member: "Family Member",\n    legal_guardian: "Legal Guardian",\n    authorised_representative: "Authorised Representative",\n    other: "Other",\n  };'
);

// 2. Update print styles
content = content.replace(
  'nav, header, .no-print { display: none !important; }',
  'nav, header, .no-print, .no-print-element { display: none !important; }'
);
content = content.replace(
  '@page { margin: 1.5cm; }\n        }',
  '@page { margin: 1.5cm; }\n          .print-only { display: block !important; }\n          .sig-print-img { display: block !important; max-height: 80px; border-bottom: 1px solid #333; padding-bottom: 4px; margin-top: 8px; }\n        }'
);

fs.writeFileSync(filePath, content);
console.log('Step 1 done - labels and styles');
