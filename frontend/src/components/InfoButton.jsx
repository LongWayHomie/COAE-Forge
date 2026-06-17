import { useState } from "react";
import { useI18n } from "../i18n.jsx";
import Modal from "./Modal.jsx";

// A small "ⓘ" button that opens an explainer modal for the given topic id.
// `label` optionally shows text next to the icon (e.g. a dataset/variant name).
export default function InfoButton({ topic, label }) {
  const { t, explain } = useI18n();
  const [open, setOpen] = useState(false);
  const content = explain(topic);
  if (!content) return null;

  const Section = ({ heading, paras }) =>
    paras && paras.length ? (
      <div className="modal-section">
        <h4>{t(heading)}</h4>
        {paras.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    ) : null;

  return (
    <>
      <button className="infobtn" onClick={() => setOpen(true)} title={t("What is this?")}>
        ⓘ{label ? <span className="infobtn-label">{label}</span> : null}
      </button>
      {open && (
        <Modal title={content.title} onClose={() => setOpen(false)}>
          <Section heading="What it is" paras={content.what} />
          <Section heading="How it works" paras={content.how} />
          <Section heading="What it results in" paras={content.result} />
        </Modal>
      )}
    </>
  );
}
