import type { EquipmentItem } from "./equipment";

/** Additional guides share the existing catalogue and playback controls. */
export const ADDITIONAL_EQUIPMENTS: EquipmentItem[] = [
  {
    "id": "leg-extension",
    "name": "レッグエクステンション",
    "enName": "Seated Leg Extension",
    "category": "マシン",
    "bodyPart": "legs",
    "bodyPartLabel": "脚（太もも前側）",
    "primaryMuscles": [
      "大腿四頭筋"
    ],
    "secondaryMuscles": [
      "体幹"
    ],
    "pof": "膝を伸ばす動作",
    "summary": "座った姿勢で膝を伸ばし、太もも前側を鍛えるマシン。",
    "svgType": "leg-extension",
    "muscleTag": "大腿四頭筋",
    "seatSetup": "膝の位置をマシンの回転軸に合わせ、パッドを足首の少し上に当てる。",
    "beginnerSteps": [
      "背中とお尻を座席につけ、ハンドルを軽く握る",
      "膝が伸びきる手前まで、反動を使わず脚を上げる",
      "太ももに力を残したまま、ゆっくり開始位置へ戻す"
    ],
    "ngPoints": [
      "重りを跳ね上げて膝を強く伸ばしきる",
      "お尻が座席から浮く"
    ],
    "startWeightMale": "最軽量で動作を確認",
    "startWeightFemale": "最軽量で動作を確認",
    "proAnatomy": "大腿四頭筋が膝を伸ばす。骨盤と太ももの位置を安定させる。",
    "proBiomechanics": "膝関節を中心に下腿が回転する。回転軸と膝をそろえ、機種に合う可動域を選ぶ。",
    "proVariations": [
      "軽い重量で片脚ずつ動作を確認する",
      "伸ばした位置で短く静止する"
    ],
    "builderTip": "膝を勢いよく止めず、戻す動作まで同じ速さで制御する。"
  },
  {
    "id": "seated-leg-curl",
    "name": "シーテッドレッグカール",
    "enName": "Seated Leg Curl",
    "category": "マシン",
    "bodyPart": "legs",
    "bodyPartLabel": "脚（太もも裏側）",
    "primaryMuscles": [
      "ハムストリングス"
    ],
    "secondaryMuscles": [
      "腓腹筋"
    ],
    "pof": "膝を曲げる動作",
    "summary": "足首のパッドを後ろへ引き、太もも裏側を鍛える座位のマシン。",
    "svgType": "seated-leg-curl",
    "muscleTag": "ハムストリングス",
    "seatSetup": "膝を回転軸に合わせ、太ももパッドで脚を固定し、足首の後ろにローラーを当てる。",
    "beginnerSteps": [
      "背中を背もたれにつけ、太ももが浮かないことを確認する",
      "膝を曲げてローラーを座席の下へ引き寄せる",
      "重りを落とさず、ゆっくり脚を前へ戻す"
    ],
    "ngPoints": [
      "腰を反って重りを引く",
      "太ももがパッドから離れる"
    ],
    "startWeightMale": "最軽量で動作を確認",
    "startWeightFemale": "最軽量で動作を確認",
    "proAnatomy": "ハムストリングスを中心に膝を曲げる。股関節の位置を固定する。",
    "proBiomechanics": "座位では股関節を曲げた状態で膝を曲げ伸ばしする。膝の軸とパッド位置を優先して調整する。",
    "proVariations": [
      "片脚ずつ軽い重量で左右差を確認する",
      "曲げた位置で短く止めて反動を減らす"
    ],
    "builderTip": "足首だけを動かそうとせず、膝を曲げて太もも裏側の収縮を感じる。"
  },
  {
    "id": "hip-abduction",
    "name": "ヒップアブダクション（外もも）",
    "enName": "Seated Hip Abduction",
    "category": "マシン",
    "bodyPart": "legs",
    "bodyPartLabel": "脚・お尻（外側）",
    "primaryMuscles": [
      "中臀筋・小臀筋"
    ],
    "secondaryMuscles": [
      "大臀筋"
    ],
    "pof": "脚を外へ開く動作",
    "summary": "膝の外側にパッドを当て、脚を外へ開いてお尻の横側を鍛える。",
    "svgType": "hip-abduction",
    "muscleTag": "中臀筋・小臀筋",
    "seatSetup": "パッドを膝の外側に合わせ、足を足台に置き、無理なく閉じた位置から始める。",
    "beginnerSteps": [
      "骨盤を座席に安定させ、上体を起こす",
      "反動を使わず、左右の膝を外へ開く",
      "パッドに押し戻されないよう、ゆっくり閉じる"
    ],
    "ngPoints": [
      "腰を大きく反らせて脚を開く",
      "開ける限界を無理に超える"
    ],
    "startWeightMale": "最軽量で動作を確認",
    "startWeightFemale": "最軽量で動作を確認",
    "proAnatomy": "中臀筋・小臀筋などが股関節を外へ開く。骨盤の回旋を抑える。",
    "proBiomechanics": "左右の股関節を支点に大腿が外へ動く。膝や足首だけでパッドを押さない。",
    "proVariations": [
      "軽い重量で開いた位置を短く保つ",
      "可動域を小さくして骨盤の安定を確認する"
    ],
    "builderTip": "大きく開くことより、骨盤を動かさず往復できる範囲を選ぶ。"
  },
  {
    "id": "hip-adduction",
    "name": "ヒップアダクション（内もも）",
    "enName": "Seated Hip Adduction",
    "category": "マシン",
    "bodyPart": "legs",
    "bodyPartLabel": "脚（内もも）",
    "primaryMuscles": [
      "内転筋群"
    ],
    "secondaryMuscles": [
      "体幹"
    ],
    "pof": "脚を内へ閉じる動作",
    "summary": "膝の内側にパッドを当て、脚を閉じて内ももを鍛えるマシン。",
    "svgType": "hip-adduction",
    "muscleTag": "内転筋群",
    "seatSetup": "パッドを膝の内側に当て、足台に足を置き、痛みのない開き幅へ調整する。",
    "beginnerSteps": [
      "背中と骨盤を座席に安定させる",
      "両膝でパッドを内側へゆっくり閉じる",
      "内ももの張りを感じながら、ゆっくり開く"
    ],
    "ngPoints": [
      "開いた位置で勢いをつけて閉じる",
      "骨盤を左右にねじる"
    ],
    "startWeightMale": "最軽量で動作を確認",
    "startWeightFemale": "最軽量で動作を確認",
    "proAnatomy": "内転筋群が股関節を内側へ動かす。左右の骨盤位置をそろえる。",
    "proBiomechanics": "股関節の内転を行う。開始幅を広げすぎず、戻す局面でも負荷を制御する。",
    "proVariations": [
      "軽い重量で閉じた位置を短く保つ",
      "開始幅を狭くして動作を練習する"
    ],
    "builderTip": "パッドをぶつけることを目標にせず、最後まで静かに制御する。"
  },
  {
    "id": "seated-calf-raise",
    "name": "シーテッドカーフレイズ",
    "enName": "Seated Calf Raise",
    "category": "マシン",
    "bodyPart": "legs",
    "bodyPartLabel": "脚（ふくらはぎ）",
    "primaryMuscles": [
      "ヒラメ筋"
    ],
    "secondaryMuscles": [
      "腓腹筋"
    ],
    "pof": "かかとを上げる動作",
    "summary": "座って太もものパッドを支え、かかとを上下させてふくらはぎを鍛える。",
    "svgType": "seated-calf-raise",
    "muscleTag": "ヒラメ筋",
    "seatSetup": "母趾球付近を足台に乗せ、かかとを自由に下ろせる位置で太ももパッドを合わせる。",
    "beginnerSteps": [
      "足の前側を足台に安定させ、開始レバーを機種の手順で解除する",
      "つま先で押し、かかとを滑らかに持ち上げる",
      "足首を内外に倒さず、かかとをゆっくり下ろす"
    ],
    "ngPoints": [
      "反動で上下に跳ねる",
      "足台から足先がずれる"
    ],
    "startWeightMale": "最軽量で動作を確認",
    "startWeightFemale": "最軽量で動作を確認",
    "proAnatomy": "膝を曲げた姿勢で足関節を底屈し、ヒラメ筋を中心に使う。",
    "proBiomechanics": "前足部を支点にかかとが上下する。膝のパッドを安定させ、足首の動きで負荷を上げる。",
    "proVariations": [
      "軽い重量で上げた位置を短く保つ",
      "小さな可動域から足首の制御を練習する"
    ],
    "builderTip": "上げ下げの両方を丁寧に行い、足裏の接地を一定に保つ。"
  },
  {
    "id": "lateral-raise",
    "name": "ラテラルレイズマシン",
    "enName": "Machine Lateral Raise",
    "category": "マシン",
    "bodyPart": "shoulder",
    "bodyPartLabel": "肩（横側）",
    "primaryMuscles": [
      "三角筋中部"
    ],
    "secondaryMuscles": [
      "僧帽筋"
    ],
    "pof": "腕を横へ上げる動作",
    "summary": "上腕のパッドを外へ持ち上げ、肩の横側を鍛えるマシン。",
    "svgType": "lateral-raise",
    "muscleTag": "三角筋中部",
    "seatSetup": "肩を回転軸の高さに近づけ、パッドを上腕に当て、グリップを軽く握る。",
    "beginnerSteps": [
      "背中を安定させ、肩をすくめずに構える",
      "肘の角度を保ちながら、腕を肩の高さ付近まで開く",
      "パッドを押し返す力を保ち、ゆっくり下ろす"
    ],
    "ngPoints": [
      "肩をすくめてパッドを上げる",
      "上体を横へ振って反動を使う"
    ],
    "startWeightMale": "最軽量で動作を確認",
    "startWeightFemale": "最軽量で動作を確認",
    "proAnatomy": "三角筋中部が上腕を外転する。肩甲骨の自然な上方回旋を妨げない。",
    "proBiomechanics": "肩関節を中心に上腕が横へ上がる。機種の軸とパッド位置を確認して動作する。",
    "proVariations": [
      "軽い重量で片側ずつ制御を確認する",
      "上げた位置で短く静止する"
    ],
    "builderTip": "高く上げることより、肩をすくめずに動かせる範囲を優先する。"
  },
  {
    "id": "preacher-curl",
    "name": "アームカールマシン",
    "enName": "Preacher Curl Machine",
    "category": "マシン",
    "bodyPart": "arm",
    "bodyPartLabel": "腕（前側）",
    "primaryMuscles": [
      "上腕二頭筋"
    ],
    "secondaryMuscles": [
      "上腕筋"
    ],
    "pof": "肘を曲げる動作",
    "summary": "上腕をパッドに置き、肘を曲げて腕の前側を鍛えるマシン。",
    "svgType": "preacher-curl",
    "muscleTag": "上腕二頭筋",
    "seatSetup": "上腕がパッドに乗る高さへ座席を調整し、肘を回転軸付近に合わせる。",
    "beginnerSteps": [
      "上腕をパッドから離さず、手首をまっすぐ保つ",
      "肘を曲げてグリップを滑らかに引き上げる",
      "肘を強く伸ばしきらず、ゆっくり下ろす"
    ],
    "ngPoints": [
      "肩や腰を動かしてグリップを引く",
      "手首を強く反らせる"
    ],
    "startWeightMale": "最軽量で動作を確認",
    "startWeightFemale": "最軽量で動作を確認",
    "proAnatomy": "上腕二頭筋と上腕筋が肘を曲げる。上腕位置をパッドで安定させる。",
    "proBiomechanics": "上腕の位置を保ったまま前腕が回転する。戻す局面で肘の過伸展を避ける。",
    "proVariations": [
      "軽い重量で片腕ずつ確認する",
      "上げた位置で短く止める"
    ],
    "builderTip": "重さよりも、上腕と手首の位置を変えずに往復できることを優先する。"
  },
  {
    "id": "triceps-pushdown",
    "name": "ケーブルトライセプスプレスダウン",
    "enName": "Cable Triceps Pushdown",
    "category": "マシン",
    "bodyPart": "arm",
    "bodyPartLabel": "腕（後ろ側）",
    "primaryMuscles": [
      "上腕三頭筋"
    ],
    "secondaryMuscles": [
      "体幹"
    ],
    "pof": "肘を伸ばす動作",
    "summary": "上腕の位置を保ち、ケーブルを下へ押して腕の後ろ側を鍛える。",
    "svgType": "triceps-pushdown",
    "muscleTag": "上腕三頭筋",
    "seatSetup": "プーリーを高い位置に設定し、適したアタッチメントを固定して、軽い重量から始める。",
    "beginnerSteps": [
      "足を安定させ、肘を体の横に構える",
      "上腕を振らず、肘を伸ばしてグリップを下へ押す",
      "肘の位置を保ったまま、ゆっくり戻す"
    ],
    "ngPoints": [
      "肩や体重を使って押し下げる",
      "肘を強くロックする"
    ],
    "startWeightMale": "最軽量で動作を確認",
    "startWeightFemale": "最軽量で動作を確認",
    "proAnatomy": "上腕三頭筋が肘を伸ばす。上腕と体幹の位置を安定させる。",
    "proBiomechanics": "肘を支点に前腕を動かす。ケーブル張力に逆らい、戻す局面まで制御する。",
    "proVariations": [
      "ロープで手首が自然に動く範囲を確認する",
      "片腕ずつ軽い重量で確認する"
    ],
    "builderTip": "グリップを遠くへ押すより、上腕を動かさず肘を伸ばすことに集中する。"
  },
  {
    "id": "assisted-pull-up",
    "name": "アシストチンニングマシン",
    "enName": "Assisted Pull-up",
    "category": "マシン",
    "bodyPart": "back",
    "bodyPartLabel": "背中（広背筋）",
    "primaryMuscles": [
      "広背筋"
    ],
    "secondaryMuscles": [
      "上腕二頭筋"
    ],
    "pof": "補助付きで体を引き上げる動作",
    "summary": "膝パッドの補助を使い、体を引き上げる懸垂を練習するマシン。",
    "svgType": "assisted-pull-up",
    "muscleTag": "広背筋",
    "seatSetup": "補助重量を十分に設定し、踏み台と膝パッドの乗降手順を機種の表示で確認する。",
    "beginnerSteps": [
      "グリップを握り、膝を補助パッドに安定させる",
      "肩をすくめず、肘を下へ引いて体を持ち上げる",
      "パッドの動きを制御しながら、ゆっくり下りる"
    ],
    "ngPoints": [
      "体を振って勢いで引き上げる",
      "補助を少なくしすぎて乗降が不安定になる"
    ],
    "startWeightMale": "補助を強めて体を支える",
    "startWeightFemale": "補助を強めて体を支える",
    "proAnatomy": "広背筋を中心に肩関節の内転・伸展と肘の屈曲を組み合わせる。",
    "proBiomechanics": "グリップ位置を固定したまま体が上へ移動する。多くの機種では補助重量が大きいほど動作が軽くなる。",
    "proVariations": [
      "補助を強めて小さな可動域から練習する",
      "機種に合う握り方で肩の動きを確認する"
    ],
    "builderTip": "補助重量を急に減らさず、乗り降りまで安定して行える設定を選ぶ。"
  },
  {
    "id": "assisted-dip",
    "name": "アシストディップスマシン",
    "enName": "Assisted Dip",
    "category": "マシン",
    "bodyPart": "chest",
    "bodyPartLabel": "胸・腕（押す動作）",
    "primaryMuscles": [
      "大胸筋・上腕三頭筋"
    ],
    "secondaryMuscles": [
      "三角筋前部"
    ],
    "pof": "補助付きで体を押し上げる動作",
    "summary": "膝パッドの補助を使い、平行グリップで体を押し上げる動作を練習する。",
    "svgType": "assisted-dip",
    "muscleTag": "大胸筋・上腕三頭筋",
    "seatSetup": "十分な補助重量を選び、グリップ幅と膝パッドへの乗り方を機種の表示で確認する。",
    "beginnerSteps": [
      "グリップを握り、膝パッドに安定して乗る",
      "肩に無理のない深さから、肘を伸ばして体を押し上げる",
      "肩をすくめず、ゆっくり開始位置へ下りる"
    ],
    "ngPoints": [
      "肩を深く下げすぎる",
      "肘を伸ばしきって勢いよく止まる"
    ],
    "startWeightMale": "補助を強めて体を支える",
    "startWeightFemale": "補助を強めて体を支える",
    "proAnatomy": "大胸筋と上腕三頭筋を中心に、肩と肘の関節を協調させる。",
    "proBiomechanics": "固定されたグリップに対して体が上下する。補助を使い、肩の位置と可動域を制御する。",
    "proVariations": [
      "補助を強めて浅い範囲から練習する",
      "上体を安定させてゆっくり下りる"
    ],
    "builderTip": "補助を使っても肩の違和感が出る深さには入らず、安定して制御できる範囲にする。"
  },
  {
    "id": "back-extension",
    "name": "バックエクステンションベンチ",
    "enName": "Back Extension Bench",
    "category": "マシン",
    "bodyPart": "back",
    "bodyPartLabel": "背中・お尻（股関節の動き）",
    "primaryMuscles": [
      "脊柱起立筋・大臀筋"
    ],
    "secondaryMuscles": [
      "ハムストリングス"
    ],
    "pof": "股関節から上体を起こす動作",
    "summary": "骨盤をパッドで支え、股関節を曲げ伸ばしして上体を起こすベンチ。",
    "svgType": "back-extension",
    "muscleTag": "脊柱起立筋・大臀筋",
    "seatSetup": "パッドを股関節が曲げられる高さに合わせ、足首を支持部に安定させる。",
    "beginnerSteps": [
      "背中の自然な形を保ち、腕を胸の前に置く",
      "股関節から上体を倒し、痛みのない範囲で止める",
      "体が脚とほぼ一直線になる位置まで起こし、反りすぎない"
    ],
    "ngPoints": [
      "腰を勢いよく反らして起き上がる",
      "足首の支持が不安定なまま動く"
    ],
    "startWeightMale": "追加の重りなし",
    "startWeightFemale": "追加の重りなし",
    "proAnatomy": "臀部と太もも裏側で股関節を伸ばし、脊柱起立筋が背骨の位置を支える。",
    "proBiomechanics": "股関節を支点に上体を動かす。背骨を大きく反らせて可動域を増やさない。",
    "proVariations": [
      "重りを持たず小さな範囲から始める",
      "起こした位置で短く静止する"
    ],
    "builderTip": "上まで反るのではなく、体がそろった位置で静かに止める。"
  },
  {
    "id": "rear-delt-fly",
    "name": "リアデルトフライマシン",
    "enName": "Reverse Pec Deck",
    "category": "マシン",
    "bodyPart": "shoulder",
    "bodyPartLabel": "肩（後ろ側）",
    "primaryMuscles": [
      "三角筋後部"
    ],
    "secondaryMuscles": [
      "僧帽筋・菱形筋"
    ],
    "pof": "腕を後方へ開く動作",
    "summary": "胸をパッドに向けて座り、腕を外へ開いて肩の後ろ側を鍛える。",
    "svgType": "rear-delt-fly",
    "muscleTag": "三角筋後部",
    "seatSetup": "グリップが肩付近の高さになるよう座席を調整し、胸をパッドへ軽く当てる。",
    "beginnerSteps": [
      "肘を軽く曲げ、胸と骨盤を安定させる",
      "肘の角度を保ち、腕を左右に開く",
      "肩をすくめず、ゆっくり前へ戻す"
    ],
    "ngPoints": [
      "腕を開くたびに胸をパッドから離す",
      "肘を曲げ伸ばししてローイングに変える"
    ],
    "startWeightMale": "最軽量で動作を確認",
    "startWeightFemale": "最軽量で動作を確認",
    "proAnatomy": "三角筋後部が上腕を後方へ開き、肩甲骨周囲の筋が姿勢を支える。",
    "proBiomechanics": "肩関節の水平外転を中心に動かす。前腕の角度を保ち、上腕の軌道を確認する。",
    "proVariations": [
      "軽い重量で開いた位置を短く保つ",
      "可動域を小さくして肩の位置を確認する"
    ],
    "builderTip": "大きく肩甲骨を寄せることだけに集中せず、腕の付け根から開く。"
  }
];
