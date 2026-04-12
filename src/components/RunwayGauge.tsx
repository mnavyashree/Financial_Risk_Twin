import { motion } from 'framer-motion';
import { Fuel } from 'lucide-react';

interface RunwayGaugeProps {
  cashOnHand: number;
  monthlyBurnRate: number;
}

export function RunwayGauge({ cashOnHand, monthlyBurnRate }: RunwayGaugeProps) {
  const runway = monthlyBurnRate > 0 ? cashOnHand / monthlyBurnRate : 24;
  const maxMonths = 24;
  const percentage = Math.min((runway / maxMonths) * 100, 100);

  const getColor = () => {
    if (runway < 3) return 'hsl(0, 72%, 51%)';
    if (runway < 6) return 'hsl(38, 92%, 50%)';
    if (runway < 12) return 'hsl(200, 70%, 50%)';
    return 'hsl(160, 60%, 45%)';
  };

  const getLabel = () => {
    if (runway < 3) return 'Critical';
    if (runway < 6) return 'Short';
    if (runway < 12) return 'Moderate';
    return 'Healthy';
  };

  // Arc parameters
  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const sweepAngle = (percentage / 100) * totalAngle;

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx: number, cy: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(cx, cy, r, endA);
    const end = polarToCartesian(cx, cy, r, startA);
    const largeArc = endA - startA <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  const cx = size / 2;
  const cy = size / 2;

  return (
    <motion.div
      className="glass-card p-6 flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex items-center gap-2 mb-4 self-start">
        <Fuel className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Cash Runway</h2>
      </div>

      <div className="relative" style={{ width: size, height: size * 0.65 }}>
        <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.7}`}>
          {/* Background arc */}
          <path
            d={describeArc(cx, cy * 0.7, radius, startAngle, endAngle)}
            fill="none"
            stroke="hsl(220, 14%, 18%)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <motion.path
            d={describeArc(cx, cy * 0.7, radius, startAngle, startAngle + sweepAngle)}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <motion.span
            className="font-mono text-3xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {runway.toFixed(1)}
          </motion.span>
          <span className="text-xs text-muted-foreground">months</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: getColor() }}
        />
        <span className="text-sm font-medium" style={{ color: getColor() }}>
          {getLabel()} Runway
        </span>
      </div>
    </motion.div>
  );
}
