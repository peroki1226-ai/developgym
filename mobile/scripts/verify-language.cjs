"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("@babel/parser");
const ja = require("../src/i18n/ja.json");
const en = require("../src/i18n/en.json");
const root = path.resolve(__dirname, "..");
const errors = [];
const tokens = text => (text.match(/\{\d+\}/g) || []).sort().join(",");
for (const key of new Set([...Object.keys(ja), ...Object.keys(en)])) {
  if (typeof ja[key] !== "string" || typeof en[key] !== "string") {
    errors.push(`Missing dictionary entry: ${key}`);
    continue;
  }
  if (!ja[key].trim() || !en[key].trim()) errors.push(`Empty translation: ${key}`);
  if (/\p{Script=Latin}/u.test(ja[key].normalize("NFKC"))) errors.push(`Latin text in Japanese: ${key}`);
  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(en[key].normalize("NFKC"))) errors.push(`Japanese text in English: ${key}`);
  if (tokens(ja[key]) !== tokens(en[key])) errors.push(`Interpolation mismatch: ${key}`);
}
let used = 0;
function literalBranches(node) {
  if (!node) return [];
  if (node.type === "StringLiteral") return [node.value];
  if (node.type === "ConditionalExpression") return [...literalBranches(node.consequent), ...literalBranches(node.alternate)];
  return [];
}
function scan(file) {
  const ast = parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["typescript", "jsx"] });
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression" && node.callee?.name === "t") {
      for (const key of literalBranches(node.arguments[0])) {
        used++;
        if (!Object.hasOwn(ja, key) || !Object.hasOwn(en, key))
          errors.push(`${path.relative(root, file)}:${node.loc.start.line}: Untranslated UI message: ${key}`);
      }
    }
    // Page translates its title internally; include those message keys too.
    if (node.type === "JSXOpeningElement" && node.name?.name === "Page") {
      const title = node.attributes.find(a => a.type === "JSXAttribute" && a.name?.name === "title");
      for (const key of literalBranches(title?.value?.type === "JSXExpressionContainer" ? title.value.expression : title?.value))
        if (!Object.hasOwn(ja, key) || !Object.hasOwn(en, key))
          errors.push(`${path.relative(root, file)}:${node.loc.start.line}: Untranslated page title: ${key}`);
    }
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "comments"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  }
  visit(ast);
}
function walk(directory) {
  for (const name of fs.readdirSync(directory).sort()) {
    const file = path.join(directory, name);
    if (fs.statSync(file).isDirectory()) walk(file);
    else if (/\.[jt]sx?$/.test(name)) scan(file);
  }
}
scan(path.join(root, "App.tsx"));
walk(path.join(root, "src"));
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log(`Language audit passed: ${Object.keys(en).length} paired messages, ${used} literal UI calls, normalized Japanese/English separation.`);
