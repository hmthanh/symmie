import React, { useEffect, useInsertionEffect } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")).render(<Tool />);

/// The whole tool.
function Tool() {
  const [filter, setFilter] = React.useState("");
  const [codepoints, _] = useRemote("codepoints", []);
  const [symbols, setSymbols] = useRemote("symbols", {});

  let list = [];
  let prev = undefined;
  for (const { code, title, block } of codepoints) {
    const name = symbols[code] || "";
    if (
      filter === "" ||
      title.toLowerCase().includes(filter.toLowerCase()) ||
      name.toLowerCase().includes(filter.toLowerCase())
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
      Filter:&nbsp;
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="codepoints">{list}</div>
    </main>
  );
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
          insert(title.toLowerCase());
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
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref) ref.current.textContent = name || "(unnamed)";
  }, [name]);

  return (
    <div className={"card included" + (name === null ? " unnamed" : "")}>
      <span className="title">{title}</span>
      <button className="x" onClick={remove}>
        x
      </button>
      <span className="symbol">{String.fromCodePoint(code)}</span>
      <div
        contentEditable
        className="input"
        ref={ref}
        onClick={(e) => {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(e.target);
          selection.removeAllRanges();
          selection.addRange(range);
        }}
        onInput={(e) => {
          if (e && e !== "<unnamed>") rename(e.target.textContent);
        }}
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
