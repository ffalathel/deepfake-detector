import { motion } from 'framer-motion';

interface LanguageToggleProps {
  language: 'en' | 'ar';
  setLanguage: (language: 'en' | 'ar') => void;
}

const LanguageToggle = ({ language, setLanguage }: LanguageToggleProps) => {
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleLanguage}
      className="bg-white/80 backdrop-blur-md border border-cream-200 rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2"
      aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
    >
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-luxury-800">
          {language === 'en' ? 'EN' : 'AR'}
        </span>
        <div className="w-4 h-4 text-luxury-600">
          {/* REPLACE: Language/globe icon SVG - replace with custom SVG or image */}
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </div>
      </div>
    </motion.button>
  );
};

export default LanguageToggle;
