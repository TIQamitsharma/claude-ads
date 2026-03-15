interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

function getGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function getColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

const sizeMap = {
  sm: { r: 28, stroke: 5, size: 72, fontSize: 16, labelSize: 10 },
  md: { r: 40, stroke: 7, size: 100, fontSize: 22, labelSize: 12 },
  lg: { r: 56, stroke: 9, size: 136, fontSize: 30, labelSize: 14 },
}

export default function ScoreGauge({ score, size = 'md', showLabel = true }: ScoreGaugeProps) {
  const { r, stroke, size: svgSize, fontSize, labelSize } = sizeMap[size]
  const circumference = 2 * Math.PI * r
  const progress = ((100 - score) / 100) * circumference
  const color = getColor(score)
  const grade = getGrade(score)
  const cx = svgSize / 2
  const cy = svgSize / 2

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1e2d45"
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div
        className="absolute flex flex-col items-center leading-none"
        style={{ marginTop: -(svgSize / 2 + fontSize / 2 + labelSize / 2 + 4) }}
      />
      <div className="flex flex-col items-center" style={{ marginTop: -svgSize - 4 }}>
        <span style={{ fontSize, color, fontWeight: 700, lineHeight: 1 }}>{score}</span>
        {showLabel && (
          <span style={{ fontSize: labelSize, color: '#94a3b8', marginTop: 2 }}>{grade}</span>
        )}
      </div>
    </div>
  )
}

export function ScoreGaugeInline({ score }: { score: number }) {
  const color = getColor(score)
  const grade = getGrade(score)
  const r = 20
  const stroke = 4
  const svgSize = 52
  const circumference = 2 * Math.PI * r
  const progress = ((100 - score) / 100) * circumference
  const cx = svgSize / 2
  const cy = svgSize / 2

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
      <svg width={svgSize} height={svgSize} className="-rotate-90 absolute inset-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d45" strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="flex flex-col items-center leading-none z-10">
        <span style={{ fontSize: 13, color, fontWeight: 700 }}>{score}</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{grade}</span>
      </div>
    </div>
  )
}

export { getGrade, getColor }
