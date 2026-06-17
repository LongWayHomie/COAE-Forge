import { useState } from "react";
import { apiPost } from "../api/client.js";
import ImagePanel from "../components/ImagePanel.jsx";
import MetricCard from "../components/MetricCard.jsx";
import ParamSlider from "../components/ParamSlider.jsx";
import InfoButton from "../components/InfoButton.jsx";
import { useI18n } from "../i18n.jsx";

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function FidelityChart({ res }) {
  const { t } = useI18n();
  const W = 560, H = 230, padL = 38, padR = 14, padT = 14, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const pts = res.curve;
  const xmax = Math.max(...pts.map((p) => p.budget));
  const xmin = Math.min(...pts.map((p) => p.budget));
  const xpos = (b) => padL + (xmax === xmin ? plotW / 2 : ((b - xmin) / (xmax - xmin)) * plotW);
  const ypos = (v) => padT + (1 - v) * plotH;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${xpos(p.budget).toFixed(1)},${ypos(p.fidelity).toFixed(1)}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="panel">
      <strong style={{ fontSize: 13 }}>{t("Extraction fidelity vs query budget")}</strong>
      <svg width={W} height={H} style={{ display: "block", marginTop: 10, maxWidth: "100%" }}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padL} y1={ypos(tick)} x2={W - padR} y2={ypos(tick)} stroke="var(--border)" strokeWidth="0.5" />
            <text x={padL - 6} y={ypos(tick) + 3} textAnchor="end" className="haxis">{tick.toFixed(2)}</text>
          </g>
        ))}
        <path d={path} className="cline" fill="none" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={xpos(p.budget)} cy={ypos(p.fidelity)} r="3.5" className="cdot" />
            <text x={xpos(p.budget)} y={H - padB + 14} textAnchor="middle" className="haxis">{p.budget}</text>
          </g>
        ))}
        <text x={padL} y={12} className="haxis">{t("fidelity = substitute/target agreement · x = queries")}</text>
      </svg>
    </div>
  );
}

export default function ExtractionTab() {
  const { t, tf } = useI18n();
  const [dataset, setDataset] = useState("mnist");
  const [attack, setAttack] = useState("fgsm");
  const [queryBudget, setQueryBudget] = useState(2000);
  const [eps, setEps] = useState(0.3);
  const [epochs, setEpochs] = useState(8);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setRes(await apiPost("/extraction/run", {
        dataset, attack, query_budget: queryBudget, eps, epochs,
      }));
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
            <label>{t("Dataset")} <InfoButton topic={dataset} /> <InfoButton topic="extraction" /></label>
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
              <option value="mnist">{t("MNIST")}</option>
              <option value="cifar10">{t("CIFAR-10")}</option>
            </select>
          </div>
          <div className="field">
            <label>{t("Transfer attack")} <InfoButton topic="transfer" /></label>
            <div className="subtabs">
              {["fgsm", "pgd"].map((m) => (
                <button key={m} className={"subtab" + (attack === m ? " active" : "")} onClick={() => setAttack(m)}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <ParamSlider label={t("query budget")} value={queryBudget} min={200} max={4000} step={200} onChange={setQueryBudget} />
          <ParamSlider label={t("epsilon (L∞ budget)")} value={eps} min={0.05} max={0.5} step={0.05} onChange={setEps} fmt={(v) => v.toFixed(2)} />
          <ParamSlider label={t("substitute epochs")} value={epochs} min={2} max={15} step={1} onChange={setEpochs} />
          <button className="run" onClick={run} disabled={loading}>
            {loading ? t("Stealing & attacking…") : t("Steal & transfer")}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          {t("Trains several substitutes (one per budget) by querying the target for labels, then crafts adversarial examples on the largest substitute and replays them against the black-box target. Give it ~15–40s.")}
        </p>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      {res && (
        <>
          <div className="panel">
            <strong style={{ fontSize: 13 }}>{t("1 · Model extraction (stealing)")}</strong>
            <div className="metrics" style={{ marginTop: 10 }}>
              <MetricCard label={t("Target accuracy")} value={pct(res.target_acc)} />
              <MetricCard label={t("Substitute accuracy")} value={pct(res.substitute_acc)} />
              <MetricCard label={t("Fidelity (agreement)")} value={pct(res.fidelity)} tone="danger" />
              <MetricCard label={t("Queries used")} value={`${res.query_budget}`} />
            </div>
            <div className="callout">
              {tf("With {q} label-only queries the substitute reproduces the target's outputs {f} of the time — a stolen copy, never having seen the target's weights or training data.", {
                q: res.query_budget, f: pct(res.fidelity),
              })}
            </div>
          </div>

          <FidelityChart res={res} />

          <div className="panel">
            <strong style={{ fontSize: 13 }}>{t("2 · Black-box transfer evasion")}</strong>
            <div className="metrics" style={{ marginTop: 10 }}>
              <MetricCard label={t("White-box on substitute")} value={pct(res.whitebox_sub_success)} />
              <MetricCard label={t("Transfer to target (black-box)")} value={pct(res.transfer_success)} tone="danger" />
              <MetricCard label={t("Direct white-box on target (ref)")} value={pct(res.direct_success)} tone="ok" />
              <MetricCard label={t("Test points attacked")} value={`${res.n_eval}`} />
            </div>
            <div className="callout danger">
              {tf("Adversarial examples crafted on the stolen substitute flip the black-box target {tr} of the time — far above zero, though below the {dir} a direct white-box attack reaches. The attacker never touched the target's gradients.", {
                tr: pct(res.transfer_success), dir: pct(res.direct_success),
              })}
            </div>
          </div>

          {res.samples.length > 0 && (
            <div className="panel">
              <strong style={{ fontSize: 13 }}>{t("Transferred examples that fooled the target")}</strong>
              <p className="muted" style={{ fontSize: 12, margin: "6px 0 10px" }}>
                {t("Crafted white-box on the substitute, shown here fooling the black-box target.")}
              </p>
              {res.samples.map((s, i) => (
                <div key={i} className="images" style={{ alignItems: "center", marginBottom: 10 }}>
                  <ImagePanel src={s.orig_png} caption={`${t("Original")} — ${s.true_name}`} />
                  <ImagePanel src={s.adv_png} caption={tf("Adversarial (ε={e})", { e: res.eps })} />
                  <div className="metrics" style={{ marginTop: 0 }}>
                    <MetricCard label={t("target read before")} value={s.target_orig_name} tone="ok" />
                    <MetricCard label={t("target reads now")} value={s.target_adv_name} tone="danger" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
