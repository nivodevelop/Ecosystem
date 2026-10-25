import assert from "node:assert/strict";
import { charCount, fitKeywords, fitListing, fitText } from "../src/fit";

assert.equal(fitText("Fotobearbeitung mit künstlicher Intelligenz", 30), "Fotobearbeitung mit");
assert.ok(charCount(fitText("写真編集アプリ人工知能フィルターとコラージュ作成ツール最高品質の写真エディター", 30)) === 30);
assert.equal(charCount(fitText("😀".repeat(40), 30)), 30);
const kw = fitKeywords("fotobearbeitung,bildbearbeitung,filter,collage,künstliche intelligenz,fotoeffekte,bilder bearbeiten,ki", 100);
assert.ok(charCount(kw) <= 100 && !kw.endsWith(","));
const long = fitText("Erste Zeile. ".repeat(400), 4000);
assert.ok(charCount(long) <= 4000 && long.endsWith("."));
const { trimmed } = fitListing({ title: "a", subtitle: "b", promoText: "", description: "", keywords: "x,".repeat(80), whatsNew: "" });
assert.deepEqual(trimmed, ["keywords"]);
console.log("fit: ok");
