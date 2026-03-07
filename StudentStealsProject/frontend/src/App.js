import { useState, useEffect, useRef } from "react";

const BACKEND_URL = "http://localhost:8080"; // change to your deployed URL when live

// -------------------------------------------------------------------
// MOCK SPENDING DATA (replace with Plaid later)
// -------------------------------------------------------------------
const SPENDING = { food: 280, coffee: 65, transport: 95, books: 40, fun: 120 };
const BUDGETS  = { food: 300, coffee: 50, transport: 80, books: 100, fun: 150 };

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
};

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
      (err) => {
        setError("Location access denied. Please allow location access.");
        setLoading(false);
      }
    );
  };

  useEffect(() => { fetchDeals(); }, []);

  const categories = ["all", ...new Set(deals.map(d => d.category))];
  const filtered = filter === "all" ? deals : deals.filter(d => d.category === filter);

  return (
    <div style={{ padding: "0 20px 20px" }}>
      {/* Location bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ color: "#ffffff44", fontSize: "11px" }}>
          {locationLabel ? `📍 ${locationLabel}` : "📍 Locating..."}
        </div>
        <button onClick={fetchDeals} style={{ background: "none", border: "none", color: "#4ade80", fontSize: "11px", cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>
          ↻ Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "4px" }}>
        {categories.map(c => (
          <button key={c} style={S.pill(filter === c)} onClick={() => setFilter(c)}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* States */}
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
          No deals found nearby. Try expanding your radius.
        </div>
      )}

      {!loading && filtered.map((deal, i) => (
        <div key={deal.id || i} style={{ ...S.card, border: i < 3 ? "1px solid #4ade8022" : "1px solid #1e1e3a" }}>
          {i < 3 && (
            <div style={{ position: "absolute", marginTop: "-6px", marginLeft: "auto", display: "flex", justifyContent: "flex-end", width: "calc(100% - 28px)" }}>
              <span style={{ background: "#4ade80", color: "#080810", fontSize: "8px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", letterSpacing: "1px" }}>CLOSEST</span>
            </div>
          )}
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
function CoachTab() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! I'm your DormDeal AI coach 👋 Ask me anything about saving money as a student." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, spending: SPENDING }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", text: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: `Sorry, something went wrong: ${e.message}` }]);
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
      {/* Messages */}
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
              padding: "10px 14px",
              fontSize: "13px",
              lineHeight: 1.6,
              border: msg.role === "assistant" ? "1px solid #1e1e3a" : "none",
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🤖</div>
            <div style={{ background: "#13132a", border: "1px solid #1e1e3a", borderRadius: "18px 18px 18px 4px", padding: "10px 16px", color: "#4ade80", fontSize: "13px" }}>
              typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setInput(s)} style={{ ...S.pill(false), fontSize: "11px" }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: "8px", paddingBottom: "8px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask anything about money..."
          style={{
            flex: 1,
            background: "#13132a",
            border: "1px solid #1e1e3a",
            borderRadius: "14px",
            padding: "11px 14px",
            color: "#fff",
            fontSize: "13px",
            fontFamily: "'Syne', sans-serif",
            outline: "none",
          }}
        />
        <button onClick={sendMessage} disabled={loading} style={{
          width: "44px", height: "44px", borderRadius: "14px",
          background: "linear-gradient(135deg, #4ade80, #22c55e)",
          border: "none", cursor: "pointer", fontSize: "18px",
          opacity: loading ? 0.5 : 1,
        }}>↑</button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// BUDGET TAB
// -------------------------------------------------------------------
function BudgetTab() {
  const [swaps, setSwaps] = useState(null);
  const [loadingSwaps, setLoadingSwaps] = useState(false);

  const fetchSwaps = async () => {
    setLoadingSwaps(true);
    try {
      const res = await fetch(`${BACKEND_URL}/swaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spending: SPENDING }),
      });
      const data = await res.json();
      setSwaps(data.swaps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSwaps(false);
    }
  };

  const totalSaved = Object.entries(BUDGETS).reduce((acc, [k, v]) => {
    const spent = SPENDING[k] || 0;
    return acc + Math.max(0, v - spent);
  }, 0);

  return (
    <div style={{ padding: "0 20px 20px" }}>
      {/* Summary */}
      <div style={{ background: "linear-gradient(135deg, #13532d33, #15803d18)", border: "1px solid #4ade8033", borderRadius: "18px", padding: "16px", marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#86efac", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px" }}>UNDER BUDGET</div>
          <div style={{ color: "#4ade80", fontSize: "30px", fontWeight: 700 }}>${totalSaved}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#86efac", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px" }}>THIS MONTH</div>
          <div style={{ color: "#fff", fontSize: "13px", marginTop: "4px" }}>March 2026</div>
        </div>
      </div>

      {/* Spending bars */}
      {Object.entries(SPENDING).map(([key, amount]) => {
        const budget = BUDGETS[key];
        const pct = Math.min((amount / budget) * 100, 100);
        const over = amount > budget;
        return (
          <div key={key} style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ color: "#fff", fontWeight: 600, fontSize: "13px", textTransform: "capitalize" }}>{key}</span>
              <span style={{ fontSize: "12px", color: over ? "#f87171" : "#ffffff66" }}>
                ${amount} <span style={{ color: "#ffffff33" }}>/ ${budget}</span>
              </span>
            </div>
            <div style={{ background: "#13132a", borderRadius: "100px", height: "7px" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: "100px", background: over ? "#f87171" : "#4ade80", transition: "width 0.6s ease" }} />
            </div>
            {over && <div style={{ color: "#f87171", fontSize: "10px", marginTop: "3px" }}>⚠️ ${amount - budget} over budget</div>}
          </div>
        );
      })}

      {/* AI Swaps */}
      <div style={{ marginTop: "8px" }}>
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
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// MAIN APP
// -------------------------------------------------------------------
export default function DormDeal() {
  const [tab, setTab] = useState("deals");

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={S.phone}>
        {/* Status bar */}
        <div style={S.statusBar}>
          <span>9:41</span>
          <span style={{ color: "#4ade80", fontWeight: 700, letterSpacing: "1px", fontSize: "10px" }}>DORMDEAL</span>
          <span>●●●</span>
        </div>

        {/* Header */}
        <div style={{ padding: "10px 20px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: 700, letterSpacing: "2px" }}>GOOD MORNING</div>
              <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800 }}>Alex 👋</div>
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

        {/* Content */}
        <div style={S.scrollArea}>
          {tab === "deals" && <DealsTab />}
          {tab === "coach" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <CoachTab />
            </div>
          )}
          {tab === "budget" && <BudgetTab />}
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
      </div>
    </div>
  );
}
