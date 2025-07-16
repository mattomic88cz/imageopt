import React from 'react';
import type { ImageFile } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';

interface ImageGroupSummaryProps {
  groupedImages: Record<string, ImageFile[]>;
  totalFiles: number;
  totalOriginalSize: number;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const ImageGroupSummary: React.FC<ImageGroupSummaryProps> = ({
  groupedImages,
  totalFiles,
  totalOriginalSize,
}) => {
  const sortedGroups = Object.entries(groupedImages).sort(([, a], [, b]) => b.length - a.length);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Upload Summary</CardTitle>
                <CardDescription>
                    {totalFiles} image{totalFiles !== 1 ? 's' : ''} with a total size of {formatBytes(totalOriginalSize)}
                </CardDescription>
            </div>
            <Badge variant="default">{totalFiles} Files</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-0 max-h-[60vh] overflow-y-auto">
            {sortedGroups.map(([dimensions, files]) => (
                <div key={dimensions} className="flex items-center justify-between px-6 py-4 border-t border-[hsl(var(--border))]">
                    <div className="flex items-center gap-4">
                        <img src={files[0].objectUrl} alt="thumbnail" className="w-12 h-12 rounded-md object-cover bg-[hsl(var(--muted))]" />
                        <div>
                            <p className="font-[400] text-[hsl(var(--card-foreground))]">{dimensions}</p>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">{files.length} image{files.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <Badge variant="secondary">{formatBytes(files.reduce((acc, f) => acc + f.size, 0))}</Badge>
                </div>
            ))}
            {sortedGroups.length === 0 && (
                <p className="text-[hsl(var(--muted-foreground))] text-center py-8 px-6">No images uploaded yet.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};