import type { AuditStatus } from '../../types'

interface StatusBadgeProps {
  status: AuditStatus
}

const configs: Record<AuditStatus, { label: string; className: string; dot: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-700 text-slate-400', dot: 'bg-slate-400' },
  running: { label: 'Running', className: 'bg-blue-500/15 text-blue-400', dot: 'bg-blue-400 animate-pulse' },
  complete: { label: 'Complete', className: 'bg-green-500/15 text-green-400', dot: 'bg-green-400' },
  failed: { label: 'Failed', className: 'bg-red-500/15 text-red-400', dot: 'bg-red-400' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className, dot } = configs[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
