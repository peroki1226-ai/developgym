import * as FS from "expo-file-system/legacy";
import { discardPhoto, persistPhoto, photoUri } from "../src/domain/gymPhotos";
const asset = {
  uri: "file:///picker/cache.jpg",
  width: 100,
  height: 100,
  fileName: "camera.jpg",
  fileSize: 1000,
};
test("selected image is copied to documents and referenced by a relative filename", async () => {
  const name = await persistPhoto(asset);
  expect(name).not.toContain("/");
  expect(FS.copyAsync).toHaveBeenCalledWith({
    from: asset.uri,
    to: photoUri(name),
  });
  expect(photoUri(name)).toMatch(/^file:\/\/\/app-documents\/gym-photos\//);
  await discardPhoto(name);
  expect(FS.deleteAsync).toHaveBeenCalledWith(photoUri(name), {
    idempotent: true,
  });
});
test("oversized/remote assets are rejected before copying and traversal cannot be deleted", async () => {
  await expect(
    persistPhoto({ ...asset, fileSize: 21 * 1024 * 1024 }),
  ).rejects.toThrow();
  await expect(
    persistPhoto({ ...asset, uri: "https://example.com/photo.jpg" }),
  ).rejects.toThrow();
  expect(FS.copyAsync).not.toHaveBeenCalled();
  await expect(discardPhoto("../private.jpg")).rejects.toThrow();
  expect(FS.deleteAsync).not.toHaveBeenCalled();
});
test("failed copy cleans up only the newly created destination", async () => {
  jest.spyOn(FS, "copyAsync").mockRejectedValueOnce(new Error("no space"));
  await expect(persistPhoto(asset)).rejects.toThrow("no space");
  expect(FS.deleteAsync).toHaveBeenCalledWith(
    expect.stringMatching(
      /^file:\/\/\/app-documents\/gym-photos\/[a-z0-9-]+\.jpg$/,
    ),
    { idempotent: true },
  );
});
