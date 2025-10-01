// components/ResultDisplay.js
import { motion } from 'framer-motion';

interface AnalysisResult {
  prediction: string;
  confidence: number;
  explanation: string;
  details?: {
    model_used?: string;
    processing_time?: number;
    file_size?: string;
  };
}

interface ResultDisplayProps {
  result: AnalysisResult;
  fileName?: string;
  onReset: () => void;
  language?: 'en' | 'ar';
}

const ResultDisplay = ({ result, fileName, onReset, language = 'en' }: ResultDisplayProps) => {
  const content = {
    en: {
      analysisComplete: "Analysis Complete",
      whatThisMeans: "What This Means",
      analyzeAnother: "Analyze Another File",
      shareResults: "Share Results",
      disclaimer: "Disclaimer:",
      disclaimerText: "This analysis is for informational purposes only. Always verify information from multiple sources.",
      resultsCopied: "Results copied to clipboard!",
      confidence: "Confidence",
      real: "REAL",
      fake: "FAKE",
      likelyReal: "LIKELY REAL",
      likelyFake: "LIKELY FAKE"
    },
    ar: {
      analysisComplete: "اكتمل التحليل",
      whatThisMeans: "ماذا يعني هذا",
      analyzeAnother: "حلل ملف آخر",
      shareResults: "شارك النتائج",
      disclaimer: "تنبيه:",
      disclaimerText: "هذا التحليل لأغراض إعلامية فقط. تحقق دائمًا من المعلومات من مصادر متعددة.",
      resultsCopied: "تم نسخ النتائج إلى الحافظة!",
      confidence: "الثقة",
      real: "حقيقي",
      fake: "مزيف",
      likelyReal: "من المحتمل أن يكون حقيقي",
      likelyFake: "من المحتمل أن يكون مزيف"
    }
  };

  const currentContent = content[language];

  /**
   * Get the appropriate icon for the analysis result.
   * 
   * Returns different icons based on the prediction type and confidence level
   * to provide visual feedback about the analysis result.
   * 
   * @returns {string} Emoji icon representing the result
   */
  const getResultIcon = () => {
    const confidence = result.confidence;
    if (result.prediction.toLowerCase().includes('real')) {
      return confidence > 0.8 ? '✅' : '✅';
    } else {
      return confidence > 0.8 ? '❌' : '⚠️';
    }
  };

  /**
   * Get the localized title for the analysis result.
   * 
   * Returns the appropriate title text based on the prediction and confidence level,
   * using the current language setting for localization.
   * 
   * @returns {string} Localized title text
   */
  const getResultTitle = () => {
    const confidence = result.confidence;
    if (result.prediction.toLowerCase().includes('real')) {
      return confidence > 0.8 ? currentContent.real : currentContent.likelyReal;
    } else {
      return confidence > 0.8 ? currentContent.fake : currentContent.likelyFake;
    }
  };

  /**
   * Get the appropriate text color class for the result.
   * 
   * Returns Tailwind CSS color classes based on the prediction type and confidence level
   * to provide visual distinction between real and fake results.
   * 
   * @returns {string} Tailwind CSS color class
   */
  const getResultColor = () => {
    const confidence = result.confidence;
    if (result.prediction.toLowerCase().includes('real')) {
      return confidence > 0.8 ? 'text-green-600' : 'text-green-500';
    } else {
      return confidence > 0.8 ? 'text-red-600' : 'text-red-500';
    }
  };

  /**
   * Get the appropriate background color classes for the result container.
   * 
   * Returns Tailwind CSS background and border classes based on the prediction type
   * to provide visual distinction and appropriate color coding for the result.
   * 
   * @returns {string} Tailwind CSS background and border classes
   */
  const getResultBg = () => {
    const confidence = result.confidence;
    if (result.prediction.toLowerCase().includes('real')) {
      return confidence > 0.8 ? 'border-green-200 bg-green-50' : 'border-green-200 bg-green-50';
    } else {
      return confidence > 0.8 ? 'border-red-200 bg-red-50' : 'border-red-200 bg-red-50';
    }
  };

  /**
   * Get a detailed explanation of what the analysis result means.
   * 
   * Provides context and interpretation of the analysis result, explaining
   * what the confidence level means in practical terms for the user.
   * 
   * @returns {string} Detailed explanation of the analysis result
   */
  const getWhatThisMeans = () => {
    const confidence = result.confidence;
    if (result.prediction.toLowerCase().includes('real')) {
      return confidence > 0.8 
        ? "This content appears to be authentic and was likely created by a human or legitimate source."
        : "This content shows some signs of being authentic, but there's some uncertainty in the analysis.";
    } else {
      return confidence > 0.8 
        ? "This content shows strong indicators of being AI-generated or manipulated. Exercise caution."
        : "This content shows some signs of being AI-generated, but the analysis is not completely certain.";
    }
  };

  /**
   * Share the analysis results by copying them to the clipboard.
   * 
   * Creates a formatted text summary of the analysis result and copies it
   * to the user's clipboard for easy sharing.
   */
  const shareResults = () => {
    const shareText = `Deepfake Analysis Result: ${getResultTitle()} (${Math.round(result.confidence * 100)}% confidence)`;
    navigator.clipboard.writeText(shareText);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="card-luxury p-8 md:p-12"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-center mb-8"
      >
        <h2 className="heading-md text-luxury-900 mb-2">
          {currentContent.analysisComplete}
        </h2>
        {fileName && (
          <p className="text-luxury-600 text-sm">
            {language === 'en' ? 'File:' : 'الملف:'} {fileName}
          </p>
        )}
      </motion.div>

      {/* Result */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`border-2 rounded-xl p-8 mb-8 ${getResultBg()}`}
      >
        <div className="text-center">
          {/* REPLACE: Result status icons emojis - replace with custom SVG or images based on result */}
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-6xl mb-6"
          >
            {getResultIcon()}
          </motion.div>
          <h3 className={`heading-md mb-4 ${getResultColor()}`}>
            {getResultTitle()}
          </h3>
          <p className="text-luxury-700 mb-6 body-lg">
            {result.explanation}
          </p>
          
          {/* Confidence Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-luxury-600 mb-2">
              <span>{currentContent.confidence}</span>
              <span>{Math.round(result.confidence * 100)}%</span>
            </div>
            <div className="w-full bg-cream-200 rounded-full h-3">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${result.confidence * 100}%` }}
                transition={{ duration: 1, delay: 0.6 }}
                className={`h-3 rounded-full ${
                  result.prediction.toLowerCase().includes('real') 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Additional Details */}
      {result.details && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-cream-50 border border-cream-200 rounded-lg p-6 mb-8"
        >
          <h4 className="font-semibold text-luxury-800 mb-3">
            {language === 'en' ? 'Analysis Details' : 'تفاصيل التحليل'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {result.details.model_used && (
              <div>
                <span className="text-luxury-600">
                  {language === 'en' ? 'Model:' : 'النموذج:'}
                </span>
                <p className="text-luxury-800 font-medium">{result.details.model_used}</p>
              </div>
            )}
            {result.details.processing_time && (
              <div>
                <span className="text-luxury-600">
                  {language === 'en' ? 'Processing Time:' : 'وقت المعالجة:'}
                </span>
                <p className="text-luxury-800 font-medium">{result.details.processing_time}s</p>
              </div>
            )}
            {result.details.file_size && (
              <div>
                <span className="text-luxury-600">
                  {language === 'en' ? 'File Size:' : 'حجم الملف:'}
                </span>
                <p className="text-luxury-800 font-medium">{result.details.file_size}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* What This Means */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8"
      >
        <h4 className="font-semibold text-blue-800 mb-3">
          {/* REPLACE: Lightbulb icon emoji - replace with custom SVG or image */}
          💡 {currentContent.whatThisMeans}
        </h4>
        <p className="text-blue-700 text-sm leading-relaxed">
          {getWhatThisMeans()}
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          className="btn-primary"
        >
          {/* REPLACE: Refresh icon emoji - replace with custom SVG or image */}
          🔄 {currentContent.analyzeAnother}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            shareResults();
            alert(currentContent.resultsCopied);
          }}
          className="btn-secondary"
        >
          {/* REPLACE: Clipboard icon emoji - replace with custom SVG or image */}
          📋 {currentContent.shareResults}
        </motion.button>
      </motion.div>

      {/* Disclaimer */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg"
      >
        <p className="text-sm text-yellow-800 text-center leading-relaxed">
          {/* REPLACE: Warning icon emoji - replace with custom SVG or image */}
          <strong>⚠️ {currentContent.disclaimer}</strong> {currentContent.disclaimerText}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ResultDisplay;