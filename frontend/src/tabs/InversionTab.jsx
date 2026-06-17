import { useState } from "react";
import { apiPost } from "../api/client.js";
import ImagePanel from "../components/ImagePanel.jsx";
import MetricCard from "../components/MetricCard.jsx";
import ParamSlider from "../components/ParamSlider.jsx";
import InfoButton from "../components/InfoButton.jsx";
import { useI18n } from "../i18n.jsx";

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function ConfidenceCurve({ res }) {
  const { t } = useI18n();
  const W = 560, H = 200, padL = 38, padR = 14, padT = 14, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const pts = res.curve;
  const xmax = Math.max(...pts.map((p) => p.step), 1);
  const xpos = (s) => padL + (s / xmax) * plotW;
  const ypos = (v) => padT + (1 - v) * plotH;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${xpos(p.step).toFixed(1)},${ypos(p.confidence).toFixed(1)}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="panel">
      <strong style={{ fontSize: 13 }}>{t("Target-class confidence during reconstruction")}</strong>
      <svg width={W} height={H} style={{ display: "block", marginTop: 10, maxWidth: "100%" }}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padL} y1={ypos(tick)} x2={W - padR} y2={ypos(tick)} stroke="var(--border)" strokeWidth="0.5" />
            <text x={padL - 6} y={ypos(tick) + 3} textAnchor="end" className="haxis">{tick.toFixed(2)}</text>
          </g>
        ))}
        <path d={path} className="cline" fill="none" />
        <text x={padL} y={12} className="haxis">{t("confidence (0–1) · x = optimization step")}</text>
      </svg>
    </div>
  );
}

export default function InversionTab() {
  const { t, tf } = useI18n();
  const [dataset, setDataset] = useState("mnist");
  const [targetClass, setTargetClass] = useState(0);
  const [steps, setSteps] = useState(400);
  const [tvReg, setTvReg] = useState(3.0);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setRes(await apiPost("/inversion/run", { dataset, target_class: targetClass, steps, tv_reg: tvReg }));
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
            <label>{t("Dataset")} <InfoButton topic={dataset} /> <InfoButton topic="inversion" /></label>
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
              <option value="mnist">{t("MNIST")}</option>
              <option value="cifar10">{t("CIFAR-10")}</option>
            </select>
          </div>
          <div className="field">
            <label>{t("Target class to reconstruct")}</label>
            <select value={targetClass} onChange={(e) => setTargetClass(parseInt(e.target.value, 10))}>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <ParamSlider label={t("optimization steps")} value={steps} min={50} max={1000} step={50} onChange={setSteps} />
          <ParamSlider label={t("smoothness (TV)")} value={tvReg} min={0} max={8} step={0.5} onChange={setTvReg} fmt={(v) => v.toFixed(1)} />
          <button className="run" onClick={run} disabled={loading}>
            {loading ? t("Reconstructing…") : t("Reconstruct class")}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          {t("Optimizes a blank image so the model's internal representation matches its average for the target class — no real image of that class is ever shown to the optimizer. Takes ~3–5s.")}
        </p>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      {res && (
        <>
          <div className="panel">
            <div className="images">
              <ImagePanel src={res.recon_png} caption={tf("Reconstructed “{c}” (from gradients)", { c: res.class_name })} />
              <ImagePanel src={res.mean_png} caption={tf("Real class average ({c})", { c: res.class_name })} />
              <ImagePanel src={res.example_png} caption={tf("Real example ({c})", { c: res.class_name })} />
            </div>
            <div className="metrics">
              <MetricCard label={t("Model confidence")} value={pct(res.final_confidence)} tone="danger" />
              <MetricCard label={t("Reconstruction read as")} value={res.recon_pred_name} tone={res.recon_pred === res.target_class ? "danger" : undefined} />
              <MetricCard
                label={t("Nearest class average")}
                value={res.nearest_mean_name}
                tone={res.leak_confirmed ? "danger" : "ok"}
              />
              <MetricCard label={t("Target rank (of 10)")} value={`#${res.target_rank}`} />
            </div>
            <div className={"callout" + (res.leak_confirmed ? " danger" : "")}>
              {res.leak_confirmed
                ? tf("Pure leakage: starting from noise and using only the model's gradients, we reconstructed an image it is {f} sure is a “{c}” — and of all ten class averages it sits closest to “{c}”’s. The model memorized what the class looks like.", {
                    f: pct(res.final_confidence), c: res.class_name,
                  })
                : tf("The model is {f} sure this gradient-built image is a “{c}”. It lands closest to the “{n}” average instead — visually similar classes blur together — but the reconstruction still leaks class structure.", {
                    f: pct(res.final_confidence), c: res.class_name, n: res.nearest_mean_name,
                  })}
            </div>
          </div>

          <ConfidenceCurve res={res} />
        </>
      )}
    </div>
  );
}
