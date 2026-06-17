import { useState } from "react";
import AdversarialTab from "./tabs/AdversarialTab.jsx";
import PoisoningTab from "./tabs/PoisoningTab.jsx";
import MembershipTab from "./tabs/MembershipTab.jsx";
import PrivacyTab from "./tabs/PrivacyTab.jsx";
import DefenseTab from "./tabs/DefenseTab.jsx";
import ExtractionTab from "./tabs/ExtractionTab.jsx";
import InversionTab from "./tabs/InversionTab.jsx";
import SupplyChainTab from "./tabs/SupplyChainTab.jsx";
import LLMTab from "./tabs/LLMTab.jsx";
import { useI18n } from "./i18n.jsx";

const TABS = [
  { id: "adversarial", title: "Adversarial Examples", ready: true },
  { id: "poisoning", title: "Data Poisoning", ready: true },
  { id: "membership", title: "Membership Inference", ready: true },
  { id: "privacy", title: "Differential Privacy", ready: true },
  { id: "defense", title: "Adversarial Training", ready: true },
  { id: "extraction", title: "Model Extraction", ready: true },
  { id: "inversion", title: "Model Inversion", ready: true },
  { id: "supply_chain", title: "Supply Chain", ready: true },
  { id: "llm", title: "LLM Attacks", ready: true },
];

function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-toggle" title={t("Language")}>
      {["en", "pl"].map((l) => (
        <button
          key={l}
          className={"lang-btn" + (lang === l ? " active" : "")}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function CreditBadge() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="credit-btn" title="Credits" aria-label="Credits" onClick={() => setOpen(true)}>
        ❤️
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="credit-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="credit-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
            <p>Made with ❤️ by <strong>Razz</strong> for <strong>rpwn</strong></p>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [active, setActive] = useState("adversarial");
  const { t } = useI18n();

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>⚔️ COAE-Forge — AI Attack Playground</h1>
          <p>{t("Hands-on adversarial ML for COAE prep · educational / authorized use only")}</p>
        </div>
        <div className="header-right">
          <LangToggle />
          <CreditBadge />
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={"tab-btn" + (tab.id === active ? " active" : "")}
            onClick={() => setActive(tab.id)}
          >
            {t(tab.title)}
            <span className={"badge" + (tab.ready ? " ready" : "")}>
              {tab.ready ? t("ready") : t("soon")}
            </span>
          </button>
        ))}
      </nav>

      {active === "adversarial" ? (
        <AdversarialTab />
      ) : active === "poisoning" ? (
        <PoisoningTab />
      ) : active === "membership" ? (
        <MembershipTab />
      ) : active === "privacy" ? (
        <PrivacyTab />
      ) : active === "defense" ? (
        <DefenseTab />
      ) : active === "extraction" ? (
        <ExtractionTab />
      ) : active === "inversion" ? (
        <InversionTab />
      ) : active === "supply_chain" ? (
        <SupplyChainTab />
      ) : (
        <LLMTab />
      )}
    </div>
  );
}
