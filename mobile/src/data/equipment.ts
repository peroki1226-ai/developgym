export interface EquipmentItem {
  id: string;
  name: string;
  enName: string;
  category: string;
  bodyPart: "chest" | "back" | "shoulder" | "arm" | "legs" | "abs";
  bodyPartLabel: string;
  primaryMuscles: string[];
  pof: string;
  seatSetup: string;
  beginnerSteps: string[];
  ngPoints: string[];
  proBiomechanics: string;
  builderTip: string;
  startWeightMale: string;
  startWeightFemale: string;
}

export const EQUIPMENTS: EquipmentItem[] = [
  {
    id: "chest-press",
    name: "チェストプレス",
    enName: "Seated Chest Press",
    category: "マシン",
    bodyPart: "chest",
    bodyPartLabel: "胸（大胸筋中部）",
    primaryMuscles: ["大胸筋（胸肋部）", "三角筋前部", "上腕三頭筋"],
    pof: "Midrange（ミッドレンジ種目）",
    seatSetup:
      "グリップがバストトップ（乳頭ライン）と同じ高さになるようシート高を調整。",
    beginnerSteps: [
      "肩甲骨を軽く寄せて胸を張り、背中とお尻をシートに密着させる",
      "息を吐きながら肘が伸びきる手前まで前に押し出す",
      "息を吸いながら胸のストレッチを感じる位置までゆっくり戻す",
    ],
    ngPoints: ["肩がすくんで前に出る", "肘を完全ロックして関節で休む"],
    proBiomechanics:
      "水平軌道でコンスタントテンションを維持。片手ずつ行い正中線を超えて内転させると大胸筋内側の収縮を最大化できる。",
    builderTip: "ボトムで1秒ポーズを入れるとストレッチ刺激が倍増します。",
    startWeightMale: "25〜35 kg",
    startWeightFemale: "10〜15 kg",
  },
  {
    id: "lat-pulldown",
    name: "ラットプルダウン",
    enName: "Lat Pulldown",
    category: "マシン",
    bodyPart: "back",
    bodyPartLabel: "背中（広背筋・大円筋）",
    primaryMuscles: ["広背筋", "大円筋", "僧帽筋下部"],
    pof: "Stretch / Midrange",
    seatSetup: "座った際に太ももが浮かないよう固定パッドを隙間なく下ろす。",
    beginnerSteps: [
      "肩幅の1.5倍ほどでバーを順手で握る",
      "胸を斜め上に張り、鎖骨〜上胸に向かってバーを引き下ろす",
      "肘を脇腹に近づける意識で引き、ゆっくり戻す",
    ],
    ngPoints: [
      "首の後ろに引き下ろすビハインドネック",
      "反動で上体を倒しすぎる",
    ],
    proBiomechanics:
      "初動で肩甲骨の下制（デプレッション）を行ってから肘屈曲に入る。サムレスで小指・薬指側を強く握ると二頭筋の関与を最小化できる。",
    builderTip:
      "ネガティブ局面で広背筋をフルストレッチさせてから肩甲骨下制だけで2cm引く練習が効果的。",
    startWeightMale: "25〜35 kg",
    startWeightFemale: "10〜18 kg",
  },
  {
    id: "leg-press",
    name: "レッグプレス",
    enName: "45-Degree / Seated Leg Press",
    category: "マシン",
    bodyPart: "legs",
    bodyPartLabel: "脚全体・お尻",
    primaryMuscles: ["大腿四頭筋", "大臀筋", "ハムストリングス"],
    pof: "Midrange（ミッドレンジ種目）",
    seatSetup: "座ったときに膝が90度前後に曲がる位置にシートを調整。",
    beginnerSteps: [
      "足を肩幅に開いてプレート中央に置き、腰と臀部をシートに密着させる",
      "かかと〜足裏全体で押し出し、膝が伸びきる少し手前で止める",
      "お尻が浮かない深さまでゆっくり曲げる",
    ],
    ngPoints: [
      "高重量で膝を完全にロックする",
      "深く下ろしすぎて腰が丸まり浮く",
    ],
    proBiomechanics:
      "足をプレート下側＆狭めに置けば大腿四頭筋（外側広筋）、上側＆広めに置けば大臀筋・ハムストリングスにモーメントアームが移動する。",
    builderTip:
      "四頭筋の外側（アウトスイープ）狙いなら足幅拳1個分のノンロック20レップが有効。",
    startWeightMale: "60〜100 kg",
    startWeightFemale: "30〜50 kg",
  },
];
