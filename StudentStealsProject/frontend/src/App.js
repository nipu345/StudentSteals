import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

// Set REACT_APP_BACKEND_URL when deploying; falls back to the local Flask server
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
const DEAL_RADIUS_M = 1500;

const CATEGORY_META = {
  food: { label: "Food", color: "#fb923c" },
  coffee: { label: "Coffee", color: "#e0b07a" },
  groceries: { label: "Groceries", color: "#4ade80" },
  books: { label: "Books", color: "#60a5fa" },
  fitness: { label: "Fitness", color: "#f472b6" },
  entertainment: { label: "Fun", color: "#a78bfa" },
};
const categoryMeta = (c) => CATEGORY_META[c] || { label: c.charAt(0).toUpperCase() + c.slice(1), color: "#94a3b8" };

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const money = (n) => `$${n.toFixed(2)}`;

// Turns "Failed to fetch" into something a person can act on
function friendlyError(e) {
  if (e instanceof TypeError) {
    return BACKEND_URL.includes("localhost")
      ? "Can't reach the StudentSteals server. Is app.py running on port 8080?"
      : "The StudentSteals server is waking up. Give it 30 seconds and try again.";
  }
  return e.message || "Something went wrong.";
}

async function postJSON(path, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Server error (${res.status})`);
  return data;
}
// -------------------------------------------------------------------
// LOAD PURCHASES from purchases.txt (in /public folder)
// -------------------------------------------------------------------
async function loadPurchases() {
  const res = await fetch("/purchases.txt");
  const text = await res.text();
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.map((line) => {
    const [name, amount] = line.split("|").map((s) => s.trim());
    return { name, amount: parseFloat(amount) };
  });
}

// -------------------------------------------------------------------
function categorizeAllAtOnce(purchases, userCategories) {
  const purchaseCategories = {
    // FOOD — anything you eat, drink, or consume
    "chipotle burrito bowl": "food",
    "chipotle chips and guac": "food",
    "starbucks latte": "food",
    "dunkin coffee and bagel": "food",
    "target groceries run": "food",
    "whole foods salad bar": "food",
    "dominos pizza": "food",
    "panera bread sandwich": "food",
    "trader joes grocery haul": "food",
    "mcdonald's meal": "food",
    "subway footlong": "food",
    "campus vending machine": "food",
    "ramen noodles bulk pack": "food",
    "five guys burger": "food",
    "wendys combo meal": "food",
    "campus dining hall": "food",
    "smoothie king": "food",
    "chick-fil-a": "food",
    "kroger grocery run": "food",
    "buffalo wild wings": "food",
    "taco bell late night": "food",
    "costco bulk groceries": "food",
    "panda express": "food",
    "campus coffee cart": "food",
    "postmates delivery": "food",
    "jersey mikes sub": "food",
    "local pizza place": "food",
    "uber eats delivery fee": "food",
    "safeway grocery run": "food",
    "duck donuts": "food",
    "crumbl cookie": "food",
    "grubhub order": "food",
    "roommate groceries split": "food",
    "7-eleven snacks": "food",
    "wingstop": "food",
    "jamba juice": "food",
    "venmo friend for dinner": "food",
    "aldi grocery run": "food",
    "campus snack bar": "food",
    "local diner breakfast": "food",
    "ihop weekend brunch": "food",
    "waffle house": "food",
    "boba tea shop": "food",
    "wing stop delivery": "food",
    "study snacks cvs": "food",
    "instacart delivery fee": "food",
    "red bull energy drinks": "food",
    // TRANSPORT — getting around
    "uber ride to campus": "transport",
    "shell gas station": "transport",
    "lyft to airport": "transport",
    "parking meter": "transport",
    "lyft shared ride": "transport",
    "parking garage": "transport",
    // SUBSCRIPTIONS — recurring digital services
    "amazon prime monthly": "subscriptions",
    "spotify premium": "subscriptions",
    "netflix subscription": "subscriptions",
    "google one storage plan": "subscriptions",
    "apple app store purchase": "subscriptions",
    "hulu subscription": "subscriptions",
    "chegg subscription": "subscriptions",
    "adobe creative cloud": "subscriptions",
    "discord nitro": "subscriptions",
    "youtube premium": "subscriptions",
    "dropbox plus": "subscriptions",
    "notion pro": "subscriptions",
    "linkedin learning": "subscriptions",
    "grammarly premium": "subscriptions",
    "zoom pro subscription": "subscriptions",
    "coursera online course": "subscriptions",
    // SHOPPING — physical goods and retail
    "ikea desk lamp": "shopping",
    "walgreens toiletries": "shopping",
    "h&m clothing": "shopping",
    "airpods case replacement": "shopping",
    "sephora skincare": "shopping",
    "foot locker sneakers": "shopping",
    "shein clothing haul": "shopping",
    "hot topic": "shopping",
    "old navy jeans": "shopping",
    "bath and body works": "shopping",
    "bike repair shop": "shopping",
    "campus tech store cable": "shopping",
    "dollar tree supplies": "shopping",
    // SCHOOL — education related
    "campus bookstore textbook": "school",
    "used textbook ebay": "school",
    "barnes and noble": "school",
    "campus printer credits": "school",
    // HEALTH — body and wellness
    "planet fitness membership": "health",
    "gym day pass": "health",
    "cvs pharmacy": "health",
    "walgreens cold medicine": "health",
    "protein powder gnc": "health",
    "gym supplement store": "health",
    "vitamin c supplements": "health",
    "multivitamin pack": "health",
    "melatonin sleep aid": "health",
    "ibuprofen advil": "health",
    "tylenol pain relief": "health",
    "zinc supplements": "health",
    "iron supplement": "health",
    "allergy medicine zyrtec": "health",
    "nyquil cold medicine": "health",
    "vitamin d3": "health",
    // UTILITIES — bills and essentials
    "sprint phone bill": "utilities",
    "electric bill split": "utilities",
    "rent portion": "utilities",
    "laundromat": "utilities",
    "ups shipping": "utilities",
    "fedex package": "utilities",
    // ENTERTAINMENT — going out and fun
    "local bar tab": "entertainment",
    "movie theater ticket": "entertainment",
  };

  const matchUserCategory = (type) => {
    for (const cat of userCategories) {
      const c = cat.toLowerCase();
      if (type === "food" && (c.includes("food") || c.includes("eat") || c.includes("grocer") || c.includes("dining") || c.includes("meal"))) return cat;
      if (type === "transport" && (c.includes("transport") || c.includes("travel") || c.includes("car") || c.includes("gas") || c.includes("ride"))) return cat;
      if (type === "subscriptions" && (c.includes("sub") || c.includes("stream") || c.includes("media"))) return cat;
      if (type === "shopping" && (c.includes("shop") || c.includes("cloth") || c.includes("retail") || c.includes("personal"))) return cat;
      if (type === "health" && (c.includes("health") || c.includes("gym") || c.includes("fitness") || c.includes("medical"))) return cat;
      if (type === "school" && (c.includes("school") || c.includes("book") || c.includes("tuition") || c.includes("edu") || c.includes("campus"))) return cat;
      if (type === "utilities" && (c.includes("util") || c.includes("rent") || c.includes("bill") || c.includes("electric") || c.includes("phone"))) return cat;
      if (type === "entertainment" && (c.includes("entertain") || c.includes("fun") || c.includes("social") || c.includes("bar"))) return cat;
    }
    return null;
  };

  return purchases.map((p) => {
    const type = purchaseCategories[p.name.toLowerCase()] || null;
    const category = type ? matchUserCategory(type) : null;
    return { ...p, category: category || "Other" };
  });
}

// -------------------------------------------------------------------
// STYLES
// -------------------------------------------------------------------
const S = {
  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "none" },
  card: {
    background: "#13132a",
    borderRadius: "18px",
    padding: "14px",
    marginBottom: "10px",
    border: "1px solid #1e1e3a",
  },
  label: { color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px" },
  muted: { color: "#ffffff55", fontSize: "11px" },
  pill: (active, color = "#4ade80") => ({
    padding: "6px 12px",
    borderRadius: "20px",
    border: `1px solid ${active ? color : "#1e1e3a"}`,
    background: active ? `${color}1f` : "transparent",
    color: active ? color : "#ffffff66",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.3px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  }),
  tab: (active) => ({
    flex: 1,
    padding: "9px 4px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 700,
    fontFamily: "'Syne', sans-serif",
    background: active ? "#4ade80" : "#13132a",
    color: active ? "#080810" : "#ffffff44",
    transition: "all 0.2s",
    letterSpacing: "0.3px",
  }),
  btn: {
    background: "linear-gradient(135deg, #4ade80, #22c55e)",
    border: "none",
    borderRadius: "14px",
    padding: "12px 20px",
    color: "#080810",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "'Syne', sans-serif",
    width: "100%",
    marginTop: "8px",
  },
  input: {
    background: "#0d0d1a",
    border: "1px solid #1e1e3a",
    borderRadius: "12px",
    padding: "10px 12px",
    color: "#fff",
    fontSize: "13px",
    fontFamily: "'Syne', sans-serif",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  avatar: (size) => ({ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size / 2, flexShrink: 0 }),
  ghostBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "14px",
    background: "#13132a",
    border: "1px solid #1e1e3a",
    color: "#ffffffaa",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  sheetBackdrop: { position: "absolute", inset: 0, background: "rgba(8,8,16,0.88)", display: "flex", alignItems: "flex-end", zIndex: 200, borderRadius: "inherit" },
  sheet: { width: "100%", background: "#13132a", borderRadius: "24px 24px 0 0", padding: "24px 20px 32px", border: "1px solid #1e1e3a" },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(8,8,16,0.97)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px",
    zIndex: 100,
    borderRadius: "inherit",
  },
};

// -------------------------------------------------------------------
// NAME PROMPT
// -------------------------------------------------------------------
function NamePrompt({ onDone }) {
  const [name, setName] = useState("");
  return (
    <div style={S.overlay}>
      <div className="ss-fade" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ ...S.avatar(72), marginBottom: "18px", boxShadow: "0 0 40px rgba(74,222,128,0.35)" }}>🎓</div>
        <div style={{ ...S.label, letterSpacing: "2px", marginBottom: "6px" }}>WELCOME TO</div>
        <div style={{ color: "#fff", fontSize: "28px", fontWeight: 800, marginBottom: "6px" }}>
          Student<span style={{ color: "#4ade80" }}>Steals</span>
        </div>
        <div style={{ color: "#ffffff66", fontSize: "13px", marginBottom: "32px", textAlign: "center", lineHeight: 1.5 }}>
          Nearby deals and an AI money coach,<br />built for a student budget.
        </div>
        <div style={{ width: "100%", marginBottom: "10px" }}>
          <div style={{ color: "#ffffff88", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>WHAT'S YOUR NAME?</div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onDone(name.trim())}
            placeholder="Enter your first name..."
            style={S.input}
          />
        </div>
        <button onClick={() => name.trim() && onDone(name.trim())} disabled={!name.trim()} style={{ ...S.btn, opacity: name.trim() ? 1 : 0.4, marginTop: "4px" }}>
          Let's Go →
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// BUDGET SETUP
// -------------------------------------------------------------------
const DEFAULT_BUDGET_ROWS = [
  { category: "Food", budget: "300" },
  { category: "Subscriptions", budget: "40" },
  { category: "Transport", budget: "60" },
  { category: "Shopping", budget: "75" },
];

function BudgetSetup({ initial, onDone, onCancel }) {
  const [rows, setRows] = useState(
    initial ? Object.entries(initial).map(([category, budget]) => ({ category, budget: String(budget) })) : DEFAULT_BUDGET_ROWS
  );

  const addRow = () => setRows([...rows, { category: "", budget: "" }]);
  const updateRow = (i, field, value) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i));
  const valid = rows.filter((r) => r.category.trim() && parseFloat(r.budget) > 0);
  const total = valid.reduce((sum, r) => sum + parseFloat(r.budget), 0);

  const confirm = () => {
    const budgetMap = {};
    valid.forEach((r) => { budgetMap[r.category.trim()] = parseFloat(r.budget); });
    onDone(budgetMap);
  };

  return (
    <div style={S.overlay}>
      <div className="ss-scroll ss-fade" style={{ width: "100%", maxHeight: "100%", overflowY: "auto" }}>
        <div style={{ fontSize: "28px", marginBottom: "8px", textAlign: "center" }}>📊</div>
        <div style={{ color: "#fff", fontSize: "18px", fontWeight: 800, textAlign: "center", marginBottom: "4px" }}>Set your monthly budget</div>
        <div style={{ color: "#ffffff55", fontSize: "12px", textAlign: "center", marginBottom: "20px" }}>Pick categories and a monthly limit for each</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingRight: "28px" }}>
          <div style={{ ...S.label, flex: 2 }}>CATEGORY</div>
          <div style={{ ...S.label, flex: 1 }}>BUDGET ($)</div>
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
            <input value={row.category} onChange={(e) => updateRow(i, "category", e.target.value)} placeholder="e.g. Food" style={{ ...S.input, flex: 2 }} />
            <input type="number" value={row.budget} onChange={(e) => updateRow(i, "budget", e.target.value)} placeholder="0" min="0" style={{ ...S.input, flex: 1 }} />
            <button onClick={() => removeRow(i)} aria-label="Remove category" style={{ background: "none", border: "none", color: "#f87171", fontSize: "18px", cursor: "pointer", flexShrink: 0, padding: "0 4px" }}>×</button>
          </div>
        ))}
        <button onClick={addRow} style={{ background: "none", border: "1px dashed #2a2a4a", borderRadius: "12px", color: "#4ade80aa", fontSize: "12px", fontWeight: 700, cursor: "pointer", width: "100%", padding: "10px", fontFamily: "inherit", marginBottom: "16px" }}>
          + Add Category
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#ffffff88", fontSize: "12px", marginBottom: "4px" }}>
          <span>Monthly total</span><span style={{ color: "#fff", fontWeight: 700 }}>{money(total)}</span>
        </div>
        <button onClick={confirm} disabled={!valid.length} style={{ ...S.btn, opacity: valid.length ? 1 : 0.4 }}>
          ✓ Save Budget
        </button>
        {onCancel && <button onClick={onCancel} style={{ ...S.ghostBtn, marginTop: "8px", border: "none", background: "none", color: "#ffffff66" }}>Cancel</button>}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// ADD PURCHASE SHEET
// -------------------------------------------------------------------
function AddPurchaseModal({ categories, onAdd, onClose }) {
  const [category, setCategory] = useState(categories[0] || "");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const val = parseFloat(amount);
  const canSubmit = category && !isNaN(val) && val > 0;

  const submit = () => {
    if (!canSubmit) return;
    onAdd({ name: name.trim() || category, amount: val, category });
    onClose();
  };

  return (
    <div style={S.sheetBackdrop} onClick={onClose}>
      <div className="ss-sheet" style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ color: "#fff", fontSize: "16px", fontWeight: 800 }}>Add a purchase</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "#ffffff55", fontSize: "22px", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ ...S.label, color: "#ffffff88", marginBottom: "6px" }}>AMOUNT ($)</div>
        <input autoFocus type="number" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="0.00" min="0" step="0.01" style={{ ...S.input, marginBottom: "14px", fontSize: "22px", fontWeight: 700 }} />
        <div style={{ ...S.label, color: "#ffffff88", marginBottom: "6px" }}>WHAT WAS IT? (OPTIONAL)</div>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="e.g. Chipotle burrito bowl" style={{ ...S.input, marginBottom: "14px" }} />
        <div style={{ ...S.label, color: "#ffffff88", marginBottom: "8px" }}>CATEGORY</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
          {categories.map((c) => <button key={c} onClick={() => setCategory(c)} style={S.pill(category === c)}>{c}</button>)}
        </div>
        <button onClick={submit} disabled={!canSubmit} style={{ ...S.btn, marginTop: 0, opacity: canSubmit ? 1 : 0.4 }}>
          Add Purchase
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// MAP SCREEN
// -------------------------------------------------------------------
function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    let script = document.getElementById("leaflet-js");
    if (!script) {
      script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(window.L));
    script.addEventListener("error", reject);
  });
}

function dealPopupHtml(deal) {
  const meta = categoryMeta(deal.category);
  return `<div style="min-width:170px">
    <div style="color:${meta.color};font-size:9px;font-weight:700;letter-spacing:1px">${escapeHtml(meta.label.toUpperCase())} · ${escapeHtml(deal.distance_label)}</div>
    <div style="color:#fff;font-weight:800;font-size:13px;margin:2px 0 4px">${escapeHtml(deal.name)}</div>
    <div style="color:#cbd5e1">${escapeHtml(deal.deal)}</div>
    <div style="color:#4ade80;font-weight:700;margin-top:6px">💰 Save ${escapeHtml(deal.saving)}</div>
  </div>`;
}

function MapScreen({ deals, origin, selectedDeal, onSelectDeal, dealsLoading, onFindDeals }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const dealLayerRef = useRef(null);
  const markersRef = useRef({});
  const [status, setStatus] = useState("loading"); // loading | ready | denied | error
  const [here, setHere] = useState(null);

  // Create the map on the first location fix, then keep the "you" dot live with watchPosition
  useEffect(() => {
    let cancelled = false;
    let watchId = null;
    if (!navigator.geolocation) { setStatus("denied"); return; }

    loadLeaflet().then((L) => {
      if (cancelled) return;
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const ll = [pos.coords.latitude, pos.coords.longitude];
          setHere({ lat: ll[0], lng: ll[1], accuracy: Math.round(pos.coords.accuracy) });
          if (mapRef.current) { userMarkerRef.current.setLatLng(ll); return; }

          const map = L.map(mapEl.current, { center: ll, zoom: 15, zoomControl: false });
          // OpenStreetMap tiles, darkened in App.css (CARTO's dark tiles now need an API key)
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
          dealLayerRef.current = L.layerGroup().addTo(map);
          const userIcon = L.divIcon({ className: "", html: `<div class="ss-user-dot"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
          userMarkerRef.current = L.marker(ll, { icon: userIcon, zIndexOffset: 1000 }).addTo(map).bindPopup("<b>You are here</b>");
          mapRef.current = map;
          setStatus("ready");
        },
        () => { if (!mapRef.current) setStatus("denied"); },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
    }).catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Draw the search radius and one pin per deal whenever the deals change
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const layer = dealLayerRef.current;
    if (status !== "ready" || !L || !map || !layer) return;
    layer.clearLayers();
    markersRef.current = {};
    if (!deals.length) return;

    if (origin) {
      L.circle([origin.lat, origin.lng], { radius: DEAL_RADIUS_M, color: "#4ade80", weight: 1.5, opacity: 0.6, fillOpacity: 0.05, dashArray: "6 6", interactive: false }).addTo(layer);
    }
    deals.forEach((deal) => {
      const { color } = categoryMeta(deal.category);
      const icon = L.divIcon({ className: "", html: `<div class="ss-pin" style="--pin:${color}"><span>${deal.emoji}</span></div>`, iconSize: [32, 32], iconAnchor: [16, 16] });
      const marker = L.marker([deal.lat, deal.lng], { icon }).addTo(layer).bindPopup(dealPopupHtml(deal), { offset: [0, -10], maxWidth: 220, autoPanPadding: [16, 16] });
      marker.on("click", () => onSelectDeal(deal));
      markersRef.current[deal.id] = marker;
    });
    if (!selectedDeal) map.fitBounds(L.featureGroup(Object.values(markersRef.current)).getBounds(), { padding: [30, 30], maxZoom: 16 });
  }, [deals, origin, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to whichever deal was picked from the list, a pin, or the carousel
  useEffect(() => {
    const marker = selectedDeal && markersRef.current[selectedDeal.id];
    if (status !== "ready" || !marker) return;
    mapRef.current.once("moveend", () => marker.openPopup());
    mapRef.current.flyTo(marker.getLatLng(), 17, { duration: 0.6 });
    document.getElementById(`carousel-${selectedDeal.id}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedDeal, deals, status]);

  const recenter = () => here && mapRef.current?.flyTo([here.lat, here.lng], 16, { duration: 0.6 });
  const ctrlBtn = { width: "36px", height: "36px", borderRadius: "10px", background: "#13132aee", border: "1px solid #1e1e3a", color: "#4ade80", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "inherit" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minHeight: 0 }}>
      <div style={{ padding: "14px 20px 12px", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={S.label}>LIVE</div>
          <div style={{ color: "#fff", fontSize: "20px", fontWeight: 800, whiteSpace: "nowrap" }}>Deals Map</div>
        </div>
        <div style={{ textAlign: "right", minWidth: 0 }}>
          {deals.length > 0 && <div style={{ color: "#4ade80", fontSize: "12px", fontWeight: 700 }}>{deals.length} deals nearby</div>}
          {here && <div style={{ ...S.muted, fontFamily: "monospace", fontSize: "10px" }}>📍 {here.lat.toFixed(3)}, {here.lng.toFixed(3)} ±{here.accuracy}m</div>}
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", margin: "0 12px 12px", borderRadius: "20px", overflow: "hidden", border: "1px solid #1e1e3a" }}>
        <div ref={mapEl} className="ss-map" style={{ width: "100%", height: "100%" }} />

        {status === "loading" && <MapNotice icon="📡" text="Finding your location..." />}
        {status === "denied" && <MapNotice icon="📍" text="Location access is off" sub="Allow location in your browser to see deals around you." error />}
        {status === "error" && <MapNotice icon="🗺️" text="Couldn't load the map" sub="Check your internet connection." error />}

        {status === "ready" && (
          <>
            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: "6px", zIndex: 1000 }}>
              <button aria-label="Zoom in" onClick={() => mapRef.current.zoomIn()} style={ctrlBtn}>+</button>
              <button aria-label="Zoom out" onClick={() => mapRef.current.zoomOut()} style={ctrlBtn}>−</button>
              <button aria-label="Recenter on me" onClick={recenter} style={{ ...ctrlBtn, fontSize: "16px" }}>◎</button>
            </div>

            {deals.length === 0 && (
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 1000 }}>
                <button onClick={onFindDeals} disabled={dealsLoading} style={{ ...S.btn, marginTop: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", opacity: dealsLoading ? 0.7 : 1 }}>
                  {dealsLoading ? "Finding deals near you..." : "🎯 Find deals around me"}
                </button>
              </div>
            )}

            {deals.length > 0 && (
              <div className="ss-scroll" style={{ position: "absolute", left: 0, right: 0, bottom: 10, zIndex: 1000, display: "flex", gap: "8px", overflowX: "auto", padding: "0 12px", scrollSnapType: "x mandatory" }}>
                {deals.map((deal) => {
                  const active = selectedDeal?.id === deal.id;
                  const { color } = categoryMeta(deal.category);
                  return (
                    <div key={deal.id} id={`carousel-${deal.id}`} onClick={() => onSelectDeal(deal)} style={{ flex: "0 0 210px", scrollSnapAlign: "center", background: "#13132af2", border: `1px solid ${active ? color : "#1e1e3a"}`, borderRadius: "14px", padding: "10px 12px", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "18px" }}>{deal.emoji}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#fff", fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.name}</div>
                          <div style={{ color: "#4ade80", fontSize: "11px", fontWeight: 700 }}>Save {deal.saving} <span style={{ color: "#ffffff44", fontWeight: 400 }}>· {deal.distance_label}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MapNotice({ icon, text, sub, error }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0d0d1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", padding: "24px", zIndex: 1001, textAlign: "center" }}>
      <div style={{ fontSize: "32px" }}>{icon}</div>
      <div style={{ color: error ? "#f87171" : "#4ade80", fontSize: "13px", fontWeight: 700 }}>{text}</div>
      {sub && <div style={S.muted}>{sub}</div>}
    </div>
  );
}

// -------------------------------------------------------------------
// PROFILE SCREEN
// -------------------------------------------------------------------
function ProfileScreen({ userName, onRename, budgets, spending, transactions, deals, onEditBudget, onClearTransactions, onReset }) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName || "");

  const totalBudget = budgets ? Object.values(budgets).reduce((a, b) => a + b, 0) : 0;
  const totalSpent = Object.values(spending).reduce((a, b) => a + b, 0);
  const stats = [
    ["Monthly budget", budgets ? money(totalBudget) : "Not set"],
    ["Spent so far", money(totalSpent)],
    ["Transactions", transactions.length],
    ["Deals found", deals.length],
  ];

  const saveName = () => { if (tempName.trim()) { onRename(tempName.trim()); setEditingName(false); } };

  return (
    <div className="ss-scroll" style={S.scrollArea}>
      <div style={{ padding: "8px 20px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "22px" }}>
          <div style={{ ...S.avatar(72), fontSize: "30px", fontWeight: 800, color: "#080810", marginBottom: "12px", boxShadow: "0 0 0 3px #0d0d1a, 0 0 0 5px #4ade8044" }}>
            {(userName || "?").charAt(0).toUpperCase()}
          </div>
          {editingName ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} style={{ ...S.input, width: "150px", textAlign: "center", fontSize: "16px", fontWeight: 700 }} autoFocus />
              <button onClick={saveName} style={{ background: "#4ade80", border: "none", borderRadius: "8px", padding: "9px 12px", color: "#080810", fontWeight: 700, cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>Save</button>
            </div>
          ) : (
            <button onClick={() => { setTempName(userName || ""); setEditingName(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", color: "#fff", fontSize: "20px", fontWeight: 800 }}>
              {userName} <span style={{ fontSize: "12px", color: "#4ade8099" }}>✏️</span>
            </button>
          )}
        </div>

        <div style={{ ...S.label, marginBottom: "8px" }}>THIS MONTH</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
          {stats.map(([label, value]) => (
            <div key={label} style={{ ...S.card, marginBottom: 0 }}>
              <div style={{ ...S.muted, fontSize: "10px" }}>{label}</div>
              <div style={{ color: "#fff", fontSize: "18px", fontWeight: 800, marginTop: "2px" }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ ...S.label, marginBottom: "8px" }}>MANAGE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          <button onClick={onEditBudget} style={{ ...S.ghostBtn, textAlign: "left" }}>📊 {budgets ? "Edit budget" : "Set up budget"}</button>
          <button onClick={onClearTransactions} disabled={!transactions.length} style={{ ...S.ghostBtn, textAlign: "left", opacity: transactions.length ? 1 : 0.4 }}>🧾 Clear transactions</button>
          <button onClick={onReset} style={{ ...S.ghostBtn, textAlign: "left", color: "#f87171", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>↺ Start over</button>
        </div>

        <div style={{ textAlign: "center", ...S.muted, fontSize: "10px", lineHeight: 1.6 }}>
          StudentSteals · Built at HackCU 12<br />Deals from Google Places · AI by Google Gemini
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// DEALS TAB
// -------------------------------------------------------------------
function DealsTab({ deals, loading, error, origin, onFindDeals, onDealClick }) {
  const [filter, setFilter] = useState("all");

  // If the browser already has location permission, load deals right away
  useEffect(() => {
    if (deals.length || loading || error || !navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then((p) => p.state === "granted" && onFindDeals()).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = deals.reduce((acc, d) => ({ ...acc, [d.category]: (acc[d.category] || 0) + 1 }), {});
  const categories = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const filtered = filter === "all" ? deals : deals.filter((d) => d.category === filter);
  const openNow = deals.filter((d) => d.open_now).length;

  return (
    <div style={{ padding: "0 20px 20px" }}>
      {deals.length > 0 && !loading && (
        <div className="ss-fade" style={{ background: "linear-gradient(135deg, #13532d55, #15803d18)", border: "1px solid #4ade8033", borderRadius: "18px", padding: "14px 16px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ ...S.label, color: "#86efac" }}>STEALS NEAR YOU</div>
            <div style={{ color: "#fff", fontSize: "26px", fontWeight: 800, lineHeight: 1.1 }}>{deals.length} <span style={{ fontSize: "13px", color: "#ffffff88", fontWeight: 600 }}>places within 1 mi</span></div>
            <div style={{ ...S.muted, marginTop: "2px" }}>{openNow} open now{origin && ` · 📍 ${origin.lat.toFixed(3)}, ${origin.lng.toFixed(3)}`}</div>
          </div>
          <button onClick={onFindDeals} aria-label="Refresh deals" style={{ background: "#0d0d1a", border: "1px solid #4ade8044", borderRadius: "12px", color: "#4ade80", fontSize: "16px", cursor: "pointer", width: "38px", height: "38px" }}>↻</button>
        </div>
      )}

      {deals.length > 0 && !loading && (
        <div className="ss-scroll" style={{ display: "flex", gap: "6px", marginBottom: "12px", overflowX: "auto", paddingBottom: "2px" }}>
          <button style={S.pill(filter === "all")} onClick={() => setFilter("all")}>All {deals.length}</button>
          {categories.map((c) => {
            const meta = categoryMeta(c);
            return <button key={c} style={S.pill(filter === c, meta.color)} onClick={() => setFilter(c)}>{meta.label} {counts[c]}</button>;
          })}
        </div>
      )}

      {loading && (
        <div>
          <div style={{ textAlign: "center", color: "#4ade80", fontSize: "12px", fontWeight: 700, margin: "4px 0 14px" }}>
            📡 Searching nearby places and writing tips with Gemini...
          </div>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="ss-skeleton" style={{ height: "74px", marginBottom: "10px", animationDelay: `${i * 0.1}s` }} />)}
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "#2a1a1a", border: "1px solid #f8717133", borderRadius: "14px", padding: "16px", textAlign: "center" }}>
          <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "8px" }}>{error}</div>
          <button onClick={onFindDeals} style={{ ...S.btn, marginTop: "4px" }}>Try Again</button>
        </div>
      )}

      {!loading && !error && deals.length === 0 && (
        <div className="ss-fade" style={{ textAlign: "center", padding: "36px 0" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
          <div style={{ color: "#fff", fontSize: "16px", fontWeight: 800, marginBottom: "6px" }}>Find steals near you</div>
          <div style={{ color: "#ffffff55", fontSize: "12px", marginBottom: "22px", lineHeight: 1.5, padding: "0 10px" }}>
            We'll look for cafés, restaurants, grocery stores, bookstores, gyms and theaters within a mile, and Gemini will suggest how to save at each one.
          </div>
          <button onClick={onFindDeals} style={{ ...S.btn, width: "auto", padding: "12px 24px", marginTop: 0 }}>🎯 Find Nearby Deals</button>
        </div>
      )}

      {!loading && filtered.map((deal, i) => {
        const meta = categoryMeta(deal.category);
        const upTo = /^up to /i.test(deal.saving);
        return (
          <div key={deal.id} className="ss-fade ss-card-hover" onClick={() => onDealClick(deal)} style={{ ...S.card, cursor: "pointer", animationDelay: `${Math.min(i, 10) * 0.03}s` }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: `${meta.color}1a`, border: `1px solid ${meta.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>{deal.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.name}</div>
                <div style={{ color: "#cbd5e1", fontSize: "12px", marginTop: "3px", lineHeight: 1.4 }}>{deal.deal}</div>
                <div style={{ color: "#ffffff44", fontSize: "11px", marginTop: "4px" }}>
                  <span style={{ color: meta.color }}>{meta.label}</span> · {deal.distance_label}{deal.rating && ` · ⭐ ${deal.rating}`}{deal.open_now === true && " · 🟢 Open"}{deal.open_now === false && " · Closed"}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ color: "#ffffff44", fontSize: "9px", fontWeight: 700, letterSpacing: "1px" }}>{upTo ? "SAVE UP TO" : "SAVE"}</div>
                <div style={{ color: "#4ade80", fontWeight: 800, fontSize: "13px", whiteSpace: "nowrap" }}>{upTo ? deal.saving.slice(6) : deal.saving}</div>
              </div>
            </div>
          </div>
        );
      })}

      {!loading && deals.length > 0 && (
        <div style={{ ...S.muted, fontSize: "10px", textAlign: "center", marginTop: "6px" }}>Tips are AI suggestions. Ask in store to confirm discounts.</div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// AI COACH TAB
// -------------------------------------------------------------------
function CoachTab({ messages, setMessages, budgets, spending, transactions, deals, origin }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const totalSpent = Object.values(spending).reduce((a, b) => a + b, 0);
  const hasData = transactions.length > 0 || totalSpent > 0;

  const sendMessage = async (text) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;
    const history = [...messages.filter((m) => !m.error), { role: "user", text: userMsg }];
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const data = await postJSON("/coach", {
        messages: history,
        budgets: budgets || {},
        spending,
        transactions,
        nearby: deals.slice(0, 10).map((d) => ({ name: d.name, rating: d.rating })),
        ...(origin || {}),
      });
      setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Sorry, I couldn't answer that. ${friendlyError(e)}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = hasData
    ? ["Where is my money going?", "Which budget am I most likely to blow?", "Cheap dinner ideas near me?", "Plan my spending for next week"]
    : ["I have $30 left this week 😬", "How do I save on textbooks?", "Best cheap meals near campus?", "Help me make a budget"];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "0 20px" }}>
      <div style={{ ...S.card, padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: hasData ? "#86efac" : "#ffffff77", flexShrink: 0 }}>
        <span>{hasData ? "📈" : "💡"}</span>
        <span>{hasData
          ? `Coach can see your budget and ${money(totalSpent)} of spending${transactions.length ? ` across ${transactions.length} purchases` : ""}`
          : "Add purchases on the Budget tab so the coach can analyze your spending"}</span>
      </div>
      <div className="ss-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: "12px" }}>
        {messages.map((msg, i) => (
          <div key={i} className="ss-fade" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "10px" }}>
            {msg.role === "assistant" && <div style={{ ...S.avatar(28), marginRight: "8px", marginTop: "2px" }}>🤖</div>}
            <div className={msg.role === "assistant" ? "ss-md" : undefined} style={{ maxWidth: "80%", background: msg.role === "user" ? "linear-gradient(135deg, #4ade80, #22c55e)" : "#13132a", color: msg.role === "user" ? "#080810" : msg.error ? "#fca5a5" : "#e2e8f0", fontWeight: msg.role === "user" ? 600 : 400, borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: "13px", lineHeight: 1.55, border: msg.role === "assistant" ? "1px solid #1e1e3a" : "none" }}>
              {msg.role === "assistant" ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={S.avatar(28)}>🤖</div>
            <div style={{ background: "#13132a", border: "1px solid #1e1e3a", borderRadius: "18px 18px 18px 4px", padding: "12px 16px" }}>
              <span className="ss-typing"><i /><i /><i /></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.length === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
          {suggestions.map((s) => <button key={s} onClick={() => sendMessage(s)} style={S.pill(false)}>{s}</button>)}
        </div>
      )}
      <div style={{ display: "flex", gap: "8px", paddingBottom: "10px", flexShrink: 0 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Ask anything about money..." style={{ ...S.input, flex: 1, background: "#13132a", borderRadius: "14px", padding: "12px 14px" }} />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()} aria-label="Send" style={{ width: "44px", height: "44px", borderRadius: "14px", background: "linear-gradient(135deg, #4ade80, #22c55e)", border: "none", cursor: "pointer", fontSize: "18px", fontWeight: 800, color: "#080810", opacity: loading || !input.trim() ? 0.4 : 1, flexShrink: 0 }}>↑</button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// BUDGET TAB
// -------------------------------------------------------------------
function BudgetTab({ budgets, spending, transactions, onAddPurchase, onRemovePurchase, onLoadDemo, insights, setInsights }) {
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const demoLoaded = transactions.some((t) => t.source === "demo");

  // Demo only: loads sample transactions from public/purchases.txt. There is no real bank connection.
  const loadDemo = async () => {
    setLoadingDemo(true);
    try {
      const allPurchases = await loadPurchases();
      const selected = [...allPurchases].sort(() => Math.random() - 0.5).slice(0, 18);
      const today = new Date().getDate();
      const categorized = categorizeAllAtOnce(selected, Object.keys(budgets)).map((t) => ({
        ...t,
        date: new Date(new Date().setDate(1 + Math.floor(Math.random() * today))).toISOString(),
        source: "demo",
      }));
      onLoadDemo(categorized);
    } catch (e) {
      console.error("Demo load failed:", e);
    } finally {
      setLoadingDemo(false);
    }
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const data = await postJSON("/insights", { budgets, spending, transactions });
      setInsights(data.insights);
    } catch (e) {
      setInsights(`⚠️ ${friendlyError(e)}`);
    } finally {
      setLoadingInsights(false);
    }
  };

  const categories = Object.keys(budgets);
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const trackedSpent = categories.reduce((sum, c) => sum + (spending[c] || 0), 0);
  const otherSpent = spending["Other"] || 0;
  const moneyLeft = totalBudget - trackedSpent; // "Other" doesn't count against budget
  const isOver = moneyLeft < 0;
  const overallPct = totalBudget ? Math.min((trackedSpent / totalBudget) * 100, 100) : 0;
  const now = new Date();
  const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const visible = showAll ? recent : recent.slice(0, 5);

  return (
    <div style={{ padding: "0 20px 20px" }}>
      {/* Summary card */}
      <div style={{ background: isOver ? "linear-gradient(135deg, #53131355, #7f1d1d18)" : "linear-gradient(135deg, #13532d55, #15803d18)", border: `1px solid ${isOver ? "#f8717133" : "#4ade8033"}`, borderRadius: "18px", padding: "16px", marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ ...S.label, color: isOver ? "#fca5a5" : "#86efac" }}>{isOver ? "OVER BUDGET" : "MONEY LEFT"}</div>
            <div style={{ color: isOver ? "#f87171" : "#4ade80", fontSize: "32px", fontWeight: 800, lineHeight: 1.15 }}>{isOver ? `-${money(Math.abs(moneyLeft))}` : money(moneyLeft)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...S.label, color: "#86efac" }}>{now.toLocaleString("default", { month: "long" }).toUpperCase()}</div>
            <div style={{ color: "#ffffff88", fontSize: "11px", marginTop: "4px" }}>{transactions.length} purchases</div>
          </div>
        </div>
        <div style={{ background: "#0d0d1a88", borderRadius: "100px", height: "6px", margin: "12px 0 6px" }}>
          <div style={{ width: `${overallPct}%`, height: "100%", borderRadius: "100px", background: isOver ? "#f87171" : "#4ade80", transition: "width 0.6s ease" }} />
        </div>
        <div style={{ color: "#ffffff66", fontSize: "11px" }}>{money(trackedSpent)} spent of {money(totalBudget)}</div>
      </div>

      {/* Category bars */}
      {categories.map((key) => {
        const amount = spending[key] || 0;
        const budget = budgets[key];
        const pct = Math.min((amount / budget) * 100, 100);
        const over = amount > budget;
        return (
          <div key={key} style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ color: "#fff", fontWeight: 600, fontSize: "13px" }}>{key}</span>
              <span style={{ fontSize: "12px", color: over ? "#f87171" : "#ffffffaa" }}>{money(amount)} <span style={{ color: "#ffffff44" }}>/ {money(budget)}</span></span>
            </div>
            <div style={{ background: "#13132a", borderRadius: "100px", height: "8px" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: "100px", background: over ? "#f87171" : pct > 80 ? "#facc15" : "#4ade80", transition: "width 0.6s ease" }} />
            </div>
            {over && <div style={{ color: "#f87171", fontSize: "10px", marginTop: "3px" }}>⚠️ {money(amount - budget)} over budget</div>}
          </div>
        );
      })}

      {otherSpent > 0 && (
        <div style={{ marginBottom: "14px", paddingTop: "10px", borderTop: "1px dashed #1e1e3a", display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#ffffff77", fontWeight: 600, fontSize: "13px" }}>Other <span style={{ fontSize: "10px", color: "#ffffff44", fontWeight: 400 }}>(no matching budget)</span></span>
          <span style={{ fontSize: "12px", color: "#ffffff77" }}>{money(otherSpent)}</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", margin: "6px 0 10px" }}>
        <button onClick={() => setShowAddPurchase(true)} style={{ ...S.ghostBtn, flex: 1 }}>+ Add Purchase</button>
        {!demoLoaded && (
          <button onClick={loadDemo} disabled={loadingDemo} style={{ ...S.ghostBtn, flex: 1, color: "#4ade80", border: "1px solid #4ade8044" }}>
            {loadingDemo ? "Loading..." : "🧪 Load Demo Month"}
          </button>
        )}
      </div>
      {!demoLoaded && <div style={{ ...S.muted, fontSize: "10px", textAlign: "center", marginBottom: "10px" }}>The demo loads sample student purchases and auto-sorts them into your categories.</div>}

      <button onClick={fetchInsights} style={{ ...S.btn, opacity: loadingInsights || !transactions.length ? 0.5 : 1 }} disabled={loadingInsights || !transactions.length}>
        {loadingInsights ? "Analyzing your spending..." : insights ? "✨ Refresh AI Spending Report" : "✨ Get AI Spending Report"}
      </button>

      {insights && (
        <div className="ss-fade" style={{ ...S.card, marginTop: "10px", border: "1px solid #4ade8033" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={S.avatar(32)}>🤖</div>
            <div>
              <div style={{ ...S.label, letterSpacing: "1px" }}>AI SPENDING REPORT</div>
              <div style={{ ...S.muted, fontSize: "10px" }}>Gemini's read on your budget and purchases</div>
            </div>
          </div>
          <div className="ss-md" style={{ color: "#e2e8f0", fontSize: "13px", lineHeight: 1.65 }}>
            <ReactMarkdown>{insights}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Transactions */}
      {transactions.length > 0 && (
        <div style={{ marginTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={S.label}>RECENT PURCHASES</div>
            {transactions.length > 5 && <button onClick={() => setShowAll(!showAll)} style={{ background: "none", border: "none", color: "#4ade80", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>{showAll ? "Show less" : `Show all ${transactions.length}`}</button>}
          </div>
          <div style={{ ...S.card, padding: "4px 14px" }}>
            {visible.map((t) => (
              <div key={t.id} className="ss-row" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: "1px solid #1e1e3a" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#fff", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                  <div style={{ color: "#ffffff44", fontSize: "10px" }}>{new Date(t.date).toLocaleDateString("default", { month: "short", day: "numeric" })} · {t.category}{t.source === "demo" && " · demo"}</div>
                </div>
                <div style={{ color: "#ffffffbb", fontSize: "12px", fontWeight: 600 }}>-{money(t.amount)}</div>
                <button onClick={() => onRemovePurchase(t.id)} aria-label={`Remove ${t.name}`} style={{ background: "none", border: "none", color: "#ffffff33", cursor: "pointer", fontSize: "14px", padding: "0 2px" }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddPurchase && <AddPurchaseModal categories={categories} onAdd={onAddPurchase} onClose={() => setShowAddPurchase(false)} />}
    </div>
  );
}

// -------------------------------------------------------------------
// MAIN APP
// -------------------------------------------------------------------
const COACH_GREETING = { role: "assistant", text: "Hey! I'm your StudentSteals AI coach 👋 I can see your budget and spending, so ask me where your money's going or how to save this week." };

let nextTxId = 1;

export default function StudentSteals() {
  const [tab, setTab] = useState("deals");
  const [screen, setScreen] = useState("main");
  const [userName, setUserName] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [messages, setMessages] = useState([COACH_GREETING]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState(null);
  const [origin, setOrigin] = useState(null);

  // Spending is always derived from the transaction list
  const spending = useMemo(() => {
    const totals = {};
    Object.keys(budgets || {}).forEach((k) => { totals[k] = 0; });
    transactions.forEach(({ category, amount }) => { totals[category] = (totals[category] || 0) + amount; });
    return totals;
  }, [budgets, transactions]);

  // Free hosting puts the server to sleep when idle, so wake it as soon as the page opens
  useEffect(() => { fetch(`${BACKEND_URL}/health`).catch(() => {}); }, []);

  const findDeals = useCallback(() => {
    if (!navigator.geolocation) { setDealsError("Your browser doesn't support location."); return; }
    setDealsLoading(true);
    setDealsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigin(here);
        try {
          const data = await postJSON("/deals", { ...here, radius: DEAL_RADIUS_M });
          setDeals(data.deals || []);
          setSelectedDeal(null);
        } catch (e) {
          setDealsError(friendlyError(e));
        } finally {
          setDealsLoading(false);
        }
      },
      () => { setDealsError("Location access denied. Allow location in your browser to find deals."); setDealsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  const addTransactions = (items) => {
    const now = new Date().toISOString();
    setTransactions((prev) => [...prev, ...items.map((t) => ({ date: now, source: "manual", ...t, id: nextTxId++ }))]);
  };

  const handleBudgetDone = (budgetMap) => {
    setBudgets(budgetMap);
    setEditingBudget(false);
    // Re-file purchases whose category no longer exists
    setTransactions((prev) => prev.map((t) => (t.category in budgetMap ? t : { ...t, category: "Other" })));
  };

  const resetAll = () => {
    setUserName(null); setBudgets(null); setTransactions([]); setInsights(null); setMessages([COACH_GREETING]);
    setDeals([]); setOrigin(null); setSelectedDeal(null); setTab("deals"); setScreen("main");
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";
  const needsBudget = userName && ((tab === "budget" && screen === "main" && !budgets) || editingBudget);

  const navItem = (key, icon, label) => {
    const active = screen === key;
    return (
      <button onClick={() => setScreen(key)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", fontFamily: "inherit" }}>
        <div style={{ width: "44px", height: "40px", borderRadius: "14px", background: active ? "rgba(74,222,128,0.15)" : "transparent", border: `1px solid ${active ? "rgba(74,222,128,0.3)" : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px", transition: "all 0.2s" }}>{icon}</div>
        <div style={{ color: active ? "#4ade80" : "#ffffff44", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px" }}>{label}</div>
      </button>
    );
  };

  return (
    <div className="ss-stage">
      <aside className="ss-side">
        <div className="ss-side-kicker">BUILT AT HACKCU 12</div>
        <h1>Student<span>Steals</span></h1>
        <p className="ss-side-lede">The AI money app for college students. Find deals around you and get coaching based on how you actually spend.</p>
        <ul>
          <li><span>🗺️</span><div><b>Deals on a live map</b><br />Google Places finds cafés, food, groceries, books, gyms and theaters near you.</div></li>
          <li><span>🤖</span><div><b>An AI money coach</b><br />Gemini looks at your spending before it gives advice.</div></li>
          <li><span>📊</span><div><b>Budget tracking</b><br />Set limits, log purchases, and get a plain-English spending report.</div></li>
        </ul>
        <div className="ss-side-stack">React · Flask · Google Gemini · Google Places</div>
      </aside>

      <div className="ss-phone">

        {screen === "map" && (
          <MapScreen deals={deals} origin={origin} selectedDeal={selectedDeal} onSelectDeal={setSelectedDeal} dealsLoading={dealsLoading} onFindDeals={findDeals} />
        )}

        {screen === "profile" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "14px 20px 8px", flexShrink: 0 }}>
              <div style={S.label}>YOUR</div>
              <div style={{ color: "#fff", fontSize: "20px", fontWeight: 800 }}>Profile</div>
            </div>
            <ProfileScreen
              userName={userName}
              onRename={setUserName}
              budgets={budgets}
              spending={spending}
              transactions={transactions}
              deals={deals}
              onEditBudget={() => setEditingBudget(true)}
              onClearTransactions={() => { setTransactions([]); setInsights(null); }}
              onReset={resetAll}
            />
          </div>
        )}

        {screen === "main" && (
          <>
            <div style={{ padding: "10px 20px 14px", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "2px" }}>{greeting}</div>
                  <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800 }}>{userName ? `${userName} 👋` : "Welcome 👋"}</div>
                </div>
                <button onClick={() => setScreen("profile")} aria-label="Profile" style={{ ...S.avatar(42), border: "none", cursor: "pointer", fontSize: "18px", fontWeight: 800, color: "#080810", fontFamily: "inherit" }}>
                  {userName ? userName.charAt(0).toUpperCase() : "🎓"}
                </button>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[["deals", "🔥 Steals"], ["coach", "🤖 Coach"], ["budget", "📊 Budget"]].map(([key, label]) => (
                  <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>
                ))}
              </div>
            </div>
            {tab === "coach" ? (
              <CoachTab messages={messages} setMessages={setMessages} budgets={budgets} spending={spending} transactions={transactions} deals={deals} origin={origin} />
            ) : (
            <div className="ss-scroll" style={S.scrollArea}>
              {tab === "deals" && <DealsTab deals={deals} loading={dealsLoading} error={dealsError} origin={origin} onFindDeals={findDeals} onDealClick={(deal) => { setSelectedDeal(deal); setScreen("map"); }} />}
              {tab === "budget" && budgets && (
                <BudgetTab
                  budgets={budgets}
                  spending={spending}
                  transactions={transactions}
                  onAddPurchase={(t) => addTransactions([t])}
                  onRemovePurchase={(id) => setTransactions((prev) => prev.filter((t) => t.id !== id))}
                  onLoadDemo={addTransactions}
                  insights={insights}
                  setInsights={setInsights}
                />
              )}
            </div>
            )}
          </>
        )}

        {/* Bottom Nav */}
        <nav style={{ display: "flex", alignItems: "center", padding: "8px 20px 14px", background: "#0d0d1a", borderTop: "1px solid #1a1a2e", flexShrink: 0 }}>
          {navItem("map", "🗺️", "Map")}
          <button onClick={() => setScreen("main")} style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer", marginTop: "-18px", fontFamily: "inherit" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: screen === "main" ? "linear-gradient(135deg, #4ade80, #22c55e)" : "#13132a", border: screen === "main" ? "none" : "1px solid #2a2a4a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: screen === "main" ? "0 4px 20px rgba(74,222,128,0.4)" : "0 4px 12px rgba(0,0,0,0.4)", transition: "all 0.2s" }}>🏠</div>
            <div style={{ color: screen === "main" ? "#4ade80" : "#ffffff44", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px" }}>Home</div>
          </button>
          {navItem("profile", "👤", "Profile")}
        </nav>

        {/* Overlays */}
        {!userName && <NamePrompt onDone={setUserName} />}
        {needsBudget && <BudgetSetup initial={budgets} onDone={handleBudgetDone} onCancel={budgets ? () => setEditingBudget(false) : null} />}
      </div>
    </div>
  );
}