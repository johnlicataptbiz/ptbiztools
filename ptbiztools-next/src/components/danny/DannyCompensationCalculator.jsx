"use client";

// @ts-nocheck
import { useState, useCallback } from "react";
import { TOOL_BADGES } from "@/constants/tool-badges";
import "@/styles/danny-tools.css";

// Print styles - hide UI elements when printing
const printStyles = `
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; }
  }
`;

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// Light theme color palette
const B = {
  bg:"#FAFAFB",
  surf:"#FFFFFF", 
  dark:"#F3F4F6", 
  bdr:"#E5E7EB", 
  blue:"#2E86F5", 
  wht:"#111827", 
  gray:"#6B7280", 
  grayDk:"#9CA3AF", 
  grayXDk:"#D1D5DB", 
  green:"#059669", 
  yellow:"#D97706", 
  red:"#DC2626", 
  glow:"rgba(46,134,245,0.15)"
};

const $ = v => v === null || v === undefined || isNaN(v) ? "—" : "$" + Math.round(v).toLocaleString("en-US");
const $k = v => v >= 1000 ? "$" + (v/1000).toFixed(v % 1000 === 0 ? 0 : 1) + "K" : $(v);
const pf = v => v === null || v === undefined || isNaN(v) ? "—" : v.toFixed(1) + "%";

