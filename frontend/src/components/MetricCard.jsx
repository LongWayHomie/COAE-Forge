export default function MetricCard({ label, value, tone }) {
  return (
    <div className="metric">
      <div className="k">{label}</div>
      <div className={"v" + (tone ? " " + tone : "")}>{value}</div>
    </div>
  );
}
