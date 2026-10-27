jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
}));
beforeEach(async () => {
  await require("@react-native-async-storage/async-storage").default.clear();
});
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///app-documents/",
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest
    .fn()
    .mockResolvedValue({ exists: true, isDirectory: false, size: 1000 }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));
