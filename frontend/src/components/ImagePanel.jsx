export default function ImagePanel({ src, caption }) {
  return (
    <div className="image-card">
      {src ? (
        <img src={src} alt={caption} width={168} height={168} />
      ) : (
        <div
          style={{
            width: 168,
            height: 168,
            border: "1px dashed var(--border)",
            borderRadius: 6,
          }}
        />
      )}
      <div className="cap">{caption}</div>
    </div>
  );
}
