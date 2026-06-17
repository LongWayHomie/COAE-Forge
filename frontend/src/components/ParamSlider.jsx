export default function ParamSlider({ label, value, min, max, step, onChange, fmt }) {
  const display = fmt ? fmt(value) : value;
  return (
    <div className="field slider">
      <div className="row">
        <label>{label}</label>
        <span className="val">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
