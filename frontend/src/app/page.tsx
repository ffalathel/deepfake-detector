"use client"
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import FileUpload from '../components/FileUpload';
import ResultDisplay from '../components/ResultDisplay';
import LoadingSpinner from '../components/LoadingSpinner';
import LanguageToggle from '../components/LanguageToggle';

// Type definitions
type Language = 'en' | 'ar';

// Fixed AnalysisResult to match ResultDisplay expectations
interface AnalysisResult {
  confidence: number;
  prediction: string;
  explanation: string;
  details?: {
    model_used?: string;
    processing_time?: number;
    file_size?: string;
  };
}

// Fixed FileType to match FileUpload expectations  
interface FileType {
  name: string;
  type: string;
  size: number;
  file?: File; // Add actual File object
}

interface ContentStructure {
  en: {
    hero: {
      title: string;
      subtitle: string;
      description: string;
      cta: string;
    };
    about: {
      title: string;
      name: string;
      role: string;
      story: string;
      motivation: string;
    };
    awareness: {
      title: string;
      subtitle: string;
      description: string;
      risks: string[];
    };
    features: {
      title: string;
      image: string;
      video: string;
    };
    nav: {
      home: string;
      awareness: string;
      features: string;
      about: string;
    };
  };
  ar: {
    hero: {
      title: string;
      subtitle: string;
      description: string;
      cta: string;
    };
    about: {
      title: string;
      name: string;
      role: string;
      story: string;
      motivation: string;
    };
    awareness: {
      title: string;
      subtitle: string;
      description: string;
      risks: string[];
    };
    features: {
      title: string;
      image: string;
      video: string;
    };
    nav: {
      home: string;
      awareness: string;
      features: string;
      about: string;
    };
  };
}

