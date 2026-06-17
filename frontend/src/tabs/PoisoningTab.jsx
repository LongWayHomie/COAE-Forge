import { useState } from "react";
import { apiPost } from "../api/client.js";
import ImagePanel from "../components/ImagePanel.jsx";
import MetricCard from "../components/MetricCard.jsx";
import ParamSlider from "../components/ParamSlider.jsx";
import InfoButton from "../components/InfoButton.jsx";
import { useI18n } from "../i18n.jsx";

const CLASS_NAMES = {
  mnist: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  cifar10: ["airplane", "automobile", "bird", "cat", "deer", "dog", "frog", "horse", "ship", "truck"],
};

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function ClassSelect({ dataset, value, onChange, label }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))}>
        {CLASS_NAMES[dataset].map((n, i) => (
          <option key={i} value={i}>
            {i} — {n}
          </option>
        ))}
      </select>
    </div>
  );
}

function DatasetSelect({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="field">
      <label>{t("Dataset")} <InfoButton topic={value} /></label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="mnist">{t("MNIST")}</option>
        <option value="cifar10">{t("CIFAR-10")}</option>
      </select>
    </div>
  );
}

function PerClassBars({ res }) {
  const { t } = useI18n();
  return (
    <div className="panel">
      <strong style={{ fontSize: 13 }}>{t("Per-class test accuracy")}</strong>
      <div className="bars">
        {res.class_names.map((name, c) => (
          <PerClassRow
            key={c}
            label={`${c} ${res.dataset === "cifar10" ? name : ""}`.trim()}
            clean={res.per_class_clean[c]}
            pois={res.per_class_poisoned[c]}
            max={1}
          />
        ))}
      </div>
      <div className="legend">
        <span><span className="dot clean" />{t("clean model")}</span>
        <span><span className="dot pois" />{t("poisoned model")}</span>
      </div>
    </div>
  );
}

function PerClassRow({ label, clean, pois, max }) {
  return (
    <>
      <div className="cls">{label}</div>
      <div className="bar-pair">
        <div className="bar clean" title={`clean ${pct(clean)}`}>
          <span style={{ width: `${(clean / max) * 100}%` }} />
        </div>
        <div className="bar pois" title={`poisoned ${pct(pois)}`}>
          <span style={{ width: `${(pois / max) * 100}%` }} />
        </div>
      </div>
    </>
  );
}

function LabelFlipPanel({ dataset }) {
  const { t, tf } = useI18n();
  const [mode, setMode] = useState("random");
  const [rate, setRate] = useState(0.3);
  const [source, setSource] = useState(7);
  const [target, setTarget] = useState(1);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setRes(await apiPost("/poisoning/label-flip", { dataset, rate, mode, source, target }));
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
            <label>{t("Flip mode")} <InfoButton topic="label_flip" /></label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="random">{t("Random (untargeted)")}</option>
              <option value="targeted">{t("Targeted (source → target)")}</option>
            </select>
          </div>
          <ParamSlider
            label={mode === "targeted" ? t("fraction of source class flipped") : t("fraction of labels flipped")}
            value={rate}
            min={0}
            max={mode === "targeted" ? 1 : 0.6}
            step={0.05}
            onChange={setRate}
            fmt={pct}
          />
          {mode === "targeted" && (
            <>
              <ClassSelect dataset={dataset} value={source} onChange={setSource} label={t("source class")} />
              <ClassSelect dataset={dataset} value={target} onChange={setTarget} label={t("→ target label")} />
            </>
          )}
          <button className="run" onClick={run} disabled={loading}>
            {loading ? t("Training…") : t("Poison & retrain")}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          {t("Flips training labels, then retrains the linear head on frozen CNN features and compares test accuracy to a clean baseline.")}
        </p>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      {res && (
        <>
          <div className="panel">
            <div className="metrics">
              <MetricCard label={t("Clean accuracy")} value={pct(res.clean_acc)} tone="ok" />
              <MetricCard label={t("Poisoned accuracy")} value={pct(res.poisoned_acc)} tone="danger" />
              <MetricCard label={t("Accuracy drop")} value={pct(res.acc_drop)} tone="danger" />
              <MetricCard label={t("Labels flipped")} value={`${res.num_flipped} / ${res.num_train}`} />
            </div>
            {res.mode === "targeted" && res.source_recall_clean != null && (
              <div className="callout danger">
                {tf("Targeted collapse — class {n} recall: {a} → {b}.", {
                  n: res.source,
                  a: pct(res.source_recall_clean),
                  b: pct(res.source_recall_poisoned),
                })}{" "}
                {t("The model now reads many source-class inputs as the target label.")}
              </div>
            )}
            {res.samples.length > 0 && (
              <div className="images" style={{ marginTop: 16 }}>
                {res.samples.map((s, i) => (
                  <ImagePanel
                    key={i}
                    src={s.image_png}
                    caption={tf("{a} → {b} (poisoned label)", { a: s.true_name, b: s.flipped_name })}
                  />
                ))}
              </div>
            )}
          </div>
          <PerClassBars res={res} />
        </>
      )}
    </div>
  );
}

