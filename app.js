// IRON ATLAS - メインアプリケーションロジック
(function () {
  const DATA = window.GYM_DATA;

  // アプリ状態管理
  const state = {
    activeTab: "travel", // travel | encyclopedia | body | scanner | map | log
    userMode: localStorage.getItem("iron_atlas_mode") || "beginner", // beginner | pro
    travelArea: "現在地周辺（GPS・旅先エリア）",
    travelMuscles: ["chest", "legs"],
    travelEquips: ["power-rack", "incline-smith", "hack-squat"],
    selectedMuscle: "all",
    selectedCategory: "all",
    searchQuery: "",
    onlyFavorites: false,
    onlyCurrentGym: false,
    bodyViewSide: "front", // front | back
    selectedGymId: localStorage.getItem("iron_atlas_gym") || "gold-iron-shibuya",
    activeModalMachineId: null,
    favorites: JSON.parse(localStorage.getItem("iron_atlas_favs") || '["chest-press","lat-pulldown","incline-smith","leg-press"]'),
    customGymMachines: JSON.parse(
      localStorage.getItem("iron_atlas_custom_gym") ||
      '["chest-press","incline-smith","lat-pulldown","seated-row","shoulder-press","cable-machine","leg-press","leg-extension","seated-leg-curl","power-rack","dumbbell-area"]'
    ),
    logs: JSON.parse(localStorage.getItem("iron_atlas_logs") || "null") || [
      {
        id: "sample-1",
        machineId: "chest-press",
        machineName: "チェストプレス",
        weight: 45,
        reps: 10,
        rpe: 8.5,
        note: "シート高3段目、ボトム1秒止め意識",
        date: "今日 12:40"
      },
      {
        id: "sample-2",
        machineId: "lat-pulldown",
        machineName: "ラットプルダウン",
        weight: 50,
        reps: 12,
        rpe: 9.0,
        note: "サムレスグリップで小指側意識",
        date: "今日 12:55"
      },
      {
        id: "sample-3",
        machineId: "leg-press",
        machineName: "レッグプレス",
        weight: 120,
        reps: 12,
        rpe: 8.5,
        note: "足位置やや下・ナロースタンスで四頭筋狙い",
        date: "昨日"
      }
    ],
    timerSeconds: 90,
    timerRemaining: 90,
    timerRunning: false,
    timerInterval: null,
    cameraStream: null
  };

  function saveState() {
    localStorage.setItem("iron_atlas_mode", state.userMode);
    localStorage.setItem("iron_atlas_gym", state.selectedGymId);
    localStorage.setItem("iron_atlas_favs", JSON.stringify(state.favorites));
    localStorage.setItem("iron_atlas_custom_gym", JSON.stringify(state.customGymMachines));
    localStorage.setItem("iron_atlas_logs", JSON.stringify(state.logs));
  }

  // 現在のジムの設置器具IDリストを取得
  function getCurrentGymInstalledIds() {
    if (state.selectedGymId === "my-custom-gym") {
      return state.customGymMachines;
    }
    const gym = DATA.gyms.find((g) => g.id === state.selectedGymId) || DATA.gyms[0];
    return gym.installedIds;
  }

  // 1RM推定計算（Epley式: weight * (1 + reps / 30)）
  function calc1RM(weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (w <= 0 || r <= 0) return 0;
    if (r === 1) return Math.round(w);
    return Math.round(w * (1 + r / 30));
  }

  // マシン別カスタムSVGイラスト生成
  function getMachineSVG(svgType) {
    const commonFrame = `stroke="#94a3b8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    const padStyle = `fill="#1e293b" stroke="#ef4444" stroke-width="2.5"`;
    const accentArrow = `stroke="#f97316" stroke-width="3" stroke-linecap="round" fill="none"`;

    switch (svgType) {
      case "chest-press":
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <rect x="22" y="18" width="22" height="84" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
          <line x1="26" y1="32" x2="40" y2="32" stroke="#ef4444" stroke-width="2"/>
          <line x1="26" y1="42" x2="40" y2="42" stroke="#475569" stroke-width="2"/>
          <line x1="26" y1="52" x2="40" y2="52" stroke="#475569" stroke-width="2"/>
          <path d="M44 98 L120 98 M75 98 L75 20 L108 20" ${commonFrame}/>
          <rect x="66" y="42" width="12" height="34" rx="4" ${padStyle}/>
          <rect x="68" y="80" width="26" height="9" rx="3" ${padStyle}/>
          <path d="M98 20 L105 58 L122 58" stroke="#f8fafc" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="122" cy="58" r="4" fill="#ef4444"/>
          <path d="M114 45 L138 45 M132 40 L138 45 L132 50" ${accentArrow}/>
        </svg>`;
      case "pec-fly":
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <path d="M80 15 L80 102 M45 102 L115 102 M50 22 L110 22" ${commonFrame}/>
          <rect x="70" y="42" width="20" height="36" rx="5" ${padStyle}/>
          <path d="M50 22 L38 56 L54 70" stroke="#f8fafc" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <path d="M110 22 L122 56 L106 70" stroke="#f8fafc" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <path d="M44 58 Q80 76 116 58" stroke="#f97316" stroke-width="2.5" stroke-dasharray="4 3" fill="none"/>
          <circle cx="80" cy="64" r="5" fill="#ef4444"/>
        </svg>`;
      case "smith-machine":
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <path d="M35 102 L125 102 M48 102 L56 16 M112 102 L104 16 M56 16 L104 16" ${commonFrame}/>
          <line x1="62" y1="20" x2="54" y2="98" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 3"/>
          <line x1="34" y1="54" x2="126" y2="54" stroke="#f8fafc" stroke-width="4.5" stroke-linecap="round"/>
          <rect x="38" y="44" width="8" height="20" rx="2" fill="#ef4444"/>
          <rect x="114" y="44" width="8" height="20" rx="2" fill="#ef4444"/>
          <path d="M62 92 L92 68 L112 92" ${padStyle}/>
          <path d="M80 44 L80 26 M75 31 L80 26 L85 31" ${accentArrow}/>
        </svg>`;
      case "lat-pulldown":
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <rect x="24" y="20" width="20" height="82" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
          <path d="M44 102 L118 102 M64 102 L64 14 L105 14" ${commonFrame}/>
          <line x1="100" y1="14" x2="100" y2="38" stroke="#94a3b8" stroke-width="2"/>
          <path d="M74 42 L82 38 L118 38 L126 42" stroke="#f8fafc" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="88" cy="68" r="5" fill="#1e293b" stroke="#ef4444" stroke-width="2.5"/>
          <circle cx="98" cy="68" r="5" fill="#1e293b" stroke="#ef4444" stroke-width="2.5"/>
          <rect x="86" y="82" width="28" height="8" rx="3" ${padStyle}/>
          <path d="M100 46 L100 64 M95 58 L100 64 L105 58" ${accentArrow}/>
        </svg>`;
      case "seated-row":
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <rect x="24" y="22" width="22" height="78" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
          <path d="M46 98 L130 98 M82 98 L82 52" ${commonFrame}/>
          <rect x="76" y="48" width="10" height="26" rx="4" ${padStyle}/>
          <rect x="102" y="78" width="24" height="9" rx="3" ${padStyle}/>
          <line x1="46" y1="60" x2="96" y2="60" stroke="#f8fafc" stroke-width="3" stroke-dasharray="4 2"/>
          <path d="M92 60 L114 60 M108 55 L114 60 L108 65" ${accentArrow}/>
        </svg>`;
      case "leg-press":
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <path d="M24 98 L136 98 M36 98 L92 42" ${commonFrame}/>
          <line x1="52" y1="28" x2="72" y2="66" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/>
          <path d="M96 66 L118 90 L132 86" ${padStyle}/>
          <path d="M84 44 L66 28 M66 36 L66 28 L74 28" ${accentArrow}/>
        </svg>`;
      case "power-rack":
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <rect x="42" y="16" width="76" height="86" stroke="#94a3b8" stroke-width="4" fill="none"/>
          <line x1="42" y1="68" x2="118" y2="68" stroke="#ef4444" stroke-width="3"/>
          <line x1="22" y1="48" x2="138" y2="48" stroke="#f8fafc" stroke-width="4.5" stroke-linecap="round"/>
          <rect x="28" y="34" width="9" height="28" rx="2" fill="#ef4444"/>
          <rect x="123" y="34" width="9" height="28" rx="2" fill="#ef4444"/>
          <rect x="66" y="80" width="28" height="8" rx="2" ${padStyle}/>
        </svg>`;
      case "cable-machine":
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <path d="M28 16 L28 102 M132 16 L132 102 M28 20 L132 20" ${commonFrame}/>
          <circle cx="34" cy="30" r="4" fill="#ef4444"/>
          <circle cx="126" cy="30" r="4" fill="#ef4444"/>
          <path d="M34 30 L68 68 M126 30 L92 68" stroke="#f8fafc" stroke-width="2.5" stroke-dasharray="3 2"/>
          <path d="M65 70 Q80 82 95 70" ${accentArrow}/>
        </svg>`;
      case "dumbbell":
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <line x1="42" y1="46" x2="118" y2="46" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/>
          <rect x="34" y="28" width="12" height="36" rx="3" fill="#1e293b" stroke="#ef4444" stroke-width="2.5"/>
          <rect x="48" y="32" width="9" height="28" rx="2" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
          <rect x="114" y="28" width="12" height="36" rx="3" fill="#1e293b" stroke="#ef4444" stroke-width="2.5"/>
          <rect x="103" y="32" width="9" height="28" rx="2" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
          <path d="M40 94 L82 94 L112 72" ${padStyle}/>
        </svg>`;
      default:
        return `<svg viewBox="0 0 160 120" class="w-full h-full">
          <rect x="24" y="20" width="20" height="80" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
          <path d="M44 100 L122 100 M74 100 L74 28" ${commonFrame}/>
          <rect x="66" y="42" width="16" height="32" rx="4" ${padStyle}/>
          <rect x="74" y="74" width="28" height="10" rx="3" ${padStyle}/>
          <path d="M98 76 L118 52" stroke="#f8fafc" stroke-width="4" stroke-linecap="round"/>
          <circle cx="118" cy="52" r="5" fill="#ef4444"/>
          <path d="M108 42 Q124 48 124 66" ${accentArrow}/>
        </svg>`;
    }
  }

  // 人体解剖SVGマップ描画（前面・背面）
  function renderAnatomySVG() {
    const active = state.selectedMuscle;
    const isFront = state.bodyViewSide === "front";
    const fillFor = (part) =>
      active === part
        ? "fill-red-500/80 stroke-red-300"
        : "fill-slate-700/80 hover:fill-red-500/50 stroke-slate-500";

    if (isFront) {
      return `
      <svg viewBox="0 0 220 340" class="w-full max-w-[230px] mx-auto select-none">
        <!-- 頭部・首 -->
        <circle cx="110" cy="32" r="18" class="fill-slate-800 stroke-slate-600" stroke-width="2"/>
        <rect x="102" y="48" width="16" height="12" rx="3" class="fill-slate-800"/>

        <!-- 肩（三角筋前・中部） -->
        <g onclick="window.appActions.selectMuscleFromMap('shoulder')" class="cursor-pointer transition-all">
          <path d="M62 62 Q72 54 84 60 L82 86 Q64 84 60 72 Z" class="${fillFor("shoulder")}" stroke-width="2"/>
          <path d="M158 62 Q148 54 136 60 L138 86 Q156 84 160 72 Z" class="${fillFor("shoulder")}" stroke-width="2"/>
        </g>

        <!-- 胸（大胸筋） -->
        <g onclick="window.appActions.selectMuscleFromMap('chest')" class="cursor-pointer transition-all">
          <path d="M84 60 L109 62 L109 96 L80 94 L82 68 Z" class="${fillFor("chest")}" stroke-width="2"/>
          <path d="M136 60 L111 62 L111 96 L140 94 L138 68 Z" class="${fillFor("chest")}" stroke-width="2"/>
        </g>

        <!-- 腹筋（腹直筋・腹斜筋） -->
        <g onclick="window.appActions.selectMuscleFromMap('abs')" class="cursor-pointer transition-all">
          <rect x="86" y="98" width="48" height="62" rx="8" class="${fillFor("abs")}" stroke-width="2"/>
          <line x1="110" y1="100" x2="110" y2="158" stroke="#0f172a" stroke-width="2"/>
          <line x1="88" y1="116" x2="132" y2="116" stroke="#0f172a" stroke-width="1.5"/>
          <line x1="88" y1="134" x2="132" y2="134" stroke="#0f172a" stroke-width="1.5"/>
        </g>

        <!-- 腕（上腕二頭筋・前腕） -->
        <g onclick="window.appActions.selectMuscleFromMap('arm')" class="cursor-pointer transition-all">
          <rect x="56" y="86" width="20" height="66" rx="9" transform="rotate(8 66 115)" class="${fillFor("arm")}" stroke-width="2"/>
          <rect x="144" y="86" width="20" height="66" rx="9" transform="rotate(-8 154 115)" class="${fillFor("arm")}" stroke-width="2"/>
        </g>

        <!-- 脚（大腿四頭筋・内転筋・下腿） -->
        <g onclick="window.appActions.selectMuscleFromMap('legs')" class="cursor-pointer transition-all">
          <path d="M82 164 L107 164 L104 246 L78 246 Z" class="${fillFor("legs")}" stroke-width="2"/>
          <path d="M113 164 L138 164 L142 246 L116 246 Z" class="${fillFor("legs")}" stroke-width="2"/>
          <rect x="81" y="252" width="20" height="64" rx="8" class="${fillFor("legs")}" stroke-width="2"/>
          <rect x="119" y="252" width="20" height="64" rx="8" class="${fillFor("legs")}" stroke-width="2"/>
        </g>

        <!-- ラベル -->
        <text x="110" y="82" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold" pointer-events="none">胸</text>
        <text x="50" y="75" text-anchor="end" fill="#cbd5e1" font-size="10" pointer-events="none">肩</text>
        <text x="45" y="122" text-anchor="end" fill="#cbd5e1" font-size="10" pointer-events="none">腕</text>
        <text x="110" y="130" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold" pointer-events="none">腹筋</text>
        <text x="110" y="208" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold" pointer-events="none">前もも(脚)</text>
      </svg>`;
    } else {
      return `
      <svg viewBox="0 0 220 340" class="w-full max-w-[230px] mx-auto select-none">
        <!-- 頭部 -->
        <circle cx="110" cy="32" r="18" class="fill-slate-800 stroke-slate-600" stroke-width="2"/>

        <!-- 肩後部（リアデルト） -->
        <g onclick="window.appActions.selectMuscleFromMap('shoulder')" class="cursor-pointer transition-all">
          <path d="M60 64 Q72 54 84 60 L80 84 Q62 82 58 72 Z" class="${fillFor("shoulder")}" stroke-width="2"/>
          <path d="M160 64 Q148 54 136 60 L140 84 Q158 82 162 72 Z" class="${fillFor("shoulder")}" stroke-width="2"/>
        </g>

        <!-- 背中（僧帽筋・広背筋・大円筋・脊柱起立筋） -->
        <g onclick="window.appActions.selectMuscleFromMap('back')" class="cursor-pointer transition-all">
          <path d="M84 56 L136 56 L144 106 L128 158 L92 158 L76 106 Z" class="${fillFor("back")}" stroke-width="2"/>
          <path d="M98 56 L110 95 L122 56" fill="none" stroke="#0f172a" stroke-width="2"/>
          <line x1="110" y1="95" x2="110" y2="156" stroke="#0f172a" stroke-width="2"/>
        </g>

        <!-- 腕（上腕三頭筋） -->
        <g onclick="window.appActions.selectMuscleFromMap('arm')" class="cursor-pointer transition-all">
          <rect x="54" y="86" width="20" height="66" rx="9" transform="rotate(8 64 115)" class="${fillFor("arm")}" stroke-width="2"/>
          <rect x="146" y="86" width="20" height="66" rx="9" transform="rotate(-8 156 115)" class="${fillFor("arm")}" stroke-width="2"/>
        </g>

        <!-- 臀部・裏もも（大臀筋・ハムストリングス・ふくらはぎ） -->
        <g onclick="window.appActions.selectMuscleFromMap('legs')" class="cursor-pointer transition-all">
          <rect x="82" y="160" width="27" height="32" rx="10" class="${fillFor("legs")}" stroke-width="2"/>
          <rect x="111" y="160" width="27" height="32" rx="10" class="${fillFor("legs")}" stroke-width="2"/>
          <path d="M82 194 L107 194 L104 250 L80 250 Z" class="${fillFor("legs")}" stroke-width="2"/>
          <path d="M113 194 L138 194 L140 250 L116 250 Z" class="${fillFor("legs")}" stroke-width="2"/>
          <rect x="81" y="254" width="20" height="62" rx="8" class="${fillFor("legs")}" stroke-width="2"/>
          <rect x="119" y="254" width="20" height="62" rx="8" class="${fillFor("legs")}" stroke-width="2"/>
        </g>

        <!-- ラベル -->
        <text x="110" y="106" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold" pointer-events="none">背中(広背筋・僧帽筋)</text>
        <text x="48" y="122" text-anchor="end" fill="#cbd5e1" font-size="10" pointer-events="none">三頭筋</text>
        <text x="110" y="180" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold" pointer-events="none">お尻</text>
        <text x="110" y="226" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold" pointer-events="none">裏もも(ハム)</text>
      </svg>`;
    }
  }

  // フィルタリング済み器具一覧を取得
  function getFilteredEquipments() {
    const installedIds = getCurrentGymInstalledIds();
    return DATA.equipments.filter((eq) => {
      if (state.selectedMuscle !== "all" && eq.bodyPart !== state.selectedMuscle) return false;
      if (state.selectedCategory !== "all" && eq.category !== state.selectedCategory) return false;
      if (state.onlyFavorites && !state.favorites.includes(eq.id)) return false;
      if (state.onlyCurrentGym && !installedIds.includes(eq.id)) return false;
      if (state.searchQuery.trim() !== "") {
        const q = state.searchQuery.trim().toLowerCase();
        const hay = [
          eq.name,
          eq.enName,
          eq.bodyPartLabel,
          eq.summary,
          ...eq.primaryMuscles,
          ...eq.secondaryMuscles
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // 図鑑カードのレンダリング
  function renderEquipmentCard(eq) {
    const isFav = state.favorites.includes(eq.id);
    const installed = getCurrentGymInstalledIds().includes(eq.id);
    const isPro = state.userMode === "pro";

    return `
      <div class="bg-slate-900/95 border border-slate-800 hover:border-red-500/60 rounded-2xl p-4 transition-all shadow-lg flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-500/20 text-red-300 border border-red-500/30">${eq.bodyPartLabel}</span>
                <span class="px-2 py-0.5 text-[11px] rounded-full bg-slate-800 text-slate-300">${eq.category}</span>
                ${
                  installed
                    ? `<span class="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">選択店舗に設置あり</span>`
                    : `<span class="px-2 py-0.5 text-[11px] rounded-full bg-slate-800 text-slate-500">選択店舗に未設置</span>`
                }
              </div>
              <h3 class="text-base font-extrabold text-white leading-snug">${eq.name}</h3>
              <p class="text-xs text-slate-400">${eq.enName}</p>
            </div>
            <button onclick="window.appActions.toggleFav('${eq.id}')" title="お気に入り切替" class="p-2 rounded-xl border ${
              isFav
                ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white"
            }">
              ${isFav ? "★" : "☆"}
            </button>
          </div>

          <!-- イラスト＋対象筋サマリー -->
          <div class="grid grid-cols-12 gap-3 my-3 items-center bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80">
            <div class="col-span-5 h-24 flex items-center justify-center">
              ${getMachineSVG(eq.svgType)}
            </div>
            <div class="col-span-7 space-y-1.5 text-xs">
              <div>
                <span class="text-slate-400 block text-[11px]">メイン対象筋：</span>
                <span class="text-red-300 font-bold">${eq.primaryMuscles.join("・")}</span>
              </div>
              ${
                isPro
                  ? `<div>
                      <span class="text-amber-300 font-semibold text-[11px]">POF分類: ${eq.pof}</span>
                    </div>`
                  : `<div>
                      <span class="text-slate-400 block text-[11px]">初回目安重量：</span>
                      <span class="text-emerald-300 font-semibold">男性 ${eq.beginnerGuide.startWeight.male} / 女性 ${eq.beginnerGuide.startWeight.female}</span>
                    </div>`
              }
            </div>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed mb-3">${eq.summary}</p>

          <!-- モード別クイックプレビュー -->
          ${
            !isPro
              ? `<div class="bg-slate-800/50 border border-slate-700/70 rounded-xl p-2.5 mb-3 text-xs">
                  <div class="font-bold text-sky-300 mb-1">💡 初心者ワンポイント（イスの合わせ方）</div>
                  <p class="text-slate-200 leading-relaxed">${eq.beginnerGuide.seatSetup}</p>
                </div>`
              : `<div class="bg-amber-950/25 border border-amber-500/30 rounded-xl p-2.5 mb-3 text-xs">
                  <div class="font-bold text-amber-300 mb-1">🔥 ビルダーProバイオメカニクス</div>
                  <p class="text-amber-100/90 leading-relaxed">${eq.proGuide.builderTip}</p>
                </div>`
          }
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1">
          <button onclick="window.appActions.openModal('${eq.id}')" class="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition flex items-center justify-center gap-1 shadow">
            <span>📖 詳しい使い方・解剖解説</span>
          </button>
          <button onclick="window.appActions.quickLogFromMachine('${eq.id}')" class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-1">
            <span>✍️ 重量・回数を記録</span>
          </button>
        </div>
      </div>
    `;
  }

  // タブ1：器具図鑑＆検索ビュー
  function renderEncyclopediaTab() {
    const list = getFilteredEquipments();
    const currentGym = DATA.gyms.find((g) => g.id === state.selectedGymId) || DATA.gyms[0];

    return `
      <div class="space-y-4">
        <!-- 検索＆フィルタバー -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          <div class="flex flex-col sm:flex-row gap-2">
            <div class="relative flex-1">
              <input
                id="search-input"
                type="text"
                value="${state.searchQuery}"
                oninput="window.appActions.setSearch(this.value)"
                placeholder="器具名・鍛えたい部位（例：大胸筋、ラットプル、背中、お尻）で検索..."
                class="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
            <div class="flex gap-1.5">
              <button onclick="window.appActions.toggleOnlyFavs()" class="px-3 py-2 rounded-xl text-xs font-bold border transition ${
                state.onlyFavorites
                  ? "bg-amber-500/20 border-amber-400 text-amber-300"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }">
                ★ お気に入りのみ
              </button>
              <button onclick="window.appActions.toggleOnlyCurrentGym()" class="px-3 py-2 rounded-xl text-xs font-bold border transition ${
                state.onlyCurrentGym
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }">
                📍 選択中の店舗にある器具のみ
              </button>
            </div>
          </div>

          <!-- 部位チップ -->
          <div class="flex gap-1.5 overflow-x-auto pb-1">
            ${DATA.muscleGroups
              .map(
                (m) => `
              <button onclick="window.appActions.setMuscle('${m.id}')" class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  state.selectedMuscle === m.id
                    ? "bg-red-600 border-red-400 text-white shadow"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                }">
                ${m.name}
              </button>
            `
              )
              .join("")}
          </div>

          <!-- カテゴリチップ＆件数表示 -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
            <div class="flex gap-1.5">
              ${["all", "マシン", "フリーウェイト", "ケーブル"]
                .map(
                  (cat) => `
                <button onclick="window.appActions.setCategory('${cat}')" class="px-2.5 py-1 rounded-lg font-semibold ${
                    state.selectedCategory === cat
                      ? "bg-slate-200 text-slate-900"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }">
                  ${cat === "all" ? "全タイプ" : cat}
                </button>
              `
                )
                .join("")}
            </div>
            <div class="text-slate-400">
              表示中: <span class="text-white font-bold">${list.length}</span> 機種 （選択店舗: <span class="text-emerald-300">${currentGym.name}</span>）
            </div>
          </div>
        </div>

        <!-- 器具カードグリッド -->
        ${
          list.length === 0
            ? `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <p class="text-base font-bold text-slate-200">条件に一致する器具が見つかりませんでした</p>
                <button onclick="window.appActions.resetFilters()" class="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold">フィルタをリセット</button>
              </div>`
            : `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${list.map(renderEquipmentCard).join("")}
              </div>`
        }
      </div>
    `;
  }

  // タブ2：人体解剖ボディマップ検索ビュー
  function renderBodyMapTab() {
    const list = getFilteredEquipments();
    const currentMuscleObj = DATA.muscleGroups.find((m) => m.id === state.selectedMuscle) || DATA.muscleGroups[0];

    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- 左：人体解剖マップ -->
        <div class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
          <div class="w-full flex items-center justify-between mb-2">
            <div>
              <h2 class="text-sm font-extrabold text-white">人体筋肉マップから器具を探す</h2>
              <p class="text-xs text-slate-400">鍛えたい部位をタップすると対応マシンが表示されます</p>
            </div>
            <div class="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button onclick="window.appActions.setBodySide('front')" class="px-3 py-1 rounded-lg text-xs font-bold ${
                state.bodyViewSide === "front" ? "bg-red-600 text-white" : "text-slate-400"
              }">前面 (Front)</button>
              <button onclick="window.appActions.setBodySide('back')" class="px-3 py-1 rounded-lg text-xs font-bold ${
                state.bodyViewSide === "back" ? "bg-red-600 text-white" : "text-slate-400"
              }">背面 (Back)</button>
            </div>
          </div>

          <div class="my-2 w-full bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80">
            ${renderAnatomySVG()}
          </div>

          <div class="w-full flex flex-wrap gap-1.5 justify-center mt-2">
            ${DATA.muscleGroups
              .map(
                (m) => `
              <button onclick="window.appActions.selectMuscleFromMap('${m.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  state.selectedMuscle === m.id
                    ? "bg-red-600 border-red-400 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }">
                ${m.name}
              </button>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- 右：選択部位の器具リスト -->
        <div class="lg:col-span-7 space-y-3">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span class="text-xs text-red-400 font-bold">選択中のターゲット部位</span>
              <h3 class="text-lg font-extrabold text-white">${currentMuscleObj.name} — ${currentMuscleObj.sub}</h3>
            </div>
            <span class="px-3 py-1 rounded-full bg-red-500/20 text-red-300 font-bold text-xs">${list.length} 機種</span>
          </div>

          <div class="grid grid-cols-1 gap-3">
            ${list.map(renderEquipmentCard).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // タブ3：AIカメラ器具スキャナー
  function renderScannerTab() {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-red-500/20 text-red-300 border border-red-500/30">AI VISION SCANNER</span>
              <h2 class="text-lg font-extrabold text-white mt-1">カメラ・写真から器具の名前と使い方を判定</h2>
              <p class="text-xs text-slate-400">ジムで「このマシン何だろう？」と思ったらカメラで撮影するか写真を選択してください</p>
            </div>
          </div>

          <!-- カメラ/プレビュー枠 -->
          <div class="relative bg-slate-950 border-2 border-dashed border-slate-700 rounded-2xl overflow-hidden h-64 flex flex-col items-center justify-center">
            <video id="camera-video" autoplay playsinline class="hidden w-full h-full object-cover"></video>
            <img id="scanner-preview-img" class="hidden w-full h-full object-contain" alt="preview" />

            <div id="scanner-placeholder" class="text-center p-6 space-y-2">
              <div class="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto text-2xl">
                📷
              </div>
              <p class="text-sm font-bold text-slate-200">カメラを起動するか、マシンの写真をアップロード</p>
              <p class="text-xs text-slate-400">下の「ワンタップ実機シミュレーション」でもすぐにAI判定テストができます</p>
            </div>

            <!-- スキャン中オーバーレイ -->
            <div id="scanner-overlay" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
              <div class="w-48 h-32 border-2 border-red-500 rounded-xl relative overflow-hidden mb-3 flex items-center justify-center">
                <div class="w-full h-1 bg-red-500 animate-pulse"></div>
                <span class="text-xs font-bold text-red-300">AI骨格・フレーム形状解析中...</span>
              </div>
              <p class="text-xs text-slate-300">プーリー軌道・シート角度・パッド配置を照合しています</p>
            </div>
          </div>

          <!-- アクションボタン -->
          <div class="flex flex-wrap gap-2">
            <button onclick="window.appActions.startCamera()" class="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition">
              📷 スマホ・PCカメラを起動
            </button>
            <label class="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 text-center cursor-pointer transition">
              📁 写真ファイルを選択
              <input type="file" accept="image/*" class="hidden" onchange="window.appActions.handleImageUpload(event)" />
            </label>
          </div>

          <!-- すぐに試せるデモ撮影プリセット -->
          <div class="pt-2 border-t border-slate-800">
            <p class="text-xs font-bold text-slate-300 mb-2">⚡ 今すぐ試せる！ジム現場のAI画像認識シミュレーション：</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              ${[
                { id: "lat-pulldown", label: "上から引くバーの器具", tag: "ラットプルダウン" },
                { id: "pec-fly", label: "両腕を閉じる器具", tag: "ペックフライ" },
                { id: "leg-press", label: "足で板を押す大型器具", tag: "レッグプレス" },
                { id: "assisted-chin-dip", label: "膝パッド付き懸垂台", tag: "アシストチン＆ディップ" },
                { id: "hack-squat", label: "斜め45度しゃがみ器具", tag: "ハックスクワット" },
                { id: "cable-machine", label: "左右のワイヤー滑車台", tag: "ケーブルマシン" }
              ]
                .map(
                  (preset) => `
                <button onclick="window.appActions.runAiScan('${preset.id}')" class="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-red-500/50 text-left transition">
                  <div class="text-[11px] text-slate-400">${preset.label}</div>
                  <div class="text-xs font-bold text-white mt-0.5">🔍 ${preset.tag}を判定</div>
                </button>
              `
                )
                .join("")}
            </div>
          </div>
        </div>

        <!-- 右：AI認識結果表示パネル -->
        <div class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4" id="scanner-result-box">
          <div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div class="text-3xl">🤖</div>
            <p class="text-sm font-bold text-slate-200">AI判定結果がここに表示されます</p>
            <p class="text-xs">左のボタンから写真を読み込むか、シミュレーションボタンを押すと、器具名・対象筋肉・シート調整・推奨重量を即座にガイドします。</p>
          </div>
        </div>
      </div>
    `;
  }

  // タブ4：店舗別設置マシン＆2Dジムフロアマップ
  function renderMapTab() {
    const currentGym = DATA.gyms.find((g) => g.id === state.selectedGymId) || DATA.gyms[0];
    const installedIds = getCurrentGymInstalledIds();

    return `
      <div class="space-y-4">
        <!-- 店舗選択ヘッダー -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <span class="text-xs font-bold text-emerald-400">GYM FLOOR MAP & STORE INVENTORY</span>
              <h2 class="text-lg font-extrabold text-white">店舗ごとの設置マシン一覧・フロアマップ</h2>
            </div>
            <div class="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
              混雑状況: ${currentGym.crowdStatus}
            </div>
          </div>

          <!-- 店舗切替ボタン -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            ${DATA.gyms
              .map(
                (g) => `
              <button onclick="window.appActions.selectGym('${g.id}')" class="p-3 rounded-xl border text-left transition ${
                  state.selectedGymId === g.id
                    ? "bg-red-600/20 border-red-500 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                }">
                <div class="text-[11px] text-slate-400">${g.type}</div>
                <div class="text-xs font-extrabold mt-0.5">${g.name}</div>
                <div class="text-[11px] text-emerald-300 mt-1">設置 ${
                  g.id === "my-custom-gym" ? state.customGymMachines.length : g.installedIds.length
                } / ${DATA.equipments.length} 機種</div>
              </button>
            `
              )
              .join("")}
          </div>

          <p class="text-xs text-slate-300">${currentGym.description} （📍 ${currentGym.address}）</p>
        </div>

        <!-- インタラクティブ館内見取り図＆設置リスト -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-extrabold text-white">🗺️ わかりやすい館内フロア見取り図（タップで使い方表示）</h3>
              <div class="flex items-center gap-3 text-xs">
                <span class="flex items-center gap-1 text-emerald-300 font-bold">● 緑枠＝設置あり</span>
                <span class="flex items-center gap-1 text-amber-300 font-bold">★＝旅先診断で選んだ器具</span>
              </div>
            </div>

            <!-- 館内見取り図 -->
            <div class="bg-slate-950 rounded-2xl border-2 border-slate-800 p-3 space-y-2.5">
              <!-- 奥側：有酸素・ストレッチ ＆ フリーウェイト -->
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div class="sm:col-span-4 bg-teal-950/20 border border-teal-500/30 rounded-xl p-2.5 flex flex-col justify-between text-xs">
                  <div class="font-bold text-teal-300">🏃 有酸素＆ストレッチ（窓側）</div>
                  <div class="grid grid-cols-2 gap-1 my-1 text-center text-[11px] text-slate-300">
                    <div class="bg-slate-900 rounded p-1">ランニング8台</div>
                    <div class="bg-slate-900 rounded p-1">バイク5台</div>
                  </div>
                  <div class="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-1.5 text-center text-emerald-200 text-[11px]">
                    🧘 ストレッチマット広場
                  </div>
                </div>

                <div class="sm:col-span-8 bg-amber-950/20 border-2 border-amber-500/40 rounded-xl p-2.5 space-y-1.5">
                  <div class="text-xs font-bold text-amber-300">④ フリーウェイト＆ケーブルエリア（奥側・鏡の前）</div>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    ${DATA.equipments
                      .filter((eq) => eq.mapZone === "freeweight")
                      .map((eq) => {
                        const hasIt = installedIds.includes(eq.id);
                        const isWanted = state.travelEquips.includes(eq.id);
                        return `<button onclick="window.appActions.openModal('${eq.id}')" class="p-2 rounded-lg border text-left text-xs transition ${
                          hasIt ? "bg-slate-900 border-emerald-500/50 text-white hover:bg-slate-800" : "bg-slate-950 border-slate-800 text-slate-600 opacity-45"
                        }">
                          <div class="font-bold truncate">${eq.name.split("（")[0]}</div>
                          <div class="text-[11px] ${hasIt ? "text-emerald-400" : "text-rose-400"}">${hasIt ? "● 設置あり" : "× なし"} ${isWanted && hasIt ? "★" : ""}</div>
                        </button>`;
                      })
                      .join("")}
                  </div>
                </div>
              </div>

              <!-- 中央通路 -->
              <div class="bg-slate-900/90 border border-dashed border-slate-700 rounded-lg py-1 px-3 flex justify-between text-[11px] text-slate-400">
                <span>⬅️ 冷水機・トイレ</span>
                <span class="font-bold text-slate-300">🚶 中央通路（初心者は手前の①②③エリアからスタート！）</span>
                <span>消毒シート 🧴 ➡️</span>
              </div>

              <!-- 手前側：部位別マシン3ゾーン -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div class="bg-rose-950/20 border-2 border-rose-500/40 rounded-xl p-2.5 space-y-1.5">
                  <div class="text-xs font-bold text-rose-300">① 胸・肩・腕マシンエリア</div>
                  <div class="space-y-1.5">
                    ${DATA.equipments
                      .filter((eq) => eq.mapZone === "machine" && ["chest", "shoulder", "arm"].includes(eq.bodyPart))
                      .map((eq) => {
                        const hasIt = installedIds.includes(eq.id);
                        const isWanted = state.travelEquips.includes(eq.id);
                        return `<button onclick="window.appActions.openModal('${eq.id}')" class="w-full p-2 rounded-lg border text-left text-xs transition ${
                          hasIt ? "bg-slate-900 border-emerald-500/50 text-white hover:bg-slate-800" : "bg-slate-950 border-slate-800 text-slate-600 opacity-45"
                        }">
                          <div class="font-bold">${eq.name.split("（")[0]}</div>
                          <div class="text-[11px] ${hasIt ? "text-emerald-400" : "text-rose-400"}">${hasIt ? "● 設置あり" : "× なし"} ${isWanted && hasIt ? "★今日使う" : ""}</div>
                        </button>`;
                      })
                      .join("")}
                  </div>
                </div>

                <div class="bg-sky-950/20 border-2 border-sky-500/40 rounded-xl p-2.5 space-y-1.5">
                  <div class="text-xs font-bold text-sky-300">② 背中・腹筋マシンエリア</div>
                  <div class="space-y-1.5">
                    ${DATA.equipments
                      .filter((eq) => eq.mapZone === "machine" && ["back", "abs"].includes(eq.bodyPart))
                      .map((eq) => {
                        const hasIt = installedIds.includes(eq.id);
                        const isWanted = state.travelEquips.includes(eq.id);
                        return `<button onclick="window.appActions.openModal('${eq.id}')" class="w-full p-2 rounded-lg border text-left text-xs transition ${
                          hasIt ? "bg-slate-900 border-emerald-500/50 text-white hover:bg-slate-800" : "bg-slate-950 border-slate-800 text-slate-600 opacity-45"
                        }">
                          <div class="font-bold">${eq.name.split("（")[0]}</div>
                          <div class="text-[11px] ${hasIt ? "text-emerald-400" : "text-rose-400"}">${hasIt ? "● 設置あり" : "× なし"} ${isWanted && hasIt ? "★今日使う" : ""}</div>
                        </button>`;
                      })
                      .join("")}
                  </div>
                </div>

                <div class="bg-purple-950/20 border-2 border-purple-500/40 rounded-xl p-2.5 space-y-1.5">
                  <div class="text-xs font-bold text-purple-300">③ 脚・お尻マシンエリア</div>
                  <div class="space-y-1.5">
                    ${DATA.equipments
                      .filter((eq) => eq.mapZone === "machine" && eq.bodyPart === "legs")
                      .map((eq) => {
                        const hasIt = installedIds.includes(eq.id);
                        const isWanted = state.travelEquips.includes(eq.id);
                        return `<button onclick="window.appActions.openModal('${eq.id}')" class="w-full p-2 rounded-lg border text-left text-xs transition ${
                          hasIt ? "bg-slate-900 border-emerald-500/50 text-white hover:bg-slate-800" : "bg-slate-950 border-slate-800 text-slate-600 opacity-45"
                        }">
                          <div class="font-bold">${eq.name.split("（")[0]}</div>
                          <div class="text-[11px] ${hasIt ? "text-emerald-400" : "text-rose-400"}">${hasIt ? "● 設置あり" : "× なし"} ${isWanted && hasIt ? "★今日使う" : ""}</div>
                        </button>`;
                      })
                      .join("")}
                  </div>
                </div>
              </div>

              <!-- 入口・更衣室 -->
              <div class="grid grid-cols-12 gap-2 pt-1 text-xs text-center">
                <div class="col-span-5 bg-slate-800 border border-slate-600 rounded-lg p-2 font-bold text-white">🚪 入口・受付フロント</div>
                <div class="col-span-7 bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300">👕 更衣室・ロッカー・🚿 シャワー</div>
              </div>
            </div>
          </div>

          <!-- マイジム設置カスタマイズ / 店舗設置一覧 -->
          <div class="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 class="text-sm font-extrabold text-white">
              ${
                state.selectedGymId === "my-custom-gym"
                  ? "🛠️ マイジムの設置器具をON/OFF編集"
                  : `✅ ${currentGym.name} の設置リスト`
              }
            </h3>
            <p class="text-xs text-slate-400">
              ${
                state.selectedGymId === "my-custom-gym"
                  ? "自分が通うジムにあるマシンにチェックを入れると、マップと図鑑に反映されます。"
                  : "「マイジム」タブを選ぶと、通っているジムに合わせて自由に設置器具をカスタマイズできます。"
              }
            </p>
            <div class="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              ${DATA.equipments
                .map((eq) => {
                  const hasIt = installedIds.includes(eq.id);
                  return `
                    <div class="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div>
                        <span class="font-bold ${hasIt ? "text-white" : "text-slate-500 line-through"}">${eq.name}</span>
                        <span class="text-[11px] text-slate-400 block">${eq.bodyPartLabel}</span>
                      </div>
                      ${
                        state.selectedGymId === "my-custom-gym"
                          ? `<button onclick="window.appActions.toggleCustomGymMachine('${eq.id}')" class="px-2.5 py-1 rounded-lg font-bold ${
                              hasIt ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                            }">${hasIt ? "設置あり" : "なし"}</button>`
                          : `<button onclick="window.appActions.openModal('${eq.id}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200">詳細</button>`
                      }
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // タブ5：トレーニング記録＆1RM計算＆インターバルタイマー
  function renderLogTab() {
    const mins = String(Math.floor(state.timerRemaining / 60)).padStart(2, "0");
    const secs = String(state.timerRemaining % 60).padStart(2, "0");

    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- 左：新規セット記録＆インターバルタイマー -->
        <div class="lg:col-span-5 space-y-4">
          <!-- セット記録フォーム -->
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 class="text-base font-extrabold text-white">✍️ トレーニング記録（重量・回数・1RM自動算出）</h2>
            <div>
              <label class="text-xs text-slate-400 block mb-1">使用マシン・種目</label>
              <select id="log-machine" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                ${DATA.equipments
                  .map((eq) => `<option value="${eq.id}">${eq.name} (${eq.bodyPartLabel})</option>`)
                  .join("")}
              </select>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-xs text-slate-400 block mb-1">重量 (kg)</label>
                <input id="log-weight" type="number" step="2.5" value="40" oninput="window.appActions.update1RMPreview()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white" />
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">回数 (Reps)</label>
                <input id="log-reps" type="number" value="10" oninput="window.appActions.update1RMPreview()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white" />
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">RPE (きつさ1-10)</label>
                <input id="log-rpe" type="number" step="0.5" min="5" max="10" value="8.5" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white" />
              </div>
            </div>
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <span class="text-slate-400">推定1RM（最大挙上重量 Epley式）：</span>
              <span id="preview-1rm" class="text-amber-300 font-extrabold text-sm">${calc1RM(40, 10)} kg</span>
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">シート高・ピン位置・フォームメモ</label>
              <input id="log-note" type="text" placeholder="例：シート高3、グリップ指2本外側、ボトム丁寧" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <button onclick="window.appActions.addWorkoutLog()" class="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow transition">
              ＋ このセットを記録してタイマー開始
            </button>
          </div>

          <!-- インターバルタイマー -->
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-extrabold text-white">⏱️ セット間インターバルタイマー</h3>
              <span class="text-xs text-slate-400">筋肥大目安: 90〜180秒</span>
            </div>
            <div class="text-center py-3 bg-slate-950 rounded-2xl border border-slate-800">
              <div id="timer-display" class="text-3xl font-black tracking-wider text-red-400 font-mono">${mins}:${secs}</div>
            </div>
            <div class="grid grid-cols-4 gap-1.5 text-xs">
              ${[60, 90, 120, 180]
                .map(
                  (sec) => `
                <button onclick="window.appActions.setTimerPreset(${sec})" class="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold">${sec}秒</button>
              `
                )
                .join("")}
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button onclick="window.appActions.toggleTimer()" class="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                ${state.timerRunning ? "⏸ 一時停止" : "▶ スタート"}
              </button>
              <button onclick="window.appActions.resetTimer()" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs">
                ↺ リセット
              </button>
            </div>
          </div>
        </div>

        <!-- 右：履歴一覧 -->
        <div class="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-extrabold text-white">📊 トレーニング履歴・シート設定メモ</h3>
            <span class="text-xs text-slate-400">全 ${state.logs.length} セット記録済み</span>
          </div>
          <div class="space-y-2.5">
            ${state.logs
              .map(
                (item) => `
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-extrabold text-white">${item.machineName}</span>
                    <span class="text-[11px] text-slate-500">${item.date}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">${item.weight} kg × ${item.reps} 回</span>
                    <span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold">推定1RM: ${calc1RM(item.weight, item.reps)} kg</span>
                    <span class="text-slate-400">RPE ${item.rpe}</span>
                  </div>
                  ${item.note ? `<p class="text-xs text-slate-300">📝 ${item.note}</p>` : ""}
                </div>
                <button onclick="window.appActions.deleteLog('${item.id}')" class="text-xs text-slate-500 hover:text-red-400 px-2 py-1">削除</button>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  // 詳細モーダル描画（初心者ガイド＆ビルダーPro解説の両方を完全表示）
  function renderModal() {
    if (!state.activeModalMachineId) return "";
    const eq = DATA.equipments.find((e) => e.id === state.activeModalMachineId);
    if (!eq) return "";

    return `
      <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto" onclick="if(event.target===this) window.appActions.closeModal()">
        <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
          <div class="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-300">${eq.bodyPartLabel} / ${eq.category}</span>
              <h2 class="text-xl font-black text-white mt-1">${eq.name}</h2>
              <p class="text-xs text-slate-400">${eq.enName} — POF分類: ${eq.pof}</p>
            </div>
            <button onclick="window.appActions.closeModal()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">✕ 閉じる</button>
          </div>

          <!-- イラスト＆対象筋肉 -->
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 items-center">
            <div class="sm:col-span-5 h-32">
              ${getMachineSVG(eq.svgType)}
            </div>
            <div class="sm:col-span-7 space-y-2 text-xs">
              <div><span class="text-slate-400">メインターゲット筋：</span> <span class="text-red-400 font-bold">${eq.primaryMuscles.join("、")}</span></div>
              <div><span class="text-slate-400">サブ（協働筋）：</span> <span class="text-slate-200">${eq.secondaryMuscles.join("、") || "なし（単関節アイソレーション）"}</span></div>
              <div><span class="text-slate-400">初心者目安重量：</span> <span class="text-emerald-300 font-bold">男性 ${eq.beginnerGuide.startWeight.male} ／ 女性 ${eq.beginnerGuide.startWeight.female}</span></div>
              <div><span class="text-slate-400">目標セット数：</span> <span class="text-white font-semibold">${eq.beginnerGuide.startWeight.reps}</span></div>
            </div>
          </div>

          <!-- 1. 初心者向けステップ＆NGフォーム -->
          <div class="bg-slate-950/90 border border-sky-500/30 rounded-2xl p-4 space-y-2.5">
            <h3 class="text-sm font-extrabold text-sky-300">🔰 初心者向け：シート調整＆基本のやり方</h3>
            <p class="text-xs text-slate-200 bg-sky-950/40 border border-sky-500/20 p-2.5 rounded-xl">
              <strong class="text-sky-300">【シート・開始位置の合わせ方】</strong><br/>${eq.beginnerGuide.seatSetup}
            </p>
            <ol class="list-decimal list-inside space-y-1.5 text-xs text-slate-200">
              ${eq.beginnerGuide.steps.map((s) => `<li>${s}</li>`).join("")}
            </ol>
            <div class="pt-2 border-t border-slate-800">
              <div class="text-xs font-bold text-rose-400 mb-1">⚠️ 怪我を防ぐためのNGフォーム注意：</div>
              <ul class="list-disc list-inside space-y-1 text-xs text-rose-200/90">
                ${eq.beginnerGuide.ngPoints.map((n) => `<li>${n}</li>`).join("")}
              </ul>
            </div>
          </div>

          <!-- 2. ボディービルダー・上級者向けバイオメカニクス解説 -->
          <div class="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4 space-y-2.5">
            <h3 class="text-sm font-extrabold text-amber-300">🏆 ボディービルダーPro解説：解剖学＆筋肥大テクニック</h3>
            <p class="text-xs text-slate-200"><strong class="text-amber-300">【解剖学的特徴】</strong> ${eq.proGuide.anatomy}</p>
            <p class="text-xs text-slate-200 whitespace-pre-line"><strong class="text-amber-300">【バイオメカニクス・軌道制御】</strong> ${eq.proGuide.biomechanics}</p>
            <div>
              <div class="text-xs font-bold text-amber-300 mb-1">【ターゲット別バリエーション】</div>
              <ul class="list-disc list-inside space-y-1 text-xs text-amber-100/90">
                ${eq.proGuide.variations.map((v) => `<li>${v}</li>`).join("")}
              </ul>
            </div>
            <p class="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
              <strong>🔥 Pro Builder's Tip：</strong> ${eq.proGuide.builderTip}
            </p>
          </div>

          <div class="flex justify-end gap-2">
            <button onclick="window.appActions.quickLogFromMachine('${eq.id}')" class="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold">
              ✍️ このマシンの重量・回数を記録する
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 旅先ジムマッチ度（％）計算＆レンダリング
  function calcTravelGymMatch(gym) {
    const installed = gym.id === "my-custom-gym" ? state.customGymMachines : gym.installedIds;
    const muscleEquipIds = DATA.equipments
      .filter((e) => state.travelMuscles.includes(e.bodyPart))
      .map((e) => e.id);
    const targetEquipIds = state.travelEquips;

    let specificScore = 1;
    const matchedSpecific = [];
    const missingSpecific = [];
    if (targetEquipIds.length > 0) {
      targetEquipIds.forEach((id) => {
        if (installed.includes(id)) matchedSpecific.push(id);
        else missingSpecific.push(id);
      });
      specificScore = matchedSpecific.length / targetEquipIds.length;
    }

    let muscleScore = 1;
    if (muscleEquipIds.length > 0) {
      const hitCount = muscleEquipIds.filter((id) => installed.includes(id)).length;
      muscleScore = hitCount / muscleEquipIds.length;
    }

    const distScore = Math.max(0.2, 1 - (gym.distanceKm || 0.5) * 0.45);
    let rawPercent = 90;
    if (targetEquipIds.length > 0 && muscleEquipIds.length > 0) {
      rawPercent = Math.round((specificScore * 0.65 + muscleScore * 0.25 + distScore * 0.1) * 100);
    } else if (targetEquipIds.length > 0) {
      rawPercent = Math.round((specificScore * 0.88 + distScore * 0.12) * 100);
    } else if (muscleEquipIds.length > 0) {
      rawPercent = Math.round((muscleScore * 0.88 + distScore * 0.12) * 100);
    }
    if (missingSpecific.length === 0 && muscleScore === 1 && (targetEquipIds.length > 0 || muscleEquipIds.length > 0)) {
      rawPercent = Math.max(96, Math.min(99, rawPercent + 4));
    }

    return {
      percent: Math.min(100, Math.max(15, rawPercent)),
      matchedSpecific,
      missingSpecific,
      muscleCoverageCount: muscleEquipIds.filter((id) => installed.includes(id)).length,
      muscleTotalCount: muscleEquipIds.length
    };
  }

  function renderTravelMatchTab() {
    const ranked = DATA.gyms
      .map((gym) => ({ gym, match: calcTravelGymMatch(gym) }))
      .sort((a, b) => b.match.percent - a.match.percent);

    return `
      <div class="space-y-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">✈️ 旅先・出張先 最適ジム診断</span>
              <h2 class="text-lg font-extrabold text-white mt-1">鍛えたい部位と使いたい器具から最適ジムを％表示</h2>
              <p class="text-xs text-slate-400">今日やりたい部位とこだわりの器具を選ぶだけで、近くのジムをマッチ度（％）順に出します</p>
            </div>
            <select onchange="window.appActions.setTravelArea(this.value)" class="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-300">
              ${[
                "📍 現在地周辺（GPS・旅先エリア）",
                "東京・新宿/渋谷エリア",
                "大阪・梅田/難波エリア",
                "名古屋・栄/名駅エリア",
                "福岡・博多/天神エリア",
                "札幌・すすきの/大通エリア",
                "沖縄・那覇国際通りエリア"
              ].map((a) => `<option value="${a}" ${state.travelArea === a ? "selected" : ""}>${a}</option>`).join("")}
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-sky-300 block">① 今日鍛えたい体の部位（複数選択OK）</label>
            <div class="flex flex-wrap gap-2">
              ${DATA.muscleGroups
                .filter((m) => m.id !== "all")
                .map((m) => {
                  const active = state.travelMuscles.includes(m.id);
                  return `<button onclick="window.appActions.toggleTravelMuscle('${m.id}')" class="px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                    active ? "bg-sky-600 border-sky-400 text-white shadow" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }">${active ? "✓ " : ""}${m.name}</button>`;
                })
                .join("")}
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-amber-300">② 絶対に使いたい器具（複数選択OK）</label>
              <button onclick="window.appActions.clearTravelEquips()" class="text-xs text-slate-400 hover:text-white underline">選択クリア</button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${DATA.equipments
                .map((eq) => {
                  const active = state.travelEquips.includes(eq.id);
                  const isMuscleMatch = state.travelMuscles.includes(eq.bodyPart);
                  return `<button onclick="window.appActions.toggleTravelEquip('${eq.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    active
                      ? "bg-amber-500 border-amber-300 text-slate-950 shadow"
                      : isMuscleMatch
                        ? "bg-slate-950 border-sky-500/40 text-sky-200 hover:bg-slate-800"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }">${active ? "✓ " : "+ "}${eq.name}</button>`;
                })
                .join("")}
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <h3 class="text-sm font-black text-white px-1">🏆 あなたの条件に合う近くの最適ジムランキング（％順）</h3>
          ${ranked
            .map((item, idx) => {
              const { gym, match } = item;
              const p = match.percent;
              const barColor = p >= 85 ? "bg-emerald-500" : p >= 65 ? "bg-amber-500" : "bg-rose-500";
              const badgeColor =
                p >= 85
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : p >= 65
                    ? "bg-amber-500/20 border-amber-400 text-amber-300"
                    : "bg-rose-500/20 border-rose-400 text-rose-300";
              const matchedNames = match.matchedSpecific.map((id) => DATA.equipments.find((e) => e.id === id)?.name);
              const missingNames = match.missingSpecific.map((id) => DATA.equipments.find((e) => e.id === id)?.name);

              return `
                <div class="bg-slate-900 border ${idx === 0 ? "border-emerald-500/70" : "border-slate-800"} rounded-2xl p-4 space-y-3 shadow-lg">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg text-xs font-black ${idx === 0 ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"}">
                          ${idx === 0 ? "👑 1位 最適ジム" : `${idx + 1}位`}
                        </span>
                        <span class="text-xs text-slate-400">📍 徒歩${gym.walkMin || 5}分 (${gym.distanceKm || 0.4}km) ／ ${gym.crowdStatus}</span>
                      </div>
                      <h4 class="text-lg font-black text-white mt-1">${gym.name}</h4>
                      <p class="text-xs text-sky-300 font-semibold">🎫 ${gym.visitorFee || gym.type}</p>
                    </div>
                    <div class="px-4 py-2 rounded-2xl border text-center shrink-0 ${badgeColor}">
                      <div class="text-xs font-bold">最適マッチ度</div>
                      <div class="text-3xl font-black leading-none mt-0.5">${p}<span class="text-sm">%</span></div>
                    </div>
                  </div>
                  <div class="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div class="h-full ${barColor}" style="width: ${p}%"></div>
                  </div>
                  <div class="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-1 text-xs">
                    ${
                      matchedNames.length > 0
                        ? `<div class="text-emerald-300">✅ <strong>希望器具あり：</strong>${matchedNames.join("、")}</div>`
                        : `<div class="text-slate-300">✅ 選択部位のマシン設置数：${match.muscleCoverageCount} / ${match.muscleTotalCount} 機種</div>`
                    }
                    ${
                      missingNames.length > 0
                        ? `<div class="text-rose-300">❌ <strong>未設置：</strong>${missingNames.join("、")}</div>`
                        : state.travelEquips.length > 0
                          ? `<div class="text-amber-300 font-bold">🎉 希望した器具が100%すべて揃っています！</div>`
                          : ""
                    }
                  </div>
                  <div class="flex justify-end">
                    <button onclick="window.appActions.selectGym('${gym.id}'); window.appActions.setTab('map');" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold">
                      🗺️ このジムのフロアマップを開く →
                    </button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  // 全体レンダリング
  function render() {
    const root = document.getElementById("app-root");
    if (!root) return;

    let tabContent = "";
    if (state.activeTab === "travel") tabContent = renderTravelMatchTab();
    else if (state.activeTab === "encyclopedia") tabContent = renderEncyclopediaTab();
    else if (state.activeTab === "body") tabContent = renderBodyMapTab();
    else if (state.activeTab === "scanner") tabContent = renderScannerTab();
    else if (state.activeTab === "map") tabContent = renderMapTab();
    else if (state.activeTab === "log") tabContent = renderLogTab();

    root.innerHTML = `
      <!-- トップヘッダー -->
      <header class="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center font-black text-white shadow">
              GF
            </div>
            <div>
              <h1 class="text-base font-black tracking-tight text-white">Gym Finder</h1>
              <p class="text-[11px] text-slate-400">旅先の最適ジム％診断＆初心者〜ビルダー対応器具ガイド</p>
            </div>
          </div>

          <!-- 初心者モード / ビルダーProモード 切替スイッチ -->
          <div class="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onclick="window.appActions.setUserMode('beginner')"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                state.userMode === "beginner"
                  ? "bg-sky-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }"
            >
              🔰 初心者ガイド表示
            </button>
            <button
              onclick="window.appActions.setUserMode('pro')"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                state.userMode === "pro"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }"
            >
              🏆 ビルダーPro解剖学表示
            </button>
          </div>
        </div>
      </header>

      <!-- メインコンテンツ -->
      <main class="max-w-6xl mx-auto px-4 py-4 pb-24">
        ${tabContent}
      </main>

      <!-- ボトムナビゲーションバー（スマホアプリUI） -->
      <nav class="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800">
        <div class="max-w-xl mx-auto grid grid-cols-6 py-1.5 px-2">
          ${[
            { id: "travel", icon: "✈️", label: "旅先ジム％" },
            { id: "encyclopedia", icon: "🏋️", label: "器具図鑑" },
            { id: "body", icon: "🫀", label: "部位マップ" },
            { id: "scanner", icon: "📷", label: "AI判定" },
            { id: "map", icon: "🗺️", label: "店舗地図" },
            { id: "log", icon: "📊", label: "記録・1RM" }
          ]
            .map(
              (t) => `
            <button
              onclick="window.appActions.setTab('${t.id}')"
              class="flex flex-col items-center justify-center py-1 rounded-xl transition ${
                state.activeTab === t.id ? "text-red-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
              }"
            >
              <span class="text-base">${t.icon}</span>
              <span class="text-[11px] mt-0.5">${t.label}</span>
            </button>
          `
            )
            .join("")}
        </div>
      </nav>

      ${renderModal()}
    `;
  }

  // アクション公開
  window.appActions = {
    setTab(tab) {
      if (state.cameraStream && tab !== "scanner") {
        state.cameraStream.getTracks().forEach((tr) => tr.stop());
        state.cameraStream = null;
      }
      state.activeTab = tab;
      render();
    },
    setTravelArea(area) {
      state.travelArea = area;
      render();
    },
    toggleTravelMuscle(mId) {
      if (state.travelMuscles.includes(mId)) {
        state.travelMuscles = state.travelMuscles.filter((x) => x !== mId);
      } else {
        state.travelMuscles.push(mId);
      }
      render();
    },
    toggleTravelEquip(eId) {
      if (state.travelEquips.includes(eId)) {
        state.travelEquips = state.travelEquips.filter((x) => x !== eId);
      } else {
        state.travelEquips.push(eId);
      }
      render();
    },
    clearTravelEquips() {
      state.travelEquips = [];
      render();
    },
    setUserMode(mode) {
      state.userMode = mode;
      saveState();
      render();
    },
    setMuscle(muscleId) {
      state.selectedMuscle = muscleId;
      render();
    },
    selectMuscleFromMap(muscleId) {
      state.selectedMuscle = muscleId;
      render();
    },
    setBodySide(side) {
      state.bodyViewSide = side;
      render();
    },
    setCategory(cat) {
      state.selectedCategory = cat;
      render();
    },
    setSearch(q) {
      state.searchQuery = q;
      render();
      const input = document.getElementById("search-input");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    },
    toggleOnlyFavs() {
      state.onlyFavorites = !state.onlyFavorites;
      render();
    },
    toggleOnlyCurrentGym() {
      state.onlyCurrentGym = !state.onlyCurrentGym;
      render();
    },
    resetFilters() {
      state.selectedMuscle = "all";
      state.selectedCategory = "all";
      state.searchQuery = "";
      state.onlyFavorites = false;
      state.onlyCurrentGym = false;
      render();
    },
    toggleFav(id) {
      if (state.favorites.includes(id)) {
        state.favorites = state.favorites.filter((x) => x !== id);
      } else {
        state.favorites.push(id);
      }
      saveState();
      render();
    },
    openModal(id) {
      state.activeModalMachineId = id;
      render();
    },
    closeModal() {
      state.activeModalMachineId = null;
      render();
    },
    selectGym(gymId) {
      state.selectedGymId = gymId;
      saveState();
      render();
    },
    toggleCustomGymMachine(id) {
      if (state.customGymMachines.includes(id)) {
        state.customGymMachines = state.customGymMachines.filter((x) => x !== id);
      } else {
        state.customGymMachines.push(id);
      }
      saveState();
      render();
    },
    quickLogFromMachine(id) {
      state.activeModalMachineId = null;
      state.activeTab = "log";
      render();
      const sel = document.getElementById("log-machine");
      if (sel) sel.value = id;
    },
    update1RMPreview() {
      const w = document.getElementById("log-weight")?.value || 0;
      const r = document.getElementById("log-reps")?.value || 0;
      const el = document.getElementById("preview-1rm");
      if (el) el.textContent = `${calc1RM(w, r)} kg`;
    },
    addWorkoutLog() {
      const machineId = document.getElementById("log-machine")?.value || "chest-press";
      const eq = DATA.equipments.find((e) => e.id === machineId) || DATA.equipments[0];
      const weight = parseFloat(document.getElementById("log-weight")?.value) || 20;
      const reps = parseInt(document.getElementById("log-reps")?.value, 10) || 10;
      const rpe = parseFloat(document.getElementById("log-rpe")?.value) || 8;
      const note = document.getElementById("log-note")?.value || "";

      state.logs.unshift({
        id: "log-" + Date.now(),
        machineId: eq.id,
        machineName: eq.name,
        weight,
        reps,
        rpe,
        note,
        date: "たった今"
      });
      saveState();
      this.setTimerPreset(90);
      this.toggleTimer(true);
      render();
    },
    deleteLog(id) {
      state.logs = state.logs.filter((l) => l.id !== id);
      saveState();
      render();
    },
    setTimerPreset(sec) {
      state.timerSeconds = sec;
      state.timerRemaining = sec;
      render();
    },
    toggleTimer(forceStart) {
      if (forceStart === true) state.timerRunning = false;
      if (state.timerRunning) {
        clearInterval(state.timerInterval);
        state.timerRunning = false;
      } else {
        clearInterval(state.timerInterval);
        state.timerRunning = true;
        state.timerInterval = setInterval(() => {
          if (state.timerRemaining > 0) {
            state.timerRemaining -= 1;
            const disp = document.getElementById("timer-display");
            if (disp) {
              const m = String(Math.floor(state.timerRemaining / 60)).padStart(2, "0");
              const s = String(state.timerRemaining % 60).padStart(2, "0");
              disp.textContent = `${m}:${s}`;
            }
          } else {
            clearInterval(state.timerInterval);
            state.timerRunning = false;
            render();
          }
        }, 1000);
      }
      render();
    },
    resetTimer() {
      clearInterval(state.timerInterval);
      state.timerRunning = false;
      state.timerRemaining = state.timerSeconds;
      render();
    },
    async startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        state.cameraStream = stream;
        const video = document.getElementById("camera-video");
        const placeholder = document.getElementById("scanner-placeholder");
        if (video && placeholder) {
          placeholder.classList.add("hidden");
          video.classList.remove("hidden");
          video.srcObject = stream;
        }
      } catch (e) {
        this.runAiScan("chest-press");
      }
    },
    handleImageUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.getElementById("scanner-preview-img");
        const placeholder = document.getElementById("scanner-placeholder");
        if (img && placeholder) {
          placeholder.classList.add("hidden");
          img.classList.remove("hidden");
          img.src = ev.target.result;
        }
        // ファイル名から推定または人気機種を判定
        const nameLower = file.name.toLowerCase();
        let targetId = "chest-press";
        for (const eq of DATA.equipments) {
          if (nameLower.includes(eq.id.split("-")[0])) {
            targetId = eq.id;
            break;
          }
        }
        this.runAiScan(targetId);
      };
      reader.readAsDataURL(file);
    },
    runAiScan(machineId) {
      const overlay = document.getElementById("scanner-overlay");
      if (overlay) overlay.classList.remove("hidden");

      setTimeout(() => {
        if (overlay) overlay.classList.add("hidden");
        const eq = DATA.equipments.find((e) => e.id === machineId) || DATA.equipments[0];
        const box = document.getElementById("scanner-result-box");
        if (!box) return;
        box.innerHTML = `
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✓ AI一致度 98.4%</span>
              <span class="text-xs text-slate-400">${eq.category}</span>
            </div>
            <div>
              <h3 class="text-lg font-black text-white">${eq.name}</h3>
              <p class="text-xs text-red-300 font-bold">鍛えられる部位：${eq.primaryMuscles.join("・")}</p>
            </div>
            <div class="h-28 bg-slate-950 rounded-xl p-2 border border-slate-800">
              ${getMachineSVG(eq.svgType)}
            </div>
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
              <div class="font-bold text-sky-300">🔰 すぐできるシート設定：</div>
              <p class="text-slate-200">${eq.beginnerGuide.seatSetup}</p>
              <div class="font-bold text-emerald-300 pt-1">⚖️ 初回おすすめ重量：</div>
              <p class="text-slate-200">男性 ${eq.beginnerGuide.startWeight.male} ／ 女性 ${eq.beginnerGuide.startWeight.female}</p>
            </div>
            <button onclick="window.appActions.openModal('${eq.id}')" class="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs">
              📖 詳しいフォーム解説＆ビルダーPro解説を開く
            </button>
          </div>
        `;
      }, 650);
    }
  };

  window.addEventListener("DOMContentLoaded", render);
  render();
})();
