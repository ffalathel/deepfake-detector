// components/FileUpload.js
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface FileType {
  name: string;
  type: string;
  size: number;
  file?: File; // Add actual File object
}

interface FileUploadProps {
  onFileSelect: (file: FileType) => void;
  selectedFile: FileType | null;
  language?: 'en' | 'ar';
}

const FileUpload = ({ onFileSelect, selectedFile, language = 'en' }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const content = {
    en: {
      dropText: "Drop your file here",
      browseText: "Or click to browse for images and videos",
      chooseFile: "Choose File",
      fileSelected: "File Selected",
      chooseDifferent: "Choose Different File",
      supports: "Supports: JPEG, PNG, GIF, WebP, MP4, WebM, MOV • Max 50MB"
    },
    ar: {
      dropText: "أفلت ملفك هنا",
      browseText: "أو انقر للتصفح للصور والفيديوهات",
      chooseFile: "اختر ملف",
      fileSelected: "تم اختيار الملف",
      chooseDifferent: "اختر ملف مختلف",
      supports: "يدعم: JPEG, PNG, GIF, WebP, MP4, WebM, MOV • الحد الأقصى 50 ميجابايت"
    }
  };

  const currentContent = content[language];

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov'];
      if (!validTypes.includes(file.type)) {
        alert(language === 'en' 
          ? 'Please select a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV) file.'
          : 'يرجى اختيار ملف صورة صحيح (JPEG, PNG, GIF, WebP) أو ملف فيديو (MP4, WebM, MOV).'
        );
        return;
      }

      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert(language === 'en' 
          ? 'File size must be less than 50MB.'
          : 'يجب أن يكون حجم الملف أقل من 50 ميجابايت.'
        );
        return;
      }

      onFileSelect({
        name: file.name,
        type: file.type,
        size: file.size,
        file: file
      });
    }
  };

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
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return language === 'en' ? '0 Bytes' : '0 بايت';
    const k = 1024;
    const sizes = language === 'en' 
      ? ['Bytes', 'KB', 'MB', 'GB']
      : ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    return '📄';
  };

  return (
    <div className="w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleChange}
        className="hidden"
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          dragActive 
            ? 'border-gold-400 bg-gold-50 shadow-lg' 
            : 'border-cream-300 hover:border-gold-300 hover:bg-cream-50 hover:shadow-md'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!selectedFile ? (
          <div>
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-6xl mb-6"
            >
              {/* REPLACE: File upload folder icon emoji - replace with custom SVG or image */}
              📁
            </motion.div>
            <h3 className="heading-md text-luxury-900 mb-3">
              {currentContent.dropText}
            </h3>
            <p className="text-luxury-muted mb-6 body-lg">
              {currentContent.browseText}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openFileDialog}
              className="btn-outline"
            >
              {currentContent.chooseFile}
            </motion.button>
            <p className="text-sm text-luxury-400 mt-6">
              {currentContent.supports}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-6xl mb-6">
              {/* REPLACE: File type icon emoji - replace with custom SVG or image based on file type */}
              {getFileIcon(selectedFile.type)}
            </div>
            <h3 className="heading-md text-luxury-900 mb-4">
              {currentContent.fileSelected}
            </h3>
            <div className="bg-cream-100 rounded-lg p-6 mb-6 max-w-md mx-auto border border-cream-200">
              <p className="font-medium text-luxury-800 truncate mb-2">
                {selectedFile.name}
              </p>
              <p className="text-sm text-luxury-600">
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </p>
            </div>
            
            {selectedFile.type.startsWith('image/') && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                {/* REPLACE: This is the actual image preview - keep this as is for functionality */}
                <img
                  src={URL.createObjectURL(new File([], selectedFile.name, { type: selectedFile.type }))}
                  alt="Preview"
                  className="max-w-xs max-h-48 mx-auto rounded-lg shadow-lg border border-cream-200"
                />
              </motion.div>
            )}
            
            {selectedFile.type.startsWith('video/') && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                {/* REPLACE: This is the actual video preview - keep this as is for functionality */}
                <video
                  src={URL.createObjectURL(new File([], selectedFile.name, { type: selectedFile.type }))}
                  controls
                  className="max-w-xs max-h-48 mx-auto rounded-lg shadow-lg border border-cream-200"
                />
              </motion.div>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openFileDialog}
              className="text-gold-600 hover:text-gold-700 font-medium underline transition-colors duration-300"
            >
              {currentContent.chooseDifferent}
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default FileUpload;