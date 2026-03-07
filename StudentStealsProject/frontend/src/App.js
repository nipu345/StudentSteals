import { useState, useEffect, useRef } from "react";

const BACKEND_URL = "http://localhost:8080";

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
  statusBar: {
    padding: "14px 24px 0",
    display: "flex",
    justifyContent: "space-between",
    color: "#ffffff55",
    fontSize: "11px",
    flexShrink: 0,
  },
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    scrollbarWidth: "none",
  },
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
// NAME PROMPT SCREEN
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
        <div style={{ color: "#ffffff88", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}>
          WHAT'S YOUR NAME?
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onDone(name.trim())}
          placeholder="Enter your first name..."
          style={S.input}
        />
      </div>
      <button
        onClick={() => name.trim() && onDone(name.trim())}
        disabled={!name.trim()}
        style={{ ...S.btn, opacity: name.trim() ? 1 : 0.4, marginTop: "4px" }}
      >
        Let's Go →
      </button>
    </div>
  );
}

// -------------------------------------------------------------------
// BUDGET SETUP SCREEN
// -------------------------------------------------------------------
function BudgetSetup({ onDone }) {
  const [rows, setRows] = useState([
    { category: "Food", budget: "" },
    { category: "Coffee", budget: "" },
    { category: "Transport", budget: "" },
  ]);

  const addRow = () => setRows([...rows, { category: "", budget: "" }]);

  const updateRow = (i, field, value) => {
    const updated = [...rows];
    updated[i][field] = value;
    setRows(updated);
  };

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
        <div style={{ color: "#fff", fontSize: "16px", fontWeight: 800, textAlign: "center", marginBottom: "4px" }}>
          Set Your Monthly Budget
        </div>
        <div style={{ color: "#ffffff55", fontSize: "11px", textAlign: "center", marginBottom: "20px" }}>
          Add categories and how much you want to spend on each
        </div>

        {/* Column headers */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingRight: "28px" }}>
          <div style={{ flex: 2, color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "1px" }}>CATEGORY</div>
          <div style={{ flex: 1, color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "1px" }}>BUDGET ($)</div>
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
            <input
              value={row.category}
              onChange={(e) => updateRow(i, "category", e.target.value)}
              placeholder="e.g. Food"
              style={{ ...S.input, flex: 2 }}
            />
            <input
              type="number"
              value={row.budget}
              onChange={(e) => updateRow(i, "budget", e.target.value)}
              placeholder="0"
              min="0"
              style={{ ...S.input, flex: 1 }}
            />
            <button
              onClick={() => removeRow(i)}
              style={{ background: "none", border: "none", color: "#f87171", fontSize: "16px", cursor: "pointer", flexShrink: 0, padding: "0 2px" }}
            >×</button>
          </div>
        ))}

        {/* Add row */}
        <button
          onClick={addRow}
          style={{ background: "none", border: "1px dashed #1e1e3a", borderRadius: "12px", color: "#4ade8088", fontSize: "12px", fontWeight: 700, cursor: "pointer", width: "100%", padding: "10px", fontFamily: "'Syne', sans-serif", marginBottom: "16px" }}
        >
          + Add Category
        </button>

        <button
          onClick={confirm}
          disabled={!canConfirm}
          style={{ ...S.btn, opacity: canConfirm ? 1 : 0.4, marginTop: 0 }}
        >
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
    <div style={{
      position: "absolute", inset: 0, background: "rgba(8,8,16,0.88)",
      display: "flex", alignItems: "flex-end", zIndex: 200, borderRadius: "44px",
    }}>
      <div style={{
        width: "100%", background: "#13132a", borderRadius: "24px 24px 0 0",
        padding: "24px 20px 32px", border: "1px solid #1e1e3a",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ color: "#fff", fontSize: "16px", fontWeight: 800 }}>Add Purchase</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff55", fontSize: "20px", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ color: "#ffffff88", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", marginBottom: "6px" }}>CATEGORY</div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            ...S.input, marginBottom: "14px", appearance: "none",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%234ade80'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
            paddingRight: "32px", cursor: "pointer",
          }}
        >
          {categories.map((c) => <option key={c} value={c} style={{ background: "#13132a" }}>{c}</option>)}
        </select>

        <div style={{ color: "#ffffff88", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", marginBottom: "6px" }}>AMOUNT ($)</div>
        <input
          autoFocus
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="0.00"
          min="0"
          step="0.01"
          style={{ ...S.input, marginBottom: "18px", fontSize: "20px", fontWeight: 700 }}
        />

        <button onClick={submit} disabled={!amount || parseFloat(amount) <= 0} style={{ ...S.btn, marginTop: 0, opacity: amount && parseFloat(amount) > 0 ? 1 : 0.4 }}>
          Add Purchase
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// DEALS TAB
// -------------------------------------------------------------------
function DealsTab() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [locationLabel, setLocationLabel] = useState(null);

  const fetchDeals = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        try {
          const res = await fetch(`${BACKEND_URL}/deals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude, radius: 1500 }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          setDeals(data.deals || []);
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      },
      () => { setError("Location access denied. Please allow location access."); setLoading(false); }
    );
  };

  useEffect(() => { fetchDeals(); }, []);

  const categories = ["all", ...new Set(deals.map((d) => d.category))];
  const filtered = filter === "all" ? deals : deals.filter((d) => d.category === filter);

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ color: "#ffffff44", fontSize: "11px" }}>
          {locationLabel ? `📍 ${locationLabel}` : "📍 Locating..."}
        </div>
        <button onClick={fetchDeals} style={{ background: "none", border: "none", color: "#4ade80", fontSize: "11px", cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>↻ Refresh</button>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "4px" }}>
        {categories.map((c) => (
          <button key={c} style={S.pill(filter === c)} onClick={() => setFilter(c)}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "#4ade80", padding: "40px 0" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📡</div>
          <div style={{ fontSize: "13px" }}>Finding deals near you...</div>
        </div>
      )}

      {error && (
        <div style={{ background: "#2a1a1a", border: "1px solid #f8717133", borderRadius: "14px", padding: "16px", textAlign: "center" }}>
          <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "8px" }}>{error}</div>
          <button onClick={fetchDeals} style={{ ...S.btn, marginTop: "4px" }}>Try Again</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#ffffff33", padding: "40px 0", fontSize: "13px" }}>
          No deals found nearby.
        </div>
      )}

      {!loading && filtered.map((deal, i) => (
        <div key={deal.id || i} style={{ ...S.card, border: i < 3 ? "1px solid #4ade8022" : "1px solid #1e1e3a" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
              {deal.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>{deal.name}</div>
              <div style={{ color: "#4ade8099", fontSize: "12px", marginTop: "2px" }}>{deal.deal}</div>
              <div style={{ color: "#ffffff33", fontSize: "11px", marginTop: "3px" }}>
                📍 {deal.distance_label} away
                {deal.rating && ` · ⭐ ${deal.rating}`}
                {deal.open_now === true && " · 🟢 Open"}
                {deal.open_now === false && " · 🔴 Closed"}
              </div>
            </div>
            <div style={{ color: "#4ade80", fontWeight: 700, fontSize: "15px", flexShrink: 0 }}>
              -{deal.saving}
            </div>
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
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! I'm your StudentSteals AI coach 👋 Ask me anything about saving money as a student." }
  ]);
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
      const res = await fetch(`${BACKEND_URL}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, spending }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Sorry, something went wrong: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "I have $30 left this week 😬",
    "How do I save on textbooks?",
    "Best cheap meals near campus?",
    "Help me stick to my budget",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 20px" }}>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", paddingBottom: "12px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "10px" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", marginRight: "8px", flexShrink: 0, marginTop: "2px" }}>🤖</div>
            )}
            <div style={{
              maxWidth: "75%",
              background: msg.role === "user" ? "linear-gradient(135deg, #4ade80, #22c55e)" : "#13132a",
              color: msg.role === "user" ? "#080810" : "#e2e8f0",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "10px 14px", fontSize: "13px", lineHeight: 1.6,
              border: msg.role === "assistant" ? "1px solid #1e1e3a" : "none",
            }}>
              {msg.text}
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
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setInput(s)} style={{ ...S.pill(false), fontSize: "11px" }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", paddingBottom: "8px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask anything about money..."
          style={{ flex: 1, background: "#13132a", border: "1px solid #1e1e3a", borderRadius: "14px", padding: "11px 14px", color: "#fff", fontSize: "13px", fontFamily: "'Syne', sans-serif", outline: "none" }}
        />
        <button onClick={sendMessage} disabled={loading} style={{ width: "44px", height: "44px", borderRadius: "14px", background: "linear-gradient(135deg, #4ade80, #22c55e)", border: "none", cursor: "pointer", fontSize: "18px", opacity: loading ? 0.5 : 1 }}>↑</button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// BUDGET TAB
// -------------------------------------------------------------------
function BudgetTab({ budgets, spending, onAddPurchase }) {
  const [swaps, setSwaps] = useState(null);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);

  const fetchSwaps = async () => {
    setLoadingSwaps(true);
    try {
      const res = await fetch(`${BACKEND_URL}/swaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spending }),
      });
      const data = await res.json();
      setSwaps(data.swaps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSwaps(false);
    }
  };

  // Total budget = sum of all category budgets
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  // Total spent = sum of all category spending
  const totalSpent = Object.values(spending).reduce((a, b) => a + b, 0);
  // Money left
  const moneyLeft = totalBudget - totalSpent;
  const isOverall = moneyLeft < 0;

  const categories = Object.keys(budgets);

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" });
  const year = now.getFullYear();

  return (
    <div style={{ padding: "0 20px 20px", position: "relative" }}>

      {/* Money Left banner */}
      <div style={{
        background: isOverall
          ? "linear-gradient(135deg, #53131333, #7f1d1d18)"
          : "linear-gradient(135deg, #13532d33, #15803d18)",
        border: `1px solid ${isOverall ? "#f8717133" : "#4ade8033"}`,
        borderRadius: "18px", padding: "16px", marginBottom: "16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ color: isOverall ? "#fca5a5" : "#86efac", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px" }}>
            {isOverall ? "OVER BUDGET" : "MONEY LEFT"}
          </div>
          <div style={{ color: isOverall ? "#f87171" : "#4ade80", fontSize: "30px", fontWeight: 700 }}>
            {isOverall ? `-$${Math.abs(moneyLeft).toFixed(2)}` : `$${moneyLeft.toFixed(2)}`}
          </div>
          <div style={{ color: "#ffffff44", fontSize: "10px", marginTop: "2px" }}>
            ${totalSpent.toFixed(2)} spent of ${totalBudget.toFixed(2)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#86efac", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px" }}>THIS MONTH</div>
          <div style={{ color: "#fff", fontSize: "13px", marginTop: "4px" }}>{monthName} {year}</div>
        </div>
      </div>

      {/* Spending bars per category */}
      {categories.map((key) => {
        const amount = spending[key] || 0;
        const budget = budgets[key];
        const pct = Math.min((amount / budget) * 100, 100);
        const over = amount > budget;
        return (
          <div key={key} style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ color: "#fff", fontWeight: 600, fontSize: "13px" }}>{key}</span>
              <span style={{ fontSize: "12px", color: over ? "#f87171" : "#ffffff66" }}>
                ${amount.toFixed(2)} <span style={{ color: "#ffffff33" }}>/ ${budget.toFixed(2)}</span>
              </span>
            </div>
            <div style={{ background: "#13132a", borderRadius: "100px", height: "7px" }}>
              <div style={{
                width: `${pct}%`, height: "100%", borderRadius: "100px",
                background: over ? "#f87171" : pct > 80 ? "#facc15" : "#4ade80",
                transition: "width 0.6s ease",
              }} />
            </div>
            {over && (
              <div style={{ color: "#f87171", fontSize: "10px", marginTop: "3px" }}>
                ⚠️ ${(amount - budget).toFixed(2)} over budget
              </div>
            )}
          </div>
        );
      })}

      {/* Add Purchase button */}
      <button
        onClick={() => setShowAddPurchase(true)}
        style={{
          width: "100%", padding: "12px", borderRadius: "14px", marginBottom: "10px",
          background: "#13132a", border: "1px solid #4ade8044",
          color: "#4ade80", fontSize: "13px", fontWeight: 700, cursor: "pointer",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        + Add Purchase
      </button>

      {/* AI Swaps */}
      <button onClick={fetchSwaps} style={S.btn} disabled={loadingSwaps}>
        {loadingSwaps ? "Getting AI swaps..." : "✨ Get AI-Powered Swaps"}
      </button>

      {swaps && swaps.map((swap, i) => (
        <div key={i} style={{ ...S.card, marginTop: "10px" }}>
          <div style={{ fontSize: "20px", marginBottom: "8px" }}>{swap.emoji}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <span style={{ background: "#ff4d4d18", color: "#f87171", padding: "3px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}>
              ❌ {swap.from}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <span style={{ background: "#4ade8018", color: "#4ade80", padding: "3px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}>
              ✅ {swap.to}
            </span>
          </div>
          <div style={{ background: "#13532d33", borderRadius: "10px", padding: "8px 12px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#86efac", fontSize: "12px" }}>Save</span>
            <span style={{ color: "#4ade80", fontWeight: 700, fontSize: "15px" }}>{swap.save}</span>
          </div>
        </div>
      ))}

      {/* Add Purchase Modal */}
      {showAddPurchase && (
        <AddPurchaseModal
          categories={categories}
          onAdd={onAddPurchase}
          onClose={() => setShowAddPurchase(false)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// MAIN APP
// -------------------------------------------------------------------
export default function DormDeal() {
  const [tab, setTab] = useState("deals");

  // --- Onboarding state ---
  const [userName, setUserName] = useState(null);       // null = not entered yet
  const [budgets, setBudgets] = useState(null);          // null = not set up yet

  // --- Live spending state (user updates this via Add Purchase) ---
  const [spending, setSpending] = useState({});

  // When budgets are set, initialize spending to 0 for each category
  const handleBudgetDone = (budgetMap) => {
    setBudgets(budgetMap);
    const initialSpending = {};
    Object.keys(budgetMap).forEach((k) => { initialSpending[k] = 0; });
    setSpending(initialSpending);
  };

  // Add a purchase to a category
  const handleAddPurchase = (category, amount) => {
    setSpending((prev) => ({
      ...prev,
      [category]: (prev[category] || 0) + amount,
    }));
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ ...S.phone, position: "relative" }}>
        {/* Status bar */}
        <div style={S.statusBar}>
          <span>9:41</span>
          <span style={{ color: "#4ade80", fontWeight: 700, letterSpacing: "1px", fontSize: "10px" }}>StudentSteals</span>
          <span>●●●</span>
        </div>

        {/* Header */}
        <div style={{ padding: "10px 20px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "2px" }}>{greeting}</div>
              <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800 }}>
                {userName ? `${userName} 👋` : "Welcome 👋"}
              </div>
            </div>
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🎓</div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "6px" }}>
            {[["deals", "🔥 Deals"], ["coach", "🤖 Coach"], ["budget", "📊 Budget"]].map(([key, label]) => (
              <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={S.scrollArea}>
          {tab === "deals" && <DealsTab />}
          {tab === "coach" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <CoachTab spending={spending} />
            </div>
          )}
          {tab === "budget" && budgets && (
            <BudgetTab
              budgets={budgets}
              spending={spending}
              onAddPurchase={handleAddPurchase}
            />
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 24px 18px", background: "#0d0d1a", borderTop: "1px solid #1a1a2e", flexShrink: 0 }}>
          {[["🔥", "Deals"], ["🗺️", "Map"], ["🤖", "AI"], ["👤", "Me"]].map(([icon, label]) => (
            <div key={label} style={{ textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "18px" }}>{icon}</div>
              <div style={{ color: "#ffffff33", fontSize: "9px", marginTop: "2px", fontWeight: 600, letterSpacing: "0.5px" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Step 1: Name prompt — shown on first open */}
        {!userName && (
          <NamePrompt onDone={(name) => setUserName(name)} />
        )}

        {/* Step 2: Budget setup — only when Budget tab is clicked for the first time */}
        {userName && tab === "budget" && !budgets && (
          <BudgetSetup onDone={handleBudgetDone} />
        )}
      </div>
    </div>
  );
}