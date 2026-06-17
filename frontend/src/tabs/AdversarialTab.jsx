import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client.js";
import ImagePanel from "../components/ImagePanel.jsx";
import MetricCard from "../components/MetricCard.jsx";
import ParamSlider from "../components/ParamSlider.jsx";
import InfoButton from "../components/InfoButton.jsx";
import { useI18n } from "../i18n.jsx";

const ATTACKS = {
  fgsm: { label: "FGSM", blurb: "Single-step L∞ sign attack (Goodfellow 2015)." },
  pgd: { label: "PGD", blurb: "Iterative L∞ attack projected into an ε-ball (Madry 2018)." },
  deepfool: { label: "DeepFool", blurb: "Iterative minimal-L2 attack (Moosavi-Dezfooli 2016)." },
  ead: { label: "EAD", blurb: "Elastic-net (L1+L2) attack with c binary search (Chen 2018)." },
  jsma: { label: "JSMA", blurb: "Jacobian saliency-map L0 (sparse) attack (Papernot 2016)." },
};

const DEFAULT_PARAMS = {
  fgsm: { epsilon: 0.3 },
  pgd: { epsilon: 0.2, alpha: 0.03, steps: 40 },
  deepfool: { max_iter: 50, overshoot: 0.02 },
  ead: { beta: 0.01, steps: 100, lr: 0.02 },
  jsma: { gamma: 0.14, theta: 1.0 },
};

export default function AdversarialTab() {
  const { t } = useI18n();
  const [dataset, setDataset] = useState("mnist");
  const [index, setIndex] = useState(0);
  const [attack, setAttack] = useState("fgsm");
  const [params, setParams] = useState(DEFAULT_PARAMS);

  const [sample, setSample] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setParam = (key, value) =>
    setParams((p) => ({ ...p, [attack]: { ...p[attack], [key]: value } }));

  const loadSample = useCallback(() => {
    setError(null);
    setResult(null);
    apiGet("/adversarial/sample", { dataset, index })
      .then(setSample)
      .catch((e) => {
        setSample(null);
        setError(e.message);
      });
  }, [dataset, index]);

  useEffect(() => {
    loadSample();
  }, [loadSample]);

  const runAttack = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost("/adversarial/attack", {
        dataset,
        sample_index: index,
        attack,
        params: params[attack],
      });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const p = params[attack];

  return (
    <div>
      <div className="panel">
        <div className="controls">
          <div className="field">
            <label>{t("Dataset")} <InfoButton topic={dataset} /></label>
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
              <option value="mnist">{t("MNIST")}</option>
              <option value="cifar10">{t("CIFAR-10")}</option>
            </select>
          </div>

          <div className="field">
            <label>{t("Sample index")}</label>
            <input
              type="number"
              min={0}
              value={index}
              style={{ width: 90 }}
              onChange={(e) => setIndex(Math.max(0, parseInt(e.target.value || "0", 10)))}
            />
          </div>

          <div className="field">
            <label>{t("Attack")} <InfoButton topic="adversarial" /></label>
            <select value={attack} onChange={(e) => setAttack(e.target.value)}>
              {Object.entries(ATTACKS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {attack === "fgsm" && (
            <ParamSlider
              label={t("epsilon (L∞ budget)")}
              value={p.epsilon}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setParam("epsilon", v)}
              fmt={(v) => v.toFixed(2)}
            />
          )}
          {attack === "pgd" && (
            <>
              <ParamSlider
                label={t("epsilon (L∞ budget)")}
                value={p.epsilon}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => setParam("epsilon", v)}
                fmt={(v) => v.toFixed(2)}
              />
              <ParamSlider
                label={t("alpha (step size)")}
                value={p.alpha}
                min={0.005}
                max={0.1}
                step={0.005}
                onChange={(v) => setParam("alpha", v)}
                fmt={(v) => v.toFixed(3)}
              />
              <ParamSlider
                label={t("steps")}
                value={p.steps}
                min={5}
                max={100}
                step={1}
                onChange={(v) => setParam("steps", v)}
              />
            </>
          )}
          {attack === "jsma" && (
            <>
              <ParamSlider
                label={t("gamma (max % pixels)")}
                value={p.gamma}
                min={0.02}
                max={0.5}
                step={0.02}
                onChange={(v) => setParam("gamma", v)}
                fmt={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <ParamSlider
                label={t("theta (per-pixel push)")}
                value={p.theta}
                min={0.2}
                max={1}
                step={0.1}
                onChange={(v) => setParam("theta", v)}
                fmt={(v) => v.toFixed(1)}
              />
            </>
          )}
          {attack === "deepfool" && (
            <>
              <ParamSlider
                label={t("max iterations")}
                value={p.max_iter}
                min={5}
                max={100}
                step={1}
                onChange={(v) => setParam("max_iter", v)}
              />
              <ParamSlider
                label={t("overshoot")}
                value={p.overshoot}
                min={0}
                max={0.1}
                step={0.005}
                onChange={(v) => setParam("overshoot", v)}
                fmt={(v) => v.toFixed(3)}
              />
            </>
          )}
          {attack === "ead" && (
            <>
              <ParamSlider
                label={t("beta (L1 weight)")}
                value={p.beta}
                min={0}
                max={0.05}
                step={0.005}
                onChange={(v) => setParam("beta", v)}
                fmt={(v) => v.toFixed(3)}
              />
              <ParamSlider
                label={t("steps / c-search inner")}
                value={p.steps}
                min={20}
                max={300}
                step={10}
                onChange={(v) => setParam("steps", v)}
              />
              <ParamSlider
                label={t("learning rate")}
                value={p.lr}
                min={0.005}
                max={0.05}
                step={0.005}
                onChange={(v) => setParam("lr", v)}
                fmt={(v) => v.toFixed(3)}
              />
            </>
          )}

          <button className="run" onClick={runAttack} disabled={loading || !sample}>
            {loading ? t("Running…") : t("Run attack")}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <InfoButton topic={attack} label={ATTACKS[attack].label} /> {t(ATTACKS[attack].blurb)}
        </p>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      <div className="panel">
        <div className="images">
          <ImagePanel
            src={result ? result.original_png : sample?.image_png}
            caption={
              sample
                ? `${t("Original")} — true: ${sample.label_name} | pred: ${sample.pred_name} (${(
                    sample.confidence * 100
                  ).toFixed(1)}%)`
                : t("Original")
            }
          />
          <ImagePanel
            src={result?.adversarial_png}
            caption={
              result
                ? `${t("Adversarial")} — pred: ${result.adv_pred_name} (${(
                    result.adv_conf * 100
                  ).toFixed(1)}%)`
                : t("Adversarial")
            }
          />
          <ImagePanel src={result?.perturbation_png} caption={t("Perturbation (scaled)")} />
        </div>

        {result && (
          <div className="metrics">
            <MetricCard
              label={t("Result")}
              value={result.success ? t("Misclassified") : t("Robust")}
              tone={result.success ? "danger" : "ok"}
            />
            <MetricCard
              label={t("Pred change")}
              value={`${result.orig_pred_name} → ${result.adv_pred_name}`}
            />
            <MetricCard label="L2" value={result.l2.toFixed(3)} />
            <MetricCard label="L∞" value={result.linf.toFixed(3)} />
            <MetricCard label="L0" value={result.l0.toFixed(0)} />
            <MetricCard label={t("Adv confidence")} value={`${(result.adv_conf * 100).toFixed(1)}%`} />
          </div>
        )}
      </div>
    </div>
  );
}
