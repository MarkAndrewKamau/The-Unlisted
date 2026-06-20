export function ObscurityGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = (clamped / 100) * 180; // 0..180 degrees across the semicircle
  const radians = (angle * Math.PI) / 180;
  const cx = 60;
  const cy = 60;
  const r = 48;
  const needleX = cx - r * Math.cos(radians);
  const needleY = cy - r * Math.sin(radians);

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="72" viewBox="0 0 120 72">
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke="#DDD8CC"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke="#E8A020"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * 150.8} 999`}
        />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#0F2419" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="3.5" fill="#0F2419" />
      </svg>
      <div className="-mt-1 font-mono text-2xl font-medium text-forest">{clamped.toFixed(1)}</div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-text-muted">Obscurity</div>
    </div>
  );
}
