// Dependency-free predeployment validation for the static dashboard.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const html = read("index.html");
const summary = JSON.parse(read("summary.json"));
const data = JSON.parse(read("data.json"));
const marker = '<script type="application/json" id="summary-data">';
const begin = html.indexOf(marker), finish = html.indexOf("</script>", begin + marker.length);
assert(begin >= 0 && finish > begin, "Embedded summary missing");
assert.deepEqual(JSON.parse(html.slice(begin + marker.length, finish)), summary,
  "Inline summary and summary.json differ; publish both together");
for (const id of ["headline","stats","areas","checks","match","research","left","timeline","error","footer","date-stamp"]) {
  assert(html.includes('id="' + id + '"'), "Missing dashboard mount: " + id);
}
for (const path of ["dashboard.js","research.js"]) new vm.Script(read(path), {filename:path});
assert(Array.isArray(summary.areas) && Array.isArray(summary.checks?.items), "Invalid summary shape");
assert(Array.isArray(data.functions) && Array.isArray(data.ports) && Array.isArray(data.findings),
  "Invalid research data shape");
assert(summary.counts?.port_rows_total === data.ports.length, "Port summary count differs from data.json");
console.log("Dashboard validation passed: summary, DOM mounts, JavaScript syntax, and research data.");
