(function () {
  "use strict";
  const state = window.gfState;
  const app = window.gf;
  if (!state || !app || typeof DATA === "undefined")
    throw new Error("Unsupported GymFinder preview source");
  const store = window.GymFinderPreviewStorage;
  const providedMeals = new Map(state.meals.map((m) => [m.id, m.name]));
  const messages = {
    ja: {
      install: "ホーム画面に追加",
      saved: "端末に保存済み",
      offline: "オフライン・端末の記録で利用中",
      failed: "端末に保存できません。記録を書き出してください。",
      unreadable: "保存データを読み込めません。元データは保持しています。",
      export: "記録を書き出す",
      close: "閉じる",
      title: "ホーム画面から使う",
      ios: "Safariの共有ボタンから「ホーム画面に追加」を選びます。",
      android:
        "ブラウザーのメニューから「アプリをインストール」または「ホーム画面に追加」を選びます。",
      local:
        "記録はこの端末・このブラウザーに保存します。ネイティブアプリの記録とは別です。",
      error: "アプリを読み込めませんでした。再読み込みをお試しください。",
    },
    en: {
      install: "Add to home screen",
      saved: "Saved on this device",
      offline: "Offline — using records on this device",
      failed: "Could not save. Export your records.",
      unreadable: "Could not read saved records. Original data is preserved.",
      export: "Export records",
      close: "Close",
      title: "Use from your home screen",
      ios: "In Safari, tap Share, then Add to Home Screen.",
      android: "In the browser menu, choose Install app or Add to Home Screen.",
      local:
        "Records stay on this device and browser, separately from the native app.",
      error: "Could not load the app. Please reload.",
    },
  };
  const language = () => (state.lang === "en" ? "en" : "ja");
  let storageError = "",
    originalRaw = null,
    lastSaved = "",
    saveTimer,
    deferredInstall;
  let writesEnabled = true;
  const panel = document.createElement("aside");
  panel.id = "preview-tools";
  panel.setAttribute("aria-label", "");
  panel.innerHTML =
    '<button type="button" id="preview-install"></button><span id="preview-status" role="status"></span><button type="button" id="preview-export"></button>';
  const root = document.getElementById("app-root");
  root.before(panel);
  const dialog = document.createElement("dialog");
  dialog.id = "preview-install-help";
  dialog.innerHTML =
    '<h2></h2><p id="preview-ios"></p><p id="preview-android"></p><p id="preview-local"></p><button type="button"></button>';
  document.body.append(dialog);
  const standalone = () =>
    matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  function refresh() {
    const text = messages[language()];
    document.getElementById("preview-install").textContent = text.install;
    document.getElementById("preview-install").hidden = standalone();
    document.getElementById("preview-export").textContent = text.export;
    document.getElementById("preview-status").textContent = storageError
      ? text[storageError]
      : navigator.onLine === false
        ? text.offline
        : text.saved;
    panel.setAttribute("aria-label", text.title);
    dialog.querySelector("h2").textContent = text.title;
    for (const id of ["ios", "android", "local"])
      document.getElementById("preview-" + id).textContent = text[id];
    dialog.querySelector("button").textContent = text.close;
    document.querySelector('link[rel="manifest"]').href =
      "./manifest-" + language() + ".webmanifest";
    document.querySelector('meta[name="apple-mobile-web-app-title"]').content =
      language() === "ja" ? "ジムファインダー" : "GymFinder";
  }
  function save() {
    clearTimeout(saveTimer);
    if (!writesEnabled) {
      refresh();
      return;
    }
    try {
      const raw = JSON.stringify(
        store.snapshot(state, DATA.gyms, providedMeals),
      );
      if (raw !== lastSaved) localStorage.setItem(store.key, raw);
      lastSaved = raw;
      storageError = "";
    } catch {
      storageError = "failed";
    }
    refresh();
  }
  try {
    originalRaw = localStorage.getItem(store.key);
    if (originalRaw !== null) {
      store.restore(store.decode(originalRaw), state, DATA.gyms);
      lastSaved = originalRaw;
    }
  } catch {
    writesEnabled = false;
    storageError = "unreadable";
  }
  for (const name of Object.keys(app)) {
    if (typeof app[name] !== "function") continue;
    const action = app[name];
    app[name] = function (...args) {
      const result = action.apply(this, args);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 120);
      refresh();
      if (result && typeof result.then === "function")
        return result.finally(save);
      return result;
    };
  }
  // Keep restored data local to this origin. The native app's AsyncStorage is separate.
  app.setLang(language());
  app.setTab("finder");
  save();
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });
  window.addEventListener("online", refresh);
  window.addEventListener("offline", refresh);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstall = event;
    refresh();
  });
  window.addEventListener("appinstalled", refresh);
  document.getElementById("preview-install").onclick = async () => {
    if (deferredInstall) {
      const prompt = deferredInstall;
      deferredInstall = null;
      await prompt.prompt();
      await prompt.userChoice;
    } else if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  };
  dialog.querySelector("button").onclick = () => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  };
  document.getElementById("preview-export").onclick = () => {
    const raw = writesEnabled
      ? JSON.stringify(store.snapshot(state, DATA.gyms, providedMeals), null, 2)
      : originalRaw;
    const url = URL.createObjectURL(
      new Blob([raw || ""], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "gymfinder-records.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if ("serviceWorker" in navigator && window.isSecureContext)
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  refresh();
})();
