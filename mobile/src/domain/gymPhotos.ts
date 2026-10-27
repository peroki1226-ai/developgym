import * as FileSystem from "expo-file-system/legacy";
import { ImagePickerAsset } from "expo-image-picker";
import { validPhotoName } from "./community";
export function photoUri(fileName: string) {
  if (!FileSystem.documentDirectory || !validPhotoName(fileName))
    throw new Error("Invalid photo path");
  return `${FileSystem.documentDirectory}gym-photos/${fileName}`;
}
export async function discardPhoto(fileName: string) {
  await FileSystem.deleteAsync(photoUri(fileName), { idempotent: true });
}
/** Copy into app-owned documents; picker cache URIs are not durable across restarts. */
export async function persistPhoto(asset: ImagePickerAsset): Promise<string> {
  if (
    !FileSystem.documentDirectory ||
    !asset.uri ||
    !/^file:|^content:/.test(asset.uri)
  )
    throw new Error("Photo unavailable");
  if (asset.fileSize && asset.fileSize > 20 * 1024 * 1024)
    throw new Error("Photo too large");
  const candidate = (asset.fileName ?? asset.uri.split("?")[0])
    .split(".")
    .pop()
    ?.toLowerCase();
  const ext =
    candidate && /^(jpg|jpeg|png|heic|heif|webp)$/.test(candidate)
      ? candidate
      : "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const destination = photoUri(fileName);
  await FileSystem.makeDirectoryAsync(
    `${FileSystem.documentDirectory}gym-photos`,
    { intermediates: true },
  );
  try {
    await FileSystem.copyAsync({ from: asset.uri, to: destination });
    const info = await FileSystem.getInfoAsync(destination);
    if (
      !info.exists ||
      info.isDirectory ||
      !Number.isFinite(info.size) ||
      info.size <= 0 ||
      info.size > 20 * 1024 * 1024
    )
      throw new Error("Photo copy failed");
    return fileName;
  } catch (error) {
    await discardPhoto(fileName).catch(() => {});
    throw error;
  }
}