function CleanLabelPanel({ dataset }) {
  const { t, tf } = useI18n();
  const [targetIndex, setTargetIndex] = useState(0);
  const [baseClass, setBaseClass] = useState(3);
  const [numPoisons, setNumPoisons] = useState(3);
  const [beta, setBeta] = useState(0.1);
  const [steps, setSteps] = useState(200);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setRes(
        await apiPost("/poisoning/clean-label", {
          dataset,
          target_index: targetIndex,
          base_class: baseClass,
          num_poisons: numPoisons,
          beta,
          steps,
        })
      );
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
            <label>{t("Target test index")} <InfoButton topic="clean_label" /></label>
            <input
              type="number"
              min={0}
              value={targetIndex}
              style={{ width: 90 }}
              onChange={(e) => setTargetIndex(Math.max(0, parseInt(e.target.value || "0", 10)))}
            />
          </div>
          <ClassSelect dataset={dataset} value={baseClass} onChange={setBaseClass} label={t("base / poison class")} />
          <ParamSlider label={t("num poisons")} value={numPoisons} min={1} max={10} step={1} onChange={setNumPoisons} />
          <ParamSlider label={t("beta (stay near base)")} value={beta} min={0} max={1} step={0.05} onChange={setBeta} fmt={(v) => v.toFixed(2)} />
          <ParamSlider label={t("craft steps")} value={steps} min={50} max={600} step={50} onChange={setSteps} />
          <button className="run" onClick={run} disabled={loading}>
            {loading ? t("Crafting…") : t("Craft poisons & retrain")}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          {t("Poison Frogs: craft images that look like the base class but collide with the target's features. Injected with their correct base label, they make the specific target test image get misclassified — without any mislabeling.")}
        </p>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      {res && (
        <div className="panel">
          <span className={"badge-result " + (res.success ? "ok" : "fail")}>
            {res.success
              ? tf("Attack succeeded — target {a} now read as {b}", { a: res.target_name, b: res.base_name })
              : t("Attack failed — target prediction unchanged")}
          </span>
          <div className="images" style={{ marginTop: 16 }}>
            <ImagePanel
              src={res.target_png}
              caption={tf("Target ({c}) — pred {a} → {b}", { c: res.target_name, a: res.pred_before_name, b: res.pred_after_name })}
            />
            <ImagePanel src={res.base_png} caption={tf("Base class: {b}", { b: res.base_name })} />
            {res.poison_pngs.map((p, i) => (
              <ImagePanel key={i} src={p} caption={tf("Poison {n} (labeled {b})", { n: i + 1, b: res.base_name })} />
            ))}
          </div>
          <div className="metrics">
            <MetricCard label={t("Pred before")} value={res.pred_before_name} tone="ok" />
            <MetricCard label={t("Pred after")} value={res.pred_after_name} tone={res.success ? "danger" : undefined} />
            <MetricCard label={t("Feat dist: base→target")} value={res.feat_dist_before.toFixed(2)} />
            <MetricCard label={t("Feat dist: poison→target")} value={res.feat_dist_after.toFixed(2)} tone="danger" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PoisoningTab() {
  const { t } = useI18n();
  const [technique, setTechnique] = useState("label_flip");
  const [dataset, setDataset] = useState("mnist");

  return (
    <div>
      <div className="panel">
        <div className="controls" style={{ alignItems: "center" }}>
          <div className="subtabs">
            <button
              className={"subtab" + (technique === "label_flip" ? " active" : "")}
              onClick={() => setTechnique("label_flip")}
            >
              {t("Label Flipping")}
            </button>
            <button
              className={"subtab" + (technique === "clean_label" ? " active" : "")}
              onClick={() => setTechnique("clean_label")}
            >
              {t("Clean-Label (Poison Frogs)")}
            </button>
          </div>
          <InfoButton topic={technique === "label_flip" ? "label_flip" : "clean_label"} />
          <DatasetSelect value={dataset} onChange={setDataset} />
        </div>
      </div>

      {technique === "label_flip" ? (
        <LabelFlipPanel key={dataset} dataset={dataset} />
      ) : (
        <CleanLabelPanel key={dataset} dataset={dataset} />
      )}
    </div>
  );
}
