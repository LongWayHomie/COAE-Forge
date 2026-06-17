import { useState } from "react";
import { apiPost } from "../api/client.js";
import MetricCard from "../components/MetricCard.jsx";
import ParamSlider from "../components/ParamSlider.jsx";
import InfoButton from "../components/InfoButton.jsx";
import { useI18n } from "../i18n.jsx";

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const EPS_CHOICES = [0.5, 1, 2, 4, 8, 16];
const DELTAS = [1e-3, 1e-4, 1e-5, 1e-6];

function TradeoffChart({ res }) {
  const { t } = useI18n();
  const W = 560, H = 250, padL = 38, padR = 14, padT = 14, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const pts = res.points;
  const xs = pts.map((p) => Math.log(p.epsilon_target));
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const xpos = (eps) =>
    padL + (xmax === xmin ? plotW / 2 : ((Math.log(eps) - xmin) / (xmax - xmin)) * plotW);
  const ypos = (v) => padT + (1 - v) * plotH;

  const path = (key) =>
    pts.map((p, i) => `${i ? "L" : "M"}${xpos(p.epsilon_target).toFixed(1)},${ypos(p[key]).toFixed(1)}`).join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="panel">
      <strong style={{ fontSize: 13 }}>{t("Privacy / utility trade-off")}</strong>
      <svg width={W} height={H} style={{ display: "block", marginTop: 10, maxWidth: "100%" }}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padL} y1={ypos(tick)} x2={W - padR} y2={ypos(tick)} stroke="var(--border)" strokeWidth="0.5" />
            <text x={padL - 6} y={ypos(tick) + 3} textAnchor="end" className="haxis">{tick.toFixed(2)}</text>
          </g>
        ))}
        <line x1={padL} y1={ypos(res.baseline_accuracy)} x2={W - padR} y2={ypos(res.baseline_accuracy)} className="cline" strokeDasharray="4 3" />
        <line x1={padL} y1={ypos(res.baseline_mia_auc)} x2={W - padR} y2={ypos(res.baseline_mia_auc)} className="dline" strokeDasharray="4 3" />
        <path d={path("accuracy")} className="cline" fill="none" />
        <path d={path("mia_auc")} className="dline" fill="none" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={xpos(p.epsilon_target)} cy={ypos(p.accuracy)} r="3.5" className="cdot" />
            <circle cx={xpos(p.epsilon_target)} cy={ypos(p.mia_auc)} r="3.5" className="ddot" />
            <text x={xpos(p.epsilon_target)} y={H - padB + 14} textAnchor="middle" className="haxis">
              ε={p.epsilon_target}
            </text>
          </g>
        ))}
        <text x={padL} y={12} className="haxis">{t("accuracy (—) & MIA AUC (—), 0–1 · dashed = non-private baseline")}</text>
      </svg>
      <div className="legend">
        <span><span className="dot clean" />{t("test accuracy (utility)")}</span>
        <span><span className="dot pois" />{t("MIA AUC (leak; 0.5 = none)")}</span>
      </div>
    </div>
  );
}

export default function PrivacyTab() {
  const { t, tf } = useI18n();
  const [dataset, setDataset] = useState("mnist");
  const [epsilons, setEpsilons] = useState([1, 4, 8]);
  const [delta, setDelta] = useState(1e-5);
  const [epochs, setEpochs] = useState(15);
  const [maxGradNorm, setMaxGradNorm] = useState(1.0);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleEps = (e) =>
    setEpsilons((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e].sort((a, b) => a - b)));

  const run = async () => {
    if (epsilons.length === 0) {
      setError(t("Select at least one ε value."));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRes(await apiPost("/privacy/train", { dataset, epsilons, delta, epochs, max_grad_norm: maxGradNorm }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="controls">
          <div className="field">
            <label>{t("Dataset")} <InfoButton topic={dataset} /> <InfoButton topic="privacy" /></label>
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
              <option value="mnist">{t("MNIST")}</option>
              <option value="cifar10">{t("CIFAR-10")}</option>
            </select>
          </div>
          <div className="field">
            <label>{t("Privacy budgets ε (pick 1–6)")}</label>
            <div className="subtabs" style={{ flexWrap: "wrap" }}>
              {EPS_CHOICES.map((e) => (
                <button
                  key={e}
                  className={"subtab" + (epsilons.includes(e) ? " active" : "")}
                  onClick={() => toggleEps(e)}
                  disabled={!epsilons.includes(e) && epsilons.length >= 6}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>{t("δ (delta)")}</label>
            <select value={delta} onChange={(e) => setDelta(parseFloat(e.target.value))}>
              {DELTAS.map((d) => (
                <option key={d} value={d}>{d.toExponential(0)}</option>
              ))}
            </select>
          </div>
          <ParamSlider label={t("epochs")} value={epochs} min={3} max={40} step={1} onChange={setEpochs} />
          <ParamSlider label={t("clip norm C")} value={maxGradNorm} min={0.2} max={5} step={0.2} onChange={setMaxGradNorm} fmt={(v) => v.toFixed(1)} />
          <button className="run" onClick={run} disabled={loading}>
            {loading ? t("Training DP models…") : t("Train & sweep ε")}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          {t("Trains one DP-SGD model per ε (Opacus: per-sample clipping + Gaussian noise), plus a non-private baseline. Reports test accuracy and a confidence-threshold membership-inference AUC. Several models train per run — give it ~30s.")}
        </p>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      {res && (
        <>
          <div className="panel">
            <div className="metrics">
              <MetricCard label={t("Baseline accuracy")} value={pct(res.baseline_accuracy)} tone="ok" />
              <MetricCard label={t("Baseline MIA AUC")} value={res.baseline_mia_auc.toFixed(3)} tone="danger" />
              <MetricCard label={t("Tightest ε")} value={`${res.points[0].epsilon_target}`} />
              <MetricCard label={tf("Acc @ ε={n}", { n: res.points[0].epsilon_target })} value={pct(res.points[0].accuracy)} />
              <MetricCard label={tf("MIA AUC @ ε={n}", { n: res.points[0].epsilon_target })} value={res.points[0].mia_auc.toFixed(3)} tone="ok" />
            </div>
            <div className="callout">
              {t("DP-SGD trades utility for privacy: tighter budgets (smaller ε) add more noise, lowering accuracy and pulling the membership-inference AUC back toward 0.5 (no leak) — defending the attack from the previous tab.")}{" "}
              {tf("δ = {d}, clip norm = {c}, {n} members, {e} epochs.", {
                d: res.delta.toExponential(0),
                c: res.max_grad_norm,
                n: res.size,
                e: res.epochs,
              })}
            </div>
          </div>

          <TradeoffChart res={res} />

          <div className="panel">
            <strong style={{ fontSize: 13 }}>{t("Per-budget detail")}</strong>
            <table className="dptable">
              <thead>
                <tr>
                  <th>{t("ε target")}</th><th>{t("ε spent")}</th><th>{t("noise σ")}</th>
                  <th>{t("accuracy")}</th><th>{t("MIA AUC")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="baseline-row">
                  <td>{t("∞ (none)")}</td><td>—</td><td>0</td>
                  <td>{pct(res.baseline_accuracy)}</td><td>{res.baseline_mia_auc.toFixed(3)}</td>
                </tr>
                {res.points.map((p, i) => (
                  <tr key={i}>
                    <td>{p.epsilon_target}</td>
                    <td>{p.epsilon_spent.toFixed(2)}</td>
                    <td>{p.noise_multiplier.toFixed(2)}</td>
                    <td>{pct(p.accuracy)}</td>
                    <td>{p.mia_auc.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
