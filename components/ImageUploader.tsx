import React, { useCallback, useState } from 'react';
import { UploadIcon, ZipIcon } from './icons';

interface ImageUploaderProps {
  onUpload: (files: FileList) => void;
  disabled: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }, [onUpload]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const activeClass = isDragging ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] bg-opacity-10 scale-105' : 'border-[hsl(var(--border))] bg-transparent';

  return (
    <div className="w-full max-w-3xl mx-auto">
      <label
        htmlFor="file-upload"
        className={`relative flex flex-col items-center justify-center w-full h-80 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${activeClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center justify-center text-center">
            <UploadIcon className="w-16 h-16 text-[hsl(var(--muted-foreground))] mb-4"/>
            <p className="text-xl font-[400] text-[hsl(var(--foreground))]">
                <span className="text-[hsl(var(--primary))]">Click to upload</span> or drag and drop
            </p>
            <p className="text-[hsl(var(--muted-foreground))] mt-2">
                PNG, JPG, WEBP, GIF or a ZIP file
            </p>
        </div>
        <input
            id="file-upload"
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept="image/png, image/jpeg, image/webp, image/gif, application/zip"
            onChange={handleFileChange}
            multiple
            disabled={disabled}
        />
      </label>
    </div>
  );
};