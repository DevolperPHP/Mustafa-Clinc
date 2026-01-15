function weightedRandom(items, weightKey) {
  const totalWeight = items.reduce((sum, item) => sum + item[weightKey], 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item[weightKey];
    if (random <= 0) return item;
  }

  return items[items.length - 1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomFloat(min, max, decimals = 2) {
  const num = Math.random() * (max - min) + min;
  return parseFloat(num.toFixed(decimals));
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = {
  weightedRandom,
  randomInt,
  randomItem,
  randomFloat,
  shuffleArray
};
