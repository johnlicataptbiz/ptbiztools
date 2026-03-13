"use client";
/* eslint-disable react/no-unescaped-entities, @next/next/no-page-custom-font, @typescript-eslint/no-unused-vars */
import { useState, useRef, useCallback } from "react";
import { extractDannyPLFromPdf, logAction, savePdfExport } from "@/lib/ptbiz-api";
import { PTBIZ_LOGO_DARK_BG_URL } from "@/constants/branding";
import { TOOL_BADGES } from "@/constants/tool-badges";
import { ClinicIcon } from "@/components/clinic/ClinicIcon";
import { ClinicBackground } from "@/components/clinic/ClinicBackgrounds";
import { CLINIC_SVGS } from "@/constants/clinic-svgs";
import "@/styles/danny-tools.css";

// Print styles - hide UI elements when printing
const printStyles = `
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; }
    #pl-report-print-root { 
      box-shadow: none !important; 
      border: none !important;
    }
  }
`;

// Dark theme color palette
const B = { blue:"#2E86F5", blueLt:"#5BA0F7", blueDk:"#1A6AD4", glow:"rgba(46,134,245,0.25)", dark:"#1A1A1E", surf:"#242428", bdr:"#35353A", bdrLt:"#45454B", wht:"#F5F5F7", gray:"#9A9AA0", grayDk:"#6A6A70", grayXDk:"#4A4A50" };
const REF = { rev:961260, rent:46807, util:4909, staff:278433, ptax:25785, ben:15596, owner:61539, mkt:58137, merch:28764, sw:11489, dues:15967, oSup:10109, ptSup:7172, med:0, prof:16874, cont:0, ins:5092, ce:3170, meal:5157, trav:5348, int:2095, oth:8721 };

const BM = [
  { k:"facilityPct", l:"Facility Costs", d:"Rent + utilities", h:[0,8], ca:[8,10], cr:[10,100] },
  { k:"peoplePct", l:"Total People Cost (Non-Owner)", d:"Staff wages + taxes + benefits", h:[0,42], ca:[42,45], cr:[45,100] },
  { k:"ownerPct", l:"Owner's Compensation", d:"W-2 salary (S-corp distributions come from net profit)", h:[5,15], ca:[2,5], caHi:[15,20], cr:[0,2], crHi:[20,100], band:true },
  { k:"mktPct", l:"Marketing & Advertising", d:"Ads, agency, tools, SEO", h:[3,8], ca:[1,3], caHi:[8,12], cr:[0,1], crHi:[12,100], band:true },
  { k:"merchPct", l:"Merchant / CC Fees", d:"Payment processing", h:[0,2.5], ca:[2.5,3], cr:[3,100] },
  { k:"swPct", l:"Software & Tech", d:"EMR, scheduling, CRM", h:[0,2.5], ca:[2.5,3], cr:[3,100] },
  { k:"supPct", l:"Supplies & Equipment", d:"Office + PT supplies", h:[0,2.5], ca:[2.5,3], cr:[3,100] },
  { k:"profPct", l:"Professional & Contracted Svcs", d:"Accounting, legal, consulting", h:[0,3], ca:[3,4], cr:[4,100] },
  { k:"medPct", l:"Medical Billing Fees", d:"Third-party billing", h:[0,1.5], ca:[1.5,2], cr:[2,100] },
  { k:"duesPct", l:"Dues & Subscriptions", d:"Memberships, associations", h:[0,1.5], ca:[1.5,2], cr:[2,100] },
  { k:"mealPct", l:"Meals & Entertainment", d:"Business meals, events", h:[0,0.8], ca:[0.8,1], cr:[1,100] },
  { k:"travPct", l:"Travel & Auto", d:"Travel, vehicle expenses", h:[0,1.5], ca:[1.5,2], cr:[2,100] },
  { k:"intPct", l:"Interest / Debt Service", d:"Loan interest, credit lines", h:[0,0.8], ca:[0.8,1], cr:[1,100] },
  { k:"insPct", l:"Insurance", d:"Liability, malpractice", h:[0,1.5], ca:[1.5,2], cr:[2,100] },
  { k:"netPct", l:"Net Profit Margin", d:"Bottom line after all expenses", h:[15,100], ca:[10,15], cr:[0,10], inv:true },
  { k:"odePct", l:"Owner's Discretionary Earnings", d:"Net income + owner comp + depreciation", h:[20,35], ca:[15,20], caHi:[35,45], cr:[0,15], crHi:[45,100], band:true },
];

function adjustBM(ct, pm, bp) {
  const ov = {};
  if (ct === "solo") {
    ov.peoplePct = { h:[0,35], ca:[35,42], cr:[42,100] };
    ov.facilityPct = { h:[0,8], ca:[8,11], cr:[11,100] };
  }
  if (pm === "hybrid") {
    ov.medPct = { h:[0,5], ca:[5,7], cr:[7,100] };
    ov.swPct = { h:[0,4], ca:[4,6], cr:[6,100] };
    if (ct !== "solo") {
      ov.peoplePct = { h:[0,45], ca:[45,55], cr:[55,100] };
    }
  } else {
    if (ct === "solo") {
      ov.peoplePct = { h:[0,33], ca:[33,40], cr:[40,100] };
    } else {
      ov.peoplePct = { h:[0,35], ca:[35,45], cr:[45,100] };
    }
  }
  if (bp === "growth") {
    ov.netPct = { h:[10,100], ca:[5,10], cr:[0,5], inv:true };
    ov.odePct = { h:[15,35], ca:[10,15], caHi:[35,45], cr:[0,10], crHi:[45,100], band:true };
  }
  return BM.map(bm => ov[bm.k] ? { ...bm, ...ov[bm.k] } : bm);
}

function getTargets(ct, pm, bp) {
  const isCashSolo = pm === "cash" && ct === "solo";
  const isCashMulti = pm === "cash" && ct !== "solo";
  return {
    peopleTgt: isCashSolo ? "<33%" : isCashMulti ? "<35%" : ct === "solo" ? "<35%" : "<45%",
    facilityTgt: ct === "solo" ? "<8%" : "<10%",
    staffTgt: isCashSolo ? "<28%" : ct === "solo" ? "<30%" : "<40%",
    payrollTgt: ct === "solo" ? "<4%" : "<5%",
    medTgt: pm === "hybrid" ? "<5%" : "<2%",
    swTgt: pm === "hybrid" ? "<4%" : "<3%",
    rentTgt: ct === "solo" ? "3–8%" : "5–10%",
    netTgt: bp === "growth" ? "≥10%" : "≥15%",
    odeTgt: bp === "growth" ? "15–35%" : "20–35%",
  };
}

function stat(v, bm) {
  if (v === null || v === undefined || isNaN(v)) return "none";
  const x = parseFloat(v);
  if (bm.inv) return x >= bm.h[0] ? "healthy" : x >= bm.ca[0] ? "caution" : "critical";
  if (bm.band) {
    if (x >= bm.h[0] && x <= bm.h[1]) return "healthy";
    if ((x >= bm.ca[0] && x < bm.h[0]) || (bm.caHi && x > bm.h[1] && x <= bm.caHi[1])) return "caution";
    return "critical";
  }
  return (x >= bm.h[0] && x <= bm.h[1]) ? "healthy" : (x >= bm.ca[0] && x <= bm.ca[1]) ? "caution" : "critical";
}

const SX = {
  healthy: { bg:"#ECFDF5", tx:"#059669", ac:"#047857", lb:"HEALTHY" },
  caution: { bg:"#FFFBEB", tx:"#D97706", ac:"#B45309", lb:"CAUTION" },
  critical: { bg:"#FEF2F2", tx:"#DC2626", ac:"#B91C1C", lb:"CRITICAL" },
  none: { bg:B.surf, tx:B.gray, ac:B.grayXDk, lb:"—" }
};
const PSX = { healthy:"#047857", caution:"#B45309", critical:"#DC2626", none:"#6B7280" };
const $ = v => (!v && v !== 0) ? "" : new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
const pf = v => (v === null || v === undefined || isNaN(v)) ? "—" : parseFloat(v).toFixed(1) + "%";
const EMPTY_FORM = {
  revenue:"", rent:"", utilities:"", staffWages:"", contractLabor:"", payrollTaxes:"", payrollFees:"", benefits:"",
  ownerComp:"", marketing:"", merchantFees:"", software:"", duesSubs:"", officeSupplies:"", ptSupplies:"",
  medBilling:"", profFees:"", contractedSvcs:"", insurance:"", ce:"", mealsEnt:"", travelAuto:"",
  interest:"", depreciation:"", other:"",
};

