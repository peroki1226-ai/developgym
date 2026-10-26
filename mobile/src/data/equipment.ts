export interface EquipmentItem {
  id: string;
  name: string;
  enName: string;
  category: string;
  bodyPart: "chest" | "back" | "shoulder" | "arm" | "legs" | "abs";
  bodyPartLabel: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  pof: string;
  summary: string;
  svgType: string;
  muscleTag: string;
  seatSetup: string;
  beginnerSteps: string[];
  ngPoints: string[];
  startWeightMale: string;
  startWeightFemale: string;
  proBiomechanics: string;
  proAnatomy: string;
  proVariations: string[];
  builderTip: string;
}

export const EQUIPMENTS: EquipmentItem[] = [
  {
    id: "chest-press",
    name: "チェストプレス",
    enName: "Seated Chest Press",
    category: "マシン",
    bodyPart: "chest",
    bodyPartLabel: "胸（大胸筋中部）",
    primaryMuscles: ["大胸筋（胸肋部）"],
    secondaryMuscles: ["三角筋前部", "上腕三頭筋"],
    pof: "Midrange（ミッドレンジ種目）",
    svgType: "chest-press",
    muscleTag: "Pectoralis Major (Full Chest)",
    summary: "軌道が固定されており、初心者でも安全に大胸筋へ高重量の刺激を入れられる王道プッシュマシン。",
    seatSetup: "グリップがバストトップ（乳頭ライン）と同じ高さになるようシート高を調整。",
    beginnerSteps: [
      "背中とお尻をシートに密着させ、肩甲骨を軽く寄せて胸を張る",
      "息を吐きながら肘が伸びきる手前まで前に押し出す",
      "息を吸いながら胸のストレッチを感じる位置までゆっくり戻す"
    ],
    ngPoints: ["肩がすくんで前に出る", "肘を完全ロックして関節で休む"],
    startWeightMale: "25〜35 kg",
    startWeightFemale: "10〜15 kg",
    proBiomechanics: "水平軌道でコンスタントテンションを維持。コンバージング機構では内側に絞り込むことで大胸筋内側の収縮を最大化できる。",
    proAnatomy: "大胸筋胸肋部（起始: 胸骨・第2-6肋軟骨 / 停止: 上腕骨大結節稜）",
    proVariations: [
      "シート高めでやや下方へ押し出し大胸筋下部を強調",
      "片手実施（ユニラテラル）で正中線を超えて内転させ最大収縮"
    ],
    builderTip: "ボトムで1秒ポーズを入れてストレッチを最大化し、ベンチプレス後の追い込みに最適。"
  },
  {
    id: "pec-fly",
    name: "ペックフライ / リアデルト",
    enName: "Pec Deck / Rear Delt Fly",
    category: "マシン",
    bodyPart: "chest",
    bodyPartLabel: "胸（内側） / 肩後部",
    primaryMuscles: ["大胸筋（内転作用）", "三角筋後部"],
    secondaryMuscles: ["烏口腕筋", "前鋸筋"],
    pof: "Contracted（コントラクト・収縮種目）",
    svgType: "pec-fly",
    muscleTag: "Inner Pectorals & Cleavage",
    summary: "腕を閉じる動きで大胸筋を極限まで収縮させるマシン。背面向きに座れば肩後部（リアデルト）も刺激可能。",
    seatSetup: "グリップを握ったときに肩のラインより肘がやや下になる高さにシートを合わせる。",
    beginnerSteps: [
      "肩甲骨を寄せてシートに固定し、肘を軽く曲げた角度をキープする",
      "大木を抱きかかえるイメージで、両手を胸の前で合わせるように閉じる",
      "閉じきった位置で1秒収縮を意識し、コントロールしながら開く"
    ],
    ngPoints: ["腕を後ろに引きすぎて肩前部を痛める", "肘の曲げ伸ばしだけで閉じてしまう"],
    startWeightMale: "20〜30 kg",
    startWeightFemale: "7〜12 kg",
    proBiomechanics: "肩関節の水平内転を単関節（アイソレーション）で遂行。ダンベルフライでは負荷が抜けるトップでも100%張力が維持される。",
    proAnatomy: "大胸筋全体および水平内転筋群（三角筋前部、烏口腕筋）",
    proVariations: [
      "胸トレ前のプレエグゾースト（予備疲労法）として活用",
      "シート逆向きでアームを後方に引き三角筋後部（リア）を集中的に刺激"
    ],
    builderTip: "トップでグリップをぶつけず、手のひらの付け根（掌底）同士を押し合わせるイメージで胸の谷間を作る。"
  },
  {
    id: "incline-smith",
    name: "スミスマシン（インクライン）",
    enName: "Smith Machine Incline Press",
    category: "マシン",
    bodyPart: "chest",
    bodyPartLabel: "胸上部（鎖骨部）",
    primaryMuscles: ["大胸筋上部（鎖骨部）"],
    secondaryMuscles: ["三角筋前部", "上腕三頭筋"],
    pof: "Midrange（ミッドレンジ種目）",
    svgType: "incline-smith",
    muscleTag: "Upper Pectorals (Collarbone)",
    summary: "レール固定のスミスマシンにより、バランスを崩さず大胸筋上部へ安全に高重量を叩き込める。",
    seatSetup: "インクラインベンチの角度を30°〜45°に設定し、バーが鎖骨の真下に下りる位置に配置。",
    beginnerSteps: [
      "鎖骨の真下にバーが来る位置に仰向けになり、肩幅の1.5倍で握る",
      "手首を返してフックを外し、鎖骨上部に向かってゆっくり下ろす",
      "胸を張ったまま、大胸筋上部の力でバーを押し上げる"
    ],
    ngPoints: ["ベンチ角度が急すぎて肩（三角筋前部）に逃げる", "肩甲骨が外れて背中が丸まる"],
    startWeightMale: "30〜45 kg",
    startWeightFemale: "10〜20 kg",
    proBiomechanics: "軌道ブレがゼロのため、三角筋の動員を最小限に抑え大胸筋鎖骨部へメカニカルテンションを集中できる。",
    proAnatomy: "大胸筋鎖骨部（起始: 鎖骨内側1/2 / 停止: 上腕骨大結節稜）",
    proVariations: [
      "セーフティを胸すれすれに設定しボトムからのピンプレスで筋力強化",
      "リバースグリップ（逆手）で握り上部線維の動員をさらに高める"
    ],
    builderTip: "鎖骨に触れる寸前で止め、胸上部の伸び感を感じてから爆発的に押し上げる。"
  },
  {
    id: "cable-machine",
    name: "ケーブルクロスオーバー",
    enName: "Cable Crossover",
    category: "ケーブル",
    bodyPart: "chest",
    bodyPartLabel: "胸（下部・内側） / 全体",
    primaryMuscles: ["大胸筋下部（腹部線維）", "胸骨部"],
    secondaryMuscles: ["前鋸筋", "上腕二頭筋短頭"],
    pof: "Contracted（コントラクト種目）",
    svgType: "cable-machine",
    muscleTag: "Chest, Deltoids & Arms",
    summary: "滑車高さを自由に変更でき、全可動域で抜けない一定テンションをかけられる最高峰の収縮マシン。",
    seatSetup: "プーリーの高さを肩より上にセット（下部狙い）または床付近にセット（上部狙い）。",
    beginnerSteps: [
      "両手でハンドルを持ち、一歩前へ出て片足を前に出しスタンスを安定させる",
      "上体を少し前傾させ、肘を固定したまま両手を前下方に絞り込む",
      "胸の前で手が交差する位置まで引きつけ、ゆっくりストレッチを感じて戻す"
    ],
    ngPoints: ["上体を前後に激しく振って反動を使う", "肘を曲げてプレス動作にしてしまう"],
    startWeightMale: "7.5〜12.5 kg（片側）",
    startWeightFemale: "2.5〜5 kg（片側）",
    proBiomechanics: "重力と独立したケーブル張力により、フィニッシュで手が交差（クロスオーバー）する瞬間まで負荷が最大化される。",
    proAnatomy: "大胸筋腹部線維および胸肋部内側線維",
    proVariations: [
      "ハイプーリー: 斜め下へ引いて大胸筋下部の輪郭を形成",
      "ロープーリー: 斜め上へすくい上げて大胸筋上部内側を直撃"
    ],
    builderTip: "フィニッシュで左右の手首を交差させ、交互に入れ替えることで内側線維を完全収縮。"
  },
  {
    id: "lat-pulldown",
    name: "ラットプルダウン",
    enName: "Lat Pulldown Machine",
    category: "マシン",
    bodyPart: "back",
    bodyPartLabel: "背中（広背筋・大円筋）",
    primaryMuscles: ["広背筋", "大円筋"],
    secondaryMuscles: ["僧帽筋下部", "上腕二頭筋", "菱形筋"],
    pof: "Stretch / Midrange",
    svgType: "lat-pulldown",
    muscleTag: "Latissimus Dorsi (Back Width)",
    summary: "懸垂ができない方でも体重以下の重量から背中の広がり（逆三角形）を安全に作れる王道マシン。",
    seatSetup: "太ももパッドに脚を差し込んだとき、太ももが浮かないよう固定する。",
    beginnerSteps: [
      "肩幅の1.5倍で順手でバーを握り、太ももをパッドにしっかり固定する",
      "胸を斜め上に向けて張り、肘を真横ではなく「あばら骨」に向かって引き下ろす",
      "鎖骨のあたりまでバーを引きつけたら、背中の伸びを感じながらゆっくり戻す"
    ],
    ngPoints: ["上体を大きく後ろに倒して腕の力だけで引く", "バーを首の後ろ（ビハインド）に引き肩を痛める"],
    startWeightMale: "30〜45 kg",
    startWeightFemale: "15〜25 kg",
    proBiomechanics: "肩関節の内転および伸展動作。肘を腰のポケットに差し込む意識で引くと広背筋下部まで収縮が入る。",
    proAnatomy: "広背筋（起始: 胸腰筋膜・腸骨稜 / 停止: 上腕骨結節間溝底）",
    proVariations: [
      "MAGグリップ（中立位ハンドル）で前腕・二頭筋の関与を最小化",
      "アンダーグリップ（逆手）で広背筋下部線維と上腕二頭筋の動員強化"
    ],
    builderTip: "小指と薬指側を強く意識して握り、トップで広背筋を最大ストレッチさせてから引き始める。"
  },
  {
    id: "seated-row",
    name: "シーテッドケーブルロー",
    enName: "Seated Cable Row",
    category: "ケーブル",
    bodyPart: "back",
    bodyPartLabel: "背中（厚み・僧帽筋・菱形筋）",
    primaryMuscles: ["僧帽筋中部・下部", "菱形筋", "広背筋"],
    secondaryMuscles: ["脊柱起立筋", "上腕二頭筋"],
    pof: "Contracted（収縮種目）",
    svgType: "seated-row",
    muscleTag: "Lats & Rhomboids (Back Depth)",
    summary: "水平方向に引くことで背中の立体的な「厚み」と姿勢改善効果をもたらす水平プラーマシン。",
    seatSetup: "フットプレートに足を置き、膝をわずかに曲げた状態で骨盤を立てて座る。",
    beginnerSteps: [
      "背筋を伸ばしてハンドルを持ち、胸を張ってスタンバイする",
      "息を吐きながら、肘を後ろへ引き寄せておへその横にハンドルを引く",
      "肩甲骨を中央にしっかり寄せきって1秒収縮し、ゆっくり戻す"
    ],
    ngPoints: ["背中を丸めたまま引いて腰を痛める", "上体を前後に大きくスイングさせて反動を使う"],
    startWeightMale: "25〜40 kg",
    startWeightFemale: "12〜20 kg",
    proBiomechanics: "肩甲骨の内転（リトラクション）と上腕骨の水平伸展。骨盤を前傾維持することで広背筋のテンションが抜けない。",
    proAnatomy: "僧帽筋中部・菱形筋・広背筋上部内側",
    proVariations: [
      "ナローVバー: 広背筋の厚みと下部線維にダイレクト負荷",
      "ワイドストレートバー: 僧帽筋中部・リアデルト寄りの背中上部強化"
    ],
    builderTip: "引く時に肩甲骨を寄せるだけでなく、下制（下に下げる）意識を持つと僧帽筋上部への無駄な力みが消える。"
  },
  {
    id: "shoulder-press",
    name: "シーテッドショルダープレス",
    enName: "Overhead Shoulder Press Machine",
    category: "マシン",
    bodyPart: "shoulder",
    bodyPartLabel: "肩（三角筋前部・中部）",
    primaryMuscles: ["三角筋（前部・側部）"],
    secondaryMuscles: ["上腕三頭筋", "僧帽筋上部"],
    pof: "Midrange（ミッドレンジ種目）",
    svgType: "shoulder-press",
    muscleTag: "Deltoids (Full Shoulders)",
    summary: "頭上へ安全に押し上げ、丸く立体的なメロン肩を作るための主軸オーバーヘッドプレス。",
    seatSetup: "グリップが耳の高さからスタートできるようにシート高さを調節する。",
    beginnerSteps: [
      "背中をシートに密着させ、腹筋に力を入れて腰の反りを防ぐ",
      "息を吐きながら頭上へ向かってバーを押し上げる",
      "肘が伸びきる手前で止め、耳の高さまでゆっくりコントロールして下ろす"
    ],
    ngPoints: ["腰を過度に反らせて胸の種目にしてしまう", "下ろしたときに肘を後ろへ引きすぎて肩関節を捻る"],
    startWeightMale: "15〜25 kg",
    startWeightFemale: "5〜10 kg",
    proBiomechanics: "肩甲骨面（スキャプラプレーン: 体幹から約30度前方）に沿った軌道で動作することで肩峰下インピンジメントを防ぐ。",
    proAnatomy: "三角筋鎖骨部および肩峰部（停止: 上腕骨三角筋粗面）",
    proVariations: [
      "パラレルグリップ（ニュートラル）で肩関節の負担を軽減し三角筋前部を直撃",
      "トップで肘をロックせず緊張を抜かないコンスタントテンション法"
    ],
    builderTip: "押し上げる軌道の頂点で肩をすくめず、首を長く保つことで僧帽筋への負荷逃げをシャットアウト。"
  },
  {
    id: "dumbbell-heavy",
    name: "インクラインダンベルプレス / カール",
    enName: "Incline Dumbbell Press & Curl",
    category: "フリーウェイト",
    bodyPart: "arm",
    bodyPartLabel: "胸上部 / 腕（上腕二頭筋）",
    primaryMuscles: ["大胸筋上部", "上腕二頭筋長頭"],
    secondaryMuscles: ["三角筋前部", "上腕三頭筋"],
    pof: "Stretch（ストレッチ種目）",
    svgType: "dumbbell-heavy",
    muscleTag: "Deep Stretch & Arms",
    summary: "ダンベルならではの自由な可動域と最大ストレッチが得られるフリーウェイトの最高峰。",
    seatSetup: "アジャスタブルベンチの角度を30°〜45°または60°に設定。",
    beginnerSteps: [
      "太ももにダンベルを乗せて座り、後ろへ倒れ込みながら膝でダンベルを跳ね上げる",
      "肩甲骨を寄せて胸を張り、深く下ろして強いストレッチを感じる",
      "弧を描くように頭上へ向かって押し上げる（ぶつけない）"
    ],
    ngPoints: ["左右のバランスが崩れてダンベルを落としそうになる", "下ろしすぎて肩前部に鋭い痛みが出る"],
    startWeightMale: "10〜18 kg（片手）",
    startWeightFemale: "3〜7 kg（片手）",
    proBiomechanics: "バーベルと異なり手首の自由回旋が可能。ボトムで回外・トップでニュートラルにすることで筋線維の走行に完璧に一致。",
    proAnatomy: "大胸筋上部線維 / 上腕二頭筋長頭（結節間溝通過部）",
    proVariations: [
      "インクラインカール: 腕を体幹後方に落として二頭筋長頭を強烈ストレッチ",
      "ワンハンドプレス: 体幹の回旋に抗するアンチローテーション体幹強化"
    ],
    builderTip: "ボトムで一瞬静止して反動を殺し、大胸筋上部の弾性と筋力だけで押し出すと劇的な筋肥大が起こる。"
  },
  {
    id: "leg-press",
    name: "45° レッグプレスマシン",
    enName: "45-Degree Leg Press",
    category: "マシン",
    bodyPart: "legs",
    bodyPartLabel: "脚（大腿四頭筋・大臀筋）",
    primaryMuscles: ["大腿四頭筋", "大臀筋"],
    secondaryMuscles: ["ハムストリングス", "内転筋群"],
    pof: "Midrange（ミッドレンジ種目）",
    svgType: "leg-press",
    muscleTag: "Quadriceps & Glutes",
    summary: "腰や脊柱に負担をかけずに脚へ高重量を安全にかけられる、下半身トレーニングの主砲。",
    seatSetup: "背もたれに深く座り、フットプレートに腰幅〜肩幅で足を置く。",
    beginnerSteps: [
      "背中とお尻をシートに密着させ、安全レバーを解除する",
      "膝がつま先と同じ方向を向くよう意識し、膝が90度になる深さまでゆっくり下ろす",
      "足裏全体（特にかかと側）で力強くフットプレートを押し上げる"
    ],
    ngPoints: ["膝を伸ばしきって関節をロックする（重大な怪我のリスク）", "深く下ろしすぎてお尻がシートから浮く"],
    startWeightMale: "60〜100 kg",
    startWeightFemale: "30〜50 kg",
    proBiomechanics: "スクワットに比べて脊柱の軸圧（アキシャルロード）がゼロに近く、中枢神経の疲労を抑えながら脚の筋線維を限界まで追い込める。",
    proAnatomy: "大腿直筋、内側広筋、外側広筋、大臀筋",
    proVariations: [
      "足位置【上部】: 大臀筋・ハムストリングスへの負荷比率アップ",
      "足位置【下部・ナロー】: 膝関節の屈曲を深め大腿四頭筋（外側広筋）を集中的に破壊"
    ],
    builderTip: "絶対に膝を完全伸展（ロック）させず、押し切る直前で折り返して大腿四頭筋の血流を遮断（パンプアップ）させる。"
  },
  {
    id: "hack-squat",
    name: "ハックスクワット",
    enName: "Hack Squat Machine",
    category: "マシン",
    bodyPart: "legs",
    bodyPartLabel: "大腿四頭筋（脚の前側・外側）",
    primaryMuscles: ["大腿四頭筋（特に外側広筋）"],
    secondaryMuscles: ["大臀筋", "内転筋"],
    pof: "Stretch / Midrange",
    svgType: "hack-squat",
    muscleTag: "Quadriceps (Teardrop Focus)",
    summary: "背中をパッドで支えながら45°のレール上を滑走し、大腿四頭筋へピンポイントの破壊的負荷をかける名機。",
    seatSetup: "肩パッドの下に肩を入れ、フットプレート中央やや前方に足を配置。",
    beginnerSteps: [
      "肩をパッドに密着させ、安全フックを外して背筋を伸ばす",
      "膝がつま先と同じ方向を保ちながら、太ももがプレートと平行になるまで下りる",
      "かかとでプレートを強く押し込み、大腿四頭筋の力で立ち上がる"
    ],
    ngPoints: ["かかとがプレートから浮いてしまう", "下ろしたときに腰が丸まってパッドから離れる"],
    startWeightMale: "40〜70 kg（プレート重量）",
    startWeightFemale: "15〜30 kg（プレート重量）",
    proBiomechanics: "体幹の前傾が制限されるため、股関節伸展モーメントが減少し膝関節伸展モーメントが最大化。四頭筋の筋肥大効率はフリースクワットを凌駕する。",
    proAnatomy: "大腿四頭筋全般（特に内側広筋の涙滴部と外側広筋の張り出し）",
    proVariations: [
      "足幅を狭め足先を正面に向け外側広筋のスウィープ（張り出し）を強調",
      "パーシャルレップ（下半分だけを繰り返す）で四頭筋を完全燃焼"
    ],
    builderTip: "ボトムポジションで骨盤が後傾しないギリギリまで深くしゃがみ込み、大腿四頭筋の付け根から引き伸ばす。"
  },
  {
    id: "power-rack",
    name: "パワーラック（BIG3・スクワット）",
    enName: "Power Rack (Barbell Squat)",
    category: "フリーウェイト",
    bodyPart: "legs",
    bodyPartLabel: "全身・下半身（大腿・臀部・体幹）",
    primaryMuscles: ["大腿四頭筋", "大臀筋", "脊柱起立筋"],
    secondaryMuscles: ["ハムストリングス", "腹横筋", "内転筋"],
    pof: "Midrange（筋力向上・ホルモン分泌）",
    svgType: "power-rack",
    muscleTag: "Full Body Compound (Big 3)",
    summary: "キング・オブ・エクササイズ。全身の筋肉と骨密度、神経系を同時に鍛え上げるトレーニングの頂点。",
    seatSetup: "バーベルを鎖骨の高さ、セーフティバーを最深スクワット位置のわずか下に設定。",
    beginnerSteps: [
      "バーベルを僧帽筋の上に担ぎ、胸を張って肩甲骨を寄せる",
      "足幅を肩幅よりやや広めにとり、つま先を30度外側に向ける",
      "お尻を後ろへ引きながら、股関節と膝を同時に曲げてしゃがむ",
      "太ももが床と平行になる深さまで下りたら、足裏全体で床を押して立ち上がる"
    ],
    ngPoints: ["膝が内側に入る（ニーイン）", "背中が丸まり腰椎に過大な負荷がかかる"],
    startWeightMale: "40〜60 kg",
    startWeightFemale: "20〜30 kg",
    proBiomechanics: "全身多関節運動。腹圧（バルサルバ法）を高めて腹腔内圧を上昇させ、脊柱を強固な円柱として固定することが超高重量挙上の必須条件。",
    proAnatomy: "大腿四頭筋・大臀筋・ハムストリングス・脊柱起立筋群",
    proVariations: [
      "ハイバースクワット: 膝の屈曲が深く大腿四頭筋優位",
      "ローバースクワット: 股関節の屈曲が深く後部筋連鎖（ポステリアチェーン）優位"
    ],
    builderTip: "ラックアップの瞬間から腹圧を100%充填し、骨盤をニュートラルに固定して1ミリの軸ブレも許さない。"
  },
  {
    id: "abdominal-crunch",
    name: "アブドミナルクランチ",
    enName: "Abdominal Crunch Machine",
    category: "マシン",
    bodyPart: "abs",
    bodyPartLabel: "腹筋（腹直筋・シックスパック）",
    primaryMuscles: ["腹直筋（腱画・白線部）"],
    secondaryMuscles: ["腹斜筋", "腹横筋"],
    pof: "Contracted（収縮種目）",
    svgType: "abdominal-crunch",
    muscleTag: "Rectus Abdominis (Six-Pack)",
    summary: "自重クランチでは負荷が足りなくなった腹直筋へ、ウェイト負荷をかけて彫りの深い腹筋を刻み込むマシン。",
    seatSetup: "胸パッドまたはハンドルを持ち、骨盤がシートにしっかり当たるよう位置を合わせる。",
    beginnerSteps: [
      "胸パッドに密着し、足首をローラーに固定する",
      "息をすべて吐ききりながら、みぞおちをおへそに近づけるように背中を丸め込む",
      "腹筋を限界まで絞り込んで1秒キープし、息を吸いながらゆっくり戻す"
    ],
    ngPoints: ["股関節（脚の付け根）を使って体を曲げてしまう", "腕の力でハンドルを無理やり引き下げる"],
    startWeightMale: "25〜40 kg",
    startWeightFemale: "10〜20 kg",
    proBiomechanics: "股関節の屈曲（腸腰筋）ではなく、胸椎および腰椎の屈曲（腹直筋）を純粋に単離。背骨を1骨ずつ丸める意識が必須。",
    proAnatomy: "腹直筋（起始: 恥骨結合 / 停止: 第5-7肋軟骨・剣状突起）",
    proVariations: [
      "ツイストクランチ: 収縮時に骨盤を固定したままわずかに回旋させ腹斜筋を同時に刺激",
      "トップホールド法: 収縮ピークで息を吐ききり3秒静止"
    ],
    builderTip: "股関節の屈曲を完全に脱力し、みぞおちとおへそをくっつける感覚のみに集中すると腹筋の厚みが激増する。"
  }
];
