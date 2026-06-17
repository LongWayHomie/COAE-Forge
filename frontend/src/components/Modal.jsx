import { useEffect } from "react";
import { useI18n } from "../i18n.jsx";

export default function Modal({ title, onClose, children }) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label={t("Close")}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          <button className="run" onClick={onClose}>{t("Close")}</button>
        </div>
      </div>
    </div>
  );
}
