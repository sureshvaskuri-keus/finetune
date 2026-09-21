
const CATEGORIES = [
  { key: "downlights", label: "Downlights", file: "./data/downlights.csv" },
  { key: "tracklights", label: "Tracklights", file: "./data/tracklights.csv" },
  { key: "profiles", label: "Profiles", file: "./data/profiles.csv" },
  { key: "outdoor", label: "Outdoor Lights", file: "./data/outdoor-lights.csv" }
];

const FINISHES = {
  W:   { label: "White",            swatch: "#f4f1e8" },
  B:   { label: "Mat Black",        swatch: "#171717" },
  CG:  { label: "Champagne Gold",   swatch: "#c7a36d" },
  RG:  { label: "Rose Gold",        swatch: "#b77d70" },
  BR:  { label: "Brown",            swatch: "#6f4d39" },
  COF: { label: "Coffee",           swatch: "#594038" },
  DGR: { label: "Dark Gray",        swatch: "#55585a" },
  BB:  { label: "Ballet Blue",      swatch: "#8aa9bd" },
  CH:  { label: "Chrome",           swatch: "linear-gradient(135deg,#ececec,#8d8d8d,#f6f6f6)" },
  CHB: { label: "Chrome Black",     swatch: "linear-gradient(135deg,#bdbdbd,#252525,#909090)" }
};

const state = {
  category: "downlights",
  rows: [],
  products: [],
  filteredProducts: []
};

const els = {
  tabs: document.getElementById("categoryTabs"),
  sectionTitle: document.getElementById("sectionTitle"),
  product: document.getElementById("productFilter"),
  search: document.getElementById("searchInput"),
  finish: document.getElementById("finishFilter"),
  cct: document.getElementById("cctFilter"),
  wattage: document.getElementById("wattageFilter"),
  clear: document.getElementById("clearFilters"),
  count: document.getElementById("resultCount"),
  grid: document.getElementById("grid"),
  status: document.getElementById("status"),
  dialog: document.getElementById("productDialog"),
  dialogContent: document.getElementById("dialogContent"),
  dialogClose: document.getElementById("dialogClose")
};

function csvToRows(text) {
  const matrix = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        quoted = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        matrix.push(row);
        row = [];
        cell = "";
      } else if (ch !== "\r") {
        cell += ch;
      }
    }
  }

  row.push(cell);
  if (row.some(v => v !== "")) matrix.push(row);

  if (!matrix.length) return [];

  const headers = matrix[0].map((h, i) =>
    (i === 0 ? h.replace(/^\uFEFF/, "") : h).trim()
  );

  return matrix.slice(1)
    .filter(r => r.some(v => String(v).trim()))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = (r[i] ?? "").trim());
      return obj;
    });
}

function stockFinishCode(stockCode = "") {
  const clean = stockCode.trim().toUpperCase();
  const parts = clean.split(/[\/_-]/).filter(Boolean);
  const last = parts[parts.length - 1] || "";

  // Longest codes first so CHB is not mistaken for CH/B.
  for (const code of ["CHB","DGR","COF","CG","RG","BR","BB","CH","W","B"]) {
    if (last === code || clean.endsWith("/" + code) || clean.endsWith("-" + code) || clean.endsWith("_" + code)) {
      return code;
    }
  }

  // Filename/text fallback for inconsistent legacy data.
  const sample = clean
    .replace(/BALCK/g, "BLACK")
    .replace(/COFEE/g, "COFFEE")
    .replace(/CROME/g, "CHROME")
    .replace(/CHAMPEING/g, "CHAMPAGNE");

  if (/CHROME.?BLACK/.test(sample)) return "CHB";
  if (/DARK.?GRAY|DARK.?GREY/.test(sample)) return "DGR";
  if (/CHAMPAGNE/.test(sample)) return "CG";
  if (/ROSE.?GOLD/.test(sample)) return "RG";
  if (/BALLET.?BLUE/.test(sample)) return "BB";
  if (/COFFEE/.test(sample)) return "COF";
  if (/BROWN/.test(sample)) return "BR";
  if (/CHROME/.test(sample)) return "CH";
  if (/BLACK/.test(sample)) return "B";
  if (/WHITE/.test(sample)) return "W";
  return "";
}

function normalizeRow(row) {
  const code = stockFinishCode(row["Stock Code"] || row.IMAGE || row.Name);
  return {
    ...row,
    finishCode: code,
    finishLabel: FINISHES[code]?.label || "Standard",
    searchText: Object.values(row).join(" ").toLowerCase()
  };
}

function groupProducts(rows) {
  const map = new Map();

  for (const row of rows) {
    const name = (row.Name || "Unnamed Product").trim();
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(row);
  }

  return [...map.entries()].map(([name, variants]) => {
    const finishMap = new Map();
    for (const v of variants) {
      const key = v.finishCode || "STD";
      if (!finishMap.has(key)) finishMap.set(key, []);
      finishMap.get(key).push(v);
    }

    return {
      name,
      variants,
      finishes: [...finishMap.entries()].map(([code, rows]) => ({
        code,
        label: FINISHES[code]?.label || "Standard",
        rows,
        image: rows.find(r => r.IMAGE)?.IMAGE || ""
      }))
    };
  }).sort((a,b) => a.name.localeCompare(b.name));
}

