import { useI18n } from "../i18n";
import React, { useState } from "react";
import { Alert, Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Body, Button, Field, Heading, s } from "./ui";
import { equipment, equipmentName } from "../domain/matching";
import {
  reviewSummary,
  validateReview,
  validateSpec,
  PhotoPost,
} from "../domain/community";
import { parseNumber } from "../domain/nutrition";
import { discardPhoto, persistPhoto, photoUri } from "../domain/gymPhotos";
import { useFitness } from "../state";
function GymPhoto({ post }: { post: PhotoPost }) {
  const { t, formatDate } = useI18n();
  const [failed, setFailed] = useState(false);
  return (
    <View
      style={{
        gap: 8,
      }}
    >
      {failed ? (
        <Body>{t("写真を読み込めませんでした。")}</Body>
      ) : (
        <Image
          source={{
            uri: photoUri(post.fileName),
          }}
          accessibilityLabel={t("設備写真: {0}", {
            "0": post.caption,
          })}
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: 160,
            borderRadius: 12,
          }}
        />
      )}
      <Body>
        {post.caption}
        {post.equipmentId ? ` / ${equipmentName(post.equipmentId)}` : ""}
      </Body>
      <Body>{formatDate(post.createdAt)}</Body>
    </View>
  );
}
export function GymPosts({ gymId }: { gymId: string }) {
  const { t, formatDate } = useI18n();
  const { community } = useFitness();
  const reviews = community.reviews.filter((p) => p.gymId === gymId);
  const photos = community.photos.filter((p) => p.gymId === gymId);
  const specs = community.specs.filter((p) => p.gymId === gymId);
  const summary = reviewSummary(reviews);
  return (
    <View
      style={{
        gap: 12,
      }}
    >
      <Heading>{t("この端末の投稿")}</Heading>
      <Body>
        {t("端末内のみ・未検証。店舗公式情報や公開レビューではありません。")}
      </Body>
      <Body>
        {summary.average === null
          ? t("星評価はまだありません")
          : t("★ {0} / 5（{1}件・この端末）", {
              "0": summary.average.toFixed(1),
              "1": summary.count,
            })}
      </Body>
      {[...specs].reverse().map((p) => (
        <View key={p.id}>
          <Body>
            {t("設備修正 /")}{" "}
            {p.maxDumbbellKg === null
              ? t("重量変更なし")
              : `${p.previousMaxDumbbellKg}kg → ${p.maxDumbbellKg}kg`}
          </Body>
          {!!p.equipmentIds.length && (
            <Body>
              {t("器具追加申請: ")}
              {p.equipmentIds.map(equipmentName).join(" / ")}
            </Body>
          )}
          {!!p.note && <Body>{p.note}</Body>}
          <Body>
            {formatDate(p.createdAt)}
            {t(" / 端末に反映済み・未検証")}
          </Body>
        </View>
      ))}
      {[...reviews].reverse().map((p) => (
        <View key={p.id}>
          <Body>
            {"★".repeat(p.rating)}
            {"☆".repeat(5 - p.rating)} / {p.rating}
            {t("点")}
          </Body>
          <Body>{p.comment}</Body>
          <Body>{formatDate(p.createdAt)}</Body>
        </View>
      ))}
      {[...photos].reverse().map((p) => (
        <GymPhoto key={p.id} post={p} />
      ))}
      {!specs.length && !reviews.length && !photos.length && (
        <Body>{t("このジムへの投稿はまだありません。")}</Body>
      )}
    </View>
  );
}
export function GymContributionForm({ gymId }: { gymId: string }) {
  const { t, formatDate } = useI18n();
  const { gymCatalog, addSpec, addReview, addPhoto, storageStatus } =
    useFitness();
  const gym = gymCatalog.find((g) => g.id === gymId)!;
  const [mode, setMode] = useState<"spec" | "photo" | "review">("spec");
  const [max, setMax] = useState("");
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [photoEquipment, setPhotoEquipment] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const invalid = (message: string) => Alert.alert(t("入力を確認"), t(message));
  function saveSpec() {
    const kg = max.trim() === "" ? null : parseNumber(max, 0, 200);
    if (max.trim() !== "" && kg === null) {
      invalid(t("最大重量は0〜200kgで入力してください。"));
      return;
    }
    const error = validateSpec(gym, kg, equipmentIds, note);
    if (error) {
      invalid(error);
      return;
    }
    try {
      addSpec({
        gymId,
        maxDumbbellKg: kg,
        equipmentIds,
        note: note.trim(),
      });
      setMax("");
      setEquipmentIds([]);
      setNote("");
      Alert.alert(
        t("設備修正を反映しました"),
        t("この端末の検索・マッチ率に反映しました。外部への送信は行いません。"),
      );
    } catch {
      Alert.alert(
        t("反映できませんでした"),
        t("内容を確認して再試行してください。"),
      );
    }
  }
  function saveReview() {
    const error = validateReview(rating, comment);
    if (error) {
      invalid(error);
      return;
    }
    try {
      addReview({
        gymId,
        rating,
        comment,
      });
      setRating(0);
      setComment("");
      Alert.alert(
        t("レビューを追加しました"),
        t("この端末のジム情報とMy Pageに反映しました。"),
      );
    } catch {
      Alert.alert(
        t("投稿できませんでした"),
        t("内容を確認して再試行してください。"),
      );
    }
  }
  async function choosePhoto(camera: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            t("カメラを利用できません"),
            t("端末設定でカメラを許可するか、写真を選択してください。"),
          );
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.7,
        exif: false,
        base64: false,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const selected = result.assets?.[0];
      if (!selected?.uri) throw new Error("Missing image");
      if (selected.fileSize && selected.fileSize > 20 * 1024 * 1024) {
        Alert.alert(
          t("写真が大きすぎます"),
          t("20MB以下の写真を選択してください。"),
        );
        return;
      }
      setAsset(selected);
    } catch {
      Alert.alert(
        t("写真を取得できませんでした"),
        t("写真の選択・撮影を再試行してください。"),
      );
    } finally {
      setBusy(false);
    }
  }
  async function savePhoto() {
    if (busy) return;
    if (!asset || !caption.trim() || caption.trim().length > 120) {
      invalid(t("写真を選び、説明を1〜120文字で入力してください。"));
      return;
    }
    setBusy(true);
    let fileName: string | undefined;
    try {
      fileName = await persistPhoto(asset);
      addPhoto({
        gymId,
        fileName,
        caption: caption.trim(),
        equipmentId: photoEquipment,
      });
      setAsset(null);
      setCaption("");
      setPhotoEquipment(null);
      Alert.alert(
        t("写真を追加しました"),
        t("この端末に写真をコピーしました。公開・外部送信は行いません。"),
      );
    } catch {
      if (fileName) await discardPhoto(fileName).catch(() => {});
      Alert.alert(
        t("写真を保存できませんでした"),
        t("空き容量や写真へのアクセスを確認して再試行してください。"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      style={{
        gap: 12,
      }}
    >
      <Heading>
        {t("投稿先 / ")}
        {gym.name}
      </Heading>
      <Body>
        {t(
          "この端末だけに保存します。設備修正は未検証の個人設定として即時反映します。",
        )}
      </Body>
      <Body>
        {storageStatus === "saved"
          ? t("端末に保存済み")
          : storageStatus === "saving"
            ? t("端末に保存中…")
            : t("保存失敗。画面上部から再試行してください。")}
      </Body>
      <View style={s.row}>
        {(
          [
            {
              id: "spec",
              label: t("設備修正"),
            },
            {
              id: "photo",
              label: t("設備写真"),
            },
            {
              id: "review",
              label: t("レビュー"),
            },
          ] as const
        ).map((m) => (
          <Button
            key={m.id}
            title={m.label}
            selected={mode === m.id}
            disabled={busy}
            onPress={() => setMode(m.id)}
          />
        ))}
      </View>
      {mode === "spec" && (
        <>
          <Body>
            {t("現在のダンベル最大重量: ")}
            {gym.maxDumbbellKg}kg
          </Body>
          <Field
            accessibilityLabel={t("修正後ダンベル最大重量kg")}
            placeholder={t("変更後kg（空欄なら変更しない）")}
            keyboardType="decimal-pad"
            value={max}
            onChangeText={setMax}
          />
          <Body>{t("追加申請する不足器具（複数選択可）")}</Body>
          <View style={s.row}>
            {equipment
              .filter((e) => !gym.installed.includes(e.id))
              .map((e) => (
                <Button
                  key={e.id}
                  title={t("追加: {0}", {
                    "0": e.name,
                  })}
                  selected={equipmentIds.includes(e.id)}
                  onPress={() =>
                    setEquipmentIds((old) =>
                      old.includes(e.id)
                        ? old.filter((id) => id !== e.id)
                        : [...old, e.id],
                    )
                  }
                />
              ))}
          </View>
          <Field
            accessibilityLabel={t("設備確認メモ")}
            placeholder={t("確認メモ（任意・300文字以内）")}
            multiline
            maxLength={300}
            value={note}
            onChangeText={setNote}
          />
          <Button title={t("設備修正を反映")} selected onPress={saveSpec} />
        </>
      )}
      {mode === "review" && (
        <>
          <Heading>{t("星評価")}</Heading>
          <View style={s.row}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                title={`★ ${n}`}
                selected={rating === n}
                onPress={() => setRating(n)}
              />
            ))}
          </View>
          <Field
            accessibilityLabel={t("ジムレビューコメント")}
            placeholder={t("使いやすい器具・混雑・トレーニング環境など")}
            multiline
            maxLength={1000}
            value={comment}
            onChangeText={setComment}
          />
          <Button title={t("レビューを投稿")} selected onPress={saveReview} />
        </>
      )}
      {mode === "photo" && (
        <>
          <Body>
            {t("写真は20MB以下。撮影・選択後に説明を入力して保存します。")}
          </Body>
          <View style={s.row}>
            <Button
              title={t("写真を選択")}
              disabled={busy}
              onPress={() => void choosePhoto(false)}
            />
            <Button
              title={t("写真を撮影")}
              disabled={busy}
              onPress={() => void choosePhoto(true)}
            />
          </View>
          {asset && (
            <Image
              source={{
                uri: asset.uri,
              }}
              accessibilityLabel={t("投稿する写真のプレビュー")}
              style={{
                width: "100%",
                height: 160,
                borderRadius: 12,
              }}
            />
          )}
          <Field
            accessibilityLabel={t("設備写真の説明")}
            editable={!busy}
            placeholder={t("写真の説明（120文字以内）")}
            maxLength={120}
            value={caption}
            onChangeText={setCaption}
          />
          <Body>{t("写真の器具（任意）")}</Body>
          <View style={s.row}>
            <Button
              title={t("設備全体")}
              disabled={busy}
              selected={photoEquipment === null}
              onPress={() => setPhotoEquipment(null)}
            />
            {equipment.map((e) => (
              <Button
                key={e.id}
                title={t("写真: {0}", {
                  "0": e.name,
                })}
                disabled={busy}
                selected={photoEquipment === e.id}
                onPress={() => setPhotoEquipment(e.id)}
              />
            ))}
          </View>
          <Button
            title={busy ? t("写真を処理中…") : t("写真を投稿")}
            selected
            disabled={busy}
            onPress={() => void savePhoto()}
          />
        </>
      )}
    </View>
  );
}
