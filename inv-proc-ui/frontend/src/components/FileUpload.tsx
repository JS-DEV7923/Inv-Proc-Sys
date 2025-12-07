import { useRef, useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { FileText, Upload, X } from 'lucide-react';

const FileUpload = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { uploadDocument, uploads, uploadProgress, isUploading } = useDocumentStore();
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.match('application/pdf') && !file.type.match('image/.*')) {
        alert('Please upload a PDF or image file');
        continue;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        continue;
      }
      
      await uploadDocument(file);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeUploads = Object.values(uploads).filter(
    upload => upload.status !== 'COMPLETED' && upload.status !== 'ERROR'
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Drag and drop files here
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              or{' '}
              <button
                type="button"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => fileInputRef.current?.click()}
              >
                browse files
              </button>
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              PDF or images up to 10MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleChange}
            accept="application/pdf,image/*"
            multiple
          />
        </div>
      </div>

      {activeUploads.length > 0 && (
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Uploading {activeUploads.length} file{activeUploads.length !== 1 ? 's' : ''}
          </h4>
          
          <div className="space-y-3">
            {activeUploads.map((upload) => (
              <div key={upload.uploadId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                      {upload.documentId || 'Preparing...'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round(upload.progress || 0)}%
                  </span>
                </div>
                <Progress value={upload.progress || 0} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {isUploading && uploads.length === 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Processing your files...
          </p>
          <Progress value={uploadProgress} className="mt-2 h-2" />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
