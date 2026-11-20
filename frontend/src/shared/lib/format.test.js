import test from "node:test";
import assert from "node:assert/strict";
import { formatNumber, currency, shortName, initials } from "./format.js";

test("initials handles emojis, suffixes, trailing spaces, and single-letter names", () => {
  assert.equal(initials("🏋️ Minh"), "🏋️M");
  assert.equal(initials("Christopher Alexander Montgomery III"), "CM");
  assert.equal(initials("Nguyễn Linh "), "NL");
  assert.equal(initials("J"), "J");
  assert.equal(initials("   "), "OG");
  assert.equal(initials("Đặng Thị Ngọc Hân"), "ĐH");
});

test("formatNumber and currency guard against null/undefined/NaN", () => {
  assert.equal(formatNumber(1284), "1.284");
  assert.equal(formatNumber(undefined), "0");
  assert.equal(formatNumber(null), "0");
  assert.equal(currency(0), "0 ₫");
});

test("shortName trims extra whitespace and provides fallback", () => {
  assert.equal(shortName("  Nguyễn   Khánh   Linh "), "Khánh Linh");
  assert.equal(shortName(""), "Bạn");
});
