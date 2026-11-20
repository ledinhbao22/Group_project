const NAME_SUFFIXES = new Set(["JR", "JR.", "SR", "SR.", "II", "III", "IV", "V"]);

function firstGrapheme(str) {
  if (!str) return "";
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("vi", { granularity: "grapheme" });
    for (const s of seg.segment(str)) return s.segment;
  }
  return Array.from(str)[0] || "";
}

export const formatNumber = (n) => {
  const num = Number(n);
  if (n === null || n === undefined || n === "" || Number.isNaN(num)) return "0";
  return num.toLocaleString("vi-VN");
};

export const currency = (n) => formatNumber(n) + " ₫";

export const shortName = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(-2).join(" ") : "Bạn";
};

export const initials = (name) => {
  const raw = String(name || "").trim();
  if (!raw) return "OG";
  const words = raw.split(/\s+/).filter(Boolean);
  while (words.length > 1 && NAME_SUFFIXES.has(words[words.length - 1].toUpperCase())) {
    words.pop();
  }
  const picked = words.length <= 2 ? words : [words[0], words[words.length - 1]];
  const out = picked
    .map((w) => firstGrapheme(w).toUpperCase())
    .join("");
  return out || "OG";
};