export default function Home() {
  const [file, setFile] = useState<FileType | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [activeSection, setActiveSection] = useState<string>('hero');

  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, 50]);
  const y3 = useTransform(scrollY, [0, 300], [0, -30]);
  
  const springY1 = useSpring(y1, { stiffness: 300, damping: 30 });
  const springY2 = useSpring(y2, { stiffness: 300, damping: 30 });
  const springY3 = useSpring(y3, { stiffness: 300, damping: 30 });

  /**
   * Handle file selection from the upload component.
   * 
   * Resets any previous analysis results and errors when a new file is selected.
   * This ensures a clean state for each new analysis session.
   * 
   * @param selectedFile - The file object selected by the user
   */
  const handleFileSelect = (selectedFile: FileType): void => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  /**
   * Handle the analysis of the selected file.
   * 
   * Validates the file, determines the appropriate API endpoint based on file type,
   * sends the file to the backend for analysis, and handles the response.
   * Includes comprehensive error handling and loading state management.
   */
  const handleAnalyze = async () => {
    if (!file) return;
    
    // Ensure we have a valid file with content
    if (!file.file || file.size === 0) {
      setError('Please select a valid file with content.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a FormData object for the API call
      const formData = new FormData();
      
      // Use the actual File object if available, otherwise create a new one
      if (file.file) {
        formData.append('file', file.file);
      } else {
        // Fallback: create a new File object (this shouldn't happen in normal usage)
        const newFile = new File([''], file.name, { type: file.type });
        formData.append('file', newFile);
      }

      const endpoint = file.type.startsWith('video/') ? '/api/analyze-video' : '/api/analyze-image';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err) {
      setError('Sorry, something went wrong. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset the application state to allow for a new analysis.
   * 
   * Clears the selected file, analysis results, and any error messages,
   * returning the application to its initial state.
   */
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  /**
   * Smoothly scroll to a specific section and update the active section state.
   * 
   * Used for navigation between different sections of the page with smooth scrolling
   * animation and proper state management for the active section indicator.
   * 
   * @param sectionId - The ID of the section to scroll to
   */
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  /**
   * Effect hook to update the active section based on scroll position.
   * 
   * Automatically detects which section is currently in view and updates
   * the activeSection state accordingly. This enables dynamic navigation
   * highlighting as the user scrolls through the page.
   */
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'awareness', 'features', 'about'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;
          
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const content: ContentStructure = {
    en: {
      hero: {
        title: "Advanced Deepfake Detection",
        subtitle: "Professional AI-powered analysis for images and videos",
        description: "Our sophisticated deep learning models provide accurate detection of AI-generated content, helping you navigate the digital landscape with confidence and trust.",
        cta: "Start Analysis"
      },
      about: {
        title: "About the Creator",
        name: "Fahada Alathel",
        role: "Student at University of South Florida",
        story: "I developed this deepfake detector for my older family members who were increasingly concerned about the authenticity of content they encountered online. This project represents my commitment to creating technology that serves and protects our communities.",
        motivation: "For my older family members"
      },
      awareness: {
        title: "Understanding the Threat",
        subtitle: "The Dangers of Misinformation",
        description: "Deepfakes and AI-generated content pose significant risks to our society, from political manipulation to personal reputation damage. Understanding and detecting these threats is crucial for maintaining trust in our digital world.",
        risks: [
          "Political misinformation and election interference",
          "Personal reputation damage and identity theft",
          "Financial fraud and business deception",
          "Erosion of public trust in media and institutions"
        ]
      },
      features: {
        title: "Advanced Detection Technology",
        image: "Sophisticated image analysis using custom-trained deep learning models",
        video: "State-of-the-art video deepfake detection with research-grade accuracy"
      },
      nav: {
        home: "Home",
        awareness: "Awareness",
        features: "Features",
        about: "About"
      }
    },
    ar: {
      hero: {
        title: "كشف متقدم للوسائط المزيفة",
        subtitle: "تحليل ذكي مدعوم بالذكاء الاصطناعي للصور والفيديوهات",
        description: "نماذج التعلم العميق المتطورة لدينا توفر كشف دقيق للمحتوى المُنشأ بالذكاء الاصطناعي، مما يساعدك على التنقل في العالم الرقمي بثقة وأمان.",
        cta: "ابدأ التحليل"
      },
      about: {
        title: "عن المطور",
        name: "فهده العذل ",
        role: "طالبة في جامعة جنوب فلوريدا",
        story: "طورت هذا الكاشف للوسائط المزيفة لأفراد عائلتي الكبار الذين كانوا قلقين بشكل متزايد بشأن أصالة المحتوى الذي يواجهونه عبر الإنترنت. يمثل هذا المشروع التزامي بإنشاء تقنية تخدم وتحمي مجتمعاتنا.",
        motivation: "لأفراد عائلتي الكبار"
      },
      awareness: {
        title: "فهم التهديد",
        subtitle: "مخاطر المعلومات المضللة",
        description: "تشكل الوسائط المزيفة والمحتوى المُنشأ بالذكاء الاصطناعي مخاطر كبيرة على مجتمعنا، من التلاعب السياسي إلى الإضرار بالسمعة الشخصية. فهم وكشف هذه التهديدات أمر بالغ الأهمية للحفاظ على الثقة في عالمنا الرقمي.",
        risks: [
          "المعلومات السياسية المضللة والتدخل في الانتخابات",
          "الإضرار بالسمعة الشخصية وسرقة الهوية",
          "الاحتيال المالي وخداع الأعمال",
          "تآكل الثقة العامة في وسائل الإعلام والمؤسسات"
        ]
      },
      features: {
        title: "تقنية الكشف المتقدمة",
        image: "تحليل متطور للصور باستخدام نماذج التعلم العميق المدربة خصيصاً",
        video: "كشف متقدم للفيديوهات المزيفة بدقة على مستوى البحث العلمي"
      },
      nav: {
        home: "الرئيسية",
        awareness: "الوعي",
        features: "المميزات",
        about: "حول"
      }
    }
  };

  const currentContent = content[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-cream-100">
      
      {/* Language Toggle */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-3 right-6 z-50"
      >
        <LanguageToggle language={language} setLanguage={setLanguage} />
      </motion.div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-cream-200 shadow-lg"
      >
        <div className="container-luxury">
          <div className="flex items-center justify-between h-16">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-xl font-serif text-luxury-900 cursor-pointer magnetic"
              onClick={() => scrollToSection('hero')}
            >
              <span className="gradient-text-black">Deepfake Detector</span> 
            </motion.div>
            <div className="flex space-x-8">
              {[
                { id: 'hero', label: currentContent.nav.home },
                { id: 'awareness', label: currentContent.nav.awareness },
                { id: 'features', label: currentContent.nav.features },
                { id: 'about', label: currentContent.nav.about }
              ].map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => scrollToSection(item.id)}
                  className={`text-sm font-medium transition-all duration-300 relative ${
                    activeSection === item.id 
                      ? 'text-luxury-900' 
                      : 'text-luxury-600 hover:text-luxury-900'
                  }`}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-gold-400 to-gold-600"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section id="hero" className="pt-24 pb-16 relative overflow-hidden">
        <div className="container-luxury">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="heading-xl text-luxury-900 mb-6"
            >
              <span className="gradient-text">{currentContent.hero.title}</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="text-xl text-luxury-700 mb-8 leading-relaxed font-medium"
            >
              {currentContent.hero.subtitle}
            </motion.p>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="body-lg text-luxury-600 mb-12 max-w-3xl mx-auto"
            >
              {currentContent.hero.description}
            </motion.p>
          </motion.div>

          {/* Analysis Section */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            {!result ? (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="card-glow p-8 md:p-12 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gold-50 to-cream-50 opacity-50" />
                <div className="relative z-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1 }}
                    className="text-center mb-8"
                  >
                    <h2 className="heading-md text-luxury-900 mb-4">
                      {language === 'en' ? 'Upload Your Media' : 'ارفع الوسائط الخاصة بك'}
                    </h2>
                    <p className="text-luxury-700 font-medium">
                      {language === 'en' ? 'Choose an image or video to analyze' : 'اختر صورة أو فيديو للتحليل'}
                    </p>
                  </motion.div>

                  <FileUpload 
                    onFileSelect={handleFileSelect}
                    selectedFile={file}
                    language={language}
                  />

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <p className="text-red-700 text-center">{error}</p>
                    </motion.div>
                  )}

                  {file && !loading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 text-center"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAnalyze}
                        className="btn-accent shimmer"
                      >
                        {currentContent.hero.cta}
                      </motion.button>
                    </motion.div>
                  )}

                  {loading && <LoadingSpinner language={language} />}
                </div>
              </motion.div>
            ) : (
              <ResultDisplay 
                result={result}
                fileName={file?.name}
                onReset={handleReset}
                language={language}
              />
            )}
          </motion.div>
        </div>
      </section>

      {/* Misinformation Awareness Section */}
      <section id="awareness" className="section-padding bg-gradient-to-br from-luxury-50 to-cream-50 relative overflow-hidden">
        <div className="container-luxury">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="heading-lg text-luxury-900 mb-6">
                <span className="gradient-text">{currentContent.awareness.title}</span>
              </h2>
              <h3 className="heading-md text-luxury-700 mb-8">
                {currentContent.awareness.subtitle}
              </h3>
              <p className="body-lg text-luxury-600 max-w-4xl mx-auto leading-relaxed">
                {currentContent.awareness.description}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {currentContent.awareness.risks.map((risk: string, index: number) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="card-luxury p-6 text-center hover-lift"
                >
                  <motion.div 
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                    className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center"
                  >
                    <span className="text-red-600 text-xl">⚠️</span>
                  </motion.div>
                  <p className="text-luxury-800 font-medium leading-relaxed">
                    {risk}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding bg-white relative overflow-hidden">
        <div className="container-luxury">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="heading-lg text-luxury-900 text-center mb-12"
            >
              <span className="gradient-text">{currentContent.features.title}</span>
            </motion.h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="card-luxury p-8 hover-lift"
              >
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 bg-blue-100 rounded-full mb-6 flex items-center justify-center"
                >
                  <span className="text-blue-600 text-2xl">🖼️</span>
                </motion.div>
                <h3 className="heading-md text-luxury-900 mb-4">
                  {language === 'en' ? 'Image Detection' : 'كشف الصور'}
                </h3>
                <p className="text-luxury-600 leading-relaxed">
                  {currentContent.features.image}
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="card-luxury p-8 hover-lift"
              >
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  className="w-16 h-16 bg-purple-100 rounded-full mb-6 flex items-center justify-center"
                >
                  <span className="text-purple-600 text-2xl">🎥</span>
                </motion.div>
                <h3 className="heading-md text-luxury-900 mb-4">
                  {language === 'en' ? 'Video Detection' : 'كشف الفيديو'}
                </h3>
                <p className="text-luxury-600 leading-relaxed">
                  {currentContent.features.video}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Section - Now at the bottom */}
      <section id="about" className="section-padding bg-gradient-to-br from-cream-100 to-cream-200 relative overflow-hidden">
        <div className="container-luxury">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="heading-lg text-luxury-900 mb-12"
            >
              <span className="gradient-text">{currentContent.about.title}</span>
            </motion.h2>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                className="text-left"
              >
                <h3 className="heading-md text-luxury-900 mb-4">
                  {currentContent.about.name}
                </h3>
                <p className="text-lg text-gold-600 mb-6 font-medium">
                  {currentContent.about.role}
                </p>
                <p className="body-lg text-luxury-700 mb-6 leading-relaxed">
                  {currentContent.about.story}
                </p>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="inline-block bg-cream-200 px-6 py-3 rounded-lg border border-gold-200"
                >
                  <p className="text-luxury-800 font-medium">
                    "{currentContent.about.motivation}"
                  </p>
                </motion.div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="bg-white p-8 rounded-xl shadow-xl hover-lift"
              >
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-32 h-32 bg-gradient-to-br from-gold-200 to-gold-400 rounded-full mx-auto mb-6 flex items-center justify-center"
                >
                  <span className="text-4xl">👨‍💻</span>
                </motion.div>
                <h4 className="text-xl font-serif text-luxury-900 mb-4">
                  {language === 'en' ? 'Personal Mission' : 'المهمة الشخصية'}
                </h4>
                <p className="text-luxury-600">
                  {language === 'en' 
                    ? 'Creating technology that protects and serves our communities' 
                    : 'إنشاء تقنية تحمي وتخدم مجتمعاتنا'}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="bg-gradient-to-r from-luxury-900 to-luxury-800 text-cream-50 py-12 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gold-500/10 to-accent-500/10" />
        <div className="container-luxury text-center relative z-10">
          <motion.p 
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-cream-200 mb-4"
          >
            {language === 'en' 
              ? 'Advanced Deepfake Detection Technology' 
              : 'تقنية متقدمة لكشف الوسائط المزيفة'}
          </motion.p>
          <p className="text-cream-300 text-sm">
            {language === 'en' 
              ? '© 2025 Fahada Alathel. Built with precision and trust.' 
              : '© 2025 فهده العذل. مبني بالدقة والثقة.'}
          </p>
        </div>
      </motion.footer>
    </div>
  );
}