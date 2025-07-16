import React, { useState, useCallback, useMemo } from 'react';
import type { OptimizationSettings, AiSuggestion, ImageFile, CompletionData } from './types';

import { ImageUploader } from '../components/ImageUploader';
import { OptimizationForm } from '../components/OptimizationForm';
import { ImageGroupSummary } from '../components/ImageGroupSummary';
import { CompletionSummary } from '../components/CompletionSummary';

import { getOptimizationSuggestion } from './services/geminiService';
import { 
  processUploadedFiles, 
  groupImagesByDimensions, 
  calculateTotalSize, 
  cleanupImageFiles 
} from './services/fileProcessingService';
import { useImageOptimizer } from "../hooks/useImageOptimizer";

type AppState = 'upload' | 'processing' | 'summary' | 'optimizing_ai' | 'optimizing' | 'completed';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  
  const [settings, setSettings] = useState<OptimizationSettings>({
    quality: 0.85,
    maxWidth: 1920,
    format: 'webp',
  });
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);

  const { optimizeAndZip } = useImageOptimizer();

  const groupedImages = useMemo(() => groupImagesByDimensions(imageFiles), [imageFiles]);
  const totalOriginalSize = useMemo(() => calculateTotalSize(imageFiles), [imageFiles]);

  const processFiles = useCallback(async (fileList: FileList) => {
    return await processUploadedFiles(fileList);
  }, []);

  const handleGetAiSuggestion = useCallback(async () => {
    setAppState('optimizing_ai');
    try {
      const suggestion = await getOptimizationSuggestion(imageFiles);
      setAiSuggestion(suggestion);
      setAppState('summary');
    } catch (error) {
      console.error('AI suggestion failed:', error);
      alert(`Failed to get AI suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAppState('summary');
    }
  }, [imageFiles]);

  const handleFileProcessing = useCallback(async (fileList: FileList) => {
    setAppState('processing');
    try {
      const processedImages = await processFiles(fileList);
      setImageFiles(processedImages);
      setAppState('summary');
    } catch (error) {
      console.error('File processing failed:', error);
      alert(`An error occurred while processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAppState('upload');
    }
  }, [processFiles]);

  const handleOptimize = useCallback(async () => {
    setAppState('optimizing');
    try {
      const result = await optimizeAndZip(imageFiles, settings);
      if (result) {
        setCompletionData({
          originalSize: totalOriginalSize,
          finalSize: result.finalSize,
          fileCount: imageFiles.length,
        });
        setAppState('completed');
      } else {
        throw new Error('Optimization failed to produce a result');
      }
    } catch (error) {
      console.error("Optimization failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Optimization failed: ${errorMessage}`);
      setAppState('summary');
    }
  }, [imageFiles, settings, optimizeAndZip, totalOriginalSize]);

  const handleReset = useCallback(() => {
    // Clean up object URLs to prevent memory leaks
    cleanupImageFiles(imageFiles);
    
    setImageFiles([]);
    setAiSuggestion(null);
    setCompletionData(null);
    setSettings({ quality: 0.85, maxWidth: 1920, format: 'webp' });
    setAppState('upload');
  }, [imageFiles]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupImageFiles(imageFiles);
    };
  }, [imageFiles]);

  const isLoading = appState === 'processing' || appState === 'optimizing_ai' || appState === 'optimizing';

  return (
    <>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8 md:mb-12">
            <h1 className="text-2xl md:text-3xl tracking-tight text-[hsl(var(--foreground))] mb-4">
                Bulk AI Image Optimizer
            </h1>
            <p className="text-base text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
              Upload multiple images or a ZIP. Get AI suggestions. Download an optimized ZIP.
            </p>
        </header>

        <main className="max-w-5xl mx-auto">
          {appState === 'upload' && <ImageUploader onUpload={handleFileProcessing} disabled={isLoading} />}
          
          { (appState === 'summary' || appState === 'optimizing_ai' || appState === 'optimizing') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <OptimizationForm 
                    settings={settings}
                    onSettingsChange={setSettings}
                    onOptimize={handleOptimize}
                    onGetAiSuggestion={handleGetAiSuggestion}
                    onReset={handleReset}
                    isAiLoading={appState === 'optimizing_ai'}
                    isOptimizing={appState === 'optimizing'}
                    aiSuggestion={aiSuggestion}
                />
              </div>
              <div className="lg:col-span-2">
                <ImageGroupSummary
                    groupedImages={groupedImages}
                    totalFiles={imageFiles.length}
                    totalOriginalSize={totalOriginalSize}
                />
              </div>
            </div>
          )}

          {appState === 'completed' && completionData && (
              <CompletionSummary data={completionData} onReset={handleReset} />
          )}
        </main>
      </div>
    </>
  );
};

export default App;