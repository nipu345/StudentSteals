import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const BACKEND_URL = "http://localhost:8080";
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || "";
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
  app: {
    fontFamily: "'Syne', sans-serif",
    background: "#080810",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },
  phone: {
    width: "375px",
    height: "800px",
    background: "#0d0d1a",
    borderRadius: "44px",
    overflow: "hidden",
    boxShadow: "0 0 0 2px #1a1a2e, 0 50px 100px rgba(0,0,0,0.9), 0 0 80px rgba(99,200,100,0.06)",
    display: "flex",
    flexDirection: "column",
  },
  scrollArea: { flex: 1, overflowY: "auto", scrollbarWidth: "none" },
  card: {
    background: "#13132a",
    borderRadius: "18px",
    padding: "14px",
    marginBottom: "10px",
    border: "1px solid #1e1e3a",
  },
  pill: (active) => ({
    padding: "5px 14px",
    borderRadius: "20px",
    border: `1px solid ${active ? "#4ade80" : "#1e1e3a"}`,
    background: active ? "#4ade8018" : "transparent",
    color: active ? "#4ade80" : "#ffffff33",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Syne', sans-serif",
    letterSpacing: "0.5px",
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
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(8,8,16,0.92)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px",
    zIndex: 100,
    borderRadius: "44px",
  },
};

// -------------------------------------------------------------------
// NAME PROMPT
// -------------------------------------------------------------------
function NamePrompt({ onDone }) {
  const [name, setName] = useState("");
  return (
    <div style={S.overlay}>
      <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎓</div>
      <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "2px", marginBottom: "6px" }}>WELCOME TO</div>
      <div style={{ color: "#fff", fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>
        Student<span style={{ color: "#4ade80" }}>Steals</span>
      </div>
      <div style={{ color: "#ffffff55", fontSize: "12px", marginBottom: "28px", textAlign: "center" }}>
        Your AI-powered student money coach
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
  );
}

