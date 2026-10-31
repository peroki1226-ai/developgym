const fs = require("node:fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const assert = require("node:assert/strict");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push(e.message));
const dom = new JSDOM(
  fs.readFileSync(
    require("node:path").resolve(__dirname, "../../index.html"),
    "utf8",
  ),
  {
    url: "http://localhost:3000",
    runScripts: "dangerously",
    virtualConsole: vc,
  },
);
const w = dom.window,
  d = w.document;
const bad = { ja: new Set(), en: new Set() };
function check(lang) {
  const root = d.getElementById("app-root");
  const tw = d.createTreeWalker(root, w.NodeFilter.SHOW_TEXT);
  let n;
  const values = [];
  while ((n = tw.nextNode())) {
    if (!n.parentElement.closest(".hidden,script,style"))
      values.push(n.textContent.trim());
  }
  for (const e of root.querySelectorAll("input,button,[aria-label]")) {
    for (const key of ["placeholder", "aria-label"])
      if (e.hasAttribute(key)) values.push(e.getAttribute(key));
    if (e.tagName === "INPUT") values.push(e.value);
  }
  for (const text of values)
    if (
      lang === "ja"
        ? /[A-Za-z]/.test(text)
        : /[\u3040-\u30ff\u3400-\u9fff]/.test(text)
    )
      bad[lang].add(text);
}
for (const lang of ["ja", "en"]) {
  w.gf.setLang(lang);
  for (const tab of ["finder", "guide", "home", "diet", "mypage"]) {
    w.gf.setTab(tab);
    check(lang);
    if (tab === "finder") {
      w.gf.toggleFilter();
      check(lang);
      for (const mode of ["beginner", "pro"]) {
        w.gf.setMode(mode);
        for (const id of [
          "gold",
          "anytime",
          "compact",
          "global-la",
          "global-ldn",
        ]) {
          w.gf.selectGym(id);
          check(lang);
        }
      }
      w.gf.toggleFilter();
    }
    if (tab === "guide") {
      for (const mode of ["beginner", "pro"]) {
        w.gf.setMode(mode);
        for (const part of [
          "all",
          "chest",
          "back",
          "legs",
          "shoulder",
          "arm",
          "abs",
        ]) {
          w.gf.setFilter(part);
          check(lang);
        }
      }
      for (const goal of ["hypertrophy", "strength", "diet", "health"]) {
        w.gf.setGoal(goal);
        check(lang);
      }
      w.gf.addWorkoutLog();
      check(lang);
    }
    if (tab === "home") {
      w.gf.toggleBodyweightOnly();
      check(lang);
      w.gf.toggleBodyweightOnly();
      for (const id of [
        "hg-db",
        "hg-pullup",
        "hg-band",
        "hg-bench",
        "hg-roller",
        "hg-kb",
      ]) {
        w.gf.toggleHomeGear(id);
        check(lang);
      }
    }
    if (tab === "diet") {
      w.gf.aiPhotoEstimate();
      check(lang);
      const quick = d.querySelector('[onclick^=\"window.gf.quickAddMeal\"]');
      if (quick) quick.click();
      check(lang);
    }
    if (tab === "mypage") {
      w.gf.toggleAiCoach();
      check(lang);
      w.gf.toggleAiCoach();
      check(lang);
    }
  }
}
const result = { ja: [...bad.ja], en: [...bad.en], errors };
assert.deepEqual(
  result.ja,
  [],
  "Japanese system UI must contain no Latin words or units",
);
assert.deepEqual(result.en, [], "English system UI must contain no Japanese");
assert.deepEqual(
  errors,
  [],
  "No runtime errors in five screens, both modes and expanded states",
);
assert.equal(d.documentElement.lang, "en");
w.gf.setTab("finder");
const input = d.getElementById("search-keyword-input");
input.focus();
let blurs = 0;
input.addEventListener("blur", () => blurs++);
for (const value of ["ゴ", "ゴールドジム"]) {
  input.value = value;
  input.dispatchEvent(
    new w.InputEvent("input", { bubbles: true, data: value }),
  );
  assert.equal(d.activeElement, input);
  assert.equal(d.getElementById("search-keyword-input"), input);
}
assert(
  d
    .getElementById("gym-list-container")
    .textContent.includes("Matching Gyms (2)"),
);
w.gf.setLang("ja");
assert.equal(d.getElementById("search-keyword-input").value, "ゴールドジム");
assert(
  d
    .getElementById("gym-list-container")
    .textContent.includes("適合ジム一覧 (2)"),
);
assert.equal(blurs, 0);
const raw = '胸 (Chest) 日本語 <b>原文</b> " &';
w.gf.setLang("en");
w.gf.setLogField("reviewText", raw);
w.gf.setLogField("reviewEquipNote", "");
w.gf.submitUserPost();
assert(
  d.getElementById("app-root").textContent.includes(raw),
  "User review text must remain literal and untranslated",
);
w.gf.setLang("ja");
assert(d.getElementById("app-root").textContent.includes(raw));
assert.equal(
  d.querySelector("b"),
  null,
  "User review markup must be rendered as text",
);
assert.equal(w.localStorage.getItem("gf_lang"), "ja");
w.gf.setLang("invalid");
assert.equal(w.localStorage.getItem("gf_lang"), "ja");
assert.deepEqual(errors, []);
console.log(
  JSON.stringify(
    {
      systemLanguages: ["ja", "en"],
      tabs: 5,
      modes: 2,
      systemLanguageLeaks: 0,
      runtimeErrors: 0,
      searchFocus: "preserved",
      searchAliases: "both languages",
      userReview: "preserved as literal text",
    },
    null,
    2,
  ),
);
dom.window.close();
