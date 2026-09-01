import React, { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Briefcase,
  Clock3,
  ListOrdered,
  CandlestickChart,
  RotateCcw,
  Minus,
  Plus,
} from "lucide-react";

/* =========================================================================
   DATA LAYER — simulates 10 stocks x 13 trading days x 13 half-hour slots,
   loaded once at mount (stands in for "loading the CSVs into memory").
   ========================================================================= */

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STOCK_DEFS = [
  { symbol: "NEXUS", name: "Nexus Technologies", sector: "Information Technology", base: 1420, drift: 0.0011, vol: 0.006, seed: 11 },
  { symbol: "AGROVA", name: "Agrova Foods", sector: "FMCG", base: 612, drift: 0.0003, vol: 0.0032, seed: 22 },
  { symbol: "VELOCIS", name: "Velocis Motors", sector: "Automobile", base: 2340, drift: 0.0002, vol: 0.007, seed: 33 },
  { symbol: "HELIOS", name: "Helios Power", sector: "Energy", base: 845, drift: -0.0005, vol: 0.008, seed: 44 },
  { symbol: "BRICKTON", name: "Brickton Infra", sector: "Construction", base: 318, drift: 0.0007, vol: 0.009, seed: 55 },
  { symbol: "MEDICORE", name: "Medicore Health", sector: "Pharmaceuticals", base: 1785, drift: 0.0005, vol: 0.0038, seed: 66 },
  { symbol: "QUANTA", name: "Quanta Bank", sector: "Banking & Finance", base: 964, drift: 0.0003, vol: 0.0048, seed: 77 },
  { symbol: "STEELARC", name: "Steelarc Metals", sector: "Metals & Mining", base: 156, drift: -0.0003, vol: 0.01, seed: 88 },
  { symbol: "AEROVIA", name: "Aerovia Airlines", sector: "Aviation", base: 89, drift: -0.0007, vol: 0.012, seed: 99 },
  { symbol: "PIXELWAVE", name: "PixelWave Media", sector: "Media & Entertainment", base: 274, drift: 0.0009, vol: 0.009, seed: 110 },
];

const TIME_SLOTS = [
  "09:15", "09:45", "10:15", "10:45", "11:15", "11:45", "12:15",
  "12:45", "13:15", "13:45", "14:15", "14:45", "15:15",
];
const SLOTS_PER_DAY = TIME_SLOTS.length;
const TRADING_DAYS = 13;
const STARTING_CASH = 1000000; // ₹10,00,000 virtual money

