import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client.js";
import InfoButton from "../components/InfoButton.jsx";
import { useI18n } from "../i18n.jsx";

function highlight(text, mark) {
  if (!mark) return text;
  const parts = text.split(new RegExp(`(${mark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i"));
  return parts.map((p, i) =>
    p.toLowerCase() === mark.toLowerCase() ? <span key={i} className="secret">{p}</span> : p
  );
}

function ResultBadge({ r }) {
  const { t } = useI18n();
  if (r.succeeded) return <span className="badge-result fail">{t("🪝 injection obeyed — phishing link delivered")}</span>;
  if (r.blocked) return <span className="badge-result ok">{t("🛡 injected but stripped by guardrail")}</span>;
  if (r.injected === false) return <span className="badge-result ok">{t("✓ resisted")}</span>;
  return null;
}

export default function RagPanel() {
  const { t } = useI18n();
  const [sc, setSc] = useState(null);
  const [question, setQuestion] = useState("");
  const [injection, setInjection] = useState("");
  const [poisoned, setPoisoned] = useState(0);
  const [defense, setDefense] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/llm/rag-scenario")
      .then((d) => {
        setSc(d);
        setQuestion(d.question);
        setInjection(d.injection);
        setPoisoned(d.poisoned_index);
      })
      .catch((e) => setError(e.message));
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiPost("/llm/rag", {
        question, injection, poisoned_index: poisoned, defense,
      });
      setResult(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (error && !sc) return <div className="panel"><div className="error">⚠ {error}</div></div>;
  if (!sc) return <div className="panel muted">{t("Loading…")}</div>;

  return (
    <div>
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <strong style={{ fontSize: 13 }}>{t(sc.title)}</strong>
          <InfoButton topic="indirect_injection" />
        </div>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>{t(sc.description)}</p>
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{t("Assistant system prompt (trusted)")}</div>
          <pre className="sysprompt">{sc.system}</pre>
        </div>
      </div>

      <div className="panel">
        <strong style={{ fontSize: 13 }}>{t("Retrieved documents (knowledge base)")}</strong>
        <div className="muted" style={{ fontSize: 12, margin: "4px 0 10px" }}>
          {t("Pick which document the attacker poisoned. Its hidden instruction is shown in red — the model reads it as part of the data.")}
        </div>
        <div className="subtabs" style={{ marginBottom: 10, flexWrap: "wrap" }}>
          {sc.documents.map((_, i) => (
            <button key={i} className={"subtab" + (poisoned === i ? " active" : "")} onClick={() => setPoisoned(i)}>
              {t("Document")} {i + 1}{poisoned === i ? " ☣" : ""}
            </button>
          ))}
        </div>
        {sc.documents.map((body, i) => (
          <pre key={i} className="sysprompt" style={poisoned === i ? { borderColor: "var(--danger)" } : undefined}>
            <span className="muted">[{t("Document")} {i + 1}]</span>{"\n"}
            {body}
            {poisoned === i && <span className="secret">{injection}</span>}
          </pre>
        ))}
        <div className="field" style={{ marginTop: 6 }}>
          <label>{t("Injected instruction (hidden in the poisoned document)")}</label>
          <textarea
            rows={2}
            value={injection}
            onChange={(e) => setInjection(e.target.value)}
            style={{ background: "var(--panel-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6, padding: 8, fontFamily: "inherit", fontSize: 13 }}
          />
        </div>
      </div>

      <div className="panel">
        <div className="field">
          <label>{t("User question (benign — the user is not the attacker)")}</label>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          <label className="toggle">
            <input type="checkbox" checked={defense} onChange={(e) => setDefense(e.target.checked)} />
            <span>{t("🛡 Defense (treat documents as data + output filter)")}</span>
          </label>
          <button className="run" onClick={run} disabled={loading || !question.trim()}>
            {loading ? t("Asking DocBot…") : t("Ask DocBot")}
          </button>
          <span className="muted" style={{ fontSize: 12 }}>model: <code>{sc.model_id}</code></span>
        </div>
        {error && <div className="error">⚠ {error}</div>}
        {loading && <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>{t("Running on a local CPU model — first reply also loads it (~10–20s).")}</p>}

        {result && (
          <div className="chat" style={{ marginTop: 14 }}>
            <div className="bubble user">
              <div className="who">{t("user (benign)")}</div>
              <div className="text">{question}</div>
            </div>
            <div className="bubble assistant">
              <div className="who">{t("DocBot")}</div>
              <div className="text">{highlight(result.reply, result.marker)}</div>
              <ResultBadge r={result} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
