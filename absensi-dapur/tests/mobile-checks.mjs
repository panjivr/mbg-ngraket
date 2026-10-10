import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(file) {
  const exports={};
  const source=ts.transpileModule(fs.readFileSync(new URL("../src/lib/"+file,import.meta.url),"utf8"),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,Buffer,Date,Intl,console});
  return exports;
}
const {validDate,validTimestamp,validImage,validCapture,validCoordinates}=load("employee-validation.ts");
const {shiftDate,statusMasukShift}=load("time.ts");
assert(validDate("2024-02-29"));
assert(!validDate("2025-02-29"));
assert(!validDate("2026-13-01"));
assert(!validTimestamp("2026-10-10"));
assert(validTimestamp("2026-10-10T08:00:00+07:00"));
assert(!validTimestamp("2026-02-30T08:00:00Z"));
assert(validImage("data:image/jpeg;base64,/9j/AA=="));
assert(!validImage("data:image/svg+xml;base64,PHN2Zz4="));
assert(!validImage("data:image/jpeg;base64,YWJjZA=="));
assert(!validImage("data:image/jpeg;base64,/9j/AA==",10));
assert(validCoordinates(-7.8,111.5));
assert(!validCoordinates(91,111));
assert(!validCoordinates(null,0));
assert(!validCoordinates("0","0"));
assert(validCapture("2026-10-10T01:00:00Z",Date.parse("2026-10-10T01:01:00Z")));
assert(!validCapture("2026-10-10T01:00:00Z",Date.parse("2026-10-10T01:03:00Z")));
assert(!validCapture("2026-10-10T01:05:00Z",Date.parse("2026-10-10T01:01:00Z")));
assert.equal(shiftDate(new Date("2026-10-10T19:00:00Z"),"22:00","08:00","Asia/Jakarta"),"2026-10-10");
assert.equal(statusMasukShift(new Date("2026-10-10T19:00:00Z"),"22:00","08:00","Asia/Jakarta"),"Terlambat");
assert.equal(shiftDate(new Date("2026-10-10T23:00:00Z"),"22:00","08:00","Asia/Makassar"),"2026-10-10");
console.log("20 employee validation / timezone assertions passed");
