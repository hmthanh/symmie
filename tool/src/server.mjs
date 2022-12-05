import * as express from "express";
import * as fs from "fs";

/// The selection of blocks we are interested in.
const blockFilter = [
  // Basics.
  "Basic Latin",
  "Latin-1 Supplement",
  "Spacing Modifier Letters",
  "General Punctuation",
  "Currency Symbols",
  "Small Form Variants",
  "Ideographic Symbols and Punctuation",
  "CJK Symbols and Punctuation",
  "Greek and Coptic",
  "Hebrew",
  "Letterlike Symbols",
  "Mathematical Alphanumeric Symbols",
  "Enclosed Alphanumerics",
  "Enclosed Alphanumeric Supplement",
  "Enclosed Ideographic Supplement",
  "Enclosed CJK Letters and Months",

  // Maths and tech.
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
  "Playing Cards",
  "Domino Tiles",
  "Mahjong Tiles",
];

main();

// Entry point.
function main() {
  const codepoints = readCodepoints();
  const symbols = readSymbolJson();
  runServer(symbols, codepoints);
}

/// Start the symbol server.
function runServer(symbols, codepoints) {
  const app = express.default();
  app.use((_, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    next();
  });

  const font = fs.readFileSync("../fonts/LatinModernMath.otf");
  app.get("/font", (_, res) => res.send(font));
  app.get("/codepoints", (_, res) => res.send(codepoints));
  app.get("/symbols", (_, res) => res.send(symbols));
  app.put("/symbols/:code", (req, res) => {
    const code = req.params.code;
    const name = req.query.name || null;
    symbols[code] = name;
    writeSymbolJson(symbols);
    res.end();
  });
  app.delete("/symbols/:code", (req, res) => {
    const code = req.params.code;
    delete symbols[code];
    writeSymbolJson(symbols);
    res.end();
  });

  app.listen(7071);
}

/// Read all relevant codepoints from the Unicode database files.
function readCodepoints() {
  let blocks = [];
  const blockData = fs.readFileSync("ucd/Blocks.txt", "ascii");
  for (const line of blockData.split("\n")) {
    const parts = line.split("; ");
    if (parts.length == 2) {
      const [from, to] = parts[0].split("..").map((str) => parseInt(str, 16));
      const name = parts[1];
      blocks.push({ from, to, name });
    }
  }

  let codepoints = [];
  const uniData = fs.readFileSync("ucd/UnicodeData.txt", "ascii");
  for (const line of uniData.split("\n")) {
    const parts = line.split(";");
    if (parts.length >= 2) {
      const code = parseInt(parts[0], 16);
      const title = parts[1];
      const block = blocks.find((b) => b.from <= code && b.to >= code).name;
      if (blockFilter.includes(block)) {
        codepoints.push({ code, title, block });
      }
    }
  }

  return codepoints.sort(
    (a, b) => blockFilter.indexOf(a.block) - blockFilter.indexOf(b.block)
  );
}

/// Read the symbols from the JSON file.
function readSymbolJson() {
  const raw = JSON.parse(fs.readFileSync("../src/symbols.json"));
  return Object.fromEntries(
    Object.entries(raw).map(([name, code]) => [
      parseInt(code.slice(2), 16),
      name,
    ])
  );
}

/// Write the symbols to the JSON file.
function writeSymbolJson(symbols) {
  const entries = Object.entries(symbols).map(([code, name]) => {
    const hex = parseInt(code).toString(16).toUpperCase();
    return [name, "U+" + hex];
  });

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  const raw = Object.fromEntries(entries);
  fs.writeFileSync("../src/symbols.json", JSON.stringify(raw, null, 2) + "\n");
}
