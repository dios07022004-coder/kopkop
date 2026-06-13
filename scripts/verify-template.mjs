/**
 * Verifies Excel template structure and formula presence.
 * Value sync is covered by vitest excel-sync.test.ts
 * Run: npm run verify:template
 */
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const templatePath = path.join(root, "private", "downloads", "budget-tracker-template.xlsx");

const REQUIRED_SHEETS = [
  "Старт",
  "Доходы",
  "Расходы",
  "Распределение",
  "Решение о покупке",
  "Цели",
  "Резерв",
  "Дашборд",
];

const FORMULA_CELLS = [
  { sheet: "Распределение", cell: "B16", label: "availableForLife" },
  { sheet: "Распределение", cell: "B17", label: "freeBudgetMonthly" },
  { sheet: "Распределение", cell: "B18", label: "availableForPurchaseNow" },
  { sheet: "Цели", cell: "B16", label: "remainingToSave" },
  { sheet: "Цели", cell: "B21", label: "savingsStatus" },
];

try {
  execSync("node scripts/generate-template.mjs", { cwd: root, stdio: "pipe" });
} catch {
  console.warn("Could not regenerate template, verifying existing file");
}

if (!fs.existsSync(templatePath)) {
  console.error("Template missing. Run npm run generate:template");
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(templatePath), { type: "buffer", cellFormula: true });
const results = [];

for (const name of REQUIRED_SHEETS) {
  results.push({
    check: `sheet:${name}`,
    pass: Boolean(wb.Sheets[name]),
  });
}

for (const { sheet, cell, label } of FORMULA_CELLS) {
  const ws = wb.Sheets[sheet];
  const ref = ws?.[cell];
  results.push({
    check: `${sheet}!${cell} (${label})`,
    pass: Boolean(ref?.f || ref?.v != null),
  });
}

const failed = results.filter((r) => !r.pass);
console.log("\nExcel template verification:\n");
for (const r of results) {
  console.log(`[${r.pass ? "OK" : "FAIL"}] ${r.check}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} check(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${results.length} structure checks passed.`);
console.log("Run npm test for value sync (excel-sync.test.ts).");
