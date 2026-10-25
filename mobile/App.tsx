import React, { useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet
} from "react-native";

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

const EQUIPMENTS: EquipmentItem[] = [
  {
    id: "chest-press",
    name: "チェストプレス",
    enName: "Seated Chest Press",
    category: "マシン",
    bodyPart: "chest",
    bodyPartLabel: "胸（大胸筋中部）",
    primaryMuscles: ["大胸筋（胸肋部）", "三角筋前部", "上腕三頭筋"],
    pof: "Midrange（ミッドレンジ種目）",
    seatSetup: "グリップがバストトップ（乳頭ライン）と同じ高さになるようシート高を調整。",
    beginnerSteps: [
      "肩甲骨を軽く寄せて胸を張り、背中とお尻をシートに密着させる",
      "息を吐きながら肘が伸びきる手前まで前に押し出す",
      "息を吸いながら胸のストレッチを感じる位置までゆっくり戻す"
    ],
    ngPoints: ["肩がすくんで前に出る", "肘を完全ロックして関節で休む"],
    proBiomechanics:
      "水平軌道でコンスタントテンションを維持。片手ずつ行い正中線を超えて内転させると大胸筋内側の収縮を最大化できる。",
    builderTip: "ボトムで1秒ポーズを入れるとストレッチ刺激が倍増します。",
    startWeightMale: "25〜35 kg",
    startWeightFemale: "10〜15 kg"
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
      "肘を脇腹に近づける意識で引き、ゆっくり戻す"
    ],
    ngPoints: ["首の後ろに引き下ろすビハインドネック", "反動で上体を倒しすぎる"],
    proBiomechanics:
      "初動で肩甲骨の下制（デプレッション）を行ってから肘屈曲に入る。サムレスで小指・薬指側を強く握ると二頭筋の関与を最小化できる。",
    builderTip: "ネガティブ局面で広背筋をフルストレッチさせてから肩甲骨下制だけで2cm引く練習が効果的。",
    startWeightMale: "25〜35 kg",
    startWeightFemale: "10〜18 kg"
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
      "お尻が浮かない深さまでゆっくり曲げる"
    ],
    ngPoints: ["高重量で膝を完全にロックする", "深く下ろしすぎて腰が丸まり浮く"],
    proBiomechanics:
      "足をプレート下側＆狭めに置けば大腿四頭筋（外側広筋）、上側＆広めに置けば大臀筋・ハムストリングスにモーメントアームが移動する。",
    builderTip: "四頭筋の外側（アウトスイープ）狙いなら足幅拳1個分のノンロック20レップが有効。",
    startWeightMale: "60〜100 kg",
    startWeightFemale: "30〜50 kg"
  }
];

export default function App() {
  const [tab, setTab] = useState<"encyclopedia" | "scanner" | "map" | "log">("encyclopedia");
  const [userMode, setUserMode] = useState<"beginner" | "pro">("beginner");
  const [muscleFilter, setMuscleFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  const filtered = useMemo(() => {
    return EQUIPMENTS.filter((item) => {
      if (muscleFilter !== "all" && item.bodyPart !== muscleFilter) return false;
      if (query.trim() && !item.name.includes(query.trim()) && !item.bodyPartLabel.includes(query.trim())) {
        return false;
      }
      return true;
    });
  }, [muscleFilter, query]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gym Finder</Text>
          <Text style={styles.subtitle}>旅先ジム％診断＆初心者〜ボディビルダー対応器具図鑑</Text>
        </View>
        <TouchableOpacity
          style={[styles.modeBtn, userMode === "pro" ? styles.modeBtnPro : styles.modeBtnBeg]}
          onPress={() => setUserMode(userMode === "beginner" ? "pro" : "beginner")}
        >
          <Text style={styles.modeBtnText}>
            {userMode === "beginner" ? "🔰 初心者モード" : "🏆 ビルダーPro"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.main}>
        {tab === "encyclopedia" && (
          <View>
            <TextInput
              style={styles.searchInput}
              placeholder="器具名・部位で検索..."
              placeholderTextColor="#64748b"
              value={query}
              onChangeText={setQuery}
            />
            {filtered.map((eq) => (
              <TouchableOpacity
                key={eq.id}
                style={styles.card}
                onPress={() => setSelectedItem(eq)}
              >
                <Text style={styles.badge}>{eq.bodyPartLabel}</Text>
                <Text style={styles.cardTitle}>{eq.name}</Text>
                <Text style={styles.cardSub}>{eq.enName}</Text>
                <Text style={styles.cardTip}>
                  {userMode === "beginner" ? `💡 ${eq.seatSetup}` : `🔥 ${eq.builderTip}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedItem && (
              <ScrollView>
                <Text style={styles.cardTitle}>{selectedItem.name}</Text>
                <Text style={styles.cardSub}>{selectedItem.pof}</Text>
                <Text style={styles.sectionHeader}>🔰 初心者向けシート設定・手順</Text>
                <Text style={styles.bodyText}>{selectedItem.seatSetup}</Text>
                {selectedItem.beginnerSteps.map((s, idx) => (
                  <Text key={idx} style={styles.bodyText}>{`${idx + 1}. ${s}`}</Text>
                ))}
                <Text style={styles.sectionHeaderPro}>🏆 ビルダーPro解剖学・バイオメカニクス</Text>
                <Text style={styles.bodyText}>{selectedItem.proBiomechanics}</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedItem(null)}>
                  <Text style={styles.closeBtnText}>閉じる</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { id: "encyclopedia", label: "🏋️ 器具図鑑" },
          { id: "scanner", label: "📷 AI判定" },
          { id: "map", label: "🗺️ 店舗マップ" },
          { id: "log", label: "📊 トレ記録" }
        ].map((t) => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id as any)} style={styles.tabItem}>
            <Text style={{ color: tab === t.id ? "#ef4444" : "#94a3b8", fontWeight: "bold", fontSize: 12 }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b"
  },
  title: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  subtitle: { color: "#94a3b8", fontSize: 11 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  modeBtnBeg: { backgroundColor: "#0284c7" },
  modeBtnPro: { backgroundColor: "#f59e0b" },
  modeBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 12 },
  main: { flex: 1, padding: 16 },
  searchInput: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: "#ffffff",
    marginBottom: 12
  },
  card: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },
  badge: { color: "#f87171", fontSize: 11, fontWeight: "bold", marginBottom: 4 },
  cardTitle: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  cardSub: { color: "#94a3b8", fontSize: 12, marginBottom: 8 },
  cardTip: { color: "#cbd5e1", fontSize: 12, lineHeight: 18 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    backgroundColor: "#090d16",
    paddingVertical: 12
  },
  tabItem: { flex: 1, alignItems: "center" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 16
  },
  modalCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%"
  },
  sectionHeader: { color: "#38bdf8", fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  sectionHeaderPro: { color: "#fbbf24", fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  bodyText: { color: "#e2e8f0", fontSize: 13, lineHeight: 20, marginBottom: 4 },
  closeBtn: {
    marginTop: 16,
    backgroundColor: "#ef4444",
    padding: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  closeBtnText: { color: "#ffffff", fontWeight: "bold" }
});
