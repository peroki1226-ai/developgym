const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { JSDOM, ResourceLoader, VirtualConsole } = require("jsdom");
const store = require("../../preview/storage.js");
const root = path.resolve(__dirname, "../../web-dist");
const base = "https://gymfinder.test/developgym/";
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const info = JSON.parse(fs.readFileSync(path.join(root, "build-info.json")));
const errors = [];
assert.equal(info.source, "index.html", "Use the canonical translated source, not a stale preview copy");
class Assets extends ResourceLoader {
  fetch(url) {
    assert.ok(url.startsWith(base), "No external startup resource: " + url);
    return Promise.resolve(
      fs.readFileSync(
        path.join(root, new URL(url).pathname.slice("/developgym/".length)),
      ),
    );
  }
}
async function launch(raw, blocked = false, preferredLanguage) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e.message));
  const dom = new JSDOM(html, {
    url: base,
    runScripts: "dangerously",
    resources: new Assets(),
    virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false });
      if (raw !== undefined) w.localStorage.setItem(store.key, raw);
      if (preferredLanguage !== undefined)
        w.localStorage.setItem("gf_lang", preferredLanguage);
      if (blocked)
        w.Storage.prototype.setItem = () => {
          throw new Error("Quota exceeded");
        };
    },
  });
  await new Promise((resolve) =>
    dom.window.addEventListener("load", resolve, { once: true }),
  );
  assert.ok(dom.window.gf);
  assert.ok(dom.window.document.querySelector("#app-root nav"));
  return dom;
}
const flush = (w) => w.dispatchEvent(new w.Event("pagehide"));
(async () => {
  const staticDom = new JSDOM(html);
  assert.equal(staticDom.window.document.querySelector("iframe"), null);
  for (const el of staticDom.window.document.querySelectorAll(
    "script[src],link[href]",
  )) {
    const value = el.getAttribute(el.tagName === "SCRIPT" ? "src" : "href");
    assert.ok(value.startsWith("./"), "Resource must be relative: " + value);
    assert.ok(fs.existsSync(path.join(root, value)));
  }
  for (const script of staticDom.window.document.scripts)
    new vm.Script(
      script.textContent ||
        fs.readFileSync(path.join(root, script.getAttribute("src")), "utf8"),
    );
  for (const lang of ["ja", "en"]) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, `manifest-${lang}.webmanifest`)),
    );
    assert.equal(manifest.lang, lang);
    assert.equal(manifest.start_url, "./");
    assert.equal(manifest.scope, "./");
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.theme_color, "#000000");
    for (const icon of manifest.icons)
      assert.ok(fs.existsSync(path.join(root, icon.src)));
  }
  for (const file of info.files)
    assert.ok(fs.existsSync(path.join(root, file)));
  assert.equal(
    fs.readFileSync(path.join(root, "gym-app-preview.html"), "utf8"),
    html,
  );
  new vm.Script(fs.readFileSync(path.join(root, "sw.js"), "utf8"));
  staticDom.window.close();

  const first = await launch();
  const w = first.window,
    d = w.document;
  for (const lang of ["ja", "en"]) {
    w.gf.setLang(lang);
    assert.ok(
      d
        .querySelector('link[rel="manifest"]')
        .href.endsWith(`manifest-${lang}.webmanifest`),
    );
    for (const tab of ["finder", "guide", "home", "diet", "mypage"]) {
      w.gf.setTab(tab);
      const text = d.querySelector("#preview-tools").textContent;
      assert.equal(
        (lang === "ja" ? /[A-Za-z]/ : /[\u3040-\u30ff\u3400-\u9fff]/).test(
          text,
        ),
        false,
      );
      assert.ok(d.getElementById("app-root").textContent.trim().length > 50);
    }
  }
  for (const language of ["ja", "en"]) {
    d.querySelector(`header button[data-language="${language}"]`).click();
    d.querySelector("#preview-install").click();
    const help = d.querySelector("#preview-install-help");
    assert.equal((language === "ja" ? /[A-Za-z]/ : /[\u3040-\u30ff\u3400-\u9fff]/).test(help.textContent), false, "Install help uses the selected language");
    help.removeAttribute("open");
  }
  const initialWorkouts = w.gfState.workoutHistory.length;
  w.gf.addWorkoutLog();
  w.gf.quickAddMeal("<b>Private meal</b>", 420, 30, 12, 48);
  w.gf.toggleFavoriteGym("global-la");
  w.gf.toggleHomeGear("hg-pullup");
  w.gfState.weightInput = "71.5";
  w.gf.updateWeight();
  // User-authored content stays text after storage and restoration.
  w.eval(
    "DATA.gyms[0].reviews.unshift({user:'You (Verified Contributor)',stars:'★★★★★',text:'<img src=x onerror=alert(1)> review'})",
  );
  flush(w);
  const raw = w.localStorage.getItem(store.key),
    saved = store.decode(raw);
  assert.equal(saved.state.workoutHistory.length, initialWorkouts + 1);
  assert.equal(saved.state.currentWeight, 71.5);
  assert.ok(saved.state.meals.some((m) => m.name === "<b>Private meal</b>"));
  assert.ok(saved.state.meals.some((m) => m.provided));
  first.window.close();
  const second = await launch(raw),
    s = second.window;
  assert.equal(s.gfState.workoutHistory.length, initialWorkouts + 1);
  assert.equal(s.gfState.currentWeight, 71.5);
  assert.deepEqual(
    JSON.parse(JSON.stringify(s.gfState.favoriteGymIds)),
    saved.state.favoriteGymIds,
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(s.gfState.ownedHomeGear)),
    saved.state.ownedHomeGear,
  );
  assert.equal(s.gfState.lang, "en");
  s.gf.setTab("diet");
  assert.ok(
    s.document
      .getElementById("app-root")
      .textContent.includes("<b>Private meal</b>"),
  );
  assert.equal(s.document.querySelector("#app-root b"), null);
  assert.ok(s.eval("DATA.gyms[0].reviews[0].text").includes("<img"));
  second.window.close();

  // A previous full-state snapshot must not override the most recently chosen locale.
  for (const language of ["ja", "en"]) {
    const stale = JSON.parse(raw);
    stale.state.lang = language === "ja" ? "en" : "ja";
    const reopened = await launch(JSON.stringify(stale), false, language);
    const localeWindow = reopened.window;
    assert.equal(
      localeWindow.gfState.lang,
      language,
      "Latest selected language wins over stale snapshot",
    );
    assert.equal(localeWindow.document.documentElement.lang, language);
    const nextLanguage = language === "ja" ? "en" : "ja";
    localeWindow.document
      .querySelector(`header button[data-language="${nextLanguage}"]`)
      .click();
    assert.equal(
      localeWindow.gfState.lang,
      nextLanguage,
      "Actual language button changes the locale",
    );
    assert.equal(
      store.decode(localeWindow.localStorage.getItem(store.key)).state.lang,
      nextLanguage,
      "Language is saved immediately, without waiting for debounce/pagehide",
    );
    assert.equal(localeWindow.localStorage.getItem("gf_lang"), nextLanguage);
    reopened.window.close();
  }

  for (const invalid of [
    "{broken",
    JSON.stringify({ version: 99, state: {}, community: [] }),
    JSON.stringify({
      version: 1,
      state: { currentWeight: "bad" },
      community: [],
    }),
  ]) {
    const broken = await launch(invalid);
    broken.window.gf.addWorkoutLog();
    flush(broken.window);
    assert.equal(
      broken.window.localStorage.getItem(store.key),
      invalid,
      "Never replace unreadable data",
    );
    assert.match(
      broken.window.document.querySelector("#preview-status").textContent,
      /読み込めません/,
    );
    broken.window.close();
  }
  const blocked = await launch(raw, true);
  blocked.window.gf.addWorkoutLog();
  flush(blocked.window);
  assert.equal(blocked.window.localStorage.getItem(store.key), raw);
  assert.match(
    blocked.window.document.querySelector("#preview-status").textContent,
    /Could not save/,
  );
  blocked.window.close();
  const extra = store.decode(
    JSON.stringify({
      version: 1,
      state: { lang: "ja", unknown: "ignored" },
      community: [],
    }),
  );
  assert.equal(extra.state.unknown, undefined);
  assert.deepEqual(errors, []);
  console.log(
    "Preview checks passed: local assets, nested paths, manifests, 10 screen/language states, record restoration, raw user text, corrupt data preservation and save failures.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
