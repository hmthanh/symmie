import * as express from "express";
import * as fs from "fs";
import rawCodepoints from "codepoints";

const font = fs.readFileSync("../fonts/LatinModernMath.otf");
let symbols = {};
let codepoints = [];

const blocks = [
  // Basics.
  "Basic Latin",
  "Latin-1 Supplement",
  "General Punctuation",
  "Currency Symbols",
  "Small Form Variants",
  "Ideographic Symbols and Punctuation",
  "CJK Symbols and Punctuation",
  "Greek and Coptic",
  "Hebrew",
  "Letterlike Symbols",
  "Mathematical Alphanumeric Symbols",

  // Maths and tech
  "Mathematical Operators",
  "Supplemental Mathematical Operators",
  "Miscellaneous Mathematical Symbols-A",
  "Miscellaneous Mathematical Symbols-B",
  "Miscellaneous Technical",

  // Arrows.
  "Arrows",
  "Supplemental Arrows-A",
  "Supplemental Arrows-B",
  "Supplemental Arrows-C",
  "Miscellaneous Symbols and Arrows",

  // Shapes.
  "Geometric Shapes",
  "Geometric Shapes Extended",

  // Emoji and more.
  "Miscellaneous Symbols",
  "Dingbats",
  "Miscellaneous Symbols and Pictographs",
  "Emoticons",
  "Transport and Map Symbols",
  "Supplemental Symbols and Pictographs",
  "Symbols and Pictographs Extended-A",
];

function readSymbols() {
  const raw = JSON.parse(fs.readFileSync("../symbols.json"));
  symbols = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [parseInt(k.slice(2), 16), v])
  );
}

function writeSymbols() {
  const raw = Object.fromEntries(
    Object.entries(symbols).map(([k, v]) => [
      "U+" + parseInt(k).toString(16).toUpperCase(),
      v,
    ])
  );
  fs.writeFileSync("../symbols.json", JSON.stringify(raw, null, 2) + "\n");
}

function readBlocksAndCodepoints() {
  for (const c of rawCodepoints) {
    if (c !== undefined) {
      if (blocks.includes(c.block))
        codepoints.push({ code: c.code, title: c.name, block: c.block });
    }
  }
  codepoints.sort((a, b) => blocks.indexOf(a.block) - blocks.indexOf(b.block));
}

readSymbols();
readBlocksAndCodepoints();

const app = express.default();
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  next();
});

app.get("/font", (_, res) => res.send(font));
app.get("/blocks", (_, res) => res.send(blocks));
app.get("/codepoints", (_, res) => res.send(codepoints));
app.get("/symbols", (_, res) => res.send(symbols));
app.put("/symbols/:code", (req, res) => {
  const code = req.params.code;
  const name = req.query.name || null;
  symbols[code] = name;
  writeSymbols();
  res.end();
});
app.delete("/symbols/:code", (req, res) => {
  const code = req.params.code;
  delete symbols[code];
  writeSymbols();
  res.end();
});

app.listen(7071);