function uniqueValues(rows, field) {
  return [...new Set(rows.map(r => r[field]).filter(Boolean))]
    .sort((a,b) => String(a).localeCompare(String(b), undefined, { numeric:true }));
}

function fillSelect(select, values, firstLabel) {
  const previous = select.value;
  select.innerHTML = `<option value="">${firstLabel}</option>`;
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  if ([...select.options].some(o => o.value === previous)) select.value = previous;
}

function renderTabs() {
  els.tabs.innerHTML = "";
  CATEGORIES.forEach(category => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-tab" + (category.key === state.category ? " active" : "");
    btn.textContent = category.label;
    btn.addEventListener("click", () => loadCategory(category.key));
    els.tabs.appendChild(btn);
  });
}

async function loadCategory(key) {
  const category = CATEGORIES.find(c => c.key === key);
  if (!category) return;

  state.category = key;
  renderTabs();
  clearFilters(false);

  els.sectionTitle.textContent = category.label;
  els.status.textContent = `Loading ${category.label}…`;
  els.grid.innerHTML = "";

  try {
    const response = await fetch(category.file, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const text = await response.text();
    state.rows = csvToRows(text).map(normalizeRow);
    state.products = groupProducts(state.rows);

    populateFilters();
    applyFilters();
    els.status.textContent = "";
  } catch (error) {
    console.error(error);
    els.status.innerHTML = `
      Could not load <strong>${category.file}</strong>.<br>
      Make sure the CSV exists in the <code>data</code> folder and open this site through GitHub Pages or another web server.
    `;
  }
}

function populateFilters() {
  fillSelect(els.product, state.products.map(p => p.name), "All Products");
  fillSelect(els.finish, uniqueValues(state.rows, "finishLabel"), "All Finishes");
  fillSelect(els.cct, uniqueValues(state.rows, "CCT"), "All CCT");
  fillSelect(els.wattage, uniqueValues(state.rows, "Wattage"), "All Wattages");
}

function rowMatches(row) {
  const q = els.search.value.trim().toLowerCase();
  if (q && !row.searchText.includes(q)) return false;
  if (els.finish.value && row.finishLabel !== els.finish.value) return false;
  if (els.cct.value && row.CCT !== els.cct.value) return false;
  if (els.wattage.value && row.Wattage !== els.wattage.value) return false;
  return true;
}

function applyFilters() {
  const selectedProduct = els.product.value;

  const products = state.products
    .filter(p => !selectedProduct || p.name === selectedProduct)
    .map(product => {
      const matchingRows = product.variants.filter(rowMatches);
      return {
        ...product,
        matchingRows,
        matchingFinishes: groupProducts(matchingRows)[0]?.finishes || []
      };
    })
    .filter(p => p.matchingRows.length);

  state.filteredProducts = products;
  renderGrid(products);
}

function renderGrid(products) {
  els.grid.innerHTML = "";

  if (!products.length) {
    els.status.textContent = "No products match the selected filters.";
    els.count.textContent = "0 products";
    return;
  }

  els.status.textContent = "";
  const selectedProduct = els.product.value;

  // When a specific product is chosen, show one card per finish.
  if (selectedProduct) {
    const product = products[0];
    const finishCards = product.matchingFinishes.length
      ? product.matchingFinishes
      : product.finishes;

    finishCards.forEach(finish => {
      const rows = finish.rows.filter(rowMatches);
      if (!rows.length) return;
      els.grid.appendChild(createFinishCard(product.name, finish, rows));
    });

    els.count.textContent = `${els.grid.children.length} finishes`;
    return;
  }

  products.forEach(product => els.grid.appendChild(createProductCard(product)));
  els.count.textContent = `${products.length} product${products.length === 1 ? "" : "s"}`;
}

function safeImage(url, alt) {
  const img = document.createElement("img");
  img.src = url || "https://placehold.co/700x700/ffffff/333333?text=KEUS";
  img.alt = alt;
  img.loading = "lazy";
  img.decoding = "async";
  img.onerror = () => {
    img.onerror = null;
    img.src = "https://placehold.co/700x700/ffffff/333333?text=Image+Unavailable";
  };
  return img;
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "card";

  const visibleRows = product.matchingRows || product.variants;
  const image = visibleRows.find(r => r.IMAGE)?.IMAGE || product.variants.find(r => r.IMAGE)?.IMAGE || "";

  const imageBox = document.createElement("div");
  imageBox.className = "image-box";
  imageBox.appendChild(safeImage(image, product.name));

  const title = document.createElement("h2");
  title.className = "card-title";
  title.textContent = product.name;

  const subtitle = document.createElement("div");
  subtitle.className = "card-subtitle";
  subtitle.textContent = `${new Set(visibleRows.map(r => r.finishLabel)).size} finishes · ${visibleRows.length} variants`;

  const finishRow = document.createElement("div");
  finishRow.className = "finish-row";
  const labels = [...new Set(visibleRows.map(r => r.finishLabel))];
  labels.slice(0, 10).forEach(label => finishRow.appendChild(makeFinishChip(label)));

  const ccts = uniqueValues(visibleRows, "CCT");
  const watts = uniqueValues(visibleRows, "Wattage");
  const beams = uniqueValues(visibleRows, "Beam Angle");

  const specs = document.createElement("div");
  specs.className = "spec-row";
  specs.innerHTML = `
    <div class="spec"><b>${watts.slice(0,2).join(", ") || "—"}</b><span>Wattage</span></div>
    <div class="spec"><b>${ccts.slice(0,2).join(", ") || "—"}</b><span>CCT</span></div>
    <div class="spec"><b>${beams.slice(0,2).join(", ") || "—"}</b><span>Beam</span></div>
  `;

  card.append(imageBox, title, subtitle, finishRow, specs);
  card.addEventListener("click", () => openDialog(product.name, visibleRows));
  return card;
}

function createFinishCard(productName, finish, rows) {
  const card = document.createElement("article");
  card.className = "card";

  const imageBox = document.createElement("div");
  imageBox.className = "image-box";
  imageBox.appendChild(safeImage(finish.image || rows.find(r => r.IMAGE)?.IMAGE, `${productName} ${finish.label}`));

  const title = document.createElement("h2");
  title.className = "card-title";
  title.textContent = productName;

  const subtitle = document.createElement("div");
  subtitle.className = "card-subtitle";
  subtitle.textContent = `${finish.label} · ${rows.length} variant${rows.length === 1 ? "" : "s"}`;

  const finishRow = document.createElement("div");
  finishRow.className = "finish-row";
  finishRow.appendChild(makeFinishChip(finish.label));

  const ccts = uniqueValues(rows, "CCT");
  const watts = uniqueValues(rows, "Wattage");
  const beams = uniqueValues(rows, "Beam Angle");

  const specs = document.createElement("div");
  specs.className = "spec-row";
  specs.innerHTML = `
    <div class="spec"><b>${watts.slice(0,2).join(", ") || "—"}</b><span>Wattage</span></div>
    <div class="spec"><b>${ccts.slice(0,2).join(", ") || "—"}</b><span>CCT</span></div>
    <div class="spec"><b>${beams.slice(0,2).join(", ") || "—"}</b><span>Beam</span></div>
  `;

  card.append(imageBox, title, subtitle, finishRow, specs);
  card.addEventListener("click", () => openDialog(`${productName} · ${finish.label}`, rows));
  return card;
}

function makeFinishChip(label) {
  const code = Object.keys(FINISHES).find(k => FINISHES[k].label === label);
  const chip = document.createElement("span");
  chip.className = "finish-chip";

  const swatch = document.createElement("span");
  swatch.className = "swatch";
  const sw = FINISHES[code]?.swatch || "#d8d1c6";
  if (sw.startsWith("linear-gradient")) swatch.style.background = sw;
  else swatch.style.backgroundColor = sw;

  const text = document.createElement("span");
  text.textContent = label;

  chip.append(swatch, text);
  return chip;
}

function openDialog(title, rows) {
  const image = rows.find(r => r.IMAGE)?.IMAGE || "";
  const finishes = [...new Set(rows.map(r => r.finishLabel))];

  els.dialogContent.innerHTML = `
    <div class="dialog-layout">
      <div>
        <div class="dialog-image" id="dialogImage"></div>
      </div>
      <div class="dialog-copy">
        <div class="eyebrow">${CATEGORIES.find(c => c.key === state.category)?.label || ""}</div>
        <h2>${escapeHtml(title)}</h2>
        <div class="muted">${rows.length} technical variant${rows.length === 1 ? "" : "s"} · ${finishes.join(", ")}</div>
        <div class="variants">
          <div class="variant-row header">
            <div>Item No.</div><div>Wattage</div><div>CCT</div><div>CRI</div><div>Beam</div><div>Stock Code</div>
          </div>
          ${rows.map(r => `
            <div class="variant-row">
              <div>${escapeHtml(r["Item No"] || "—")}</div>
              <div>${escapeHtml(r.Wattage || "—")}</div>
              <div>${escapeHtml(r.CCT || "—")}</div>
              <div>${escapeHtml(r.CRI || "—")}</div>
              <div>${escapeHtml(r["Beam Angle"] || "—")}</div>
              <div>${escapeHtml(r["Stock Code"] || "—")}</div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  document.getElementById("dialogImage").appendChild(safeImage(image, title));
  els.dialog.showModal();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function clearFilters(render = true) {
  els.product.value = "";
  els.search.value = "";
  els.finish.value = "";
  els.cct.value = "";
  els.wattage.value = "";
  if (render) applyFilters();
}

[els.product, els.finish, els.cct, els.wattage].forEach(el =>
  el.addEventListener("change", applyFilters)
);
els.search.addEventListener("input", applyFilters);
els.clear.addEventListener("click", () => clearFilters(true));

els.dialogClose.addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", e => {
  const rect = els.dialog.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                 e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) els.dialog.close();
});

renderTabs();
loadCategory("downlights");
