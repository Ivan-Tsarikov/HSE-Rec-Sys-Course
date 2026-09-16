var LunchApp = (function () {
  var menu = [
    { id: 0, name: "Margherita Pizza", emoji: "\uD83C\uDF55", mood: "comfort", maxTime: 30 },
    { id: 1, name: "Salmon Sushi Bowl", emoji: "\uD83C\uDF63", mood: "light", maxTime: 25 },
    { id: 2, name: "Turkey Club Sandwich", emoji: "\uD83E\uDD69", mood: "light", maxTime: 15 },
    { id: 3, name: "Spaghetti Bolognese", emoji: "\uD83C\uDF5D", mood: "comfort", maxTime: 40 },
    { id: 4, name: "Greek Salad", emoji: "\uD83E\uDD57", mood: "light", maxTime: 15 },
    { id: 5, name: "Chicken Tacos", emoji: "\uD83C\uDF2E", mood: "comfort", maxTime: 20 },
    { id: 6, name: "Ramen", emoji: "\uD83C\uDF5C", mood: "comfort", maxTime: 25 },
    { id: 7, name: "Falafel Wrap", emoji: "\uD83E\uDD69", mood: "light", maxTime: 15 },
    { id: 8, name: "Fried Chicken", emoji: "\uD83C\uDF57", mood: "comfort", maxTime: 20 },
    { id: 9, name: "Shrimp Stir-fry", emoji: "\uD83E\uDD90", mood: "light", maxTime: 20 },
    { id: 10, name: "Veggie Burger", emoji: "\uD83E\uDD69", mood: "light", maxTime: 25 },
    { id: 11, name: "Teriyaki Bowl", emoji: "\uD83C\uDF63", mood: "light", maxTime: 20 }
  ];

  function filterMenu(mood, maxTime) {
    return menu.filter(function (item) {
      var moodOk = mood === "any" || item.mood === mood;
      var timeOk = maxTime === "any" || item.maxTime <= maxTime;
      return moodOk && timeOk;
    });
  }

  function clampRandom(value) {
    return Math.max(0, Math.min(1 - 1e-9, value));
  }

  function selectLunch(filteredItems, randomValue, previousId) {
    if (filteredItems.length === 0) return null;
    var v = clampRandom(randomValue);
    var candidates = filteredItems;
    if (filteredItems.length > 1 && previousId != null) {
      var excluded = filteredItems.filter(function (item) { return item.id !== previousId; });
      if (excluded.length > 0) {
        candidates = excluded;
      }
    }
    var index = Math.floor(v * candidates.length);
    return candidates[index];
  }

  var previousId = null;

  function getPreviousId() {
    return previousId;
  }

  function resetPreviousId() {
    previousId = null;
  }

  function getMenu() {
    return menu.slice();
  }

  var result = {
    menu: menu,
    filterMenu: filterMenu,
    clampRandom: clampRandom,
    selectLunch: selectLunch,
    getMenu: getMenu,
    getPreviousId: getPreviousId,
    resetPreviousId: resetPreviousId
  };

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      var moodSelect = document.getElementById("mood-select");
      var timeSelect = document.getElementById("time-select");
      var generateBtn = document.getElementById("generate-btn");
      var resultEmoji = document.getElementById("result-emoji");
      var resultText = document.getElementById("result-text");
      var details = document.getElementById("details");

      function generate() {
        var mood = moodSelect.value;
        var maxTime = timeSelect.value === "any" ? "any" : parseInt(timeSelect.value, 10);
        var filtered = filterMenu(mood, maxTime);
        var item = selectLunch(filtered, Math.random(), previousId);
        if (item) {
          previousId = item.id;
          resultEmoji.textContent = item.emoji;
          resultText.textContent = item.name;
          details.textContent = "Mood: " + item.mood + " \u00B7 Max time: " + item.maxTime + " min";
        } else {
          previousId = null;
          resultEmoji.textContent = "";
          resultText.textContent = "No lunch matches your preferences";
          details.textContent = "";
        }
      }

      generateBtn.addEventListener("click", generate);
    });
  }

  return result;
})();
