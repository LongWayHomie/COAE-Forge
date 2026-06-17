import { useState } from "react";
import { apiPost } from "../api/client.js";
import ImagePanel from "../components/ImagePanel.jsx";
import MetricCard from "../components/MetricCard.jsx";
import ParamSlider from "../components/ParamSlider.jsx";
import InfoButton from "../components/InfoButton.jsx";
import { useI18n } from "../i18n.jsx";

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function RobustnessChart({ res }) {
  const { t } = useI18n();
  const W = 560, H = 250, padL = 38, padR = 14, padT = 14, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const pts = res.curve;
  const xmax = Math.max(...pts.map((p) => p.epsilon));
  const xpos = (e) => padL + (xmax === 0 ? 0 : (e / xmax) * plotW);
  const ypos = (v) => padT + (1 - v) * plotH;
  const path = (key) =>
    pts.map((p, i) => `${i ? "L" : "M"}${xpos(p.epsilon).toFixed(1)},${ypos(p[key]).toFixed(1)}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="panel">
      <strong style={{ fontSize: 13 }}>{t("Robustness vs perturbation budget")}</strong>
      <svg width={W} height={H} style={{ display: "block", marginTop: 10, maxWidth: "100%" }}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padL} y1={ypos(tick)} x2={W - padR} y2={ypos(tick)} stroke="var(--border)" strokeWidth="0.5" />
            <text x={padL - 6} y={ypos(tick) + 3} textAnchor="end" className="haxis">{tick.toFixed(2)}</text>
          </g>
        ))}
        <line x1={xpos(res.eval_eps)} y1={padT} x2={xpos(res.eval_eps)} y2={padT + plotH} stroke="var(--muted)" strokeWidth="0.7" strokeDasharray="3 3" />
        <path d={path("baseline")} className="dline" fill="none" />
        <path d={path("defended")} className="cline" fill="none" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={xpos(p.epsilon)} cy={ypos(p.baseline)} r="3.5" className="ddot" />
            <circle cx={xpos(p.epsilon)} cy={ypos(p.defended)} r="3.5" className="cdot" />
            <text x={xpos(p.epsilon)} y={H - padB + 14} textAnchor="middle" className="haxis">{p.epsilon}</text>
          </g>
        ))}
        <text x={padL} y={12} className="haxis">{t("accuracy under FGSM, 0–1 · dashed line = eval ε")}</text>
      </svg>
      <div className="legend">
        <span><span className="dot clean" />{t("defended (adversarially trained)")}</span>
        <span><span className="dot pois" />{t("baseline (undefended)")}</span>
      </div>
    </div>
  );
}

export default function DefenseTab() {
  const { t, tf } = useI18n();
  const [dataset, setDataset] = useState("mnist");
  const [method, setMethod] = useState("fgsm");
  const [trainEps, setTrainEps] = useState(0.2);
  const [epochs, setEpochs] = useState(3);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setRes(await apiPost("/defense/train", { dataset, method, train_eps: trainEps, epochs }));
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
            <label>{t("Dataset")} <InfoButton topic={dataset} /> <InfoButton topic="defense" /></label>
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
              <option value="mnist">{t("MNIST")}</option>
              <option value="cifar10">{t("CIFAR-10")}</option>
            </select>
          </div>
          <div className="field">
            <label>{t("Training attack")} <InfoButton topic="fgsm" /> <InfoButton topic="pgd" /></label>
            <div className="subtabs">
              {["fgsm", "pgd"].map((m) => (
                <button key={m} className={"subtab" + (method === m ? " active" : "")} onClick={() => setMethod(m)}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <ParamSlider
            label={t("train ε (robustness budget)")}
            value={trainEps}
            min={0.05}
            max={0.4}
            step={0.05}
            onChange={setTrainEps}
            fmt={(v) => v.toFixed(2)}
          />
          <ParamSlider label={t("fine-tune epochs")} value={epochs} min={1} max={8} step={1} onChange={setEpochs} />
          <button className="run" onClick={run} disabled={loading}>
            {loading ? t("Hardening model…") : t("Adversarially train")}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          {t("Clones the pretrained model and fine-tunes it on adversarial examples regenerated every batch, then compares clean and robust accuracy to the undefended baseline. A few models' worth of attacks run per request — give it ~30–60s.")}
        </p>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      {res && (
        <>
          <div className="panel">
            <div className="metrics">
              <MetricCard label={t("Clean acc — baseline")} value={pct(res.baseline_clean_acc)} />
              <MetricCard label={t("Clean acc — defended")} value={pct(res.defended_clean_acc)} tone="ok" />
              <MetricCard label={t("PGD attack success — baseline")} value={pct(res.baseline_attack_success)} tone="danger" />
              <MetricCard label={t("PGD attack success — defended")} value={pct(res.defended_attack_success)} tone="ok" />
            </div>
            <div className="callout">
              {tf("Adversarial training kept clean accuracy ({a} → {b}) but cut the PGD attack success rate from {c} to {d} at ε={e}. The hardened model has seen perturbed inputs during training, so its decision boundary sits farther from natural images.", {
                a: pct(res.baseline_clean_acc), b: pct(res.defended_clean_acc),
                c: pct(res.baseline_attack_success), d: pct(res.defended_attack_success),
                e: res.eval_eps,
              })}
            </div>
            <div className="metrics" style={{ marginTop: 4 }}>
              <MetricCard label={tf("FGSM acc @ ε={e} — base", { e: res.eval_eps })} value={pct(res.baseline_fgsm_acc)} tone="danger" />
              <MetricCard label={tf("FGSM acc @ ε={e} — def", { e: res.eval_eps })} value={pct(res.defended_fgsm_acc)} tone="ok" />
              <MetricCard label={tf("PGD acc @ ε={e} — base", { e: res.eval_eps })} value={pct(res.baseline_pgd_acc)} tone="danger" />
              <MetricCard label={tf("PGD acc @ ε={e} — def", { e: res.eval_eps })} value={pct(res.defended_pgd_acc)} tone="ok" />
            </div>
          </div>

          <RobustnessChart res={res} />

          {res.samples.length > 0 && (
            <div className="panel">
              <strong style={{ fontSize: 13 }}>{t("Same adversarial image, two models")}</strong>
              <p className="muted" style={{ fontSize: 12, margin: "6px 0 10px" }}>
                {t("Each perturbation fools the undefended baseline. The defended model is shown the very same image — see whether it still predicts the true class.")}
              </p>
              {res.samples.map((s, i) => (
                <div key={i} className="images" style={{ alignItems: "center", marginBottom: 10 }}>
                  <ImagePanel src={s.orig_png} caption={`${t("Original")} — ${s.true_name}`} />
                  <ImagePanel src={s.adv_png} caption={tf("Adversarial (ε={e})", { e: res.eval_eps })} />
                  <div className="metrics" style={{ marginTop: 0 }}>
                    <MetricCard label={t("baseline reads")} value={s.baseline_pred_name} tone="danger" />
                    <MetricCard
                      label={t("defended reads")}
                      value={s.defended_pred_name}
                      tone={s.defended_holds ? "ok" : "danger"}
                    />
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
