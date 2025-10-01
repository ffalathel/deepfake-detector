// components/LoadingSpinner.js
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  language?: 'en' | 'ar';
}

const LoadingSpinner = ({ language = 'en' }: LoadingSpinnerProps) => {
  const [loadingStep, setLoadingStep] = useState(0);

  const content = {
    en: {
      analyzingTitle: "Analyzing your content...",
      didYouKnow: "Did you know?",
      estimatedTime: "Estimated time remaining: 10-30 seconds",
      steps: [
        { icon: "🔍", text: "Preprocessing the image/video" },
        { icon: "🧠", text: "Running deep learning analysis" },
        { icon: "📊", text: "Calculating confidence scores" },
        { icon: "✅", text: "Finalizing results" }
      ],
      funFacts: [
        "Deepfake detection models can analyze over 100 different visual features in just seconds.",
        "The first deepfake was created in 2017, and detection technology has been evolving ever since.",
        "Some deepfake detectors can spot inconsistencies in lighting, shadows, and reflections that humans might miss.",
        "Modern AI models can process images at resolutions up to 4K while maintaining accuracy."
      ]
    },
    ar: {
      analyzingTitle: "جاري تحليل المحتوى...",
      didYouKnow: "هل تعلم؟",
      estimatedTime: "الوقت المتبقي المقدر: 10-30 ثانية",
      steps: [
        { icon: "🔍", text: "معالجة مسبقة للصورة/الفيديو" },
        { icon: "🧠", text: "تشغيل تحليل التعلم العميق" },
        { icon: "📊", text: "حساب درجات الثقة" },
        { icon: "✅", text: "إنهاء النتائج" }
      ],
      funFacts: [
        "يمكن لنماذج كشف الوسائط المزيفة تحليل أكثر من 100 ميزة بصرية مختلفة في ثوانٍ فقط.",
        "تم إنشاء أول وسائط مزيفة في عام 2017، وتطورت تقنية الكشف منذ ذلك الحين.",
        "يمكن لبعض كاشفات الوسائط المزيفة اكتشاف التناقضات في الإضاءة والظلال والانعكاسات التي قد يغفل عنها البشر.",
        "يمكن للنماذج الحديثة للذكاء الاصطناعي معالجة الصور بدقة تصل إلى 4K مع الحفاظ على الدقة."
      ]
    }
  };

  const currentContent = content[language];
  const steps = currentContent.steps;

  /**
   * Effect hook to cycle through loading steps.
   * 
   * Automatically advances through the loading steps every 2 seconds
   * to provide visual feedback about the analysis progress.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mt-8 p-8 text-center"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Main spinner */}
      <motion.div 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative inline-block mb-8"
      >
        <div className="animate-spin rounded-full h-20 w-20 border-4 border-cream-200 border-t-gold-500 mx-auto shadow-lg"></div>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {/* REPLACE: Magnifying glass/search icon emoji - replace with custom SVG or image */}
          <span className="text-3xl">🔍</span>
        </motion.div>
      </motion.div>

      {/* Current step */}
      <motion.div 
        key={loadingStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-4xl mb-4"
        >
          {/* REPLACE: Step icons emojis - replace with custom SVG or images for each step */}
          {steps[loadingStep].icon}
        </motion.div>
        <h3 className="heading-md text-luxury-900 mb-3">
          {currentContent.analyzingTitle}
        </h3>
        <p className="text-luxury-muted body-lg">
          {steps[loadingStep].text}
        </p>
      </motion.div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto mb-8">
        <div className="w-full bg-cream-200 rounded-full h-2">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-2 bg-gradient-to-r from-gold-400 to-gold-600 rounded-full"
          />
        </div>
        <p className="text-sm text-luxury-600 mt-2">
          {Math.round(((loadingStep + 1) / steps.length) * 100)}% {language === 'en' ? 'Complete' : 'مكتمل'}
        </p>
      </div>

      {/* Fun facts while waiting */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto shadow-sm"
      >
        <h4 className="font-semibold text-blue-800 mb-3">
          {/* REPLACE: Lightbulb icon emoji - replace with custom SVG or image */}
          💡 {currentContent.didYouKnow}
        </h4>
        <motion.p 
          key={loadingStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-blue-700 text-sm leading-relaxed"
        >
          {currentContent.funFacts[loadingStep]}
        </motion.p>
      </motion.div>

      {/* Estimated time */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-sm text-luxury-500 mt-6"
      >
        {currentContent.estimatedTime}
      </motion.p>
    </motion.div>
  );
};

export default LoadingSpinner;