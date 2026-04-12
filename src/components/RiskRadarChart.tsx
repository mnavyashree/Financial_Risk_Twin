import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { RiskScore } from '@/types/risk';

interface RiskRadarChartProps {
  score: RiskScore;
}

export function RiskRadarChart({ score }: RiskRadarChartProps) {
  const data = [
    { category: 'Financial', value: score.financial, fullMark: 100 },
    { category: 'Operational', value: score.operational, fullMark: 100 },
    { category: 'Market', value: score.market, fullMark: 100 },
    { category: 'Growth', value: score.growth, fullMark: 100 },
  ];

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <h2 className="text-lg font-semibold text-foreground mb-4">Risk Radar</h2>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="hsl(220, 14%, 18%)" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'hsl(215, 12%, 40%)', fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name="Risk"
              dataKey="value"
              stroke="hsl(160, 60%, 45%)"
              fill="hsl(160, 60%, 45%)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
