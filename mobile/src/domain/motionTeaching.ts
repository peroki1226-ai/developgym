import { ExercisePose, Limb, MotionType, motionContact, motionType, Point } from "./exerciseMotion";

export interface TeachingSpec { fixedLabel: string; movingLabel: string; jointLabel: string; workCue: string; returnCue: string; holdCue: string; }
export const MOTION_TEACHING: Record<MotionType, TeachingSpec> = {
  "incline-bench-press": {fixedLabel:"座席につけた骨盤",movingLabel:"バーの軌道",jointLabel:"肘の曲げ伸ばし",workCue:"chest.inclineSmith.work",returnCue:"chest.inclineSmith.return",holdCue:"chest.inclineSmith.hold"},
  "barbell-bench-press": {fixedLabel:"座席につけた骨盤",movingLabel:"バーの軌道",jointLabel:"肘の曲げ伸ばし",workCue:"chest.bench.work",returnCue:"chest.bench.return",holdCue:"chest.bench.hold"},
  "chest-dip": { fixedLabel: "握ったままのグリップ", movingLabel: "上体の動き", jointLabel: "肘の曲げ伸ばし", workCue: "chest.dip.work", returnCue: "chest.dip.return", holdCue: "chest.dip.hold" },
  "incline-hammer-press": { fixedLabel: "座席につけた骨盤", movingLabel: "グリップの軌道", jointLabel: "肘の曲げ伸ばし", workCue: "chest.hammer.work", returnCue: "chest.hammer.return", holdCue: "chest.hammer.hold" },
  "chest-press": {
    "fixedLabel": "座席につけた骨盤",
    "movingLabel": "グリップの軌道",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "背中と骨盤を座席につけたまま、肘をゆっくり伸ばして前へ押します。",
    "returnCue": "上腕を後ろへ引きすぎず、グリップを胸の方向へゆっくり戻します。",
    "holdCue": "肘を伸ばしきらず、静かに切り返します。"
  },
  "pec-fly": {
    "fixedLabel": "安定させる肩の位置",
    "movingLabel": "グリップの軌道",
    "jointLabel": "肩から腕を開く動き",
    "workCue": "肘の曲がりを変えず、胸の前へ弧を描くように閉じます。",
    "returnCue": "肩の位置を保ち、腕を後ろへ開きすぎずに戻します。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "incline-smith": {
    "fixedLabel": "座席につけた骨盤",
    "movingLabel": "バーの軌道",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "背中をベンチにつけ、バーをレールに沿って上へ押します。",
    "returnCue": "レールに沿って、バーを胸上部の方向へゆっくり下ろします。",
    "holdCue": "肘を伸ばしきらず、静かに切り返します。"
  },
  "cable-machine": {
    "fixedLabel": "安定させる肩の位置",
    "movingLabel": "グリップの軌道",
    "jointLabel": "肩から腕を開く動き",
    "workCue": "上体を振らず、肘の角度を保ってグリップを胸の前へ絞ります。",
    "returnCue": "ケーブルに引かれる力を制御し、腕をゆっくり開きます。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "lat-pulldown": {
    "fixedLabel": "座席につけた骨盤",
    "movingLabel": "バーの軌道",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "肩をすくめずに肘を下へ引き、バーを胸の方向へ下ろします。",
    "returnCue": "骨盤を座席に保ち、バーを上へゆっくり戻します。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "seated-row": {
    "fixedLabel": "座席につけた骨盤",
    "movingLabel": "グリップの軌道",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "上体を起こしたまま、肘を後ろへ引いてグリップを体へ近づけます。",
    "returnCue": "腰を動かさず、腕を前へゆっくり伸ばして戻します。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "shoulder-press": {
    "fixedLabel": "座席につけた骨盤",
    "movingLabel": "グリップの軌道",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "腰を反らせず、グリップを頭上へ滑らかに押し上げます。",
    "returnCue": "肩をすくめず、グリップを耳の高さ付近までゆっくり戻します。",
    "holdCue": "肘を伸ばしきらず、静かに切り返します。"
  },
  "dumbbell-heavy": {
    "fixedLabel": "座席につけた骨盤",
    "movingLabel": "ダンベルの軌道",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "ベンチに背中をつけ、左右のバランスを保ってダンベルを押し上げます。",
    "returnCue": "胸上部の方向へ、ダンベルをゆっくり下ろします。",
    "holdCue": "肘を伸ばしきらず、静かに切り返します。"
  },
  "leg-press": {
    "fixedLabel": "座席につけた骨盤",
    "movingLabel": "フットプレートの動き",
    "jointLabel": "膝の曲げ伸ばし",
    "workCue": "骨盤を浮かせず、膝を足先と同じ方向へ伸ばして足台を押します。",
    "returnCue": "腰が座席から離れない範囲まで、膝をゆっくり曲げます。",
    "holdCue": "膝を伸ばしきらず、反動をつけずに切り返します。"
  },
  "hack-squat": {
    "fixedLabel": "床・足台につけた足",
    "movingLabel": "上体の動き",
    "jointLabel": "膝の曲げ伸ばし",
    "workCue": "足裏全体で押し、背中をパッドにつけたままレールに沿って立ち上がります。",
    "returnCue": "膝を足先と同じ方向へ曲げ、パッドと一緒にゆっくり下ります。",
    "holdCue": "膝を伸ばしきらず、反動をつけずに切り返します。"
  },
  "power-rack": {
    "fixedLabel": "床・足台につけた足",
    "movingLabel": "上体の動き",
    "jointLabel": "膝の曲げ伸ばし",
    "workCue": "足裏を安定させ、膝と股関節を一緒に伸ばして立ち上がります。",
    "returnCue": "お尻を後ろへ引き、膝と股関節を一緒に曲げてゆっくり下ります。",
    "holdCue": "膝を伸ばしきらず、反動をつけずに切り返します。"
  },
  "abdominal-crunch": {
    "fixedLabel": "安定させる骨盤",
    "movingLabel": "上体の動き",
    "jointLabel": "背中を丸める動き",
    "workCue": "骨盤を安定させ、背中を少しずつ丸めてみぞおちを下へ近づけます。",
    "returnCue": "腰を反らせず、丸めた背中をゆっくり起こして戻します。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "leg-extension": {
    "fixedLabel": "マシンの軸に合わせた膝",
    "movingLabel": "足首ローラーの動き",
    "jointLabel": "膝の曲げ伸ばし",
    "workCue": "太ももの位置を保ち、膝を支点に下腿とローラーを上げます。",
    "returnCue": "太ももを浮かせず、ローラーをゆっくり下ろします。",
    "holdCue": "膝を伸ばしきらず、反動をつけずに切り返します。"
  },
  "seated-leg-curl": {
    "fixedLabel": "マシンの軸に合わせた膝",
    "movingLabel": "足首ローラーの動き",
    "jointLabel": "膝の曲げ伸ばし",
    "workCue": "太ももをパッドで支え、膝を曲げてローラーを座席の下へ引きます。",
    "returnCue": "重りを落とさず、脚を前へゆっくり伸ばして戻します。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "hip-abduction": {
    "fixedLabel": "安定させる骨盤",
    "movingLabel": "太もものパッドの動き",
    "jointLabel": "股関節の動き",
    "workCue": "骨盤を動かさず、左右のパッドを外側へゆっくり開きます。",
    "returnCue": "パッドに押し戻されないよう、脚をゆっくり閉じます。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "hip-adduction": {
    "fixedLabel": "安定させる骨盤",
    "movingLabel": "太もものパッドの動き",
    "jointLabel": "股関節の動き",
    "workCue": "骨盤を動かさず、内ももで左右のパッドを内側へ閉じます。",
    "returnCue": "脚を広げすぎず、左右のパッドをゆっくり開いて戻します。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "seated-calf-raise": {
    "fixedLabel": "足台につけた前足部",
    "movingLabel": "かかとの上下",
    "jointLabel": "足首の動き",
    "workCue": "前足部を足台につけたまま、足首を使ってかかとを持ち上げます。",
    "returnCue": "足首を内外へ倒さず、かかとをゆっくり下ろします。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "lateral-raise": {
    "fixedLabel": "安定させる肩の位置",
    "movingLabel": "上腕パッドの動き",
    "jointLabel": "肩から腕を開く動き",
    "workCue": "肩をすくめず、肘の曲がりを保って上腕パッドを横へ上げます。",
    "returnCue": "上体を振らず、パッドを押し返す力を保ってゆっくり下ろします。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "preacher-curl": {
    "fixedLabel": "位置を保つ肘",
    "movingLabel": "グリップの軌道",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "上腕をパッドにつけ、肘だけを曲げてグリップを引き上げます。",
    "returnCue": "上腕を動かさず、グリップをゆっくり下ろします。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "triceps-pushdown": {
    "fixedLabel": "位置を保つ肘",
    "movingLabel": "グリップの軌道",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "上腕と肘の位置を保ち、前腕を回してグリップを下へ押します。",
    "returnCue": "肘を体の横に保ち、グリップをゆっくり上へ戻します。",
    "holdCue": "肘を伸ばしきらず、静かに切り返します。"
  },
  "assisted-pull-up": {
    "fixedLabel": "握ったままのグリップ",
    "movingLabel": "上体の動き",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "グリップは動かさず、肘を下へ引いて体と補助パッドを持ち上げます。",
    "returnCue": "体を振らず、補助パッドと一緒にゆっくり下ります。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "assisted-dip": {
    "fixedLabel": "握ったままのグリップ",
    "movingLabel": "上体の動き",
    "jointLabel": "肘の曲げ伸ばし",
    "workCue": "グリップを握ったまま、肘を伸ばして体と補助パッドを押し上げます。",
    "returnCue": "肩に無理のない深さまで、肘を曲げてゆっくり下ります。",
    "holdCue": "肘を伸ばしきらず、静かに切り返します。"
  },
  "back-extension": {
    "fixedLabel": "パッドで支える股関節",
    "movingLabel": "上体の動き",
    "jointLabel": "股関節の動き",
    "workCue": "背中の自然な形を保ち、股関節から体を起こして脚との整列で止めます。",
    "returnCue": "腰を丸めすぎず、股関節から上体をゆっくり倒して戻します。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  },
  "rear-delt-fly": {
    "fixedLabel": "安定させる肩の位置",
    "movingLabel": "グリップの軌道",
    "jointLabel": "肩から腕を開く動き",
    "workCue": "胸をパッドにつけ、肘の角度を保って腕を左右へ開きます。",
    "returnCue": "肘を曲げ伸ばしせず、腕を前へゆっくり戻します。",
    "holdCue": "姿勢を保ち、反動をつけずに切り返します。"
  }
};

export function motionTeaching(rawType: string, pose: ExercisePose) {
  const type = motionType(rawType);
  let fixed: Point = pose.hip;
  let joint: Limb = pose.arms[0];
  if (["pec-fly", "cable-machine", "rear-delt-fly", "lateral-raise"].includes(type)) {
    fixed = pose.arms[0][0]; joint = [pose.hip, fixed, pose.arms[0][1]];
  } else if (["leg-extension", "seated-leg-curl"].includes(type)) {
    fixed = pose.legs[0][1]; joint = pose.legs[0];
  } else if (["leg-press", "hack-squat", "power-rack"].includes(type)) {
    fixed = type === "leg-press" ? pose.hip : pose.legs[0][2]; joint = pose.legs[0];
  } else if (["hip-abduction", "hip-adduction"].includes(type)) {
    joint = [pose.shoulder, pose.legs[0][0], pose.legs[0][1]];
  } else if (type === "seated-calf-raise") {
    fixed = [82, 88]; joint = [pose.legs[0][1], pose.legs[0][2], fixed];
  } else if (["preacher-curl", "triceps-pushdown"].includes(type)) {
    fixed = pose.arms[0][1];
  } else if (["assisted-pull-up", "assisted-dip", "chest-dip"].includes(type)) {
    fixed = pose.grips[0];
  } else if (type === "back-extension") {
    joint = [pose.legs[0][1], pose.hip, pose.shoulder];
  } else if (type === "abdominal-crunch" && pose.spine) {
    joint = [pose.spine[1], pose.spine[2], pose.spine[3]];
  }
  const moving = type === "lateral-raise" ? pose.arms[0][1] : motionContact(type, pose);
  return { ...MOTION_TEACHING[type], fixed, moving, joint };
}

/** Keep a consistent scale around the middle joint while the bones move. */
export function enlargedJoint(points: Limb): Limb {
  const pivot = points[1];
  const radius = Math.max(1, ...points.map(p => Math.hypot(p[0] - pivot[0], p[1] - pivot[1])));
  const map = (p: Point): Point => [40 + (p[0] - pivot[0]) * 28 / radius, 40 + (p[1] - pivot[1]) * 28 / radius];
  return [map(points[0]), [40, 40], map(points[2])];
}