function mapExtractedToDannyForm(extracted) {
  const next = { ...EMPTY_FORM };
  let mappedCount = 0;
  const apply = (field, value) => {
    const numeric = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(numeric)) {
      next[field] = Math.round(Math.abs(numeric)).toString();
      mappedCount += 1;
    }
  };

  [
    "revenue", "rent", "utilities", "staffWages", "contractLabor", "payrollTaxes", "payrollFees", "benefits",
    "ownerComp", "marketing", "merchantFees", "software", "duesSubs", "officeSupplies", "ptSupplies",
    "medBilling", "profFees", "contractedSvcs", "insurance", "ce", "mealsEnt", "travelAuto", "interest",
    "depreciation", "other",
  ].forEach((field) => apply(field, extracted?.[field]));

  return { next, mappedCount };
}

function Logo({ big }) {
  const h = big ? 30 : 22;
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PTBIZ_LOGO_DARK_BG_URL} alt="PT Biz" style={{ height:h, width:"auto", objectFit:"contain" }} />
    </div>
  );
}

function Gauge({ value, bm, apVal }) {
  const s = stat(value, bm);
  const c = SX[s];
  const dv = (value !== null && !isNaN(value)) ? parseFloat(value) : null;
  const mx = bm.inv ? 60 : 20;
  const w = dv !== null ? Math.min((dv / mx) * 100, 100) : 0;
  const aw = apVal !== null ? Math.min((apVal / mx) * 100, 100) : 0;
  /** @type {import("react").CSSProperties & { "--clinic-kpi": string }} */
  const gaugeStyle = {
    marginBottom: 12,
    padding: "12px 16px",
    background: c.bg,
    borderRadius: 8,
    border: `1px solid ${c.ac}33`,
    position: "relative",
    "--clinic-kpi": `url(${CLINIC_SVGS.kpiTexture})`,
  };

  return (
    <div className="clinic-icon-hover clinic-pattern-kpi" style={gaugeStyle}>
      <ClinicIcon name="kpiTexture" size={16} style={{ position: 'absolute', top: 4, right: 8, opacity: 0.3 }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, flexWrap:"wrap", gap:4 }}>
        <div style={{ flex:"1 1 auto", minWidth:0 }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:14, color:B.wht, textTransform:"uppercase", letterSpacing:"0.02em" }}>{bm.l}</span>
          <span style={{ fontSize:10, color:B.grayDk, marginLeft:8 }}>{bm.d}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:c.tx }}>{dv !== null ? pf(dv) : "—"}</span>
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:c.tx, background:`${c.ac}22`, padding:"2px 7px", borderRadius:3, fontFamily:"'Barlow Condensed',sans-serif" }}>{c.lb}</span>
        </div>
      </div>
      <div style={{ position:"relative", height:5, background:B.bdr, borderRadius:3, overflow:"visible" }}>
        <div style={{ height:"100%", width:`${w}%`, background:`linear-gradient(90deg,${c.ac},${c.tx})`, borderRadius:3, transition:"width 0.8s ease" }} />
        {apVal !== null && <div style={{ position:"absolute", top:-4, left:`${aw}%`, width:2, height:13, background:B.blue, borderRadius:1, opacity:0.8 }} />}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:3, fontSize:9, fontFamily:"'JetBrains Mono',monospace" }}>
        {bm.inv
          ? <><span style={{ color:B.grayXDk }}>0%</span><span style={{ color:"#059669" }}>Target: ≥{bm.h[0]}%</span></>
          : bm.band
            ? <><span style={{ color:"#059669" }}>Target: {bm.h[0]}–{bm.h[1]}%</span>{apVal !== null && <span style={{ color:B.blue }}>▮ Top: {pf(apVal)}</span>}</>
            : <><span style={{ color:"#059669" }}>Target: &lt;{bm.h[1]}%</span>{apVal !== null && <span style={{ color:B.blue }}>▮ Top: {pf(apVal)}</span>}</>
        }
      </div>
    </div>
  );
}

function Inp({ label, value, name, onChange, hint }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:600, color:B.gray, marginBottom:3, fontFamily:"'Barlow',sans-serif", textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</label>
      <div style={{ display:"flex", alignItems:"center", background:B.dark, border:`1px solid ${B.bdr}`, borderRadius:6, overflow:"hidden" }}>
        <span style={{ padding:"7px 0 7px 10px", color:B.grayXDk, fontSize:13, fontFamily:"'JetBrains Mono',monospace" }}>$</span>
        <input type="number" name={name} value={value} onChange={onChange} placeholder="0" style={{ flex:1, padding:"9px 10px", background:"transparent", border:"none", outline:"none", color:B.wht, fontSize:14, fontFamily:"'JetBrains Mono',monospace", width:"100%" }} />
      </div>
      {hint && <span style={{ fontSize:9, color:B.grayXDk, marginTop:1, display:"block" }}>{hint}</span>}
    </div>
  );
}

