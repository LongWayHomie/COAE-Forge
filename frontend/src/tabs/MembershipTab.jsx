import { useState } from "react";
import { apiPost } from "../api/client.js";
import MetricCard from "../components/MetricCard.jsx";
import ParamSlider from "../components/ParamSlider.jsx";
import InfoButton from "../components/InfoButton.jsx";
import { useI18n } from "../i18n.jsx";

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function ConfidenceHistogram({ res }) {
  const { t, tf } = useI18n();
  const W = 540, H = 170, padB = 22, padL = 4;
  const bins = res.hist_member.length;
  const maxCount = Math.max(1, ...res.hist_member, ...res.hist_nonmember);
  const bw = (W - padL * 2) / bins;
  const bh = (c) => (c / maxCount) * (H - padB);

  const bars = (counts, cls) =>
    counts.map((c, i) => (
      <rect
        key={i}
        x={padL + i * bw}
        y={H - padB - bh(c)}
        width={Math.max(1, bw - 1)}
        height={bh(c)}
        className={cls}
      />
    ));

  return (
    <div className="panel">
      <strong style={{ fontSize: 13 }}>{t("Confidence distribution — members vs non-members")}</strong>
      <svg width={W} height={H} style={{ display: "block", marginTop: 10, maxWidth: "100%" }}>
        {bars(res.hist_nonmember, "hbar-non")}
        {bars(res.hist_member, "hbar-mem")}
        <line x1={padL} y1={H - padB} x2={W - padL} y2={H - padB} stroke="var(--border)" />
        <text x={padL} y={H - 6} className="haxis">0.0</text>
        <text x={W / 2 - 40} y={H - 6} className="haxis">{t("confidence (max posterior)")}</text>
        <text x={W - padL - 18} y={H - 6} className="haxis">1.0</text>
      </svg>
      <div className="legend">
        <span><span className="dot clean" />{t("members (in training set)")}</span>
        <span><span className="dot pois" />{t("non-members")}</span>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        {tf("Mean confidence — members {a} vs non-members {b}.", {
          a: pct(res.mean_conf_member),
          b: pct(res.mean_conf_nonmember),
        })}{" "}
        {t("The wider this gap, the more the model leaks.")}
      </p>
    </div>
  );
}

export default function MembershipTab() {
  const { t, tf } = useI18n();
  const [dataset, setDataset] = useState("mnist");
  const [numShadows, setNumShadows] = useState(5);
  const [size, setSize] = useState(300);
  const [epochs, setEpochs] = useState(120);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setRes(await apiPost("/membership/attack", { dataset, num_shadows: numShadows, size, epochs }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const aucTone = res ? (res.attack_auc > 0.6 ? "danger" : res.attack_auc > 0.53 ? undefined : "ok") : undefined;

  return (
    <div>
      <div className="panel">
        <div className="controls">
          <div className="field">
            <label>{t("Dataset")} <InfoButton topic={dataset} /> <InfoButton topic="membership" /></label>
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
              <option value="mnist">{t("MNIST")}</option>
              <option value="cifar10">{t("CIFAR-10 (leaks more)")}</option>
            </select>
          </div>
          <ParamSlider label={t("shadow models")} value={numShadows} min={1} max={10} step={1} onChange={setNumShadows} />
          <ParamSlider label={t("members / non-members each")} value={size} min={100} max={1000} step={50} onChange={setSize} />
          <ParamSlider label={t("epochs (overfitting)")} value={epochs} min={20} max={400} step={20} onChange={setEpochs} />
          <button className="run" onClick={run} disabled={loading}>
            {loading ? t("Training shadows…") : t("Run attack")}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          {tf("Trains {n} shadow models to mimic the target, learns a membership classifier from their posteriors, then attacks the target. Raw-pixel MLPs overfit small subsets, so members get higher confidence than non-members.", { n: numShadows })}
        </p>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      {res && (
        <>
          <div className="panel">
            <div className="metrics">
              <MetricCard label={t("Attack AUC")} value={res.attack_auc.toFixed(3)} tone={aucTone} />
              <MetricCard label={t("Attack accuracy")} value={pct(res.attack_accuracy)} tone={aucTone} />
              <MetricCard label={t("Precision")} value={pct(res.attack_precision)} />
              <MetricCard label={t("Recall")} value={pct(res.attack_recall)} />
              <MetricCard label={t("Baseline (chance)")} value={res.baseline.toFixed(2)} tone="ok" />
            </div>
            <div className={"callout" + (res.overfit_gap > 0.1 ? " danger" : "")}>
              {tf("Target overfitting — train accuracy {a} vs test {b} (gap {c}).", {
                a: pct(res.target_train_acc),
                b: pct(res.target_test_acc),
                c: pct(res.overfit_gap),
              })}{" "}
              {t("Membership inference feeds on exactly this generalization gap; differential privacy (next tab) shrinks it.")}
            </div>
          </div>
          <ConfidenceHistogram res={res} />
        </>
      )}
    </div>
  );
}