function buildTradingDays(count, endDate) {
  const days = [];
  let d = new Date(endDate);
  while (days.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.unshift(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days;
}

function fmtDate(d) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function fmtDateLong(d) {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function generateMarket() {
  const days = buildTradingDays(TRADING_DAYS, new Date(2026, 7, 31)); // ends Mon 31 Aug 2026
  const stocks = STOCK_DEFS.map((def) => {
    const rand = mulberry32(def.seed);
    let price = def.base;
    const points = [];
    days.forEach((day, dIdx) => {
      TIME_SLOTS.forEach((time, tIdx) => {
        const shock = (rand() - 0.5) * 2 * def.vol;
        price = price * (1 + def.drift + shock);
        price = Math.max(price, def.base * 0.25);
        points.push({
          dayIdx: dIdx,
          timeIdx: tIdx,
          label: `${fmtDate(day)}, ${time}`,
          price: Math.round(price * 100) / 100,
        });
      });
    });
    return { ...def, points };
  });
  return { days, stocks };
}

const idxOf = (dayIdx, timeIdx) => dayIdx * SLOTS_PER_DAY + timeIdx;

/* =========================================================================
   STYLES — paper-ledger fintech look: warm paper background, forest green
   for gains, rust for losses, gold for actions. Serif for display, plain
   sans for UI text, monospace for numbers/tickers.
   ========================================================================= */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

  .kg-root {
    --paper: #F2ECDE;
    --card: #FBF8F0;
    --ink: #221F1A;
    --ink-soft: #6E6656;
    --line: #DFD5BC;
    --gain: #2E6A46;
    --gain-bg: #E3EEE3;
    --loss: #9C3B29;
    --loss-bg: #F4E4DE;
    --gold: #A97728;
    --gold-dark: #8A5F1E;
    --gold-bg: #F1E2C2;
    font-family: 'Inter', sans-serif;
    background: var(--paper);
    color: var(--ink);
    min-height: 100%;
    padding: 0;
  }
  .kg-serif { font-family: 'Source Serif 4', serif; }
  .kg-mono { font-family: 'IBM Plex Mono', monospace; }

  .kg-shell { max-width: 1180px; margin: 0 auto; padding: 28px 24px 60px; }

  .kg-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 18px; border-bottom: 2px solid var(--ink); padding-bottom: 18px; margin-bottom: 22px; }
  .kg-brand { display: flex; flex-direction: column; gap: 2px; }
  .kg-brand h1 { font-size: 30px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
  .kg-brand p { margin: 0; color: var(--ink-soft); font-size: 13.5px; }

  .kg-summary { display: flex; gap: 22px; flex-wrap: wrap; }
  .kg-summary-item { display: flex; flex-direction: column; gap: 2px; min-width: 92px; }
  .kg-summary-label { font-size: 11px; color: var(--ink-soft); text-transform: none; }
  .kg-summary-value { font-size: 17px; font-weight: 600; }

  .kg-tabs { display: flex; gap: 4px; margin-bottom: 22px; border-bottom: 1px solid var(--line); }
  .kg-tab { display: flex; align-items: center; gap: 7px; padding: 10px 16px; font-size: 14px; font-weight: 500; color: var(--ink-soft); background: none; border: none; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .kg-tab.active { color: var(--ink); border-bottom-color: var(--gold-dark); }
  .kg-tab:hover:not(.active) { color: var(--ink); }

  .kg-clock-bar { display: flex; align-items: center; gap: 14px; background: var(--card); border: 1px solid var(--line); border-radius: 3px; padding: 12px 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .kg-clock-label { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink-soft); font-weight: 500; }
  .kg-select { font-family: 'IBM Plex Mono', monospace; font-size: 13px; padding: 6px 9px; border: 1px solid var(--line); border-radius: 3px; background: #fff; color: var(--ink); }
  .kg-latest-btn { margin-left: auto; font-size: 12.5px; padding: 7px 12px; border-radius: 3px; border: 1px solid var(--gold-dark); background: var(--gold-bg); color: var(--gold-dark); font-weight: 600; cursor: pointer; }
  .kg-latest-btn:hover { background: var(--gold); color: #fff; }

  .kg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(255px, 1fr)); gap: 12px; }
  .kg-card { background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 15px 16px; cursor: pointer; transition: border-color .12s ease, transform .12s ease; text-align: left; }
  .kg-card:hover { border-color: var(--gold-dark); }
  .kg-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .kg-symbol { font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 15px; }
  .kg-sector { font-size: 11px; color: var(--ink-soft); margin-top: 1px; }
  .kg-name { font-size: 12.5px; color: var(--ink-soft); margin: 6px 0 10px; }
  .kg-price-row { display: flex; align-items: baseline; justify-content: space-between; }
  .kg-price { font-family: 'IBM Plex Mono', monospace; font-size: 21px; font-weight: 600; }
  .kg-chip { display: inline-flex; align-items: center; gap: 3px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; padding: 2px 7px; border-radius: 20px; }
  .kg-chip.up { color: var(--gain); background: var(--gain-bg); }
  .kg-chip.down { color: var(--loss); background: var(--loss-bg); }

  .kg-section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-soft); margin: 0 0 10px; font-weight: 600; }

  .kg-trade-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; align-items: start; }
  @media (max-width: 820px) { .kg-trade-layout { grid-template-columns: 1fr; } }

  .kg-panel { background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 18px 20px; }
  .kg-picker { width: 100%; font-family: 'IBM Plex Mono', monospace; font-size: 13.5px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 3px; background: #fff; margin-bottom: 14px; }

  .kg-detail-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .kg-detail-price { font-family: 'IBM Plex Mono', monospace; font-size: 32px; font-weight: 600; line-height: 1; }
  .kg-detail-sub { color: var(--ink-soft); font-size: 13px; margin-top: 4px; }

  .kg-form-row { display: flex; gap: 8px; margin-bottom: 12px; }
  .kg-typebtn { flex: 1; padding: 9px; border-radius: 3px; border: 1px solid var(--line); background: #fff; font-weight: 600; font-size: 13.5px; cursor: pointer; color: var(--ink-soft); }
  .kg-typebtn.buy.active { background: var(--gain-bg); border-color: var(--gain); color: var(--gain); }
  .kg-typebtn.sell.active { background: var(--loss-bg); border-color: var(--loss); color: var(--loss); }

  .kg-qty-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .kg-qty-btn { width: 30px; height: 30px; border-radius: 3px; border: 1px solid var(--line); background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .kg-qty-input { flex: 1; text-align: center; font-family: 'IBM Plex Mono', monospace; font-size: 15px; padding: 6px; border: 1px solid var(--line); border-radius: 3px; }

  .kg-cost-line { display: flex; justify-content: space-between; font-size: 13.5px; padding: 5px 0; border-top: 1px dashed var(--line); }
  .kg-cost-line.total { font-weight: 600; border-top: 1px solid var(--ink); margin-top: 4px; padding-top: 8px; }

  .kg-submit { width: 100%; margin-top: 14px; padding: 11px; border-radius: 3px; border: none; font-weight: 700; font-size: 14px; cursor: pointer; color: #fff; }
  .kg-submit.buy { background: var(--gain); }
  .kg-submit.sell { background: var(--loss); }
  .kg-submit:disabled { background: #C9C2AE; cursor: not-allowed; }

  .kg-error { font-size: 12.5px; color: var(--loss); margin-top: 8px; }
  .kg-success { font-size: 12.5px; color: var(--gain); margin-top: 8px; }

  .kg-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .kg-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft); font-weight: 600; padding: 8px 10px; border-bottom: 1px solid var(--ink); }
  .kg-table td { padding: 10px 10px; border-bottom: 1px solid var(--line); font-family: 'IBM Plex Mono', monospace; }
  .kg-table td.name-cell { font-family: 'Inter', sans-serif; }
  .kg-table tr:last-child td { border-bottom: none; }
  .kg-empty { padding: 40px 10px; text-align: center; color: var(--ink-soft); font-size: 13.5px; }

  .kg-tag { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 3px; }
  .kg-tag.buy { background: var(--gain-bg); color: var(--gain); }
  .kg-tag.sell { background: var(--loss-bg); color: var(--loss); }

  .kg-reset { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-soft); background: none; border: 1px solid var(--line); padding: 6px 10px; border-radius: 3px; cursor: pointer; }
  .kg-reset:hover { border-color: var(--loss); color: var(--loss); }
`;

/* =========================================================================
   MAIN APP
   ========================================================================= */

export default function KagazTradingPlatform() {
  const { days, stocks } = useMemo(generateMarket, []);
  const stockMap = useMemo(() => Object.fromEntries(stocks.map((s) => [s.symbol, s])), [stocks]);

  const [dayIdx, setDayIdx] = useState(TRADING_DAYS - 1);
  const [timeIdx, setTimeIdx] = useState(SLOTS_PER_DAY - 1);
  const [activeTab, setActiveTab] = useState("market");
  const [selectedSymbol, setSelectedSymbol] = useState(stocks[0].symbol);

  const [cash, setCash] = useState(STARTING_CASH);
  const [holdings, setHoldings] = useState({}); // symbol -> { qty, avgCost }
  const [transactions, setTransactions] = useState([]);
  const [realizedPL, setRealizedPL] = useState(0);

  const [tradeType, setTradeType] = useState("buy");
  const [qty, setQty] = useState(1);
  const [formMsg, setFormMsg] = useState(null);

  const currentPointFor = useCallback(
    (symbol) => stockMap[symbol].points[idxOf(dayIdx, timeIdx)],
    [stockMap, dayIdx, timeIdx]
  );
  const prevDayClosePointFor = useCallback(
    (symbol) => (dayIdx > 0 ? stockMap[symbol].points[idxOf(dayIdx - 1, SLOTS_PER_DAY - 1)] : stockMap[symbol].points[idxOf(0, 0)]),
    [stockMap, dayIdx]
  );

  const asOfLabel = `${fmtDateLong(days[dayIdx])} · ${TIME_SLOTS[timeIdx]} IST`;
  const isLatest = dayIdx === TRADING_DAYS - 1 && timeIdx === SLOTS_PER_DAY - 1;

  const holdingsValue = useMemo(
    () =>
      Object.entries(holdings).reduce((sum, [sym, h]) => {
        if (h.qty <= 0) return sum;
        return sum + h.qty * currentPointFor(sym).price;
      }, 0),
    [holdings, currentPointFor]
  );
  const netWorth = cash + holdingsValue;
  const totalPL = netWorth - STARTING_CASH;
  const totalPLPct = (totalPL / STARTING_CASH) * 100;

  const selectedStock = stockMap[selectedSymbol];
  const selectedPoint = currentPointFor(selectedSymbol);
  const selectedPrevClose = prevDayClosePointFor(selectedSymbol);
  const dayChangePct = ((selectedPoint.price - selectedPrevClose.price) / selectedPrevClose.price) * 100;

  const chartData = useMemo(
    () => selectedStock.points.slice(0, idxOf(dayIdx, timeIdx) + 1).map((p) => ({ label: p.label, price: p.price })),
    [selectedStock, dayIdx, timeIdx]
  );
  const chartWindow = chartData.slice(-39); // last ~3 trading days for legibility

  const holdingForSelected = holdings[selectedSymbol] || { qty: 0, avgCost: 0 };
  const estCost = qty * selectedPoint.price;

  function openStock(symbol) {
    setSelectedSymbol(symbol);
    setActiveTab("trade");
    setFormMsg(null);
  }

  function submitTrade() {
    setFormMsg(null);
    const q = Number(qty);
    if (!q || q <= 0 || !Number.isInteger(q)) {
      setFormMsg({ type: "error", text: "Enter a whole number of shares." });
      return;
    }
    const price = selectedPoint.price;
    const cost = q * price;

    if (tradeType === "buy") {
      if (cost > cash) {
        setFormMsg({ type: "error", text: `Not enough cash. This order costs ₹${cost.toLocaleString("en-IN")}, you have ₹${cash.toLocaleString("en-IN")}.` });
        return;
      }
      setCash((c) => c - cost);
      setHoldings((h) => {
        const prev = h[selectedSymbol] || { qty: 0, avgCost: 0 };
        const newQty = prev.qty + q;
        const newAvg = (prev.qty * prev.avgCost + cost) / newQty;
        return { ...h, [selectedSymbol]: { qty: newQty, avgCost: newAvg } };
      });
      logTx("buy", q, price, null);
      setFormMsg({ type: "success", text: `Bought ${q} share${q > 1 ? "s" : ""} of ${selectedSymbol} at ₹${price.toLocaleString("en-IN")}.` });
    } else {
      const held = holdings[selectedSymbol];
      if (!held || held.qty < q) {
        setFormMsg({ type: "error", text: `You only hold ${held ? held.qty : 0} share(s) of ${selectedSymbol}.` });
        return;
      }
      const realized = (price - held.avgCost) * q;
      setCash((c) => c + cost);
      setHoldings((h) => {
        const remainingQty = held.qty - q;
        const next = { ...h };
        if (remainingQty <= 0) delete next[selectedSymbol];
        else next[selectedSymbol] = { qty: remainingQty, avgCost: held.avgCost };
        return next;
      });
      setRealizedPL((r) => r + realized);
      logTx("sell", q, price, realized);
      setFormMsg({
        type: "success",
        text: `Sold ${q} share${q > 1 ? "s" : ""} of ${selectedSymbol} at ₹${price.toLocaleString("en-IN")} (${realized >= 0 ? "profit" : "loss"} of ₹${Math.abs(realized).toLocaleString("en-IN", { maximumFractionDigits: 0 })}).`,
      });
    }
    setQty(1);
  }

  function logTx(type, q, price, realized) {
    setTransactions((t) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        asOf: asOfLabel,
        symbol: selectedSymbol,
        type,
        qty: q,
        price,
        total: q * price,
        realized,
      },
      ...t,
    ]);
  }

  function resetSimulation() {
    setCash(STARTING_CASH);
    setHoldings({});
    setTransactions([]);
    setRealizedPL(0);
    setDayIdx(TRADING_DAYS - 1);
    setTimeIdx(SLOTS_PER_DAY - 1);
    setFormMsg(null);
  }

  return (
    <div className="kg-root">
      <style>{CSS}</style>
      <div className="kg-shell">
        {/* Header */}
        <div className="kg-header">
          <div className="kg-brand">
            <h1 className="kg-serif">Kagaz Markets</h1>
            <p>Paper trades, real practice — 10 stocks, no real money involved.</p>
          </div>
          <div className="kg-summary">
            <div className="kg-summary-item">
              <span className="kg-summary-label">Cash</span>
              <span className="kg-summary-value kg-mono">₹{cash.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="kg-summary-item">
              <span className="kg-summary-label">Holdings value</span>
              <span className="kg-summary-value kg-mono">₹{holdingsValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="kg-summary-item">
              <span className="kg-summary-label">Net worth</span>
              <span className="kg-summary-value kg-mono">₹{netWorth.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="kg-summary-item">
              <span className="kg-summary-label">Total P&amp;L</span>
              <span className="kg-summary-value kg-mono" style={{ color: totalPL >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {totalPL >= 0 ? "+" : "-"}₹{Math.abs(totalPL).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                <span style={{ fontSize: 12, marginLeft: 4 }}>({totalPLPct >= 0 ? "+" : ""}{totalPLPct.toFixed(2)}%)</span>
              </span>
            </div>
            <button className="kg-reset" onClick={resetSimulation} title="Reset cash, holdings and history">
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="kg-tabs">
          <button className={`kg-tab ${activeTab === "market" ? "active" : ""}`} onClick={() => setActiveTab("market")}>
            <CandlestickChart size={15} /> Market
          </button>
          <button className={`kg-tab ${activeTab === "trade" ? "active" : ""}`} onClick={() => setActiveTab("trade")}>
            <ArrowUpRight size={15} /> Trade
          </button>
          <button className={`kg-tab ${activeTab === "portfolio" ? "active" : ""}`} onClick={() => setActiveTab("portfolio")}>
            <Briefcase size={15} /> Portfolio
          </button>
          <button className={`kg-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            <ListOrdered size={15} /> Transactions
          </button>
        </div>

        {/* Time machine — applies to every tab */}
        <div className="kg-clock-bar">
          <span className="kg-clock-label"><Clock3 size={14} /> Viewing market as of</span>
          <select className="kg-select" value={dayIdx} onChange={(e) => setDayIdx(Number(e.target.value))}>
            {days.map((d, i) => (
              <option key={i} value={i}>{fmtDateLong(d)}</option>
            ))}
          </select>
          <select className="kg-select" value={timeIdx} onChange={(e) => setTimeIdx(Number(e.target.value))}>
            {TIME_SLOTS.map((t, i) => (
              <option key={i} value={i}>{t} IST</option>
            ))}
          </select>
          {!isLatest && (
            <button className="kg-latest-btn" onClick={() => { setDayIdx(TRADING_DAYS - 1); setTimeIdx(SLOTS_PER_DAY - 1); }}>
              Jump to latest
            </button>
          )}
        </div>

        {/* MARKET TAB */}
        {activeTab === "market" && (
          <div>
            <p className="kg-section-title">Available stocks · priced as of {asOfLabel}</p>
            <div className="kg-grid">
              {stocks.map((s) => {
                const pt = currentPointFor(s.symbol);
                const prevClose = prevDayClosePointFor(s.symbol);
                const chg = ((pt.price - prevClose.price) / prevClose.price) * 100;
                const up = chg >= 0;
                return (
                  <button key={s.symbol} className="kg-card" onClick={() => openStock(s.symbol)}>
                    <div className="kg-card-top">
                      <div>
                        <div className="kg-symbol">{s.symbol}</div>
                        <div className="kg-sector">{s.sector}</div>
                      </div>
                      <span className={`kg-chip ${up ? "up" : "down"}`}>
                        {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(chg).toFixed(2)}%
                      </span>
                    </div>
                    <div className="kg-name">{s.name}</div>
                    <div className="kg-price-row">
                      <span className="kg-price">₹{pt.price.toLocaleString("en-IN")}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TRADE TAB */}
        {activeTab === "trade" && (
          <div className="kg-trade-layout">
            <div className="kg-panel">
              <select className="kg-picker" value={selectedSymbol} onChange={(e) => { setSelectedSymbol(e.target.value); setFormMsg(null); }}>
                {stocks.map((s) => (
                  <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>
                ))}
              </select>
              <div className="kg-detail-head">
                <div>
                  <div className="kg-detail-price">₹{selectedPoint.price.toLocaleString("en-IN")}</div>
                  <div className="kg-detail-sub">{selectedStock.name} · {selectedStock.sector}</div>
                </div>
                <span className={`kg-chip ${dayChangePct >= 0 ? "up" : "down"}`}>
                  {dayChangePct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(dayChangePct).toFixed(2)}% vs prior close
                </span>
              </div>
              <div style={{ height: 240, marginTop: 14 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartWindow} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#DFD5BC" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6E6656" }} interval={Math.max(0, Math.floor(chartWindow.length / 5))} />
                    <YAxis tick={{ fontSize: 10, fill: "#6E6656" }} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "#FBF8F0", border: "1px solid #DFD5BC", borderRadius: 4, fontSize: 12 }}
                      formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Price"]}
                    />
                    <Line type="monotone" dataKey="price" stroke="#A97728" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                Showing price history up to the selected date/time (last {chartWindow.length} of {chartData.length} recorded ticks).
              </p>
            </div>

            <div className="kg-panel">
              <p className="kg-section-title">Place order</p>
              <div className="kg-form-row">
                <button className={`kg-typebtn buy ${tradeType === "buy" ? "active" : ""}`} onClick={() => { setTradeType("buy"); setFormMsg(null); }}>Buy</button>
                <button className={`kg-typebtn sell ${tradeType === "sell" ? "active" : ""}`} onClick={() => { setTradeType("sell"); setFormMsg(null); }}>Sell</button>
              </div>

              <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Quantity</label>
              <div className="kg-qty-row">
                <button className="kg-qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={14} /></button>
                <input className="kg-qty-input" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))} />
                <button className="kg-qty-btn" onClick={() => setQty((q) => q + 1)}><Plus size={14} /></button>
              </div>

              <div className="kg-cost-line"><span>Price / share</span><span className="kg-mono">₹{selectedPoint.price.toLocaleString("en-IN")}</span></div>
              <div className="kg-cost-line"><span>Shares held</span><span className="kg-mono">{holdingForSelected.qty}</span></div>
              {tradeType === "sell" && (
                <div className="kg-cost-line"><span>Avg. cost held</span><span className="kg-mono">₹{holdingForSelected.avgCost ? holdingForSelected.avgCost.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</span></div>
              )}
              <div className="kg-cost-line total"><span>{tradeType === "buy" ? "Total cost" : "Total proceeds"}</span><span className="kg-mono">₹{estCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>

              <button className={`kg-submit ${tradeType}`} onClick={submitTrade} disabled={tradeType === "sell" && holdingForSelected.qty === 0}>
                {tradeType === "buy" ? `Buy ${selectedSymbol}` : `Sell ${selectedSymbol}`}
              </button>
              {formMsg && <div className={formMsg.type === "error" ? "kg-error" : "kg-success"}>{formMsg.text}</div>}
              <p style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 12 }}>
                Order executes at the {asOfLabel} price shown above. Change the clock at the top to trade against an earlier point in time.
              </p>
            </div>
          </div>
        )}

        {/* PORTFOLIO TAB */}
        {activeTab === "portfolio" && (
          <div>
            <p className="kg-section-title">Holdings · valued as of {asOfLabel}</p>
            <div className="kg-panel" style={{ padding: 0 }}>
              {Object.keys(holdings).length === 0 ? (
                <div className="kg-empty">No positions yet. Head to the Trade tab to buy your first stock.</div>
              ) : (
                <table className="kg-table">
                  <thead>
                    <tr>
                      <th>Stock</th><th>Qty</th><th>Avg. cost</th><th>Current price</th><th>Current value</th><th>Unrealized P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(holdings).map(([sym, h]) => {
                      const price = currentPointFor(sym).price;
                      const value = h.qty * price;
                      const pl = (price - h.avgCost) * h.qty;
                      const plPct = ((price - h.avgCost) / h.avgCost) * 100;
                      return (
                        <tr key={sym}>
                          <td className="name-cell"><strong>{sym}</strong><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{stockMap[sym].name}</div></td>
                          <td>{h.qty}</td>
                          <td>₹{h.avgCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                          <td>₹{price.toLocaleString("en-IN")}</td>
                          <td>₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                          <td style={{ color: pl >= 0 ? "var(--gain)" : "var(--loss)" }}>
                            {pl >= 0 ? "+" : "-"}₹{Math.abs(pl).toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({plPct >= 0 ? "+" : ""}{plPct.toFixed(2)}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
              <div className="kg-summary-item">
                <span className="kg-summary-label">Realized P&amp;L (closed trades)</span>
                <span className="kg-summary-value kg-mono" style={{ color: realizedPL >= 0 ? "var(--gain)" : "var(--loss)" }}>
                  {realizedPL >= 0 ? "+" : "-"}₹{Math.abs(realizedPL).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="kg-summary-item">
                <span className="kg-summary-label">Unrealized P&amp;L (open positions)</span>
                <span className="kg-summary-value kg-mono" style={{ color: (totalPL - realizedPL) >= 0 ? "var(--gain)" : "var(--loss)" }}>
                  {(totalPL - realizedPL) >= 0 ? "+" : "-"}₹{Math.abs(totalPL - realizedPL).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div>
            <p className="kg-section-title">Transaction history · {transactions.length} order{transactions.length === 1 ? "" : "s"}</p>
            <div className="kg-panel" style={{ padding: 0 }}>
              {transactions.length === 0 ? (
                <div className="kg-empty">No trades placed yet.</div>
              ) : (
                <table className="kg-table">
                  <thead>
                    <tr>
                      <th>Executed at</th><th>Stock</th><th>Type</th><th>Qty</th><th>Price</th><th>Total</th><th>Realized P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="name-cell">{tx.asOf}</td>
                        <td>{tx.symbol}</td>
                        <td><span className={`kg-tag ${tx.type}`}>{tx.type.toUpperCase()}</span></td>
                        <td>{tx.qty}</td>
                        <td>₹{tx.price.toLocaleString("en-IN")}</td>
                        <td>₹{tx.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                        <td style={tx.realized == null ? {} : { color: tx.realized >= 0 ? "var(--gain)" : "var(--loss)" }}>
                          {tx.realized == null ? "—" : `${tx.realized >= 0 ? "+" : "-"}₹${Math.abs(tx.realized).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
