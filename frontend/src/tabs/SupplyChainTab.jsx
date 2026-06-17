import { useState } from "react";
import { apiPost } from "../api/client.js";
import InfoButton from "../components/InfoButton.jsx";
import { useI18n } from "../i18n.jsx";

export default function SupplyChainTab() {
  const { t } = useI18n();
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setRes(await apiPost("/supply-chain/run", {}));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <strong style={{ fontSize: 13 }}>{t("Unsafe model deserialization → RCE")}</strong>
          <InfoButton topic="supply_chain" />
        </div>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          {t("PyTorch checkpoints are pickle files. Loading an untrusted one with the legacy default runs attacker code. This demo crafts such a file locally (with a harmless proof-of-execution payload), loads it the unsafe way, then shows weights_only=True blocking the very same file.")}
        </p>
        <div style={{ marginTop: 12 }}>
          <button className="run" onClick={run} disabled={loading}>
            {loading ? t("Running demo…") : t("Run the RCE demo")}
          </button>
        </div>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      {res && (
        <>
          <div className="panel">
            <strong style={{ fontSize: 13 }}>{t("The attacker's payload (hidden in the model file)")}</strong>
            <pre className="sysprompt">{res.payload_source}</pre>
            <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
              {t("Saved inside a checkpoint that looks completely ordinary:")}{" "}
              <code>{res.checkpoint_keys.join(", ")}</code> ({res.file_size} {t("bytes")})
            </p>
          </div>

          <div className="panel">
            <strong style={{ fontSize: 13 }}>① {t("Unsafe load (legacy default)")}</strong>
            <pre className="sysprompt">{res.unsafe_call}</pre>
            {res.executed ? (
              <>
                <div className="badge-result fail">{t("🔥 arbitrary code executed during load")}</div>
                <p className="muted" style={{ fontSize: 12, margin: "10px 0 4px" }}>
                  {t("The payload ran and recorded proof — a real attacker could run anything as you:")}
                </p>
                <pre className="sysprompt">{JSON.stringify(res.evidence, null, 2)}</pre>
              </>
            ) : (
              <div className="badge-result ok">{t("payload did not run")}</div>
            )}
          </div>

          <div className="panel">
            <strong style={{ fontSize: 13 }}>② {t("Safe load (the fix)")}</strong>
            <pre className="sysprompt">{res.safe_call}</pre>
            {res.safe_blocked ? (
              <>
                <div className="badge-result ok">{t("🛡 blocked — no code executed")}</div>
                <pre className="sysprompt" style={{ marginTop: 10, color: "var(--muted)" }}>{res.safe_error}</pre>
              </>
            ) : (
              <div className="badge-result fail">{t("⚠ not blocked")}</div>
            )}
          </div>

          <div className="panel">
            <strong style={{ fontSize: 13 }}>{t("Takeaways")}</strong>
            <ul className="planned">
              {res.takeaways.map((tk, i) => (
                <li key={i} style={{ color: "var(--text)" }}>{tk}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
