(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GymFinderPreviewStorage = api;
})(globalThis, function () {
  const key = "@gymfinder/web/v1";
  const record = (value) =>
    value && typeof value === "object" && !Array.isArray(value);
  const text = (value) => typeof value === "string" && value.length <= 100000;
  const number = (value) => typeof value === "number" && Number.isFinite(value);
  const list = (check) => (value) =>
    Array.isArray(value) && value.length <= 10000 && value.every(check);
  const fields = {
    lang: (value) => ["ja", "en"].includes(value),
    mode: (value) => ["beginner", "pro"].includes(value),
    favoriteGymIds: list(text),
    ownedHomeGear: list(text),
    bodyweightOnly: (value) => typeof value === "boolean",
    currentWeight: number,
    targetWeight: number,
    calorieGoal: number,
    weightHistory: list((v) => record(v) && text(v.label) && number(v.kg)),
    pfcGoal: (v) => record(v) && ["p", "f", "c"].every((k) => number(v[k])),
    meals: list(
      (v) =>
        record(v) &&
        ["id", "type", "name"].every((k) => text(v[k])) &&
        ["kcal", "p", "f", "c"].every((k) => number(v[k])) &&
        (v.provided === undefined || typeof v.provided === "boolean"),
    ),
    workoutHistory: list(
      (v) =>
        record(v) &&
        ["id", "date", "location", "exercise", "detail"].every((k) =>
          text(v[k]),
        ) &&
        number(v.volume),
    ),
    customMenus: list(
      (v) => record(v) && ["id", "name", "reqEquip"].every((k) => text(v[k])),
    ),
  };
  const own = (value, field) =>
    Object.prototype.hasOwnProperty.call(value, field);
  function decode(raw) {
    const value = JSON.parse(raw);
    if (
      !record(value) ||
      value.version !== 1 ||
      !record(value.state) ||
      !Array.isArray(value.community)
    )
      throw new Error("Unsupported stored preview data");
    const state = {};
    for (const [field, check] of Object.entries(fields)) {
      if (own(value.state, field)) {
        if (!check(value.state[field]))
          throw new Error("Invalid stored field: " + field);
        state[field] = value.state[field];
      }
    }
    const community = value.community.map((gym) => {
      if (
        !record(gym) ||
        !text(gym.id) ||
        !text(gym.spec) ||
        !list(
          (v) =>
            record(v) &&
            v.user === "You (Verified Contributor)" &&
            typeof v.stars === "string" &&
            /^[★☆]{1,5}$/.test(v.stars) &&
            text(v.text),
        )(gym.reviews)
      )
        throw new Error("Invalid stored gym posts");
      return {
        id: gym.id,
        spec: gym.spec,
        reviews: gym.reviews.map((r) => ({
          user: r.user,
          stars: r.stars,
          text: r.text,
        })),
      };
    });
    return { version: 1, state, community };
  }
  function snapshot(state, gyms, providedMeals = new Map()) {
    const values = {};
    for (const field of Object.keys(fields))
      if (own(state, field)) values[field] = state[field];
    if (values.meals)
      values.meals = values.meals.map((meal) => ({
        ...meal,
        provided:
          meal.provided === true || providedMeals.get(meal.id) === meal.name,
      }));
    const value = {
      version: 1,
      state: values,
      community: gyms.map((g) => ({
        id: g.id,
        spec: g.spec,
        reviews: g.reviews.filter(
          (r) => r.user === "You (Verified Contributor)",
        ),
      })),
    };
    return decode(JSON.stringify(value));
  }
  function restore(saved, state, gyms) {
    for (const field of Object.keys(fields))
      if (own(saved.state, field) && own(state, field))
        state[field] = saved.state[field];
    for (const post of saved.community) {
      const gym = gyms.find((g) => g.id === post.id);
      if (gym) {
        gym.spec = post.spec;
        gym.reviews = [
          ...post.reviews,
          ...gym.reviews.filter((r) => r.user !== "You (Verified Contributor)"),
        ];
      }
    }
  }
  return { key, decode, snapshot, restore };
});
