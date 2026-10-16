import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { extractXlsxText, parseSharedStrings } from "./xlsxText";

test("shared-string indexes stay aligned when an entry is empty", () => {
  const xml = `<?xml version="1.0"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>Pump</t></si>
  <si><t></t></si>
  <si><t>Valve</t></si>
</sst>`;
  assert.deepEqual(parseSharedStrings(xml), ["Pump", "", "Valve"]);
});

test("xlsx extraction keeps numeric cells that are not in shared strings", async () => {
  const zip = new JSZip();
  zip.file(
    "xl/sharedStrings.xml",
    `<?xml version="1.0"?>
<sst>
  <si><t>Item</t></si>
  <si><t>Qty</t></si>
  <si><t>Pump</t></si>
</sst>`
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0"?>
<worksheet>
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
      <c r="C1" t="s"><v>1</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>2</v></c>
      <c r="B2"><v>2</v></c>
      <c r="C2" t="n"><v>1500.75</v></c>
    </row>
    <row r="3">
      <c r="A3" t="inlineStr"><is><t>Spare</t></is></c>
      <c r="B3"><v>0</v></c>
      <c r="C3"><f>B2*C2</f><v>3001.5</v></c>
    </row>
  </sheetData>
</worksheet>`
  );

  const text = await extractXlsxText(zip);
  assert.match(text, /Item\tQty\tQty/);
  assert.match(text, /Pump\t2\t1500\.75/);
  assert.match(text, /Spare\t0\t3001\.5/);
  assert.doesNotMatch(text, /Pump\t0\t/);
});

test("a numbers-only sheet still extracts when sharedStrings is missing", async () => {
  const zip = new JSZip();
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<worksheet><sheetData><row r="1"><c r="A1"><v>42</v></c><c r="B1"><v>3.5</v></c></row></sheetData></worksheet>`
  );
  const text = await extractXlsxText(zip);
  assert.equal(text, "42\t3.5");
});