// -------------------------------------------------------------------
// BUDGET SETUP
// -------------------------------------------------------------------
function BudgetSetup({ onDone }) {
  const [rows, setRows] = useState([
    { category: "Food", budget: "" },
    { category: "Subscriptions", budget: "" },
    { category: "Transport", budget: "" },
  ]);

  const addRow = () => setRows([...rows, { category: "", budget: "" }]);
  const updateRow = (i, field, value) => { const u = [...rows]; u[i][field] = value; setRows(u); };
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i));
  const canConfirm = rows.some((r) => r.category.trim() && parseFloat(r.budget) > 0);

  const confirm = () => {
    const valid = rows.filter((r) => r.category.trim() && parseFloat(r.budget) > 0);
    const budgetMap = {};
    valid.forEach((r) => { budgetMap[r.category.trim()] = parseFloat(r.budget); });
    onDone(budgetMap);
  };

  return (
    <div style={S.overlay}>
      <div style={{ width: "100%", maxHeight: "700px", overflowY: "auto", scrollbarWidth: "none" }}>
        <div style={{ fontSize: "28px", marginBottom: "8px", textAlign: "center" }}>📊</div>
        <div style={{ color: "#fff", fontSize: "16px", fontWeight: 800, textAlign: "center", marginBottom: "4px" }}>Set Your Monthly Budget</div>
        <div style={{ color: "#ffffff55", fontSize: "11px", textAlign: "center", marginBottom: "20px" }}>Add categories and how much you want to spend on each</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingRight: "28px" }}>
          <div style={{ flex: 2, color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "1px" }}>CATEGORY</div>
          <div style={{ flex: 1, color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "1px" }}>BUDGET ($)</div>
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
            <input value={row.category} onChange={(e) => updateRow(i, "category", e.target.value)} placeholder="e.g. Food" style={{ ...S.input, flex: 2 }} />
            <input type="number" value={row.budget} onChange={(e) => updateRow(i, "budget", e.target.value)} placeholder="0" min="0" style={{ ...S.input, flex: 1 }} />
            <button onClick={() => removeRow(i)} style={{ background: "none", border: "none", color: "#f87171", fontSize: "16px", cursor: "pointer", flexShrink: 0, padding: "0 2px" }}>×</button>
          </div>
        ))}
        <button onClick={addRow} style={{ background: "none", border: "1px dashed #1e1e3a", borderRadius: "12px", color: "#4ade8088", fontSize: "12px", fontWeight: 700, cursor: "pointer", width: "100%", padding: "10px", fontFamily: "'Syne', sans-serif", marginBottom: "16px" }}>
          + Add Category
        </button>
        <button onClick={confirm} disabled={!canConfirm} style={{ ...S.btn, opacity: canConfirm ? 1 : 0.4, marginTop: 0 }}>
          ✓ Confirm Budget
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// ADD PURCHASE MODAL
// -------------------------------------------------------------------
function AddPurchaseModal({ categories, onAdd, onClose }) {
  const [category, setCategory] = useState(categories[0] || "");
  const [amount, setAmount] = useState("");

  const submit = () => {
    const val = parseFloat(amount);
    if (!category || isNaN(val) || val <= 0) return;
    onAdd(category, val);
    onClose();
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(8,8,16,0.88)", display: "flex", alignItems: "flex-end", zIndex: 200, borderRadius: "44px" }}>
      <div style={{ width: "100%", background: "#13132a", borderRadius: "24px 24px 0 0", padding: "24px 20px 32px", border: "1px solid #1e1e3a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ color: "#fff", fontSize: "16px", fontWeight: 800 }}>Add Purchase</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff55", fontSize: "20px", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ color: "#ffffff88", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", marginBottom: "6px" }}>CATEGORY</div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...S.input, marginBottom: "14px", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%234ade80'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px", cursor: "pointer" }}>
          {categories.map((c) => <option key={c} value={c} style={{ background: "#13132a" }}>{c}</option>)}
        </select>
        <div style={{ color: "#ffffff88", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", marginBottom: "6px" }}>AMOUNT ($)</div>
        <input autoFocus type="number" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="0.00" min="0" step="0.01" style={{ ...S.input, marginBottom: "18px", fontSize: "20px", fontWeight: 700 }} />
        <button onClick={submit} disabled={!amount || parseFloat(amount) <= 0} style={{ ...S.btn, marginTop: 0, opacity: amount && parseFloat(amount) > 0 ? 1 : 0.4 }}>
          Add Purchase
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// MAP SCREEN
// -------------------------------------------------------------------
function MapScreen({ selectedDeal }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [status, setStatus] = useState("loading");
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const loadLeaflet = () => new Promise((resolve) => {
      if (window.L) return resolve(window.L);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve(window.L);
      document.head.appendChild(script);
    });

    const initMap = async (lat, lng) => {
      const L = await loadLeaflet();
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = L.map(mapRef.current, { center: [lat, lng], zoom: 15, zoomControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "© OpenStreetMap © CARTO", maxZoom: 19 }).addTo(map);

      // Green dot for user location
      const greenDot = L.divIcon({ className: "", html: `<div style="width:18px;height:18px;border-radius:50%;background:#4ade80;border:3px solid #fff;box-shadow:0 0 0 4px rgba(74,222,128,0.3),0 0 20px rgba(74,222,128,0.5);"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
      L.marker([lat, lng], { icon: greenDot }).addTo(map).bindPopup("<b>You are here</b>");
      mapInstanceRef.current = map;
      setStatus("success");
      setCoords({ lat: lat.toFixed(4), lng: lng.toFixed(4) });

      // Fetch deals and place markers
      try {
        const res = await fetch("http://localhost:8080/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat, lng }) });
        const data = await res.json();
        if (!data.deals) return;
        data.deals.forEach((deal) => {
          const dealIcon = L.divIcon({ className: "", html: `<div style="background:#4ade80;color:#000;padding:4px 6px;border-radius:8px;font-size:12px;font-weight:700;">${deal.emoji}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
          const marker = L.marker([deal.lat, deal.lng], { icon: dealIcon }).addTo(map).bindPopup(`<b>${deal.name}</b><br/>${deal.deal}<br/>💰 Save ${deal.saving}`);
          markersRef.current[deal.id] = marker;
        });
      } catch (e) { console.error("Failed to load deal markers:", e); }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => initMap(pos.coords.latitude, pos.coords.longitude),
      () => setStatus("denied")
    );
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  // Fly to selected deal — retry until marker is placed on map
  useEffect(() => {
    if (!selectedDeal) return;
    let attempts = 0;
    const interval = setInterval(() => {
      const marker = markersRef.current[selectedDeal.id];
      const map = mapInstanceRef.current;
      if (marker && map) {
        map.setView(marker.getLatLng(), 17);
        marker.openPopup();
        clearInterval(interval);
      }
      if (++attempts > 30) clearInterval(interval); // give up after 3s
    }, 100);
    return () => clearInterval(interval);
  }, [selectedDeal]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ padding: "16px 20px 12px", flexShrink: 0 }}>
        <div style={{ color: "#fff", fontSize: "20px", fontWeight: 800 }}>Nearby Map</div>
        {coords && <div style={{ color: "#4ade8088", fontSize: "11px", marginTop: "2px", fontFamily: "monospace" }}>📍 {coords.lat}, {coords.lng}</div>}
      </div>
      <div style={{ flex: 1, position: "relative", margin: "0 12px 12px", borderRadius: "20px", overflow: "hidden", border: "1px solid #1e1e3a" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        {status === "loading" && <div style={{ position: "absolute", inset: 0, background: "#0d0d1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", zIndex: 10 }}><div style={{ fontSize: "32px" }}>📡</div><div style={{ color: "#4ade80", fontSize: "13px", fontWeight: 700 }}>Finding your location...</div></div>}
        {status === "denied" && <div style={{ position: "absolute", inset: 0, background: "#0d0d1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "24px", zIndex: 10 }}><div style={{ fontSize: "32px" }}>📍</div><div style={{ color: "#f87171", fontSize: "13px", fontWeight: 700, textAlign: "center" }}>Location access denied</div></div>}
        {status === "success" && mapInstanceRef.current && (
          <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: "4px", zIndex: 1000 }}>
            {["+", "−"].map((label, i) => <button key={i} onClick={() => i === 0 ? mapInstanceRef.current.zoomIn() : mapInstanceRef.current.zoomOut()} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#13132a", border: "1px solid #1e1e3a", color: "#4ade80", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{label}</button>)}
          </div>
        )}
        {status === "success" && <button onClick={() => { navigator.geolocation.getCurrentPosition((pos) => { mapInstanceRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 15); }); }} style={{ position: "absolute", bottom: 16, left: 16, zIndex: 1000, background: "#13132a", border: "1px solid #4ade8044", borderRadius: "10px", color: "#4ade80", fontSize: "11px", fontWeight: 700, padding: "8px 12px", cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>◎ Recenter</button>}
      </div>
    </div>
  );
}


// -------------------------------------------------------------------
// PROFILE SCREEN
// -------------------------------------------------------------------
function ProfileScreen({ userName }) {
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(userName || "Student");
  const [tempName, setTempName] = useState(userName || "Student");
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const ToggleSwitch = ({ value, onChange }) => (
    <div onClick={() => onChange(!value)} style={{ width: "44px", height: "24px", borderRadius: "100px", background: value ? "#4ade80" : "#1e1e3a", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: "3px", left: value ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
    </div>
  );

  const SettingRow = ({ icon, label, sublabel, children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 0", borderBottom: "1px solid #1e1e3a" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#13132a", border: "1px solid #1e1e3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#fff", fontSize: "13px", fontWeight: 600 }}>{label}</div>
        {sublabel && <div style={{ color: "#ffffff44", fontSize: "11px", marginTop: "1px" }}>{sublabel}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ padding: "16px 20px 80px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", marginBottom: "12px", boxShadow: "0 0 0 3px #0d0d1a, 0 0 0 5px #4ade8044" }}>🎓</div>
          {editingName ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input value={tempName} onChange={(e) => setTempName(e.target.value)} style={{ ...S.input, width: "140px", textAlign: "center", fontSize: "16px", fontWeight: 700 }} autoFocus />
              <button onClick={() => { setDisplayName(tempName); setEditingName(false); }} style={{ background: "#4ade80", border: "none", borderRadius: "8px", padding: "8px 12px", color: "#080810", fontWeight: 700, cursor: "pointer", fontSize: "12px", fontFamily: "'Syne', sans-serif" }}>Save</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ color: "#fff", fontSize: "20px", fontWeight: 800 }}>{displayName}</div>
              <button onClick={() => { setTempName(displayName); setEditingName(true); }} style={{ background: "none", border: "none", color: "#4ade8088", fontSize: "12px", cursor: "pointer" }}>✏️</button>
            </div>
          )}
          <div style={{ color: "#4ade8088", fontSize: "11px", marginTop: "4px", fontFamily: "monospace" }}>student@university.edu</div>
        </div>
        <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", marginBottom: "4px" }}>ACCOUNT</div>
        <div style={{ background: "#13132a", borderRadius: "16px", padding: "0 14px", border: "1px solid #1e1e3a", marginBottom: "16px" }}>
          <SettingRow icon="🔒" label="Change Password" sublabel="Last changed 30 days ago"><div style={{ color: "#ffffff33", fontSize: "18px" }}>›</div></SettingRow>
          <SettingRow icon="📧" label="Change Email" sublabel="student@university.edu"><div style={{ color: "#ffffff33", fontSize: "18px" }}>›</div></SettingRow>
          <SettingRow icon="🎓" label="University" sublabel="Not set"><div style={{ color: "#ffffff33", fontSize: "18px" }}>›</div></SettingRow>
        </div>
        <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", marginBottom: "4px" }}>PREFERENCES</div>
        <div style={{ background: "#13132a", borderRadius: "16px", padding: "0 14px", border: "1px solid #1e1e3a", marginBottom: "16px" }}>
          <SettingRow icon="🔔" label="Deal Notifications" sublabel="Get alerted on new nearby deals"><ToggleSwitch value={notifications} onChange={setNotifications} /></SettingRow>
          <SettingRow icon="📍" label="Location Sharing" sublabel="Needed for nearby deals"><ToggleSwitch value={locationSharing} onChange={setLocationSharing} /></SettingRow>
          <SettingRow icon="🌙" label="Dark Mode" sublabel="Always on (recommended)"><ToggleSwitch value={darkMode} onChange={setDarkMode} /></SettingRow>
        </div>
        <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", marginBottom: "4px" }}>ABOUT</div>
        <div style={{ background: "#13132a", borderRadius: "16px", padding: "0 14px", border: "1px solid #1e1e3a", marginBottom: "16px" }}>
          <SettingRow icon="ℹ️" label="App Version" sublabel="v1.0.0 — StudentSteals"><div style={{ color: "#4ade80", fontSize: "11px", fontWeight: 700 }}>Latest</div></SettingRow>
          <SettingRow icon="⭐" label="Rate the App" sublabel="Help us improve"><div style={{ color: "#ffffff33", fontSize: "18px" }}>›</div></SettingRow>
          <SettingRow icon="💬" label="Send Feedback" sublabel=""><div style={{ color: "#ffffff33", fontSize: "18px" }}>›</div></SettingRow>
        </div>
        <button style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// BANK LOGIN FORM
// -------------------------------------------------------------------
function BankLoginForm({ bankName, onSubmit, onClose }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountNum, setAccountNum] = useState("");
  const [routingNum, setRoutingNum] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [showPass, setShowPass] = useState(false);
  const canSubmit = username.trim() && password.trim() && accountNum.length === 4 && routingNum.length === 9;

  const fieldStyle = { background: "#0d0d1a", border: "1px solid #1e1e3a", borderRadius: "12px", padding: "11px 14px", color: "#fff", fontSize: "13px", fontFamily: "'Syne', sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };
  const labelStyle = { color: "#ffffff66", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", marginBottom: "6px" };

  return (
    <div style={{ maxHeight: "520px", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div>
          <div style={{ color: "#fff", fontSize: "16px", fontWeight: 800 }}>Sign in to {bankName}</div>
          <div style={{ color: "#ffffff44", fontSize: "11px", marginTop: "2px" }}>Enter your online banking credentials</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff44", fontSize: "22px", cursor: "pointer" }}>×</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px", marginTop: "6px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80" }} />
        <div style={{ color: "#4ade8088", fontSize: "10px", fontWeight: 700, letterSpacing: "1px" }}>SECURED BY PLAID · READ-ONLY ACCESS</div>
      </div>

      <div style={labelStyle}>ONLINE BANKING USERNAME</div>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" autoComplete="off" style={{ ...fieldStyle, marginBottom: "12px" }} />

      <div style={labelStyle}>PASSWORD</div>
      <div style={{ position: "relative", marginBottom: "12px" }}>
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" type={showPass ? "text" : "password"} style={{ ...fieldStyle, paddingRight: "40px" }} />
        <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#ffffff44", cursor: "pointer", fontSize: "14px" }}>
          {showPass ? "🙈" : "👁️"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>ACCOUNT NUMBER (last 4)</div>
          <input value={accountNum} onChange={(e) => setAccountNum(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="••••" maxLength={4} style={{ ...fieldStyle, letterSpacing: "6px", fontSize: "16px" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>ROUTING NUMBER</div>
          <input value={routingNum} onChange={(e) => setRoutingNum(e.target.value.replace(/[^0-9]/g, "").slice(0, 9))} placeholder="9 digits" maxLength={9} style={{ ...fieldStyle, fontSize: "13px" }} />
        </div>
      </div>

      <div style={labelStyle}>ACCOUNT TYPE</div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["checking", "savings"].map((type) => (
          <button key={type} onClick={() => setAccountType(type)} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: `1px solid ${accountType === type ? "#4ade80" : "#1e1e3a"}`, background: accountType === type ? "#4ade8018" : "#0d0d1a", color: accountType === type ? "#4ade80" : "#ffffff44", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "'Syne', sans-serif", textTransform: "capitalize" }}>
            {type === "checking" ? "🏧 Checking" : "🏦 Savings"}
          </button>
        ))}
      </div>

      <button onClick={onSubmit} disabled={!canSubmit} style={{ background: canSubmit ? "linear-gradient(135deg, #4ade80, #22c55e)" : "#1e1e3a", border: "none", borderRadius: "14px", padding: "13px 20px", color: canSubmit ? "#080810" : "#ffffff33", fontWeight: 700, fontSize: "13px", cursor: canSubmit ? "pointer" : "default", fontFamily: "'Syne', sans-serif", width: "100%" }}>
        Connect Account →
      </button>
      <div style={{ textAlign: "center", color: "#ffffff22", fontSize: "10px", marginTop: "10px" }}>
        🔒 Your credentials are encrypted and never stored
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// DEALS TAB
// -------------------------------------------------------------------
function DealsTab({ onDealClick }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [locationLabel, setLocationLabel] = useState(null);

  const fetchDeals = () => {
    setLoading(true); setError(null);
    if (!navigator.geolocation) { setError("Geolocation not supported."); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        try {
          const res = await fetch(`${BACKEND_URL}/deals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: latitude, lng: longitude, radius: 1500 }) });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          setDeals(data.deals || []);
        } catch (e) { setError(e.message); } finally { setLoading(false); }
      },
      () => { setError("Location access denied."); setLoading(false); }
    );
  };

  useEffect(() => { fetchDeals(); }, []);

  const categories = ["all", ...new Set(deals.map((d) => d.category))];
  const filtered = filter === "all" ? deals : deals.filter((d) => d.category === filter);

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ color: "#ffffff44", fontSize: "11px" }}>{locationLabel ? `📍 ${locationLabel}` : "📍 Locating..."}</div>
        <button onClick={fetchDeals} style={{ background: "none", border: "none", color: "#4ade80", fontSize: "11px", cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>↻ Refresh</button>
      </div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "4px" }}>
        {categories.map((c) => <button key={c} style={S.pill(filter === c)} onClick={() => setFilter(c)}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>)}
      </div>
      {loading && <div style={{ textAlign: "center", color: "#4ade80", padding: "40px 0" }}><div style={{ fontSize: "28px", marginBottom: "8px" }}>📡</div><div style={{ fontSize: "13px" }}>Finding deals near you...</div></div>}
      {error && <div style={{ background: "#2a1a1a", border: "1px solid #f8717133", borderRadius: "14px", padding: "16px", textAlign: "center" }}><div style={{ color: "#f87171", fontSize: "13px", marginBottom: "8px" }}>{error}</div><button onClick={fetchDeals} style={{ ...S.btn, marginTop: "4px" }}>Try Again</button></div>}
      {!loading && !error && filtered.length === 0 && <div style={{ textAlign: "center", color: "#ffffff33", padding: "40px 0", fontSize: "13px" }}>No deals found nearby.</div>}
      {!loading && filtered.map((deal, i) => (
        <div key={deal.id || i} onClick={() => onDealClick && onDealClick(deal)} style={{ ...S.card, border: i < 3 ? "1px solid #4ade8022" : "1px solid #1e1e3a", cursor: "pointer" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>{deal.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>{deal.name}</div>
              <div style={{ color: "#4ade8099", fontSize: "12px", marginTop: "2px" }}>{deal.deal}</div>
              <div style={{ color: "#ffffff33", fontSize: "11px", marginTop: "3px" }}>📍 {deal.distance_label} away{deal.rating && ` · ⭐ ${deal.rating}`}{deal.open_now === true && " · 🟢 Open"}{deal.open_now === false && " · 🔴 Closed"}</div>
            </div>
            <div style={{ color: "#4ade80", fontWeight: 700, fontSize: "15px", flexShrink: 0 }}>-{deal.saving}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------
// AI COACH TAB
// -------------------------------------------------------------------
function CoachTab({ spending }) {
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hey! I'm your StudentSteals AI coach 👋 Ask me anything about saving money as a student." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const res = await fetch(`${BACKEND_URL}/coach`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg, spending, lat: pos.coords.latitude, lng: pos.coords.longitude }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
        setLoading(false);
      }, async () => {
        const res = await fetch(`${BACKEND_URL}/coach`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg, spending }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
        setLoading(false);
      });
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Sorry, something went wrong: ${e.message}` }]);
      setLoading(false);
    }
  };

  const suggestions = ["I have $30 left this week 😬", "How do I save on textbooks?", "Best cheap meals near campus?", "Help me stick to my budget"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 20px" }}>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", paddingBottom: "12px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "10px" }}>
            {msg.role === "assistant" && <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", marginRight: "8px", flexShrink: 0, marginTop: "2px" }}>🤖</div>}
            <div style={{ maxWidth: "75%", background: msg.role === "user" ? "linear-gradient(135deg, #4ade80, #22c55e)" : "#13132a", color: msg.role === "user" ? "#080810" : "#e2e8f0", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: "13px", lineHeight: 1.6, border: msg.role === "assistant" ? "1px solid #1e1e3a" : "none" }}>
              {msg.role === "assistant" ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🤖</div>
            <div style={{ background: "#13132a", border: "1px solid #1e1e3a", borderRadius: "18px 18px 18px 4px", padding: "10px 16px", color: "#4ade80", fontSize: "13px" }}>typing...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.length === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
          {suggestions.map((s, i) => <button key={i} onClick={() => setInput(s)} style={{ ...S.pill(false), fontSize: "11px" }}>{s}</button>)}
        </div>
      )}
      <div style={{ display: "flex", gap: "8px", paddingBottom: "8px" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Ask anything about money..." style={{ flex: 1, background: "#13132a", border: "1px solid #1e1e3a", borderRadius: "14px", padding: "11px 14px", color: "#fff", fontSize: "13px", fontFamily: "'Syne', sans-serif", outline: "none" }} />
        <button onClick={sendMessage} disabled={loading} style={{ width: "44px", height: "44px", borderRadius: "14px", background: "linear-gradient(135deg, #4ade80, #22c55e)", border: "none", cursor: "pointer", fontSize: "18px", opacity: loading ? 0.5 : 1 }}>↑</button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// BUDGET TAB
// -------------------------------------------------------------------
function BudgetTab({ budgets, spending, onAddPurchase, onBankSync }) {
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [bankConnected, setBankConnected] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginStep, setLoginStep] = useState("form"); // "form" | "loading" | "syncing"
  const [syncStatus, setSyncStatus] = useState(null); // null | "syncing" | "done"
  const [syncedTransactions, setSyncedTransactions] = useState([]);

  // ── BANK SYNC WITH AI CATEGORIZATION ──────────────────────────────
  const connectBank = async (bankName) => {
    setShowBankModal(false);
    setSelectedBank(bankName);
    setShowLoginModal(true);
    setLoginStep("form");
  };

  const submitBankLogin = async () => {
    setLoginStep("loading");
    await new Promise((r) => setTimeout(r, 2200));
    setLoginStep("syncing");
    await new Promise((r) => setTimeout(r, 1800));
    setShowLoginModal(false);
    setSyncStatus("syncing");
    setSyncedTransactions([]);
    const bankName = selectedBank;

    try {
      // 1. Load purchases from the txt file
      const allPurchases = await loadPurchases();

      // 2. Pick a random slice of 12–18 purchases to simulate a month
      const shuffled = allPurchases.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 18);

      // 3. Categorize locally using keyword matching
      const userCategories = Object.keys(budgets);
      const categorized = categorizeAllAtOnce(selected, userCategories);

      // Show them appearing one by one visually
      for (const item of categorized) {
        setSyncedTransactions((prev) => [...prev, item]);
        await new Promise((r) => setTimeout(r, 100));
      }

      // 5. Tally up totals per category (including "Other")
      const totals = {};
      categorized.forEach(({ category, amount }) => {
        totals[category] = (totals[category] || 0) + amount;
      });

      // 5. Send to parent to update spending state
      onBankSync(totals, bankName);
      setBankConnected(bankName);
      setSyncStatus("done");

    } catch (e) {
      console.error("Bank sync failed:", e);
      setSyncStatus(null);
    }
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    setInsights(null);
    try {
      const res = await fetch(`${BACKEND_URL}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgets,
          spending,
          transactions: syncedTransactions,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInsights(data.insights);
    } catch (e) {
      setInsights("Something went wrong. Make sure your backend is running.");
    } finally {
      setLoadingInsights(false);
    }
  };

  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const otherSpent = spending["Other"] || 0;
  const totalSpent = Object.values(spending).reduce((a, b) => a + b, 0);
  const moneyLeft = totalBudget - (totalSpent - otherSpent); // "Other" doesn't count against budget
  const isOverall = moneyLeft < 0;
  const categories = Object.keys(budgets);
  const now = new Date();

  return (
    <div style={{ padding: "0 20px 20px", position: "relative" }}>

      {/* Summary card */}
      <div style={{ background: isOverall ? "linear-gradient(135deg, #53131333, #7f1d1d18)" : "linear-gradient(135deg, #13532d33, #15803d18)", border: `1px solid ${isOverall ? "#f8717133" : "#4ade8033"}`, borderRadius: "18px", padding: "16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ color: isOverall ? "#fca5a5" : "#86efac", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px" }}>{isOverall ? "OVER BUDGET" : "MONEY LEFT"}</div>
            <div style={{ color: "#ffffff33", fontSize: "10px", fontWeight: 400 }}>across your budget</div>
        </div>
          <div style={{ color: isOverall ? "#f87171" : "#4ade80", fontSize: "30px", fontWeight: 700 }}>{isOverall ? `-$${Math.abs(moneyLeft).toFixed(2)}` : `$${moneyLeft.toFixed(2)}`}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#86efac", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px" }}>THIS MONTH</div>
          <div style={{ color: "#fff", fontSize: "13px", marginTop: "4px" }}>{now.toLocaleString("default", { month: "long" })} {now.getFullYear()}</div>
        </div>
      </div>

      {/* User budget category bars */}
      {categories.map((key) => {
        const amount = spending[key] || 0;
        const budget = budgets[key];
        const pct = Math.min((amount / budget) * 100, 100);
        const over = amount > budget;
        return (
          <div key={key} style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ color: "#fff", fontWeight: 600, fontSize: "13px" }}>{key}</span>
              <span style={{ fontSize: "12px", color: over ? "#f87171" : "#ffffff66" }}>${amount.toFixed(2)} <span style={{ color: "#ffffff33" }}>/ ${budget.toFixed(2)}</span></span>
            </div>
            <div style={{ background: "#13132a", borderRadius: "100px", height: "7px" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: "100px", background: over ? "#f87171" : pct > 80 ? "#facc15" : "#4ade80", transition: "width 0.6s ease" }} />
            </div>
            {over && <div style={{ color: "#f87171", fontSize: "10px", marginTop: "3px" }}>⚠️ ${(amount - budget).toFixed(2)} over budget</div>}
          </div>
        );
      })}

      {/* "Other" category — only shown if AI put anything there */}


      {/* "Other" category — only shown if anything landed there */}
      {(spending["Other"] || 0) > 0 && (
        <div style={{ marginBottom: "14px", paddingTop: "10px", borderTop: "1px dashed #1e1e3a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ color: "#ffffff66", fontWeight: 600, fontSize: "13px" }}>Other <span style={{ fontSize: "10px", color: "#ffffff33", fontWeight: 400 }}>(uncategorized)</span></span>
            <span style={{ fontSize: "12px", color: "#ffffff44" }}>${(spending["Other"] || 0).toFixed(2)}</span>
          </div>
          <div style={{ background: "#13132a", borderRadius: "100px", height: "7px" }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "100px", background: "#ffffff22" }} />
          </div>
          {syncedTransactions.filter((t) => t.category === "Other").map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
              <span style={{ color: "#ffffff33", fontSize: "11px" }}>· {t.name}</span>
              <span style={{ color: "#ffffff33", fontSize: "11px" }}>${t.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Syncing UI — live transaction feed */}
      {syncStatus === "syncing" && (
        <div style={{ background: "#13132a", border: "1px solid #4ade8033", borderRadius: "16px", padding: "14px", marginBottom: "12px" }}>
          <div style={{ color: "#4ade80", fontSize: "12px", fontWeight: 700, marginBottom: "10px" }}>
            📡 Syncing transactions...
          </div>
          {syncedTransactions.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #1e1e3a11", animation: "fadeIn 0.3s ease" }}>
              <div>
                <span style={{ color: "#fff", fontSize: "12px" }}>{t.name}</span>
                <span style={{ color: "#4ade8077", fontSize: "10px", marginLeft: "8px" }}>→ {t.category}</span>
              </div>
              <span style={{ color: "#ffffff55", fontSize: "12px" }}>-${t.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bank connect / connected badge */}
      {!bankConnected ? (
        <button onClick={() => setShowBankModal(true)} style={{ width: "100%", padding: "13px", borderRadius: "14px", marginBottom: "10px", background: "linear-gradient(135deg, #13132a, #1a1a2e)", border: "1px solid #4ade8055", color: "#4ade80", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          🏦 Connect Bank Account
        </button>
      ) : (
        <div style={{ background: "#13132a", border: "1px solid #4ade8033", borderRadius: "14px", padding: "12px 14px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#4ade80", fontSize: "12px", fontWeight: 700 }}>🏦 {bankConnected}</div>
            <div style={{ color: "#ffffff44", fontSize: "10px", marginTop: "2px" }}>
              {syncedTransactions.length} transactions synced · AI categorized
            </div>
          </div>
          <div style={{ color: "#4ade80", fontSize: "18px" }}>✓</div>
        </div>
      )}

      {/* Add Purchase manually */}
      <button onClick={() => setShowAddPurchase(true)} style={{ width: "100%", padding: "12px", borderRadius: "14px", marginBottom: "10px", background: "#13132a", border: "1px solid #1e1e3a", color: "#ffffff66", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>
        + Add Purchase Manually
      </button>

      {/* AI Spending Insights */}
      <button onClick={fetchInsights} style={S.btn} disabled={loadingInsights}>
        {loadingInsights ? "Analyzing your spending..." : "✨ Get AI Spending Insights"}
      </button>

      {insights && (
        <div style={{ ...S.card, marginTop: "10px", border: "1px solid #4ade8033" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🤖</div>
            <div>
              <div style={{ color: "#4ade80", fontSize: "11px", fontWeight: 700, letterSpacing: "1px" }}>AI SPENDING INSIGHTS</div>
              <div style={{ color: "#ffffff44", fontSize: "10px" }}>Based on your recent transactions</div>
            </div>
          </div>
          <div style={{ color: "#e2e8f0", fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            <ReactMarkdown>{insights}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddPurchase && <AddPurchaseModal categories={categories} onAdd={onAddPurchase} onClose={() => setShowAddPurchase(false)} />}

      {showLoginModal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(8,8,16,0.95)", display: "flex", alignItems: "flex-end", zIndex: 300, borderRadius: "44px" }}>
          <div style={{ width: "100%", background: "#13132a", borderRadius: "24px 24px 0 0", padding: "28px 20px 36px", border: "1px solid #1e1e3a" }}>
            {loginStep === "form" && <BankLoginForm bankName={selectedBank} onSubmit={submitBankLogin} onClose={() => setShowLoginModal(false)} />}
            {loginStep === "loading" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "16px" }}>🔐</div>
                <div style={{ color: "#fff", fontSize: "15px", fontWeight: 800, marginBottom: "8px" }}>Verifying credentials...</div>
                <div style={{ color: "#ffffff44", fontSize: "12px", marginBottom: "24px" }}>Connecting to {selectedBank}</div>
                <div style={{ width: "100%", height: "4px", background: "#1e1e3a", borderRadius: "100px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg, #4ade80, #22c55e)", borderRadius: "100px", animation: "loadbar 2.2s ease forwards", width: "0%" }} />
                </div>
                <style>{`@keyframes loadbar { from { width: 0% } to { width: 100% } }`}</style>
              </div>
            )}
            {loginStep === "syncing" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "16px" }}>🏦</div>
                <div style={{ color: "#4ade80", fontSize: "15px", fontWeight: 800, marginBottom: "8px" }}>Connected!</div>
                <div style={{ color: "#ffffff44", fontSize: "12px", marginBottom: "6px" }}>Fetching your transactions...</div>
                <div style={{ color: "#ffffff22", fontSize: "11px" }}>256-bit encrypted · read-only access</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showBankModal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(8,8,16,0.92)", display: "flex", alignItems: "flex-end", zIndex: 200, borderRadius: "44px" }}>
          <div style={{ width: "100%", background: "#13132a", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", border: "1px solid #1e1e3a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <div style={{ color: "#fff", fontSize: "16px", fontWeight: 800 }}>Connect Your Bank</div>
              <button onClick={() => setShowBankModal(false)} style={{ background: "none", border: "none", color: "#ffffff55", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ color: "#ffffff44", fontSize: "11px", marginBottom: "4px" }}>🔒 256-bit encrypted · your credentials are never stored</div>
            <div style={{ color: "#4ade8066", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", marginBottom: "16px" }}>Powered by Plaid</div>
            {["Chase Bank", "Bank of America", "Wells Fargo", "Capital One", "Other Bank"].map((bank) => (
              <button key={bank} onClick={() => connectBank(bank)} style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", marginBottom: "8px", background: "#0d0d1a", border: "1px solid #1e1e3a", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Syne', sans-serif", textAlign: "left", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>🏦</span> {bank}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// MAIN APP
// -------------------------------------------------------------------
export default function DormDeal() {
  const [tab, setTab] = useState("deals");
  const [screen, setScreen] = useState("main");
  const [userName, setUserName] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [spending, setSpending] = useState({});
  const [selectedDeal, setSelectedDeal] = useState(null);

  const handleBudgetDone = (budgetMap) => {
    setBudgets(budgetMap);
    const init = {};
    Object.keys(budgetMap).forEach((k) => { init[k] = 0; });
    setSpending(init);
  };

  const handleAddPurchase = (category, amount) => {
    setSpending((prev) => ({ ...prev, [category]: (prev[category] || 0) + amount }));
  };

  // Called after bank sync — merges AI-categorized totals into spending
  const handleBankSync = (totals) => {
    setSpending((prev) => {
      const merged = { ...prev };
      Object.entries(totals).forEach(([cat, amt]) => {
        merged[cat] = (merged[cat] || 0) + amt;
      });
      return merged;
    });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ ...S.phone, position: "relative" }}>

        {screen === "map" && <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}><MapScreen selectedDeal={selectedDeal} /></div>}

        {screen === "profile" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 20px 8px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "2px" }}>YOUR</div>
              <div style={{ color: "#fff", fontSize: "20px", fontWeight: 800 }}>Profile</div>
            </div>
            <ProfileScreen userName={userName} />
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
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🎓</div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[["deals", "🔥 Steals"], ["coach", "🤖 Coach"], ["budget", "📊 Budget"]].map(([key, label]) => (
                  <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>
                ))}
              </div>
            </div>
            <div style={S.scrollArea}>
              {tab === "deals" && <DealsTab onDealClick={(deal) => { setSelectedDeal(deal); setScreen("map"); }} />}
              {tab === "coach" && <div style={{ display: "flex", flexDirection: "column", height: "100%" }}><CoachTab spending={spending} /></div>}
              {tab === "budget" && budgets && (
                <BudgetTab
                  budgets={budgets}
                  spending={spending}
                  onAddPurchase={handleAddPurchase}
                  onBankSync={handleBankSync}
                />
              )}
            </div>
          </>
        )}

        {/* Bottom Nav */}
        <div style={{ display: "flex", alignItems: "center", padding: "10px 20px 18px", background: "#0d0d1a", borderTop: "1px solid #1a1a2e", flexShrink: 0 }}>
          <div onClick={() => setScreen("map")} style={{ flex: 1, textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: screen === "map" ? "rgba(74,222,128,0.15)" : "transparent", border: screen === "map" ? "1px solid rgba(74,222,128,0.3)" : "1px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", transition: "all 0.2s" }}>🗺️</div>
            <div style={{ color: screen === "map" ? "#4ade80" : "#ffffff33", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px" }}>Map</div>
          </div>
          <div onClick={() => setScreen("main")} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer", marginTop: "-18px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: screen === "main" ? "linear-gradient(135deg, #4ade80, #22c55e)" : "#13132a", border: screen === "main" ? "none" : "1px solid #2a2a4a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: screen === "main" ? "0 4px 20px rgba(74,222,128,0.4)" : "0 4px 12px rgba(0,0,0,0.4)", transition: "all 0.2s" }}>🏠</div>
            <div style={{ color: screen === "main" ? "#4ade80" : "#ffffff33", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px" }}>Home</div>
          </div>
          <div onClick={() => setScreen("profile")} style={{ flex: 1, textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: screen === "profile" ? "rgba(74,222,128,0.15)" : "transparent", border: screen === "profile" ? "1px solid rgba(74,222,128,0.3)" : "1px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", transition: "all 0.2s" }}>👤</div>
            <div style={{ color: screen === "profile" ? "#4ade80" : "#ffffff33", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px" }}>Profile</div>
          </div>
        </div>

        {/* Overlays */}
        {!userName && <NamePrompt onDone={(name) => setUserName(name)} />}
        {userName && tab === "budget" && screen === "main" && !budgets && <BudgetSetup onDone={handleBudgetDone} />}
      </div>
    </div>
  );
}