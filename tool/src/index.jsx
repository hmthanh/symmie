import React, { useEffect, useInsertionEffect } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")).render(<Tool />);

/// The whole tool.
function Tool() {
  const [filter, setFilter] = React.useState("");
  const [yellow, setYellow] = React.useState(null);
  const [codepoints, _] = useRemote("codepoints", []);
  const [symbols, setSymbols] = useRemote("symbols", {});

  const dups = findDuplicates(symbols);

  let list = [];
  let prev = undefined;
  const regex = new RegExp(filter, "i");
  for (const { code, title, block } of codepoints) {
    const name = symbols[code] || "";
    if (
      (yellow === null || yellow.has(code)) &&
      (filter === "" || title.match(regex) || name.match(regex))
    ) {
      if (block !== prev) {
        list.push(<h2 key={block}>{block}</h2>);
      }
      list.push(
        <Symbol
          key={code}
          code={code}
          title={title}
          symbols={symbols}
          setSymbols={setSymbols}
        />
      );

      prev = block;
    }
  }

  return (
    <main>
      <h2>Setup</h2>
      Filter:&nbsp;
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <br />
      Duplicates: {dups.join(", ")} <br />
      Yellow:{" "}
      <input
        type="checkbox"
        value={yellow !== null}
        onChange={(e) => {
          if (e.target.checked) {
            const set = new Set();
            for (const [code, value] of Object.entries(symbols)) {
              if (value === null) {
                set.add(parseInt(code));
              }
            }
            setYellow(set);
          } else {
            setYellow(null);
          }
        }}
      />
      <div className="codepoints">{list}</div>
    </main>
  );
}

/// Finds all duplicates in a symbol list.
function findDuplicates(symbols) {
  let set = new Set();
  let dups = [];
  for (const name of Object.values(symbols)) {
    if (name) {
      const parts = name.split(":");
      let tail = parts.slice(1);
      tail.sort();
      const canon = parts[0] + ":" + tail.join(":");
      if (set.has(canon)) {
        dups.push(canon);
      }
      set.add(canon);
    }
  }
  return dups;
}

/// A single symbol item.
function Symbol({ code, title, symbols, setSymbols }) {
  let name = undefined;
  if (code in symbols) {
    name = symbols[code];
    return (
      <IncludedSymbol
        code={code}
        title={title}
        name={name}
        rename={async (name) => {
          setSymbols((symbols) => ({ ...symbols, [code]: name }));
          if (!(await request("PUT", `symbols/${code}?name=${name}`))) {
            setSymbols((symbols) => ({ ...symbols, [code]: null }));
          }
        }}
        remove={async () => {
          if (await request("DELETE", `symbols/${code}`)) {
            setSymbols((symbols) => {
              const copy = { ...symbols };
              delete copy[code];
              return copy;
            });
          }
        }}
      />
    );
  } else {
    return (
      <ExcludedSymbol
        code={code}
        title={title}
        insert={async (name) => {
          if (typeof name === "string") {
            if (await request("PUT", `symbols/${code}?name=${name}`)) {
              setSymbols((symbols) => ({ ...symbols, [code]: name }));
            }
          } else {
            if (await request("PUT", `symbols/${code}`)) {
              setSymbols((symbols) => ({ ...symbols, [code]: null }));
            }
          }
        }}
      />
    );
  }
}

/// A single excluded symbol item.
function ExcludedSymbol({ code, title, insert }) {
  return (
    <div className="card" onClick={() => insert()}>
      <span className="title">{title}</span>
      <button
        className="x"
        onClick={(e) => {
          e.stopPropagation();
          insert(title.toLowerCase().replaceAll(" ", "-"));
        }}
      >
        +
      </button>
      <span className="symbol">{String.fromCodePoint(code)}</span>
    </div>
  );
}

/// A single included symbol item.
function IncludedSymbol({ code, title, name, rename, remove }) {
  return (
    <div className={"card included" + (name === null ? " unnamed" : "")}>
      <span className="title">{title}</span>
      <button className="x" onClick={remove}>
        x
      </button>
      <span className="symbol">{String.fromCodePoint(code)}</span>
      <input
        value={name || ""}
        placeholder="(unnamed)"
        onInput={(e) => rename(e.target.value)}
      />
    </div>
  );
}

/// Load data from the remote.
function useRemote(name, init) {
  const [data, setData] = React.useState(init);
  React.useEffect(() => {
    fetch(`http://localhost:7071/${name}`)
      .then((res) => res.json())
      .then(setData);
  }, [name, setData]);
  return [data, setData];
}

/// Perform a request to the server.
async function request(method, route) {
  try {
    const res = await fetch("http://localhost:7071/" + route, { method });
    return res.ok;
  } catch (e) {
    return false;
  }
}
