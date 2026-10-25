jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
}));
beforeEach(async () => {
  await require("@react-native-async-storage/async-storage").default.clear();
});