function parseNumericInput(value) {
  const normalized = String(value ?? "").trim().replace(/[$,\s]/g, "");
  if (!normalized) return null;
  // Strict numeric parse so malformed values like "200abc" are rejected.
  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function Inp({ label, value, name, onChange, hint, prefix }) {
  return (
    <div style={{ marginBottom:10 }}>
      <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#6B7280", marginBottom:3, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</label>
      <div style={{ position:"relative" }}>
        {prefix && <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF", fontSize:13, fontFamily:"'JetBrains Mono',monospace", pointerEvents:"none" }}>{prefix}</span>}
        <input type="text" value={value} name={name} onChange={onChange} placeholder={hint || ""} style={{ width:"100%", padding:"9px 11px", paddingLeft:prefix ? 24 : 11, background:"#FFFFFF", border:"1px solid #E5E7EB", borderRadius:6, color:"#111827", fontSize:13, fontFamily:"'JetBrains Mono',monospace", outline:"none", boxSizing:"border-box" }} />
      </div>
    </div>
  );
}

export default function App() {
  const [f, setF] = useState({
    state: "GA",
    city: "",
    avgVisitRate: "",
    monthlyVisits: "105",
    grossRevOverride: "",
    useGross: false,
    healthIns: "500",
    ceBudget: "1500",
  });

  const handleChange = useCallback((e) => {
    setF(p => ({ ...p, [e.target.name]: e.target.value }));
  }, []);

  const [expLevel, setExp] = useState("moderate");
  const [step, setStep] = useState("input");

  const n = k => {
    const parsed = parseNumericInput(f[k]);
    if (parsed === null) return 0;
    return Math.max(0, parsed);
  };
  // Core calculations
  const avgRate = n("avgVisitRate");
  const monthlyVisits = n("monthlyVisits");
  const grossMonthly = f.useGross ? n("grossRevOverride") : avgRate * monthlyVisits;
  const grossAnnual = grossMonthly * 12;

  // Experience determines where in the 33-38% range they should land
  const expPct = {
    newgrad: { lo:0.30, hi:0.33, label:"New Grad — Year 1", note:"Investing in development. Expect net negative first 3-4 months while building their schedule. Their salary will be on the lower end because they require clinical mentorship and time to ramp up." },
    moderate: { lo:0.33, hi:0.36, label:"Moderate Experience — 1-3 yrs or Year 2", note:"Should reach schedule saturation by month 6-8. A good balance of affordability and experience. Most common hire for growing clinics." },
    experienced: { lo:0.35, hi:0.38, label:"Experienced — 3-5 yrs or Year 3", note:"Should have a consistent schedule quickly. They bring clinical skill and a patient following. Worth the higher salary for lower ramp-up risk." },
    senior: { lo:0.36, hi:0.38, label:"Senior — 5+ yrs or Year 4+", note:"Risk-off for the provider. Straight salary with no surprises. Golden handcuffs — create a position so good they never want to leave." },
  };

  const ep = expPct[expLevel];
  const salaryLo = Math.round(grossAnnual * ep.lo);
  const salaryHi = Math.round(grossAnnual * ep.hi);
  const salaryMid = Math.round((salaryLo + salaryHi) / 2);
  const salaryMonthlyLo = Math.round(salaryLo / 12);
  const salaryMonthlyHi = Math.round(salaryHi / 12);
  const salaryMonthlyMid = Math.round(salaryMid / 12);
  const salaryPctMid = grossAnnual > 0 ? (salaryMid / grossAnnual) * 100 : null;

  // Benefits & employer cost (calculated on midpoint salary)
  const healthAnnual = n("healthIns") * 12;
  const ceAnnual = n("ceBudget");
  const payrollTaxRate = 0.0765;
  const workersCompRate = 0.01;
  const payrollTaxes = salaryMid * payrollTaxRate;
  const workersComp = salaryMid * workersCompRate;
  const totalCostMid = salaryMid + healthAnnual + ceAnnual + payrollTaxes + workersComp;
  const totalCostPct = grossAnnual > 0 ? (totalCostMid / grossAnnual) * 100 : null;

  const totalCostLo = salaryLo + healthAnnual + ceAnnual + (salaryLo * payrollTaxRate) + (salaryLo * workersCompRate);
  const totalCostHi = salaryHi + healthAnnual + ceAnnual + (salaryHi * payrollTaxRate) + (salaryHi * workersCompRate);

  // Gross profit from this provider
  const grossProfit = grossAnnual - totalCostMid;
  const grossProfitPct = grossAnnual > 0 ? (grossProfit / grossAnnual) * 100 : null;
  const totalCostMonthlyMid = totalCostMid / 12;
  const netAfterBurdenMonthly = grossMonthly - totalCostMonthlyMid;

  // Health checks
  const compHealth = salaryPctMid === null ? "none" : salaryPctMid <= 33 ? "low" : salaryPctMid <= 38 ? "healthy" : salaryPctMid <= 42 ? "caution" : "critical";
  const totalHealth = totalCostPct === null ? "none" : totalCostPct <= 48 ? "healthy" : totalCostPct <= 52 ? "caution" : "critical";
  const healthColors = { healthy:B.green, caution:B.yellow, critical:B.red, low:B.blue, none:B.gray };
  const closeInputModal = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign("/dashboard");
    }
  };

  const handleDownload = () => {
    window.print();
  };

  const canCalc = grossMonthly > 0;
  const pageShellStyle = { maxWidth:980, margin:"0 auto", padding:"0 24px 64px" };
  const canvasStyle = {
    maxWidth: step === "input" ? 760 : 920,
    margin:"0 auto",
    padding:"24px 24px 26px",
    fontFamily:"'Barlow',sans-serif",
    color:"#111827",
    background:"#FFFFFF",
    border:"1px solid #E5E7EB",
    borderRadius:16,
    boxShadow:"0 4px 24px rgba(0, 0, 0, 0.08)",
  };
  const sectionStyle = {
    background:"#F3F4F6",
    borderRadius:14,
    padding:"18px 20px",
    marginBottom:14,
    border:"1px solid #E5E7EB",
  };

  // ── INPUT VIEW ──
  if (step === "input") {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: B.dark, padding: "24px 0 64px" }}>
        <style>{printStyles}</style>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid " + B.bdr }} className="no-print">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="grade-modal-badge" src={TOOL_BADGES.comp} alt="Compensation Calculator badge" />
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif" }}>
                  PT Biz Coach Tools
                </div>
                <h2 className="grade-modal-title" style={{ textAlign: "left", margin: 0 }}>Comp Calculator</h2>
                <p className="grade-modal-subtitle" style={{ textAlign: "left", margin: 0 }}>Find the right comp range before you hire</p>
              </div>
            </div>
            <button onClick={closeInputModal} style={{ background: "transparent", border: "1px solid " + B.bdr, borderRadius: 8, color: B.grayDk, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif" }}>← Back to Dashboard</button>
          </div>
          <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&family=Barlow:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
          <div style={pageShellStyle}>
              <div style={canvasStyle}>

        {/* Location */}
        <div style={sectionStyle}>
          <h3 style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:B.blue, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'Barlow Condensed',sans-serif" }}>Location</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <div style={{ marginBottom:10 }}>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#6B7280", marginBottom:3, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.08em" }}>State</label>
              <select name="state" value={f.state} onChange={handleChange} style={{ width:"100%", padding:"9px 11px", background:"#FFFFFF", border:"1px solid #E5E7EB", borderRadius:6, color:"#111827", fontSize:13, fontFamily:"'JetBrains Mono',monospace", outline:"none", boxSizing:"border-box" }}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Inp label="City (optional)" value={f.city} name="city" onChange={handleChange} hint="e.g. Denver" />
          </div>
        </div>

        {/* Revenue Inputs */}
        <div style={sectionStyle}>
          <h3 style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:B.blue, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'Barlow Condensed',sans-serif" }}>Provider Revenue</h3>
          <div style={{ display:"flex", gap:0, borderRadius:6, overflow:"hidden", border:"1px solid #E5E7EB", marginBottom:14 }}>
            {[["visits","Calculate from Visits"],["gross","Enter Gross Revenue"]].map(([v, lb]) => (
              <button key={v} onClick={() => setF(p => ({ ...p, useGross: v === "gross" }))} style={{ flex:1, padding:"9px 6px", background:(v === "gross") === f.useGross ? "#2E86F5" : "#F3F4F6", border:"none", color:(v === "gross") === f.useGross ? "#fff" : "#6B7280", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.04em" }}>{lb}</button>
            ))}
          </div>
          {!f.useGross ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
              <Inp label="Avg Visit Rate" value={f.avgVisitRate} name="avgVisitRate" onChange={handleChange} hint="e.g. 200" prefix="$" />
              <Inp label="Expected Monthly Visits" value={f.monthlyVisits} name="monthlyVisits" onChange={handleChange} hint="e.g. 105" />
            </div>
          ) : (
            <Inp label="Expected Monthly Gross Revenue" value={f.grossRevOverride} name="grossRevOverride" onChange={handleChange} hint="e.g. 20000" prefix="$" />
          )}
          {canCalc && (
            <div style={{ background:B.dark, borderRadius:6, padding:"10px 12px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <div style={{ fontSize:9, color:B.grayXDk, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Monthly Gross</div>
                <div style={{ fontSize:16, fontWeight:700, color:B.wht, fontFamily:"'JetBrains Mono',monospace" }}>{$(grossMonthly)}</div>
              </div>
              <div>
                <div style={{ fontSize:9, color:B.grayXDk, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Annual Gross</div>
                <div style={{ fontSize:16, fontWeight:700, color:B.wht, fontFamily:"'JetBrains Mono',monospace" }}>{$(grossAnnual)}</div>
              </div>
            </div>
          )}
          {!f.useGross && avgRate > 0 && avgRate < 170 && (
            <div style={{ background:"#F8717115", border:"1px solid #F8717133", borderRadius:6, padding:"10px 12px", marginTop:10 }}>
              <div style={{ fontSize:11, color:B.red, fontWeight:600 }}>⚠️ Average visit rate below $170</div>
              <div style={{ fontSize:10, color:B.grayDk, marginTop:2 }}>At this rate, it&apos;s very difficult to hire talented providers and maintain profitability. Consider raising your visit rate before hiring.</div>
            </div>
          )}
        </div>

        {/* Experience Level */}
        <div style={sectionStyle}>
          <h3 style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:B.blue, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'Barlow Condensed',sans-serif" }}>Experience Level</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              ["newgrad","New Grad","Year 1, needs mentorship"],
              ["moderate","1-3 Yrs Exp","Or Year 2 of a new grad"],
              ["experienced","3-5 Yrs Exp","Or Year 3 of a new grad"],
              ["senior","5+ Yrs / Senior","Established clinician"],
            ].map(([v, lb, sub]) => (
              <button key={v} onClick={() => setExp(v)} style={{ padding:"10px 10px", background:expLevel === v ? B.blue + "20" : B.dark, border:"1px solid " + (expLevel === v ? B.blue : B.bdr), borderRadius:6, cursor:"pointer", textAlign:"left" }}>
                <div style={{ fontSize:12, fontWeight:700, color:expLevel === v ? B.blue : B.wht, fontFamily:"'Barlow Condensed',sans-serif" }}>{lb}</div>
                <div style={{ fontSize:9, color:B.grayXDk, marginTop:2 }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div style={{ ...sectionStyle, marginBottom:20 }}>
          <h3 style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:B.blue, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'Barlow Condensed',sans-serif" }}>Benefits</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <Inp label="Health Insurance (monthly)" value={f.healthIns} name="healthIns" onChange={handleChange} hint="e.g. 500" prefix="$" />
            <Inp label="CE Budget (annual)" value={f.ceBudget} name="ceBudget" onChange={handleChange} hint="e.g. 1500" prefix="$" />
          </div>
          <div style={{ fontSize:10, color:B.grayXDk, fontStyle:"italic" }}>Cover 100% of employee premium. Biggest retention driver after salary.</div>
        </div>

        <button onClick={() => canCalc && setStep("results")} disabled={!canCalc} style={{ width:"100%", padding:"14px", background:canCalc ? B.blue : B.bdr, border:"none", borderRadius:10, color:canCalc ? "#fff" : B.grayXDk, fontSize:15, fontWeight:700, cursor:canCalc ? "pointer" : "not-allowed", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.06em", boxShadow:canCalc ? "0 4px 20px " + B.glow : "none" }}>Calculate Compensation →</button>
      </div>
    </div>
  );
}
  // ── RESULTS VIEW ──
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#FAFAFB", padding: "24px 0 64px" }}>
      <style>{printStyles}</style>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #E5E7EB" }} className="no-print">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="grade-modal-badge" src={TOOL_BADGES.comp} alt="Compensation Calculator badge" />
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif" }}>
                PT Biz Coach Tools
              </div>
              <h2 className="grade-modal-title" style={{ textAlign: "left", margin: 0 }}>Comp Results</h2>
              <p className="grade-modal-subtitle" style={{ textAlign: "left", margin: 0 }}>Compensation guidance with total cost clarity</p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }} className="no-print">
          <button onClick={() => setStep("input")} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 12 }}>← Edit numbers</button>
          <button onClick={handleDownload} style={{ background: B.blue, border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 20px", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>📥 Download Report</button>
        </div>
        <div style={pageShellStyle}>
          <div style={canvasStyle}>
      <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginBottom:20 }}>
        <span style={{ fontSize:10, fontWeight:700, color:"#7C3AED", background:"#7C3AED15", padding:"3px 10px", borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.08em", border:"1px solid #7C3AED33" }}>{expLevel === "newgrad" ? "NEW GRAD" : expLevel === "moderate" ? "1-3 YRS" : expLevel === "experienced" ? "3-5 YRS" : "SENIOR"}</span>
        <span style={{ fontSize:10, fontWeight:700, color:"#059669", background:"#05966915", padding:"3px 10px", borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.08em", border:"1px solid #05966933" }}>{$(grossMonthly)}/MO GROSS</span>
      </div>

      {/* Recommended Salary */}
      <div style={{ ...sectionStyle, borderRadius:16, padding:"22px 24px", marginBottom:20 }}>
        <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontStyle:"italic", fontSize:18, fontWeight:700, color:B.wht, margin:"0 0 16px" }}>Recommended Salary</h3>

        <div style={{ background:B.dark, borderRadius:12, padding:"20px", marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:10, color:B.grayDk, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Annual Salary Range</div>
          <div style={{ fontSize:32, fontWeight:800, color:B.green, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"-0.02em" }}>
            {$k(salaryLo)} – {$k(salaryHi)}
          </div>
          <div style={{ fontSize:13, color:B.gray, fontFamily:"'JetBrains Mono',monospace", marginTop:6 }}>
            {$(salaryMonthlyLo)} – {$(salaryMonthlyHi)}<span style={{ fontSize:11, color:B.grayXDk }}> /month</span>
          </div>
          <div style={{ fontSize:11, color:B.grayDk, marginTop:8 }}>
            {(ep.lo * 100).toFixed(0)}–{(ep.hi * 100).toFixed(0)}% of {$(grossAnnual)} gross revenue
          </div>
        </div>

        {/* Visual range bar */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:B.grayXDk, marginBottom:4 }}>
            <span>Under-paying</span>
            <span>Healthy Range (33–38%)</span>
            <span>Over-paying</span>
          </div>
          <div style={{ height:10, borderRadius:5, background:B.dark, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", left:"22%", width:"10%", height:"100%", background:B.blue + "40" }} />
            <div style={{ position:"absolute", left:"32%", width:"12%", height:"100%", background:B.green + "60" }} />
            <div style={{ position:"absolute", left:"44%", width:"8%", height:"100%", background:B.yellow + "40" }} />
            <div style={{ position:"absolute", left:"52%", width:"8%", height:"100%", background:B.red + "30" }} />
          </div>
          {salaryPctMid !== null && (
            <div style={{ position:"relative", height:14 }}>
              <div style={{ position:"absolute", left:`${Math.min(Math.max(salaryPctMid / 50 * 100, 3), 97)}%`, transform:"translateX(-50%)", fontSize:9, color:healthColors[compHealth], fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>▲ {pf(salaryPctMid)}</div>
            </div>
          )}
        </div>

        {/* Monthly breakdown */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
          <div style={{ background:B.bg, borderRadius:6, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:B.grayXDk, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Provider Grosses</div>
            <div style={{ fontSize:15, fontWeight:700, color:B.wht, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{$(grossMonthly)}/mo</div>
          </div>
          <div style={{ background:B.bg, borderRadius:6, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:B.grayXDk, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>You Pay Them</div>
            <div style={{ fontSize:15, fontWeight:700, color:B.green, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{$(salaryMonthlyMid)}/mo</div>
          </div>
          <div style={{ background:B.bg, borderRadius:6, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:B.grayXDk, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Left After Total Cost</div>
            <div style={{ fontSize:15, fontWeight:700, color:netAfterBurdenMonthly > 0 ? B.wht : B.red, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{$(netAfterBurdenMonthly)}/mo</div>
          </div>
        </div>

        <div style={{ background:B.blue + "10", border:"1px solid " + B.blue + "33", borderRadius:6, padding:"10px 14px" }}>
          <div style={{ fontSize:10, color:B.blue, fontWeight:600, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", marginBottom:2 }}>Coaching Note</div>
          <div style={{ fontSize:11, color:B.gray, lineHeight:1.5 }}>{ep.note}</div>
        </div>
      </div>

      {/* True Cost to Employer */}
      <div style={{ ...sectionStyle, borderRadius:16, padding:"22px 24px", marginBottom:20 }}>
        <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontStyle:"italic", fontSize:18, fontWeight:700, color:B.wht, margin:"0 0 4px" }}>True Cost to Employer</h3>
        <div style={{ fontSize:10, color:B.grayXDk, marginBottom:16, fontStyle:"italic" }}>Based on midpoint salary of {$(salaryMid)}</div>

        {[
          { l:"Salary", v:salaryMid, pct:salaryPctMid, c:healthColors[compHealth] },
          { l:"Employer Payroll Taxes (7.65%)", v:payrollTaxes, pct:grossAnnual > 0 ? payrollTaxes/grossAnnual*100 : null },
          { l:"Workers Comp (\~1%)", v:workersComp, pct:grossAnnual > 0 ? workersComp/grossAnnual*100 : null },
          { l:"Health Insurance", v:healthAnnual, pct:grossAnnual > 0 ? healthAnnual/grossAnnual*100 : null },
          { l:"Continuing Education", v:ceAnnual, pct:grossAnnual > 0 ? ceAnnual/grossAnnual*100 : null },
        ].map((row, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i < 4 ? "1px solid " + B.bdr : "none" }}>
            <span style={{ fontSize:12, color:B.gray }}>{row.l}</span>
            <div style={{ textAlign:"right" }}>
              <span style={{ fontSize:13, fontWeight:600, color:row.c || B.wht, fontFamily:"'JetBrains Mono',monospace" }}>{$(row.v)}</span>
              <span style={{ fontSize:10, color:B.grayXDk, marginLeft:8, fontFamily:"'JetBrains Mono',monospace" }}>{pf(row.pct)}</span>
            </div>
          </div>
        ))}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0 6px", marginTop:8, borderTop:"2px solid " + B.bdr }}>
          <span style={{ fontSize:13, fontWeight:700, color:B.wht, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Total Cost to Employer</span>
          <div style={{ textAlign:"right" }}>
            <span style={{ fontSize:20, fontWeight:700, color:healthColors[totalHealth], fontFamily:"'JetBrains Mono',monospace" }}>{$(totalCostMid)}</span>
            <span style={{ fontSize:12, color:healthColors[totalHealth], marginLeft:8, fontFamily:"'JetBrains Mono',monospace" }}>{pf(totalCostPct)}</span>
          </div>
        </div>
        <div style={{ fontSize:10, color:B.grayXDk, marginBottom:12 }}>Range: {$(totalCostLo)} – {$(totalCostHi)} depending on where salary lands</div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0 0", borderTop:"1px solid " + B.bdr }}>
          <span style={{ fontSize:13, fontWeight:700, color:B.wht, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Gross Profit from This Provider</span>
          <div style={{ textAlign:"right" }}>
            <span style={{ fontSize:20, fontWeight:700, color:grossProfit >= 0 ? B.green : B.red, fontFamily:"'JetBrains Mono',monospace" }}>{$(grossProfit)}</span>
            <span style={{ fontSize:12, color:grossProfit >= 0 ? B.green : B.red, marginLeft:8, fontFamily:"'JetBrains Mono',monospace" }}>{pf(grossProfitPct)}</span>
          </div>
        </div>
        <div style={{ fontSize:10, color:B.grayXDk, marginTop:6, fontStyle:"italic" }}>
          This contributes to fixed costs (rent, admin, software, etc.) and net profit. Each additional provider shares the same fixed costs — making each one more profitable.
        </div>
      </div>

      {/* All Tiers Comparison */}
      <div style={{ ...sectionStyle, borderRadius:16, padding:"22px 24px", marginBottom:20 }}>
        <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontStyle:"italic", fontSize:18, fontWeight:700, color:B.wht, margin:"0 0 14px" }}>All Experience Levels at {$(grossMonthly)}/mo</h3>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:"2px solid " + B.bdr }}>
                {["Level","Monthly","Annual","% of Gross","True Cost"].map(h => (
                  <th key={h} style={{ padding:"8px 8px", textAlign:h === "Level" ? "left" : "right", fontSize:10, fontWeight:700, color:B.grayDk, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(expPct).map(([k, t]) => {
                const mid = Math.round(grossAnnual * (t.lo + t.hi) / 2);
                const mo = Math.round(mid / 12);
                const pct = grossAnnual > 0 ? (mid / grossAnnual) * 100 : null;
                const tc = mid + healthAnnual + ceAnnual + (mid * payrollTaxRate) + (mid * workersCompRate);
                const c = pct === null ? B.gray : pct <= 33 ? B.blue : pct <= 38 ? B.green : pct <= 42 ? B.yellow : B.red;
                return (
                  <tr key={k} style={{ borderBottom:"1px solid " + B.bdr + "44", background:k === expLevel ? B.blue + "10" : "transparent" }}>
                    <td style={{ padding:"10px 8px", color:k === expLevel ? B.blue : B.gray, fontWeight:k === expLevel ? 700 : 400 }}>{k === "newgrad" ? "New Grad" : k === "moderate" ? "1-3 Yrs" : k === "experienced" ? "3-5 Yrs" : "Senior"}</td>
                    <td style={{ padding:"10px 8px", textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:B.wht }}>{$(mo)}</td>
                    <td style={{ padding:"10px 8px", textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:B.wht, fontWeight:700 }}>{$k(mid)}</td>
                    <td style={{ padding:"10px 8px", textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:c, fontWeight:600 }}>{pf(pct)}</td>
                    <td style={{ padding:"10px 8px", textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:B.grayDk }}>{$k(tc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize:10, color:B.grayXDk, marginTop:10, fontStyle:"italic" }}>True cost includes salary + payroll taxes + workers comp + health insurance + CE budget.</div>
      </div>

      {/* Key Rules */}
      <div style={{ ...sectionStyle, borderRadius:16, padding:"22px 24px", marginBottom:20 }}>
        <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontStyle:"italic", fontSize:18, fontWeight:700, color:B.wht, margin:"0 0 14px" }}>Compensation Rules</h3>
        {[
          { rule:"Total comp should be 33–38% of the gross revenue the provider generates", status:compHealth },
          { rule:"Cover 100% of employee health insurance premium — biggest retention tool", status:"healthy" },
          { rule:"Hire employees, not contractors — stability reduces turnover", status:"healthy" },
          { rule:"Expect 3-4 months net negative when onboarding a new provider", status:"healthy" },
          { rule:"105 visits/month is a stabilized schedule — not a starting point", status:"healthy" },
          { rule:"Average visit rate needs to be $170+ to hire profitably", status:f.useGross ? "none" : (avgRate > 0 && avgRate < 170 ? "critical" : "healthy") },
          { rule:"Give providers stability — make the job too good to leave", status:"healthy" },
        ].map((r, i) => (
          <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:i < 6 ? "1px solid " + B.bdr + "44" : "none" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:B.blue, flexShrink:0, marginTop:5 }} />
            <span style={{ fontSize:12, color:B.gray, lineHeight:1.5, flex:1 }}>{r.rule}</span>
            <span style={{ fontSize:8, fontWeight:700, color:healthColors[r.status], fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", flexShrink:0, marginTop:3 }}>
              {r.status === "healthy" ? "✓" : r.status === "caution" ? "⚠" : r.status === "critical" ? "✗" : "—"}
            </span>
          </div>
        ))}
      </div>

      <button onClick={() => setStep("input")} style={{ width:"100%", padding:"14px", background:B.surf, border:"1px solid " + B.bdr, borderRadius:10, color:B.gray, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.06em" }}>← Edit Inputs</button>
      </div>
    </div>
  );
}
