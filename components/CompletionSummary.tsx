import React from 'react';
import type { CompletionData } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { DownloadIcon, ResetIcon, CheckCircleIcon } from './icons';

interface CompletionSummaryProps {
  data: CompletionData;
  onReset: () => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const StatCard: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
    <div className={`p-4 bg-[hsl(var(--secondary))] rounded-lg text-center ${className}`}>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
        <p className="text-lg font-[400] text-[hsl(var(--foreground))]">{value}</p>
    </div>
)

export const CompletionSummary: React.FC<CompletionSummaryProps> = ({ data, onReset }) => {
  const { initialSize, finalSize, fileCount, blob } = data;
  const savings = initialSize - finalSize;
  const savingsPercentage = initialSize > 0 ? (savings / initialSize) * 100 : 0;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `optimized_images_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="animate-fade-in">
        <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center items-center">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mb-2" />
            <CardTitle>Optimization Complete!</CardTitle>
            <CardDescription>
                Successfully optimized {fileCount} image{fileCount !== 1 ? 's' : ''}.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <StatCard label="Initial Size" value={formatBytes(initialSize)} />
               <StatCard label="Final Size" value={formatBytes(finalSize)} />
               <StatCard label="Savings" value={`${formatBytes(savings)} (${savingsPercentage.toFixed(1)}%)`} className="bg-green-100 dark:bg-green-900/20" />
            </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleDownload} className="w-full" size="lg">
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download ZIP
            </Button>
            <Button onClick={onReset} variant="outline" className="w-full">
                <ResetIcon className="w-4 h-4 mr-2" />
                Start Over
            </Button>
        </CardFooter>
        </Card>
    </div>
  );
};