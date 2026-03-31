const fs=require("fs"),p=require("path");
const pdfP=p.join(process.cwd(),"src/lib/export-pdf.ts");
let pdf=fs.readFileSync(pdfP,"utf8");
pdf=pdf.replace('import { BUDGET_TYPE_LABELS, PENSION_STATUS_LABELS, SUPPLEMENTS } from "./constants";','import { BUDGET_TYPE_LABELS, PENSION_STATUS_LABELS, SUPPLEMENTS, FREQUENCY_LABELS } from "./constants";');
fs.writeFileSync(pdfP,pdf);
console.log("step1");