function Ring({ score, size }) {
  const sz = size || 120;
  const r = (sz - 16) / 2;
  const circ = 2 * Math.PI * r;
  const prog = (score / 100) * circ;
  const clr = score >= 80 ? "#34D399" : score >= 60 ? "#FBBF24" : "#F87171";
  const g = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F";
  return (
    <div style={{ position:"relative", width:sz, height:sz, flexShrink:0 }}>
      <svg width={sz} height={sz} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={B.bdr} strokeWidth="8" />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={clr} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - prog} style={{ transition:"stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, fontWeight:800, color:clr, lineHeight:1 }}>{g}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:B.grayDk, marginTop:2 }}>{score}/100</span>
      </div>
    </div>
  );
}

function calcScore(m, bp) {
  let s = 100;
  const netCrit = bp === "growth" ? 5 : 10;
  const netCaution = bp === "growth" ? 10 : 15;
  const rules = [
    [m.facilityPct, v => v > 10 ? -12 : v > 8 ? -6 : 0],
    [m.peoplePct, v => v > 45 ? -15 : v > 42 ? -8 : 0],
    [m.ownerPct, v => v < 2 ? -8 : v > 20 ? -6 : (v >= 5 && v <= 15) ? 0 : -3],
    [m.mktPct, v => v < 1 ? -6 : v > 12 ? -10 : (v >= 3 && v <= 8) ? 0 : -3],
    [m.profPct, v => v > 4 ? -8 : v > 3 ? -4 : 0],
    [m.intPct, v => v > 1 ? -10 : v > 0.8 ? -4 : 0],
    [m.merchPct, v => v > 3 ? -4 : v > 2.5 ? -2 : 0],
    [m.supPct, v => v > 3 ? -4 : v > 2.5 ? -2 : 0],
    [m.mealPct, v => v > 1 ? -3 : v > 0.8 ? -1 : 0],
    [m.netPct, v => v < netCrit ? -12 : v < netCaution ? -6 : 0],
    [m.odePct, v => v < 15 ? -10 : (v >= 20 && v <= 35) ? 0 : v < 20 ? -4 : v > 45 ? -4 : 0],
  ];
  rules.forEach(([v, fn]) => { if (v !== null && v !== undefined && !isNaN(v)) s += fn(v); });
  return Math.max(0, Math.min(100, s));
}

function makeRecs(m, bp) {
  const r = [];
  const netTarget = bp === "growth" ? 10 : 15;
  const add = (p, cat, icon, title, detail) => r.push({ p, cat, icon, title, detail });
  if (m.ownerPct !== null && m.ownerPct < 2) add("HIGH","COMPENSATION","💰","Establish Owner Compensation","Owner compensation at " + pf(m.ownerPct) + " is unsustainable. As an S-corp, target a reasonable W-2 salary of 5-15% of revenue. Additional returns should come through distributions from net profit.");
  else if (m.ownerPct !== null && m.ownerPct >= 2 && m.ownerPct < 5) add("MED","COMPENSATION","💰","Increase Owner Compensation","Owner comp at " + pf(m.ownerPct) + " is below the 5-15% target. Ensure your W-2 salary reflects a reasonable wage for your role to stay compliant with S-corp requirements.");
  if (m.peoplePct > 55) add("HIGH","HUMAN RESOURCES","👥","Optimize Labor Costs","People costs at " + pf(m.peoplePct) + " are critical. Conduct a productivity audit — review clinician utilization rates, admin-to-clinician ratios, and shift to production-based compensation where possible.");
  else if (m.peoplePct > 45) add("MED","HUMAN RESOURCES","👥","Review Staffing Efficiency","At " + pf(m.peoplePct) + ", people costs have room for improvement. Review provider schedules for utilization gaps and evaluate whether admin roles can be consolidated.");
  if (m.netPct !== null && m.netPct < netTarget) add(m.netPct < (bp === "growth" ? 5 : 8) ? "HIGH" : "MED","PROFITABILITY","📊","Improve Net Profit Margin","Net margin at " + pf(m.netPct) + (bp === "growth" ? " is low even for a growth-phase clinic. Target " + netTarget + "%+ while scaling." : " puts the business at risk. Target " + netTarget + "%+.") + " Identify and eliminate non-essential expenses and review service pricing.");
  if (m.facilityPct > 10) add(m.facilityPct > 13 ? "HIGH" : "MED","FIXED COSTS","🏢","Audit Facility Expenses","Facility costs at " + pf(m.facilityPct) + " exceed the 10% target. Clinics above 10% of revenue in facility costs struggle to achieve healthy net profitability. Evaluate lease terms, space utilization, and sub-leasing opportunities.");
  if (m.profPct > 4) add(m.profPct > 7 ? "HIGH" : "MED","VENDOR MANAGEMENT","📋","Reduce Professional Service Costs","Professional services at " + pf(m.profPct) + " — audit every vendor for ROI. Top clinics run under 2%.");
  if (m.intPct > 1) add(m.intPct > 3 ? "HIGH" : "MED","DEBT MANAGEMENT","🏦","Address Debt Service","Interest at " + pf(m.intPct) + " — explore refinancing and create an accelerated payoff plan.");
  if (m.mktPct !== null && m.mktPct < 1) add("MED","GROWTH","📣","Increase Marketing Investment","At " + pf(m.mktPct) + ", marketing is critically underinvested. PT clinics can grow efficiently with 3-8% of revenue in marketing spend.");
  if (m.mktPct !== null && m.mktPct > 12) add("HIGH","GROWTH","📣","Audit Marketing ROI","At " + pf(m.mktPct) + ", marketing spend needs a cost-per-acquisition analysis. PT clinics should be able to grow effectively at 3-8%.");
  if (m.odePct !== null && m.odePct < 15) add("HIGH","PROFITABILITY","⚠️","Owner's Discretionary Earnings Critical","At " + pf(m.odePct) + " ODE (net income + owner comp + depreciation), the business is generating insufficient total return. Target 20-35% through a combination of expense reduction and revenue optimization.");
  if (m.supPct > 3) add("LOW","OPERATIONS","📦","Review Supply Costs","Supplies at " + pf(m.supPct) + " exceed the 3% target.");
  if (m.merchPct > 3) add("LOW","OPERATIONS","💳","Negotiate Merchant Rates","Processing at " + pf(m.merchPct) + " — renegotiate or switch to save 0.5-1%.");
  if (m.netPct !== null && m.netPct >= 20) add("INFO","GROWTH","🎯","Strong Position — Plan Next Move","At " + pf(m.netPct) + " net margin, consider reinvesting, expanding, or hiring a clinic director.");
  return r.sort((a, b) => ({ HIGH:0, MED:1, LOW:2, INFO:3 }[a.p] || 9) - ({ HIGH:0, MED:1, LOW:2, INFO:3 }[b.p] || 9));
}

function makePlan(rev, m, pm) {
  if (!rev || rev <= 0) return null;
  const phases = [];
  let total = 0;
  const rnd = v => Math.round(v / 500) * 500;

  // Phase 1
  let p1 = [];
  let p1$ = 0;
  if (m.peoplePct !== null && m.peoplePct > 45) {
    const gap = Math.min(m.peoplePct - 45, 10);
    const sv = rnd(gap * 0.25 * rev / 100);
    p1.push("Perform a line-item audit of payroll. At " + pf(m.peoplePct) + ", people costs are " + Math.round(m.peoplePct - 45) + " points above target. Review clinician utilization rates, evaluate admin-to-clinician ratios, and shift to production-based compensation where possible.");
    p1$ += sv;
  }
  if (m.profPct !== null && m.profPct > 4) {
    const sv = rnd((m.profPct - 4) * 0.4 * rev / 100);
    p1.push("Audit all professional and contracted services at " + pf(m.profPct) + ". Review every vendor contract, eliminate redundant services, and renegotiate terms.");
    p1$ += sv;
  }
  if (m.supPct !== null && m.supPct > 3) {
    const sv = rnd((m.supPct - 3) * 0.4 * rev / 100);
    p1.push("Review supplies spending at " + pf(m.supPct) + ". Consolidate vendors and negotiate bulk pricing.");
    p1$ += sv;
  }
  if (p1.length === 0) {
    p1.push("Review all recurring expenses for optimization. Even healthy clinics find 2-3% in savings through vendor renegotiation.");
    p1$ = rnd(rev * 0.02);
  }
  phases.push({ days:"1–30", title:"Labor & Expense Rationalization", actions:p1, impact:p1$ });
  total += p1$;

  // Phase 2
  let p2 = [];
  let p2$ = 0;
  if (m.facilityPct !== null && m.facilityPct > 10) {
    const sv = rnd((m.facilityPct - 10) * 0.35 * rev / 100);
    p2.push("Renegotiate facility lease or identify sub-leasing opportunities. Facility costs at " + pf(m.facilityPct) + " exceed the 10% target. Clinics above 10% struggle to maintain healthy profitability.");
    p2$ += sv;
  }
  if (m.intPct !== null && m.intPct > 1) {
    const sv = rnd((m.intPct - 1) * 0.3 * rev / 100);
    p2.push("Meet with lenders to refinance high-interest debt. At " + pf(m.intPct) + " of revenue going to interest, explore consolidation and lower-rate options.");
    p2$ += sv;
  }
  if (m.swPct !== null && m.swPct > 3) {
    const sv = rnd((m.swPct - 3) * 0.5 * rev / 100);
    p2.push("Consolidate software subscriptions at " + pf(m.swPct) + ". Audit every SaaS tool for actual usage and eliminate overlap.");
    p2$ += sv;
  }
  if (p2.length === 0) {
    p2.push("Optimize facility utilization and review all fixed costs for renegotiation opportunities.");
    p2$ = rnd(rev * 0.015);
  }
  phases.push({ days:"31–60", title:"Facility & Debt Restructuring", actions:p2, impact:p2$ });
  total += p2$;

  // Phase 3
  let p3 = [];
  let p3$ = 0;
  if (m.netPct !== null && m.netPct < 15) {
    const lift = Math.min(15 - m.netPct, 5);
    const sv = rnd(lift * 0.4 * rev / 100);
    if (pm === "hybrid") {
      p3.push("Implement billing efficiency program to lift net margin by " + Math.round(lift) + "%+ through better coding, reduced denials, and optimized collections. Review service pricing against market rates.");
    } else {
      p3.push("Focus on revenue per visit optimization to lift net margin by " + Math.round(lift) + "%+. Review service pricing against market rates, evaluate visit package structures, and consider adding high-value cash-pay services or group offerings to increase average revenue per patient.");
    }
    p3$ += sv;
  }
  if (m.ownerPct !== null && m.ownerPct < 5) {
    const msg = m.ownerPct < 1 ? "Currently taking $0 — this is unsustainable." : "At " + pf(m.ownerPct) + ", you are undervaluing your contribution.";
    p3.push("Establish structured owner compensation at 5-15% of revenue as W-2 salary. " + msg + " As an S-corp, additional returns come through distributions from net profit. Align comp with improved cash flow from Phase 1 and 2 savings.");
    p3$ += rnd(rev * 0.03);
  }
  if (m.mktPct !== null && m.mktPct < 3) {
    p3.push("Reinvest savings into marketing. At " + pf(m.mktPct) + ", you are underinvesting. Target 3-8% for a consistent patient pipeline.");
  }
  if (p3.length === 0) {
    p3.push("Focus on revenue optimization: review pricing, improve retention, and implement referral programs.");
    p3$ = rnd(rev * 0.025);
  }
  phases.push({ days:"61–90", title:"Margin Expansion & Owner Comp", actions:p3, impact:p3$ });
  total += p3$;

  return { phases, total };
}

function makeCashFlow(rev, totalExp, netIncome, m, n) {
  if (!rev || rev <= 0) return [];
  const rentAmt = n("rent");
  const intAmt = n("interest");
  const ownerAmt = n("ownerComp");
  const utilAmt = n("utilities");
  return [
    {
      title: "Operating",
      icon: "💰",
      text: "Operating activities generated a net " + (netIncome >= 0 ? "surplus" : "deficit") + " of " + $(Math.abs(netIncome)) + ", with revenue of " + $(rev) + " offset by " + $(totalExp) + " in total expenses." + (m.peoplePct > 40 ? " Labor costs at " + pf(m.peoplePct) + " of revenue are the largest expense driver." : "") + (rentAmt > 0 ? " Facility costs of " + $(rentAmt + utilAmt) + " represent " + pf(m.facilityPct) + " of revenue." : "")
    },
    {
      title: "Owner Returns",
      icon: "👤",
      text: ownerAmt > 0
        ? "Owner compensation of " + $(ownerAmt) + " represents " + pf(m.ownerPct) + " of revenue. " + (m.ownerPct >= 10 && m.ownerPct <= 25 ? "This is within the healthy 10-25% range." : m.ownerPct < 10 ? "This is below the recommended 10-25% range." : "This exceeds the recommended range and may limit reinvestment.")
        : "No owner compensation is recorded. The business is generating zero return on the owner's time and investment. This is unsustainable."
    },
    {
      title: "Debt Service",
      icon: "🏦",
      text: intAmt > 0
        ? "Debt servicing requires " + $(intAmt) + " in interest (" + pf(m.intPct) + " of revenue)." + (m.intPct > 3 ? " This critically impacts profitability and should be prioritized for refinancing." : m.intPct > 1 ? " Above the <1% target — worth monitoring." : "")
        : "No significant interest expense — a strong position for investment or expansion."
    },
    {
      title: "Net Position",
      icon: "📊",
      text: "Net cash change is " + (netIncome >= 0 ? "positive" : "negative") + " at " + $(Math.abs(netIncome)) + " (" + pf(m.netPct) + " net margin)." + (m.netPct < 8 ? " Very little cushion — immediate action recommended." : m.netPct < 15 ? " Below the 15% target, limited room for growth investment." : " Healthy margin supporting reinvestment and owner returns.")
    }
  ];
}

function Sec({ title, children }) {
  return (
    <div style={{ background:B.surf, borderRadius:8, padding:"16px 18px", marginBottom:12, border:"1px solid " + B.bdr }}>
      <h3 style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:B.blue, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'Barlow Condensed',sans-serif" }}>{title}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>{children}</div>
    </div>
  );
}

export default function DannyFinancialAudit() {
  const [step, setStep] = useState("input");
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [clinicName, setCN] = useState("");
  const [period, setPer] = useState("");
  const [clinicType, setCT] = useState("multi");
  const [payerMix, setPM] = useState("cash");
  const [bizPhase, setBP] = useState("maintenance");
  const [uploading, setUL] = useState(false);
  const [uploadMsg, setUM] = useState(null);
  const fileRef = useRef(null);
  const [f, setF] = useState({ ...EMPTY_FORM });
  const handleChange = useCallback((e) => {
    setF(p => ({ ...p, [e.target.name]: e.target.value }));
  }, []);
  const n = k => parseFloat(f[k]) || 0;

  const rev = n("revenue");
  const pct = v => rev > 0 ? (v / rev) * 100 : null;
  const facility = n("rent") + n("utilities");
  const people = n("staffWages") + n("contractLabor") + n("payrollTaxes") + n("payrollFees") + n("benefits");
  const supplies = n("officeSupplies") + n("ptSupplies");
  const prof = n("profFees") + n("contractedSvcs");
  const totalExp = facility + people + n("ownerComp") + n("marketing") + n("merchantFees") + n("software") + n("duesSubs") + supplies + n("medBilling") + prof + n("insurance") + n("ce") + n("mealsEnt") + n("travelAuto") + n("interest") + n("depreciation") + n("other");
  const netIncome = rev - totalExp;
  const ode = netIncome + n("ownerComp") + n("depreciation");
  const odePct = rev > 0 ? (ode / rev) * 100 : null;

  const m = {
    facilityPct: pct(facility), peoplePct: pct(people), ownerPct: pct(n("ownerComp")),
    mktPct: pct(n("marketing")), merchPct: pct(n("merchantFees")), swPct: pct(n("software")),
    duesPct: pct(n("duesSubs")), supPct: pct(supplies), medPct: pct(n("medBilling")),
    profPct: pct(prof), insPct: pct(n("insurance")), mealPct: pct(n("mealsEnt")),
    travPct: pct(n("travelAuto")), intPct: pct(n("interest")),
    netPct: rev > 0 ? (netIncome / rev) * 100 : null,
    odePct: odePct
  };

  const apPcts = {
    facilityPct: ((REF.rent + REF.util) / REF.rev) * 100,
    peoplePct: ((REF.staff + REF.ptax + REF.ben) / REF.rev) * 100,
    ownerPct: (REF.owner / REF.rev) * 100,
    mktPct: (REF.mkt / REF.rev) * 100,
    merchPct: (REF.merch / REF.rev) * 100,
    swPct: (REF.sw / REF.rev) * 100,
    duesPct: (REF.dues / REF.rev) * 100,
    supPct: ((REF.oSup + REF.ptSup) / REF.rev) * 100,
    medPct: 0,
    profPct: ((REF.prof + REF.cont) / REF.rev) * 100,
    insPct: (REF.ins / REF.rev) * 100,
    mealPct: (REF.meal / REF.rev) * 100,
    travPct: (REF.trav / REF.rev) * 100,
    intPct: (REF.int / REF.rev) * 100,
    opPct: null, netPct: 36.4,
    odePct: 42.8
  };

  const adjBM = adjustBM(clinicType, payerMix, bizPhase);
  const tgt = getTargets(clinicType, payerMix, bizPhase);

  // Compute benchmark-based colors for net income and ODE
  const netBm = adjBM.find(b => b.k === "netPct");
  const netColor = netBm ? SX[stat(m.netPct, netBm)].tx : B.gray;
  const odeBm = adjBM.find(b => b.k === "odePct");
  const odeColor = odeBm ? SX[stat(odePct, odeBm)].tx : B.gray;
  // Print-friendly colors for download
  const netPrint = netBm ? PSX[stat(m.netPct, netBm)] : "#6B7280";
  const odePrint = odeBm ? PSX[stat(odePct, odeBm)] : "#6B7280";

  const score = calcScore(m, bizPhase);
  const recs = makeRecs(m, bizPhase);
  const plan = makePlan(rev, m, payerMix);
  const cashFlow = makeCashFlow(rev, totalExp, netIncome, m, n);
  const statuses = adjBM.map(bm => stat(m[bm.k], bm));
  const closeInputModal = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign("/dashboard");
    }
  };
  const hC = statuses.filter(s => s === "healthy").length;
  const caC = statuses.filter(s => s === "caution").length;
  const crC = statuses.filter(s => s === "critical").length;

  const tRows = [
    { l:"Rent", a:n("rent"), pc:pct(n("rent")), tgt:tgt.rentTgt },
    { l:"Utilities", a:n("utilities"), pc:pct(n("utilities")), tgt:"<1.5%" },
    { l:"Facility Total", a:facility, pc:m.facilityPct, tgt:tgt.facilityTgt, k:"facilityPct", bold:true },
    { l:"Staff Wages & Contractors", a:n("staffWages")+n("contractLabor"), pc:pct(n("staffWages")+n("contractLabor")), tgt:tgt.staffTgt },
    { l:"Payroll Taxes & Fees", a:n("payrollTaxes")+n("payrollFees"), pc:pct(n("payrollTaxes")+n("payrollFees")), tgt:tgt.payrollTgt },
    { l:"Employee Benefits", a:n("benefits"), pc:pct(n("benefits")), tgt:"<2%" },
    { l:"People Total (Non-Owner)", a:people, pc:m.peoplePct, tgt:tgt.peopleTgt, k:"peoplePct", bold:true },
    { l:"Owner's Compensation", a:n("ownerComp"), pc:m.ownerPct, tgt:"5–15%", k:"ownerPct" },
    { l:"Marketing & Advertising", a:n("marketing"), pc:m.mktPct, tgt:"3–8%", k:"mktPct" },
    { l:"Merchant / CC Fees", a:n("merchantFees"), pc:m.merchPct, tgt:"<3%", k:"merchPct" },
    { l:"Software & Tech", a:n("software"), pc:m.swPct, tgt:tgt.swTgt, k:"swPct" },
    { l:"Dues & Subscriptions", a:n("duesSubs"), pc:m.duesPct, tgt:"<2%", k:"duesPct" },
    { l:"Supplies & Equipment", a:supplies, pc:m.supPct, tgt:"<3%", k:"supPct" },
    { l:"Medical Billing Fees", a:n("medBilling"), pc:m.medPct, tgt:tgt.medTgt, k:"medPct" },
    { l:"Professional & Contracted Svcs", a:prof, pc:m.profPct, tgt:"<4%", k:"profPct" },
    { l:"Insurance", a:n("insurance"), pc:m.insPct, tgt:"<2%", k:"insPct" },
    { l:"Continuing Education", a:n("ce"), pc:pct(n("ce")), tgt:"—" },
    { l:"Meals & Entertainment", a:n("mealsEnt"), pc:m.mealPct, tgt:"<1%", k:"mealPct" },
    { l:"Travel & Auto", a:n("travelAuto"), pc:m.travPct, tgt:"<2%", k:"travPct" },
    { l:"Interest / Debt Service", a:n("interest"), pc:m.intPct, tgt:"<1%", k:"intPct" },
    { l:"Depreciation & Amortization", a:n("depreciation"), pc:pct(n("depreciation")), tgt:"—" },
    { l:"Other Expenses", a:n("other"), pc:pct(n("other")), tgt:"—" },
  ];

  const handleGenerateReport = async () => {
    if (rev <= 0) return;
    setStep("report");
    await logAction({
      actionType: "pl_report_generated",
      description: `P&L audit generated for ${clinicName || "Unknown Clinic"}`,
      metadata: {
        tool: "pl_calculator",
        clinicName: clinicName || null,
        period: period || null,
        score,
      },
      sessionId,
    });
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    const looksLikePdf = file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (!looksLikePdf) {
      setUM({ ok:false, text:"Please upload a PDF." });
      return;
    }

    setUL(true);
    setUM(null);
    try {
      const extracted = await extractDannyPLFromPdf(file);
      if (extracted.error || !extracted.extracted) {
        throw new Error(extracted.error || "Could not parse that PDF.");
      }

      const { next, mappedCount } = mapExtractedToDannyForm(extracted.extracted);
      setF(next);
      if (typeof extracted.extracted?.clinicName === "string" && extracted.extracted.clinicName.trim()) {
        setCN(extracted.extracted.clinicName.trim());
      }
      if (typeof extracted.extracted?.period === "string" && extracted.extracted.period.trim()) {
        setPer(extracted.extracted.period.trim());
      }
      setUM({
        ok:true,
        text:`Imported ${mappedCount} fields from ${file.name}. Review and adjust below.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not parse that PDF.";
      setUM({ ok:false, text:`${message} Try another file or enter manually.` });
    } finally {
      setUL(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    if (typeof score !== 'number' || Number.isNaN(score) || score === 0) {
      alert("Please run the analysis first before downloading the report.");
      return;
    }
    if (typeof rev !== 'number' || Number.isNaN(rev)) {
      alert("Please complete the analysis first.");
      return;
    }

    try {
      // Log the export action
      void Promise.allSettled([
        savePdfExport({
          sessionId,
          clientName: clinicName || "P&L Audit",
          score,
          metadata: {
            tool: "pl_calculator",
            summary: `${clinicName || "Clinic"} financial audit print export`,
            period: period || null,
            grade: score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F",
          },
        }),
        logAction({
          actionType: "pdf_generated",
          description: `P&L print-ready report opened for ${clinicName || "Unknown Clinic"}`,
          metadata: {
            tool: "pl_calculator",
            clinicName: clinicName || null,
            period: period || null,
            score,
            exportType: "print_dialog",
          },
          sessionId,
        }),
      ]);

      // Trigger browser print dialog directly - this avoids popup blockers
      window.print();
    } catch (err) {
      console.error("Print failed:", err);
      alert("Failed to open print dialog. Please try again.");
    }
  };

  const priClr = { HIGH:"#F87171", MED:"#FBBF24", LOW:B.gray, INFO:"#34D399" };
  const pageShellStyle = { maxWidth:980, margin:"0 auto", padding:"0 24px 64px" };
  const canvasStyle = {
    maxWidth:980,
    margin:"0 auto",
    padding:"24px 24px 26px",
    background:B.surf,
    border:"1px solid " + B.bdr,
    borderRadius:16,
    boxShadow:"0 4px 24px rgba(0, 0, 0, 0.08)",
    color:B.wht,
    fontFamily:"'Barlow',sans-serif",
  };

  // ===== INPUT STEP =====
  if (step === "input") {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: B.dark, padding: "24px 0 64px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid " + B.bdr }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="grade-modal-badge" src={TOOL_BADGES.pl} alt="P&L Calculator badge" />
              <ClinicIcon name="analyticsStrip" size={28} className="clinic-icon-hover" />
            </div>
            <button onClick={closeInputModal} style={{ background: "transparent", border: "1px solid " + B.bdr, borderRadius: 8, color: B.grayDk, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif" }}>← Back</button>
          </div>
          <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&family=Barlow:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
          <div style={{ ...canvasStyle, position: 'relative' }} className="clinic-pattern-overlay">
            <ClinicBackground pattern="nodeNetwork" opacity={0.03} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:18 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:1, height:28, background:B.bdr }} />
                <div style={{ fontSize:10, color:B.grayDk, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600 }}>Clinical Cash Flow System</div>
              </div>
            </div>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:800, color:B.wht, marginBottom:4, textTransform:"uppercase" }}>How Healthy Are Your Clinic Finances?</h2>
          <p style={{ color:B.grayDk, fontSize:12, margin:"0 0 20px" }}>Upload is processed server-side for field mapping with authenticated access.</p>

          <div style={{ marginBottom:20, padding:20, background:B.surf, borderRadius:14, border:uploading ? "2px solid " + B.blue : "2px dashed " + B.bdrLt, textAlign:"center", cursor:uploading ? "wait" : "pointer" }} onClick={() => !uploading && fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const fl = e.dataTransfer.files?.[0]; if (fl) handleUpload({ target: { files: [fl] } }); }}>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleUpload} style={{ display:"none" }} />
            {uploading ? (
              <div>
                <div style={{ display:"inline-block", width:32, height:32, border:"3px solid " + B.bdr, borderTopColor:B.blue, borderRadius:"50%", animation:"spin 1s linear infinite", marginBottom:8 }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{ color:B.blue, fontSize:13, fontWeight:600, margin:0, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Analyzing your P&L...</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:28, marginBottom:6, opacity:0.7 }}>📄</div>
                <p style={{ color:B.blue, fontSize:14, fontWeight:700, margin:"0 0 3px", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Upload P&L Statement (PDF)</p>
                <p style={{ color:B.grayDk, fontSize:11, margin:0 }}>Drag & drop or click — AI auto-extracts all line items</p>
              </div>
            )}
          </div>
          {uploadMsg && (
            <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:6, background:uploadMsg.ok ? "#0D281822" : "#2D0A0A22", border:"1px solid " + (uploadMsg.ok ? "#05966933" : "#DC262633"), display:"flex", gap:8, alignItems:"center" }}>
              <span>{uploadMsg.ok ? "✅" : "⚠️"}</span>
              <p style={{ margin:0, fontSize:12, color:uploadMsg.ok ? "#34D399" : "#F87171" }}>{uploadMsg.text}</p>
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div style={{ flex:1, height:1, background:B.bdr }} />
            <span style={{ fontSize:10, color:B.grayXDk, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600 }}>or enter manually</span>
            <div style={{ flex:1, height:1, background:B.bdr }} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:B.gray, marginBottom:3, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Clinic Name</label>
              <input type="text" value={clinicName} onChange={e => setCN(e.target.value)} placeholder="e.g. Peak Performance PT" style={{ width:"100%", padding:"9px 11px", background:B.dark, border:"1px solid " + B.bdr, borderRadius:6, color:B.wht, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:B.gray, marginBottom:3, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Reporting Period</label>
              <input type="text" value={period} onChange={e => setPer(e.target.value)} placeholder="e.g. Jan–Dec 2024" style={{ width:"100%", padding:"9px 11px", background:B.dark, border:"1px solid " + B.bdr, borderRadius:6, color:B.wht, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:18 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:B.gray, marginBottom:6, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Clinic Structure</label>
              <div style={{ display:"flex", gap:0, borderRadius:6, overflow:"hidden", border:"1px solid " + B.bdr }}>
                {[["solo","Solo"],["multi","Multi-Clinician"]].map(([v, lb]) => (
                  <button key={v} onClick={() => setCT(v)} style={{ flex:1, padding:"9px 6px", background:clinicType === v ? B.blue : B.dark, border:"none", color:clinicType === v ? "#fff" : B.grayDk, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.04em" }}>{lb}</button>
                ))}
              </div>
              <span style={{ fontSize:9, color:B.grayXDk, marginTop:3, display:"block" }}>{clinicType === "solo" ? "Tighter labor & facility targets" : "Accounts for admin overhead"}</span>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:B.gray, marginBottom:6, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Payer Mix</label>
              <div style={{ display:"flex", gap:0, borderRadius:6, overflow:"hidden", border:"1px solid " + B.bdr }}>
                {[["cash","Cash-Based"],["hybrid","Hybrid"]].map(([v, lb]) => (
                  <button key={v} onClick={() => setPM(v)} style={{ flex:1, padding:"9px 6px", background:payerMix === v ? B.blue : B.dark, border:"none", color:payerMix === v ? "#fff" : B.grayDk, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.04em" }}>{lb}</button>
                ))}
              </div>
              <span style={{ fontSize:9, color:B.grayXDk, marginTop:3, display:"block" }}>{payerMix === "hybrid" ? "Higher billing & admin overhead" : "Lower overhead, no billing"}</span>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:B.gray, marginBottom:6, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Business Phase</label>
              <div style={{ display:"flex", gap:0, borderRadius:6, overflow:"hidden", border:"1px solid " + B.bdr }}>
                {[["growth","Growth"],["maintenance","Maintenance"]].map(([v, lb]) => (
                  <button key={v} onClick={() => setBP(v)} style={{ flex:1, padding:"9px 6px", background:bizPhase === v ? B.blue : B.dark, border:"none", color:bizPhase === v ? "#fff" : B.grayDk, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.04em" }}>{lb}</button>
                ))}
              </div>
              <span style={{ fontSize:9, color:B.grayXDk, marginTop:3, display:"block" }}>{bizPhase === "growth" ? "Lower margin targets expected" : "Higher profitability expected"}</span>
            </div>
          </div>
          <Sec title="Revenue"><div style={{ gridColumn:"1/-1" }}><Inp label="Total Revenue" value={f.revenue} name="revenue" onChange={handleChange} hint="Total cash/insurance collected" /></div></Sec>
          <Sec title="Facility"><Inp label="Rent" value={f.rent} name="rent" onChange={handleChange} /><Inp label="Utilities" value={f.utilities} name="utilities" onChange={handleChange} /></Sec>
          <Sec title="Payroll & People"><Inp label="Staff Wages (Non-Owner)" value={f.staffWages} name="staffWages" onChange={handleChange} /><Inp label="Contract Labor (1099)" value={f.contractLabor} name="contractLabor" onChange={handleChange} /><Inp label="Payroll Taxes" value={f.payrollTaxes} name="payrollTaxes" onChange={handleChange} /><Inp label="Payroll Processing Fees" value={f.payrollFees} name="payrollFees" onChange={handleChange} /><Inp label="Employee Benefits" value={f.benefits} name="benefits" onChange={handleChange} /><Inp label="Owner's Compensation" value={f.ownerComp} name="ownerComp" onChange={handleChange} /></Sec>
          <Sec title="Marketing"><Inp label="Marketing & Advertising" value={f.marketing} name="marketing" onChange={handleChange} /><Inp label="Merchant / CC Fees" value={f.merchantFees} name="merchantFees" onChange={handleChange} /></Sec>
          <Sec title="Operations"><Inp label="Software & Tech" value={f.software} name="software" onChange={handleChange} /><Inp label="Dues & Subscriptions" value={f.duesSubs} name="duesSubs" onChange={handleChange} /><Inp label="Office Supplies" value={f.officeSupplies} name="officeSupplies" onChange={handleChange} /><Inp label="PT Supplies & Equipment" value={f.ptSupplies} name="ptSupplies" onChange={handleChange} /><Inp label="Medical Billing" value={f.medBilling} name="medBilling" onChange={handleChange} /><Inp label="Professional Fees (Acct/Legal)" value={f.profFees} name="profFees" onChange={handleChange} /><Inp label="Contracted Services" value={f.contractedSvcs} name="contractedSvcs" onChange={handleChange} /><Inp label="Insurance" value={f.insurance} name="insurance" onChange={handleChange} /><Inp label="Continuing Education" value={f.ce} name="ce" onChange={handleChange} /><Inp label="Meals & Entertainment" value={f.mealsEnt} name="mealsEnt" onChange={handleChange} /><Inp label="Travel & Auto" value={f.travelAuto} name="travelAuto" onChange={handleChange} /><Inp label="Interest / Debt" value={f.interest} name="interest" onChange={handleChange} /><Inp label="Depreciation & Amortization" value={f.depreciation} name="depreciation" onChange={handleChange} /><Inp label="Other Expenses" value={f.other} name="other" onChange={handleChange} /></Sec>
          {rev > 0 ? (
            <div style={{ background:B.surf, borderRadius:12, padding:"14px 18px", marginBottom:18, border:"1px solid " + B.blue + "44" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                <div><div style={{ fontSize:10, color:B.grayDk, textTransform:"uppercase", fontFamily:"'Barlow Condensed',sans-serif" }}>Revenue</div><div style={{ fontSize:18, fontWeight:700, color:B.wht, fontFamily:"'JetBrains Mono',monospace" }}>{$(rev)}</div></div>
                <div><div style={{ fontSize:10, color:B.grayDk, textTransform:"uppercase", fontFamily:"'Barlow Condensed',sans-serif" }}>Total Expenses</div><div style={{ fontSize:18, fontWeight:700, color:B.wht, fontFamily:"'JetBrains Mono',monospace" }}>{$(totalExp)}</div></div>
                <div><div style={{ fontSize:10, color:B.grayDk, textTransform:"uppercase", fontFamily:"'Barlow Condensed',sans-serif" }}>Owner's Discretionary Earnings</div><div style={{ fontSize:18, fontWeight:700, color:odeColor, fontFamily:"'JetBrains Mono',monospace" }}>{$(ode)}</div></div>
              </div>
            </div>
          ) : null}
          <button onClick={handleGenerateReport} disabled={rev <= 0} style={{ width:"100%", padding:"14px", background:rev > 0 ? B.blue : B.bdr, border:"none", borderRadius:10, color:rev > 0 ? "#fff" : B.grayXDk, fontSize:15, fontWeight:700, cursor:rev > 0 ? "pointer" : "not-allowed", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.06em", boxShadow:rev > 0 ? "0 4px 20px " + B.glow : "none" }}>Get My Financial Health Score →</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== REPORT STEP =====
  return (


    <div style={{ width: "100%", minHeight: "100vh", background: B.dark, padding: "24px 0 64px" }}>
      <style>{printStyles}</style>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid " + B.bdr }} className="no-print">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="grade-modal-badge" src={TOOL_BADGES.pl} alt="P&L Calculator badge" />
            <div>

            </div>
          </div>
          <button onClick={() => setStep("input")} style={{ background: "transparent", border: "1px solid " + B.bdr, borderRadius: 8, color: B.grayDk, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif" }}>← Edit Numbers</button>
        </div>
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&family=Barlow:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <div style={pageShellStyle}>
          <div id="pl-report-print-root" style={canvasStyle}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:1, height:28, background:B.bdr }} />
            <div style={{ fontSize:10, color:B.grayDk, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600 }}>Clinical Cash Flow System</div>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }} className="no-print">
          <button onClick={() => setStep("input")} style={{ background:"none", border:"none", color:B.grayDk, cursor:"pointer", fontSize:12 }}>← Edit numbers</button>
          <button onClick={handleDownload} style={{ background:B.blue, border:"none", borderRadius:6, color:"#fff", fontSize:13, fontWeight:700, padding:"10px 20px", cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.04em" }}>📥 Download Report</button>
        </div>

        {/* HEADER */}
        <div style={{ textAlign:"center", marginBottom:20, paddingBottom:16, borderBottom:"1px solid " + B.bdr }}>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:800, color:B.wht, margin:"0 0 4px", textTransform:"uppercase" }}>{clinicName || "Clinic"} Financial Audit</h2>
          <p style={{ color:B.grayDk, fontSize:12, margin:"0 0 10px" }}>{period || "Annual Review"} — {new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}</p>
          <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
            {[
              { lb: clinicType === "solo" ? "SOLO" : "MULTIPLE", c: B.blue },
              { lb: payerMix === "cash" ? "CASH-BASED" : "HYBRID", c: payerMix === "hybrid" ? "#D97706" : "#059669" },
              { lb: bizPhase === "growth" ? "GROWTH" : "MAINTENANCE", c: bizPhase === "growth" ? "#7C3AED" : "#059669" },
            ].map(tag => (
              <span key={tag.lb} style={{ fontSize:10, fontWeight:700, color:tag.c, background:tag.c + "15", padding:"3px 10px", borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.08em", border:"1px solid " + tag.c + "33" }}>{tag.lb}</span>
            ))}
          </div>
        </div>

        {/* SCORE CARD */}
        <div style={{ display:"flex", gap:20, alignItems:"center", marginBottom:20, padding:20, background:B.surf, borderRadius:14, border:"1px solid " + B.bdr, flexWrap:"wrap" }}>
          <Ring score={score} size={120} />
          <div style={{ flex:"1 1 260px" }}>
            <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, margin:"0 0 6px", color:B.wht, textTransform:"uppercase" }}>Financial Health Score</h3>
            <p style={{ color:B.gray, fontSize:13, margin:"0 0 10px" }}>Across {statuses.filter(s => s !== "none").length} metrics vs. 1,000+ cash-based PT clinics.</p>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
              {[["#34D399", hC, "Healthy"], ["#FBBF24", caC, "Caution"], ["#F87171", crC, "Critical"]].map(([c, cnt, lb]) => (
                <div key={lb} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:c }} />
                  <span style={{ fontSize:12, color:B.gray }}>{cnt} {lb}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:10, color:B.grayDk, textTransform:"uppercase", fontFamily:"'Barlow Condensed',sans-serif" }}>Revenue</div>
            <div style={{ fontSize:20, fontWeight:700, color:B.wht, fontFamily:"'JetBrains Mono',monospace" }}>{$(rev)}</div>
            <div style={{ fontSize:10, color:B.grayDk, textTransform:"uppercase", marginTop:8, fontFamily:"'Barlow Condensed',sans-serif" }}>Owner's Discretionary Earnings</div>
            <div style={{ fontSize:20, fontWeight:700, color:odeColor, fontFamily:"'JetBrains Mono',monospace" }}>{$(ode)}</div>
          </div>
        </div>

        {/* QUICK ANALYSIS */}
        <div style={{ background:B.surf, borderRadius:14, padding:"20px 24px", marginBottom:24, border:"1px solid " + B.bdr }}>
          <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontStyle:"italic", fontSize:18, fontWeight:700, color:B.wht, margin:"0 0 16px" }}>Quick Analysis</h3>
          {[
            { lb:"Net Profit", v:m.netPct, c:m.netPct >= 15 ? "#34D399" : m.netPct >= 10 ? "#FBBF24" : "#F87171" },
            { lb:"Owner's Discretionary Earnings", v:odePct, c:odePct >= 20 && odePct <= 35 ? "#34D399" : odePct >= 15 ? "#FBBF24" : "#F87171" },
            { lb:"Facility Load", v:m.facilityPct, c:m.facilityPct < 8 ? "#34D399" : m.facilityPct <= 10 ? "#FBBF24" : "#F87171" },
            { lb:"People Load", v:m.peoplePct, c:m.peoplePct < 42 ? "#34D399" : m.peoplePct <= 45 ? "#FBBF24" : "#F87171" },
          ].map((it, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom: i < 3 ? "1px solid " + B.bdr : "none" }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:13, color:B.gray, textTransform:"uppercase", letterSpacing:"0.08em" }}>{it.lb}</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:700, color:it.c }}>{pf(it.v)}</span>
            </div>
          ))}
        </div>

        {/* P&L TABLE */}
        <div style={{ marginBottom:24 }}>
          <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, margin:"0 0 3px", color:B.wht, textTransform:"uppercase" }}>P&L Breakdown</h3>
          <p style={{ color:B.grayDk, fontSize:11, margin:"0 0 12px" }}>Every line item as % of revenue</p>
          <div style={{ background:B.surf, borderRadius:12, overflow:"hidden", border:"1px solid " + B.bdr }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:520, fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid " + B.bdr }}>
                    {["Category","Amount","% of Rev","Target"].map((h, i) => (
                      <th key={h} style={{ textAlign:i === 0 ? "left" : "right", padding:"8px 14px", fontSize:10, color:B.grayDk, fontWeight:600, textTransform:"uppercase", fontFamily:"'Barlow Condensed',sans-serif" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tRows.map((r, i) => {
                    const bm = r.k ? adjBM.find(b => b.k === r.k) : null;
                    const st = bm ? stat(m[r.k], bm) : "none";
                    const c = SX[st];
                    return (
                      <tr key={i} style={{ borderBottom:r.bold ? "1px solid " + B.bdr + "44" : "none", background:r.bold ? B.dark + "66" : "transparent" }}>
                        <td style={{ padding:"7px 14px", color:r.bold ? B.wht : B.gray, fontWeight:r.bold ? 700 : 400, paddingLeft:r.bold ? 14 : 24, fontFamily:r.bold ? "'Barlow Condensed',sans-serif" : "'Barlow',sans-serif", textTransform:r.bold ? "uppercase" : "none", fontSize:r.bold ? 13 : 12 }}>{r.l}</td>
                        <td style={{ padding:"7px 14px", textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:B.grayDk }}>{$(r.a)}</td>
                        <td style={{ padding:"7px 14px", textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:r.k ? 600 : 400, color:r.k ? c.tx : B.grayDk }}>{r.pc !== null ? pf(r.pc) : "—"}</td>
                        <td style={{ padding:"7px 14px", textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:B.grayXDk, fontSize:11 }}>{r.tgt}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop:"2px solid " + B.bdr, background:B.dark }}>
                    <td style={{ padding:"10px 14px", fontWeight:700, color:B.wht, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Total Expenses</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:B.wht }}>{$(totalExp)}</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:B.wht }}>{pf(pct(totalExp))}</td>
                    <td />
                  </tr>
                  <tr>
                    {(() => { const netBm = adjBM.find(b => b.k === "netPct"); const netSt = netBm ? stat(m.netPct, netBm) : "none"; const netC = SX[netSt].tx; return (<>
                    <td style={{ padding:"10px 14px", fontWeight:700, color:netC, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>Net Income</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:netC }}>{$(netIncome)}</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:netC }}>{pf(m.netPct)}</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:B.grayXDk, fontSize:11 }}>{tgt.netTgt}</td>
                    </>); })()}
                  </tr>
                  <tr style={{ background:B.blue + "08" }}>
                    {(() => { const odeBm = adjBM.find(b => b.k === "odePct"); const odeSt = odeBm ? stat(odePct, odeBm) : "none"; const odeC = SX[odeSt].tx; return (<>
                    <td style={{ padding:"10px 14px", fontWeight:700, color:B.blue, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", fontSize:13 }}>Owner's Discretionary Earnings</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:odeC, fontSize:15 }}>{$(ode)}</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:odeC, fontSize:15 }}>{pf(odePct)}</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:B.grayXDk, fontSize:10 }}>{tgt.odeTgt}</td>
                    </>); })()}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* BENCHMARKS */}
        <div style={{ marginBottom:24 }}>
          <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, margin:"0 0 3px", color:B.wht, textTransform:"uppercase" }}>Benchmark Analysis</h3>
          <p style={{ color:B.grayDk, fontSize:11, margin:"0 0 12px" }}>Blue marker = top performer</p>
          {adjBM.map(bm => <Gauge key={bm.k} value={m[bm.k]} bm={bm} apVal={apPcts[bm.k]} />)}
        </div>

        {/* CASH FLOW */}
        {cashFlow.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, margin:"0 0 3px", color:B.wht, textTransform:"uppercase" }}>Cash Flow Analysis</h3>
            <p style={{ color:B.grayDk, fontSize:11, margin:"0 0 14px" }}>How money moves through your clinic</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {cashFlow.map((s, i) => (
                <div key={i} style={{ background:B.surf, borderRadius:12, padding:16, border:"1px solid " + B.bdr }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:18 }}>{s.icon}</span>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14, color:B.wht, textTransform:"uppercase" }}>{s.title}</span>
                  </div>
                  <p style={{ margin:0, fontSize:12, color:B.gray, lineHeight:1.6 }}>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 90-DAY PLAN */}
        {plan && (
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:12 }}>
              <div>
                <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, margin:"0 0 3px", color:B.wht, textTransform:"uppercase" }}>90-Day Profit Improvement Plan</h3>
                <p style={{ color:B.grayDk, fontSize:11, margin:0 }}>A phased strategy to improve your financial health</p>
              </div>
              <div style={{ background:B.blue + "15", borderRadius:12, padding:"14px 20px", border:"1px solid " + B.blue + "44", textAlign:"center" }}>
                <div style={{ fontSize:10, color:B.blue, textTransform:"uppercase", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, letterSpacing:"0.1em", marginBottom:2 }}>Total Projected Profit Increase</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:28, fontWeight:700, color:"#34D399" }}>{$(plan.total)}</div>
                <div style={{ fontSize:10, color:B.grayDk }}>Estimated Annual Impact</div>
              </div>
            </div>
            {plan.phases.map((phase, i) => (
              <div key={i} style={{ background:B.surf, borderRadius:14, padding:20, marginBottom:12, border:"1px solid " + B.bdr, borderLeft:"4px solid " + B.blue }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:B.blue, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:16, color:"#fff", flexShrink:0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, color:B.blue, textTransform:"uppercase", letterSpacing:"0.1em" }}>Days {phase.days}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, color:B.wht, textTransform:"uppercase" }}>{phase.title}</div>
                  </div>
                </div>
                {phase.actions.map((action, j) => (
                  <p key={j} style={{ margin:"0 0 " + (j < phase.actions.length - 1 ? "10px" : "12px"), fontSize:12, color:B.gray, lineHeight:1.6, paddingLeft:42 }}>{action}</p>
                ))}
                <div style={{ marginLeft:42, padding:"10px 14px", background:B.blue + "10", borderRadius:6, border:"1px solid " + B.blue + "22", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:11, color:B.blue, textTransform:"uppercase", letterSpacing:"0.08em" }}>Projected Impact</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:16, color:"#34D399" }}>{$(phase.impact)}</span>
                  <span style={{ fontSize:10, color:B.grayDk }}>in annual savings / revenue</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECOMMENDATIONS */}
        {recs.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, margin:"0 0 3px", color:B.wht, textTransform:"uppercase" }}>Recommendations</h3>
            <p style={{ color:B.grayDk, fontSize:11, margin:"0 0 12px" }}>Prioritized actions based on your numbers</p>
            {recs.map((r, i) => (
              <div key={i} style={{ padding:"14px 16px", background:B.surf, borderRadius:12, marginBottom:8, border:"1px solid " + B.bdr, borderLeft:"4px solid " + priClr[r.p] }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2, flexWrap:"wrap" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:priClr[r.p], background:priClr[r.p] + "15", padding:"2px 6px", borderRadius:3, fontFamily:"'Barlow Condensed',sans-serif" }}>{r.p === "MED" ? "MEDIUM" : r.p} PRIORITY</span>
                  <span style={{ fontSize:9, color:B.grayDk, textTransform:"uppercase", letterSpacing:"0.06em" }}>{r.cat}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:16 }}>{r.icon}</span>
                  <span style={{ fontWeight:700, fontSize:13, color:B.wht, fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>{r.title}</span>
                </div>
                <p style={{ margin:0, fontSize:12, color:B.gray, lineHeight:1.6, paddingLeft:24 }}>{r.detail}</p>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ background:B.blue + "12", borderRadius:12, padding:"28px 24px", border:"1px solid " + B.blue + "33", textAlign:"center", marginBottom:20 }} className="no-print">
          <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, color:B.wht, margin:"0 0 8px", textTransform:"uppercase" }}>Want Help Implementing This Plan?</h3>
          <p style={{ color:B.gray, fontSize:13, margin:"0 0 16px", lineHeight:1.5 }}>PT Biz has helped 1,000+ clinic owners build profitable, scalable practices. Our coaches are clinic owners who have been where you are.</p>
          <a href="https://ptbiz.com" target="_blank" rel="noopener noreferrer" style={{ display:"inline-block", padding:"12px 32px", background:B.blue, color:"#fff", borderRadius:8, fontSize:14, fontWeight:700, textDecoration:"none", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:"0.06em" }}>Learn About PT Biz →</a>
        </div>

        <div style={{ textAlign:"center", padding:"20px 0", borderTop:"1px solid " + B.bdr }} className="no-print">
          <p style={{ color:B.grayXDk, fontSize:10, margin:"0 0 3px" }}>This report is for educational purposes and does not constitute financial advice.</p>
          <p style={{ color:B.grayDk, fontSize:11, margin:0 }}><span style={{ color:B.blue, fontWeight:600 }}>ptbiz.com</span></p>
        </div>
      </div>
    </div>
      </div>
    </div>
  );
}
