import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, DollarSign, Users, TrendingUp, Percent, Scale } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StartupInputs, defaultInputs, industries } from '@/types/risk';

interface RiskInputFormProps {
  onSubmit: (inputs: StartupInputs) => void;
  isAnalyzing: boolean;
  csvOverrides?: Partial<StartupInputs> | null;
}

function FormField({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm text-secondary-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      {children}
    </div>
  );
}

export function RiskInputForm({ onSubmit, isAnalyzing, csvOverrides }: RiskInputFormProps) {
  const [inputs, setInputs] = useState<StartupInputs>(defaultInputs);

  // Apply CSV overrides when they change
  useEffect(() => {
    if (csvOverrides) {
      setInputs(prev => ({ ...prev, ...csvOverrides }));
    }
  }, [csvOverrides]);

  const update = (field: keyof StartupInputs, value: string | number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputs);
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="glass-card p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <h2 className="text-lg font-semibold text-foreground">Startup Profile</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Company Name" icon={Building2}>
          <Input
            placeholder="Acme Inc."
            value={inputs.companyName}
            onChange={e => update('companyName', e.target.value)}
            className="bg-muted/50 border-border/50 text-foreground placeholder:text-muted-foreground"
          />
        </FormField>

        <FormField label="Industry" icon={Building2}>
          <Select value={inputs.industry} onValueChange={v => update('industry', v)}>
            <SelectTrigger className="bg-muted/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Monthly Revenue ($)" icon={DollarSign}>
          <Input type="number" placeholder="50000"
            value={inputs.monthlyRevenue || ''}
            onChange={e => update('monthlyRevenue', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>

        <FormField label="Monthly Burn Rate ($)" icon={DollarSign}>
          <Input type="number" placeholder="80000"
            value={inputs.monthlyBurnRate || ''}
            onChange={e => update('monthlyBurnRate', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>

        <FormField label="Total Funding ($)" icon={DollarSign}>
          <Input type="number" placeholder="2000000"
            value={inputs.totalFunding || ''}
            onChange={e => update('totalFunding', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>

        <FormField label="Cash on Hand ($)" icon={DollarSign}>
          <Input type="number" placeholder="500000"
            value={inputs.cashOnHand || ''}
            onChange={e => update('cashOnHand', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>

        <FormField label="Team Size" icon={Users}>
          <Input type="number" placeholder="15"
            value={inputs.headcount || ''}
            onChange={e => update('headcount', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>

        <FormField label="Customer Count" icon={Users}>
          <Input type="number" placeholder="200"
            value={inputs.customerCount || ''}
            onChange={e => update('customerCount', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>

        <FormField label="Monthly Churn Rate (%)" icon={Percent}>
          <Input type="number" step="0.1" placeholder="3.5"
            value={inputs.churnRate || ''}
            onChange={e => update('churnRate', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>

        <FormField label="Revenue Growth Rate (%)" icon={TrendingUp}>
          <Input type="number" step="0.1" placeholder="15"
            value={inputs.revenueGrowthRate || ''}
            onChange={e => update('revenueGrowthRate', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>

        <FormField label="Debt-to-Equity Ratio" icon={Scale}>
          <Input type="number" step="0.01" placeholder="0.5"
            value={inputs.debtToEquityRatio || ''}
            onChange={e => update('debtToEquityRatio', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>

        <FormField label="Operating Margin (%)" icon={Percent}>
          <Input type="number" step="0.1" placeholder="-20"
            value={inputs.operatingMargin || ''}
            onChange={e => update('operatingMargin', Number(e.target.value))}
            className="bg-muted/50 border-border/50 font-mono text-foreground placeholder:text-muted-foreground" />
        </FormField>
      </div>

      <Button
        type="submit"
        disabled={isAnalyzing || !inputs.companyName}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
      >
        {isAnalyzing ? (
          <motion.div className="flex items-center gap-2"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}>
            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Analyzing Risk Profile...
          </motion.div>
        ) : (
          'Analyze Financial Risk'
        )}
      </Button>
    </motion.form>
  );
}
