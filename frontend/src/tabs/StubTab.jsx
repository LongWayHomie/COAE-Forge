import { useEffect, useState } from "react";
import { apiGet } from "../api/client.js";

// Generic "coming soon" tab for not-yet-implemented attack families.
// Hits /api/<id>/info to display the planned techniques from the backend.
export default function StubTab({ id, title }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet(`/${id}/info`).then(setInfo).catch((e) => setError(e.message));
  }, [id]);

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p className="muted">
        {info ? info.message : error ? `Error: ${error}` : "Loading…"}
      </p>
      {info?.planned?.length > 0 && (
        <>
          <strong style={{ fontSize: 13 }}>Planned:</strong>
          <ul className="planned">
            {info.planned.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </>
      )}
      <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
        This tab is a stub. Backend endpoint <code>/api/{id}/run</code> returns a
        placeholder until the attack is implemented.
      </p>
    </div>
  );
}
