'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, Image as ImageIcon, CheckCircle, X, RefreshCw, Link as LinkIcon } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUploader({ value, onChange, label = 'Product Image' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image');
      }

      onChange(data.url);
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <div className="flex items-center justify-between">
        <label className="text-[#A0988E] font-medium uppercase tracking-wider text-xs">
          {label} *
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showUrlInput ? 'Switch to Direct Upload' : 'Enter Image URL Manually'}</span>
        </button>
      </div>

      {showUrlInput ? (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="/images/products/oud_nocturne.jpg or https://..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-[#1A1815] border border-[#29241F] focus:border-[#D4AF37] text-xs text-[#FDFBF7] px-3.5 py-3 rounded focus:outline-none"
          />
          <p className="text-[10px] text-[#787063]">
            Enter relative path (e.g. <code className="text-[#D4AF37]">/images/products/oud.jpg</code>) or direct image URL.
          </p>
        </div>
      ) : (
        <div>
          {value ? (
            /* Uploaded Image Preview Box */
            <div className="relative bg-[#1A1815] border border-[#29241F] rounded-xl p-4 flex items-center space-x-4">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#0A0908] border border-[#29241F] shrink-0">
                <Image
                  src={value}
                  alt="Product preview"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center text-xs text-[#D4AF37] font-semibold space-x-1">
                  <CheckCircle className="w-4 h-4 text-[#D4AF37]" />
                  <span>Image Uploaded Successfully</span>
                </div>
                <p className="text-[11px] font-mono text-[#A0988E] truncate max-w-xs sm:max-w-md">
                  {value}
                </p>
                <div className="pt-1 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#FDFBF7] hover:text-[#D4AF37] underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Change Image
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange('')}
                    className="text-xs text-[#E63946] hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Dropzone & Direct Upload Button */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                uploading
                  ? 'bg-[#1A1815] border-[#D4AF37]'
                  : 'bg-[#141210] border-[#29241F] hover:border-[#D4AF37] hover:bg-[#1A1815]'
              }`}
            >
              {uploading ? (
                <div className="space-y-2 py-4 flex flex-col items-center">
                  <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin" />
                  <p className="text-xs text-[#FDFBF7] font-semibold">Uploading Image File...</p>
                  <p className="text-[10px] text-[#A0988E]">Processing image upload...</p>
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[#1A1815] border border-[#29241F] flex items-center justify-center text-[#D4AF37]">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-[#FDFBF7] font-semibold">
                      Click to upload image <span className="text-[#A0988E] font-normal">or drag & drop</span>
                    </p>
                    <p className="text-[10px] text-[#787063] mt-1">
                      Supports JPG, PNG, WEBP, GIF (Max file size 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-[#E63946] font-medium pt-1">
          {error}
        </p>
      )}
    </div>
  );
}
