import React from 'react';
import type { OptimizationSettings, AiSuggestion, ImageFormat } from '../types';
import { SparklesIcon, DownloadIcon, ResetIcon, LightBulbIcon } from './icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Select } from './ui/Select';
import { Slider } from './ui/Slider';
import { Input } from './ui/Input';

interface OptimizationFormProps {
  settings: OptimizationSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<OptimizationSettings>>;
  onGetAiSuggestion: () => void;
  onOptimize: () => void;
  onReset: () => void;
  isAiLoading: boolean;
  isOptimizing: boolean;
  aiSuggestion: AiSuggestion | null;
}

export const OptimizationForm: React.FC<OptimizationFormProps> = ({
  settings,
  onSettingsChange,
  onGetAiSuggestion,
  onOptimize,
  onReset,
  isAiLoading,
  isOptimizing,
  aiSuggestion,
}) => {
  const handleSettingChange = <K extends keyof OptimizationSettings>(key: K, value: OptimizationSettings[K]) => {
    onSettingsChange(prev => ({ ...prev, [key]: value }));
  };

  const formats: ImageFormat[] = ['webp', 'jpeg', 'png'];
  const isLoading = isAiLoading || isOptimizing;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimization Settings</CardTitle>
        <CardDescription>Adjust settings or get an AI suggestion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
            onClick={onGetAiSuggestion}
            disabled={isLoading}
            variant="outline"
            className="w-full"
            loading={isAiLoading}
        >
            <SparklesIcon className="w-5 h-5 mr-2" />
            {isAiLoading ? 'Analyzing...' : 'Get AI Suggestion'}
        </Button>
        {aiSuggestion && (
          <div className="p-3 bg-[hsl(var(--accent))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--accent-foreground))]">
            <p className="flex items-start gap-2">
                <LightBulbIcon className="w-4 h-4 mt-0.5 text-[hsl(var(--primary))] flex-shrink-0" />
                <span><strong className="font-[400] text-[hsl(var(--foreground))]">AI:</strong> {aiSuggestion.reasoning}</span>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <Select id="format" value={settings.format} onChange={e => handleSettingChange('format', e.target.value as ImageFormat)} disabled={isLoading}>
            {formats.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="quality">Quality</Label>
            <span className="text-sm font-[400] text-[hsl(var(--primary))]">{(settings.quality * 100).toFixed(0)}%</span>
          </div>
          <Slider
            id="quality"
            min="0.1"
            max="1"
            step="0.01"
            value={settings.quality}
            onChange={e => handleSettingChange('quality', parseFloat(e.target.value))}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxWidth">Max Width (px)</Label>
          <Input
            id="maxWidth"
            type="number"
            value={settings.maxWidth}
            onChange={e => handleSettingChange('maxWidth', parseInt(e.target.value, 10) || 0)}
            disabled={isLoading}
            placeholder="e.g., 1920"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button onClick={onOptimize} disabled={isLoading} className="w-full" size="lg" variant="default" loading={isOptimizing}>
            <DownloadIcon className="w-5 h-5 mr-2" />
            {isOptimizing ? 'Optimizing...' : 'Optimize Images'}
        </Button>
         <Button onClick={onReset} disabled={isLoading} variant="ghost" className="w-full text-[hsl(var(--muted-foreground))]">
            <ResetIcon className="w-4 h-4 mr-2" />
            Start Over
        </Button>
      </CardFooter>
    </Card>
  );
};