import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../api/client.js";
import InfoButton from "../components/InfoButton.jsx";
import RagPanel from "./RagPanel.jsx";
import { useI18n } from "../i18n.jsx";

// Map backend scenario ids to explainer topic ids.
const TOPIC = { injection: "prompt_injection", jailbreak: "jailbreak", leakage: "system_prompt_leak" };

function ResultBadge({ m }) {
  const { t } = useI18n();
  if (m.succeeded) return <span className="badge-result fail">{t("🔓 secret leaked")}</span>;
  if (m.blocked) return <span className="badge-result ok">{t("🛡 leaked but redacted by guardrail")}</span>;
  if (m.leaked === false) return <span className="badge-result ok">{t("✓ resisted")}</span>;
  return null;
}

export default function LLMTab() {
  const { t } = useI18n();
  const [mode, setMode] = useState("direct");
  const [meta, setMeta] = useState({ model_id: "", loaded: false, scenarios: [] });
  const [scenarioId, setScenarioId] = useState("injection");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [defense, setDefense] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSystem, setShowSystem] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    apiGet("/llm/scenarios")
      .then((d) => {
        setMeta(d);
        if (d.scenarios[0]) setScenarioId(d.scenarios[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const scenario = meta.scenarios.find((s) => s.id === scenarioId);

  const reset = () => {
    setMessages([]);
    setError(null);
  };

  const preload = async () => {
    setModelLoading(true);
    setError(null);
    try {
      const d = await apiPost("/llm/load", {});
      setMeta((m) => ({ ...m, loaded: d.loaded }));
    } catch (e) {
      setError(e.message);
    } finally {
      setModelLoading(false);
    }
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((cur) => [...cur, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const d = await apiPost("/llm/chat", { scenario_id: scenarioId, history, message: msg, defense });
      setMeta((m) => ({ ...m, loaded: true }));
      setMessages((cur) => [
        ...cur,
        { role: "assistant", content: d.reply, leaked: d.leaked, blocked: d.blocked, succeeded: d.succeeded },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="panel" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="subtabs">
          <button className={"subtab" + (mode === "direct" ? " active" : "")} onClick={() => setMode("direct")}>
            {t("Direct attacks")}
          </button>
          <button className={"subtab" + (mode === "rag" ? " active" : "")} onClick={() => setMode("rag")}>
            {t("Indirect (RAG)")}
          </button>
        </div>
        <span className="muted" style={{ fontSize: 12 }}>
          {mode === "direct"
            ? t("The attacker types directly to the model.")
            : t("The attacker poisons a retrieved document; the user is innocent.")}
        </span>
      </div>

      {mode === "rag" ? <RagPanel /> : (
      <>
      <div className="panel">
        <div className="controls" style={{ alignItems: "center" }}>
          <div className="field">
            <label>{t("Attack scenario")} <InfoButton topic="llm" /> <InfoButton topic={TOPIC[scenarioId]} /></label>
            <select
              value={scenarioId}
              onChange={(e) => {
                setScenarioId(e.target.value);
                reset();
              }}
            >
              {meta.scenarios.map((s) => (
                <option key={s.id} value={s.id}>{t(s.title)}</option>
              ))}
            </select>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={defense} onChange={(e) => setDefense(e.target.checked)} />
            <span>{t("🛡 Defense (hardened prompt + output filter)")}</span>
          </label>
          <button className="run ghost" onClick={reset}>{t("Reset chat")}</button>
          <span className="muted" style={{ fontSize: 12 }}>
            model: <code>{meta.model_id}</code>{" "}
            {meta.loaded ? `✓ ${t("loaded")}` : (
              <button className="link" onClick={preload} disabled={modelLoading}>
                {modelLoading ? t("loading…") : t("preload")}
              </button>
            )}
          </span>
        </div>
        {error && <div className="error">⚠ {error}</div>}
      </div>

      {scenario && (
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 13 }}>{t("Victim system prompt — goal: extract the secret")}</strong>
            <button className="link" onClick={() => setShowSystem((v) => !v)}>
              {showSystem ? t("hide") : t("show")}
            </button>
          </div>
          {showSystem && (
            <>
              <p className="muted" style={{ fontSize: 12, margin: "6px 0" }}>{scenario.description}</p>
              <pre className="sysprompt">{highlight(scenario.system, scenario.secret)}</pre>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{t("Try a payload:")}</div>
              <div className="subtabs" style={{ flexWrap: "wrap" }}>
                {scenario.payloads.map((p, i) => (
                  <button key={i} className="subtab" onClick={() => setInput(p)} title={p}>
                    {t("payload")} {i + 1}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="panel">
        <div className="chat">
          {messages.length === 0 && (
            <div className="muted" style={{ fontSize: 13 }}>
              {t("Send an attack prompt to begin. Replies run on a local CPU model — expect a few seconds each (first reply also loads the model).")}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={"bubble " + m.role}>
              <div className="who">{m.role === "user" ? t("attacker") : t("victim model")}</div>
              <div className="text">{m.content}</div>
              {m.role === "assistant" && <ResultBadge m={m} />}
            </div>
          ))}
          {loading && <div className="bubble assistant"><div className="who">{t("victim model")}</div><div className="text muted">{t("thinking…")}</div></div>}
          <div ref={endRef} />
        </div>

        <div className="chat-input">
          <textarea
            rows={2}
            value={input}
            placeholder={t("Type an attack prompt (or load a payload above)…")}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="run" onClick={() => send()} disabled={loading || !input.trim()}>
            {loading ? "…" : t("Send")}
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function highlight(text, secret) {
  if (!secret) return text;
  const parts = text.split(secret);
  return parts.flatMap((p, i) =>
    i === 0 ? [p] : [<span key={i} className="secret">{secret}</span>, p]
  );
}
