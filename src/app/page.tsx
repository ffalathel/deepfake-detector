"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Color Palette ──────────────────────────────────────────────────────────
const colors = {
  primary: '#0F1115',
  secondary: '#2A2D34',
  accent: '#E6FF00',
  text: '#EAEAEA',
  muted: '#8A8F98',
  border: '#3A3D44',
};

// ─── Types ──────────────────────────────────────────────────────────────────
type Language = 'en' | 'ar';

interface FileData { name: string; type: string; size: number; file: File; }

interface AnalysisResult {
  confidence: number;
  prediction: string;
  explanation: string;
  details?: { model_used?: string; processing_time?: number; file_size?: string; };
}

// ─── Translations ───────────────────────────────────────────────────────────
const t = {
  en: {
    brand: 'Deepfake Detector',
    tagline: 'AI-Powered Verification',
    heroTitle1: "Detect what's ",
    heroTitleAccent: 'real',
    heroSub: 'Advanced deep learning model trained to distinguish authentic imagery from AI-generated content. Upload. Analyze. Know.',
    uploadCta: 'Drop an image here or click to browse',
    uploadFormats: 'JPEG, PNG, GIF, WebP \u00B7 Max 50MB',
    analyze: 'Analyze',
    analyzeAnother: 'Analyze Another',
    removeFile: 'Remove file',
    analyzing: 'Analyzing',
    learnMore: 'Learn More',
    navHome: 'Home', navThreats: 'Threats', navProcess: 'Process', navMetrics: 'Model',
    whyMatters: 'Why This Matters',
    process: 'Process',
    howItWorks: 'How It Works',
    step: 'Step',
    uploadTitle: 'Upload',
    uploadDesc: 'Select an image from your device. We support JPEG, PNG, WebP, and GIF formats up to 50MB.',
    modelAnalysis: 'Model Analysis',
    modelAnalysisDesc: 'Our custom-trained deep learning model analyzes pixel-level patterns, artifacts, and inconsistencies.',
    authenticityScore: 'Authenticity Score',
    authenticityScoreDesc: 'Receive a calibrated confidence score with detailed explanation of detected features.',
    performance: 'Under the Hood',
    modelMetrics: 'Model & Data',
    metricsSub: 'How the model is built and what it was trained on.',
    architecture: 'Architecture',
    customCnn: 'Custom CNN',
    archDesc: 'Custom-trained convolutional neural network optimized for detecting subtle artifacts in AI-generated imagery. Built with PyTorch and fine-tuned for production reliability.',
    trainingData: 'Training Data',
    datasetOverview: 'Dataset Overview',
    inputResolution: 'Input Resolution',
    footer: 'Built by Fahada Alathel \u00B7 University of South Florida',
    authentic: 'Authentic', aiGeneratedResult: 'AI-Generated', confidence: 'confidence',
    model: 'Model', time: 'Time', size: 'Size',
    errorInvalidFile: 'Please select a valid image file (JPEG, PNG, GIF, WebP).',
    errorFileSize: 'File size must be less than 50MB.',
    errorAnalysis: 'Analysis failed. Please try again.',
    loadingSteps: ['Preprocessing image', 'Running deep learning analysis', 'Calculating confidence', 'Finalizing results'],
    slides: [
      { headline: 'Misinformation at Scale', subtext: 'AI-generated media can spread globally before verification systems respond.' },
      { headline: 'Election Interference', subtext: 'Synthetic imagery can distort public perception during critical moments.' },
      { headline: 'Fraud & Identity Manipulation', subtext: 'Fabricated images can support scams, impersonation, and financial fraud.' },
      { headline: 'Erosion of Trust', subtext: 'When everything can be fabricated, authenticity becomes infrastructure.' },
    ],
  },
  ar: {
    brand: 'كاشف التزييف',
    tagline: 'تحقق مدعوم بالذكاء الاصطناعي',
    heroTitle1: 'اكتشف ما هو ',
    heroTitleAccent: 'حقيقي',
    heroSub: 'نموذج تعلم عميق متقدم مُدرّب للتمييز بين الصور الأصلية والمحتوى المُنشأ بالذكاء الاصطناعي. ارفع. حلّل. اعرف.',
    uploadCta: 'أفلت صورة هنا أو انقر للتصفح',
    uploadFormats: 'JPEG, PNG, GIF, WebP \u00B7 الحد الأقصى 50 ميجابايت',
    analyze: 'تحليل',
    analyzeAnother: 'تحليل صورة أخرى',
    removeFile: 'إزالة الملف',
    analyzing: 'جاري التحليل',
    learnMore: 'اعرف المزيد',
    navHome: 'الرئيسية', navThreats: 'التهديدات', navProcess: 'العملية', navMetrics: 'النموذج',
    whyMatters: 'لماذا هذا مهم',
    process: 'العملية',
    howItWorks: 'كيف يعمل',
    step: 'خطوة',
    uploadTitle: 'رفع',
    uploadDesc: 'اختر صورة من جهازك. ندعم صيغ JPEG و PNG و WebP و GIF بحد أقصى 50 ميجابايت.',
    modelAnalysis: 'تحليل النموذج',
    modelAnalysisDesc: 'يحلل نموذج التعلم العميق المُدرّب خصيصاً الأنماط والتشوهات والتناقضات على مستوى البكسل.',
    authenticityScore: 'درجة المصداقية',
    authenticityScoreDesc: 'احصل على درجة ثقة معايرة مع شرح مفصل للميزات المكتشفة.',
    performance: 'من الداخل',
    modelMetrics: 'النموذج والبيانات',
    metricsSub: 'كيف بُني النموذج وما البيانات التي دُرّب عليها.',
    architecture: 'البنية',
    customCnn: 'شبكة CNN مخصصة',
    archDesc: 'شبكة عصبية التفافية مُدرّبة خصيصاً ومُحسّنة لاكتشاف التشوهات الدقيقة في الصور المُنشأة بالذكاء الاصطناعي. مبنية بـ PyTorch ومُحسّنة للموثوقية الإنتاجية.',
    trainingData: 'بيانات التدريب',
    datasetOverview: 'نظرة عامة على مجموعة البيانات',
    inputResolution: 'دقة الإدخال',
    footer: 'بناء فهده العذل \u00B7 جامعة جنوب فلوريدا',
    authentic: 'أصلي', aiGeneratedResult: 'مُنشأ بالذكاء الاصطناعي', confidence: 'ثقة',
    model: 'النموذج', time: 'الوقت', size: 'الحجم',
    errorInvalidFile: 'يرجى اختيار ملف صورة صحيح (JPEG, PNG, GIF, WebP).',
    errorFileSize: 'يجب أن يكون حجم الملف أقل من 50 ميجابايت.',
    errorAnalysis: 'فشل التحليل. يرجى المحاولة مرة أخرى.',
    loadingSteps: ['معالجة مسبقة للصورة', 'تشغيل تحليل التعلم العميق', 'حساب درجة الثقة', 'إنهاء النتائج'],
    slides: [
      { headline: 'تضليل على نطاق واسع', subtext: 'يمكن للوسائط المُنشأة بالذكاء الاصطناعي أن تنتشر عالمياً قبل أن تستجيب أنظمة التحقق.' },
      { headline: 'التدخل في الانتخابات', subtext: 'يمكن للصور الاصطناعية تشويه الإدراك العام خلال اللحظات الحرجة.' },
      { headline: 'الاحتيال والتلاعب بالهوية', subtext: 'يمكن للصور المُلفّقة دعم عمليات الاحتيال وانتحال الشخصية والاحتيال المالي.' },
      { headline: 'تآكل الثقة', subtext: 'عندما يمكن تلفيق كل شيء، تصبح المصداقية بنية تحتية.' },
    ],
  },
};

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const UploadIcon = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);
const AnalysisIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
);
const ShieldIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
);
const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);
const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const AlertIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);
const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
);
const LoaderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
);

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const c = t[language];
  const isRtl = language === 'ar';

  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const touchStart = useRef(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const slideCount = c.slides.length;

  const [file, setFile] = useState<FileData | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState('hero');

  // ─── Carousel ─────────────────────────────────────────────────
  const resetAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => { setSlideDirection(1); setCurrentSlide((p) => (p + 1) % slideCount); }, 5000);
  }, [slideCount]);

  useEffect(() => { resetAutoPlay(); return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); }; }, [resetAutoPlay]);

  const goToSlide = useCallback((i: number) => { setSlideDirection(i > currentSlide ? 1 : -1); setCurrentSlide(i); resetAutoPlay(); }, [currentSlide, resetAutoPlay]);
  const nextSlide = useCallback(() => { setSlideDirection(1); setCurrentSlide((p) => (p + 1) % slideCount); resetAutoPlay(); }, [resetAutoPlay, slideCount]);
  const prevSlide = useCallback(() => { setSlideDirection(-1); setCurrentSlide((p) => (p - 1 + slideCount) % slideCount); resetAutoPlay(); }, [resetAutoPlay, slideCount]);

  // Wake the Hugging Face Space while the visitor reads, so their first upload doesn't hit a cold start
  useEffect(() => { fetch('/api/warmup').catch(() => {}); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!carouselRef.current) return;
      const r = carouselRef.current.getBoundingClientRect();
      if (!(r.top < window.innerHeight && r.bottom > 0)) return;
      if (e.key === 'ArrowRight') nextSlide(); else if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextSlide, prevSlide]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? nextSlide() : prevSlide(); }
  };

  // ─── Upload ───────────────────────────────────────────────────
  const handleFileSelect = (f: File) => {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)) { setError(c.errorInvalidFile); return; }
    if (f.size > 50 * 1024 * 1024) { setError(c.errorFileSize); return; }
    setFile({ name: f.name, type: f.type, size: f.size, file: f });
    setPreview(URL.createObjectURL(f));
    setResult(null); setError(null);
  };
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]); };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true); setError(null); setLoadingStep(0);
    const timer = setInterval(() => { setLoadingStep((p) => Math.min(p + 1, 3)); }, 2500);
    try {
      const fd = new FormData(); fd.append('file', file.file);
      const endpoint = file.type.startsWith('video/') ? '/api/analyze-video' : '/api/analyze-image';
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('fail');
      setResult(await res.json());
    } catch { setError(c.errorAnalysis); } finally { clearInterval(timer); setLoading(false); }
  };

  const handleReset = () => { setFile(null); setPreview(null); setResult(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const fmt = (b: number) => { if (!b) return '0 B'; const k = 1024; const s = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(b) / Math.log(k)); return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]; };

  // ─── Scroll spy ───────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      for (const id of ['hero', 'carousel', 'how-it-works', 'metrics']) {
        const el = document.getElementById(id);
        if (el && window.scrollY + 120 >= el.offsetTop && window.scrollY + 120 < el.offsetTop + el.offsetHeight) { setActiveSection(id); break; }
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const isReal = result?.prediction?.toLowerCase().includes('real');
  const pct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ background: colors.primary, color: colors.text, minHeight: '100vh' }} className="font-sans">

      {/* ─── Nav ─────────────────────────────────────────────────── */}
      <motion.nav initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="fixed top-0 left-0 right-0 z-50" style={{ background: `${colors.primary}E6`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${colors.border}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => scrollTo('hero')} className="cursor-pointer flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: colors.accent }} />
              <span className="text-sm font-medium tracking-widest uppercase" style={{ color: colors.text }}>{c.brand}</span>
            </button>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-8">
                {([['hero', c.navHome], ['carousel', c.navThreats], ['how-it-works', c.navProcess], ['metrics', c.navMetrics]] as const).map(([id, label]) => (
                  <button key={id} onClick={() => scrollTo(id)} className="relative text-sm tracking-wide cursor-pointer transition-colors duration-200" style={{ color: activeSection === id ? colors.accent : colors.muted }}>
                    {label}
                    {activeSection === id && <motion.div layoutId="navIndicator" className="absolute -bottom-1 left-0 right-0 h-px" style={{ background: colors.accent }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wide cursor-pointer transition-all duration-200"
                style={{ color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: '2px' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted; }}
                aria-label="Toggle language"
              >
                <GlobeIcon />
                {language === 'en' ? 'AR' : 'EN'}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ─── Hero + Upload ───────────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${colors.muted} 1px, transparent 1px), linear-gradient(90deg, ${colors.muted} 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-3xl" style={{ background: colors.accent }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 w-full">
          <div className="text-center mb-12">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-sm tracking-[0.3em] uppercase mb-8" style={{ color: colors.accent }}>{c.tagline}</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }} className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight mb-8">
              {c.heroTitle1}<span className="italic" style={{ color: colors.accent }}>{c.heroTitleAccent}</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4 }} className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: colors.muted }}>{c.heroSub}</motion.p>
          </div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6 }} className="max-w-2xl mx-auto">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} />

            {/* No file */}
            {!file && !result && (
              <div className="p-10 text-center transition-all duration-300 cursor-pointer" style={{ border: `1px dashed ${dragActive ? colors.accent : colors.border}`, borderRadius: '2px', background: dragActive ? `${colors.accent}08` : 'transparent' }} onClick={() => fileInputRef.current?.click()} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                <div className="mb-4 flex justify-center" style={{ color: dragActive ? colors.accent : colors.muted }}><UploadIcon size={40} /></div>
                <p className="text-lg mb-2">{c.uploadCta}</p>
                <p className="text-xs tracking-wide" style={{ color: colors.muted }}>{c.uploadFormats}</p>
              </div>
            )}

            {/* File selected */}
            {file && !loading && !result && (
              <div className="p-8" style={{ border: `1px solid ${colors.border}`, borderRadius: '2px' }}>
                <div className="flex items-start gap-6">
                  {preview && <div className="flex-shrink-0 w-28 h-28 overflow-hidden" style={{ borderRadius: '2px' }}><img src={preview} alt="Preview" className="w-full h-full object-cover" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1"><span style={{ color: colors.muted }}><ImageIcon /></span><p className="text-sm font-medium truncate">{file.name}</p></div>
                    <p className="text-xs mb-6" style={{ color: colors.muted }}>{fmt(file.size)} &middot; {file.type.split('/')[1].toUpperCase()}</p>
                    <div className="flex items-center gap-3">
                      <button onClick={handleAnalyze} className="flex items-center gap-2 px-6 py-3 text-sm font-medium tracking-wide uppercase cursor-pointer transition-all duration-300" style={{ background: colors.accent, color: colors.primary, borderRadius: '2px' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 24px ${colors.accent}40`; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>{c.analyze}<ArrowRightIcon /></button>
                      <button onClick={handleReset} className="p-3 cursor-pointer transition-colors duration-200" style={{ color: colors.muted }} onMouseEnter={(e) => { e.currentTarget.style.color = colors.text; }} onMouseLeave={(e) => { e.currentTarget.style.color = colors.muted; }} aria-label={c.removeFile}><XIcon /></button>
                    </div>
                  </div>
                </div>
                {error && <div className="mt-4 p-3 flex items-center gap-2 text-sm" style={{ background: '#331111', border: '1px solid #552222', borderRadius: '2px', color: '#FF6B6B' }}><AlertIcon />{error}</div>}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="p-10 text-center" style={{ border: `1px solid ${colors.border}`, borderRadius: '2px' }}>
                <div className="mb-6 flex justify-center" style={{ color: colors.accent }}><LoaderIcon /></div>
                <p className="text-lg mb-2">{c.analyzing}</p>
                <p className="text-sm mb-8" style={{ color: colors.muted }}>{c.loadingSteps[loadingStep]}...</p>
                <div className="max-w-xs mx-auto">
                  <div className="w-full h-[2px] rounded-full" style={{ background: colors.border }}><motion.div className="h-full rounded-full" style={{ background: colors.accent }} initial={{ width: '5%' }} animate={{ width: `${Math.min(((loadingStep + 1) / 4) * 100, 95)}%` }} transition={{ duration: 0.8 }} /></div>
                  <p className="text-xs mt-3" style={{ color: colors.muted }}>{c.step} {loadingStep + 1} / 4</p>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="p-8" style={{ border: `1px solid ${colors.border}`, borderRadius: '2px' }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 flex items-center justify-center" style={{ color: isReal ? '#4ADE80' : '#F87171', border: `1px solid ${isReal ? '#4ADE8040' : '#F8717140'}`, borderRadius: '2px' }}>{isReal ? <CheckIcon /> : <AlertIcon />}</div>
                  <div><p className="text-xl font-medium" style={{ color: isReal ? '#4ADE80' : '#F87171' }}>{isReal ? c.authentic : c.aiGeneratedResult}</p><p className="text-xs tracking-wide" style={{ color: colors.muted }}>{pct}% {c.confidence}</p></div>
                </div>
                <div className="mb-6"><div className="w-full h-1 rounded-full" style={{ background: colors.border }}><motion.div className="h-full rounded-full" style={{ background: isReal ? '#4ADE80' : '#F87171' }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.3 }} /></div></div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: colors.muted }}>{result.explanation}</p>
                {result.details && (
                  <div className="grid grid-cols-3 gap-4 mb-8 p-4" style={{ background: colors.secondary, borderRadius: '2px' }}>
                    {result.details.model_used && <div><p className="text-xs mb-1" style={{ color: colors.muted }}>{c.model}</p><p className="text-xs font-medium truncate">{result.details.model_used}</p></div>}
                    {result.details.processing_time && <div><p className="text-xs mb-1" style={{ color: colors.muted }}>{c.time}</p><p className="text-xs font-medium">{result.details.processing_time}s</p></div>}
                    {result.details.file_size && <div><p className="text-xs mb-1" style={{ color: colors.muted }}>{c.size}</p><p className="text-xs font-medium">{result.details.file_size}</p></div>}
                  </div>
                )}
                <button onClick={handleReset} className="flex items-center gap-2 px-6 py-3 text-sm font-medium tracking-wide uppercase cursor-pointer transition-all duration-300" style={{ background: colors.accent, color: colors.primary, borderRadius: '2px' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 24px ${colors.accent}40`; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>{c.analyzeAnother}</button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── Carousel ────────────────────────────────────────────── */}
      <section id="carousel" ref={carouselRef} className="relative py-32 md:py-40 overflow-hidden" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-px" style={{ background: colors.accent }} />
        <div className="max-w-5xl mx-auto px-6">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs tracking-[0.4em] uppercase mb-20 text-center" style={{ color: colors.muted }}>{c.whyMatters}</motion.p>

          <div className="relative min-h-[280px] md:min-h-[320px] group" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <button onClick={prevSlide} className="absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100" style={{ color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: '2px' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted; }} aria-label="Previous slide"><ChevronLeft /></button>
            <button onClick={nextSlide} className="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100" style={{ color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: '2px' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted; }} aria-label="Next slide"><ChevronRight /></button>

            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div key={`${language}-${currentSlide}`} custom={slideDirection} initial={{ opacity: 0, x: 60 * slideDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 * slideDirection }} transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }} className="text-center px-12 md:px-0">
                <p className="text-xs tracking-[0.3em] uppercase mb-6" style={{ color: colors.accent }}>{String(currentSlide + 1).padStart(2, '0')} / {String(slideCount).padStart(2, '0')}</p>
                <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-tight mb-8">{c.slides[currentSlide].headline}</h2>
                <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: colors.muted }}>{c.slides[currentSlide].subtext}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-20 max-w-xs mx-auto">
            <div className="flex gap-2">
              {c.slides.map((_, index) => (
                <button key={index} onClick={() => goToSlide(index)} className="flex-1 h-1 cursor-pointer transition-all duration-500" style={{ background: index === currentSlide ? colors.accent : colors.border, borderRadius: '1px' }} aria-label={`Go to slide ${index + 1}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-32 md:py-40" style={{ background: colors.secondary, borderTop: `1px solid ${colors.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
            <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: colors.accent }}>{c.process}</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl">{c.howItWorks}</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
            <div className="hidden md:block absolute top-1/2 left-[33%] w-[34%] h-px" style={{ background: `linear-gradient(90deg, ${colors.border}, ${colors.accent}40, ${colors.border})` }} />
            {[
              { step: '01', title: c.uploadTitle, description: c.uploadDesc, icon: <UploadIcon /> },
              { step: '02', title: c.modelAnalysis, description: c.modelAnalysisDesc, icon: <AnalysisIcon /> },
              { step: '03', title: c.authenticityScore, description: c.authenticityScoreDesc, icon: <ShieldIcon /> },
            ].map((item, index) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: index * 0.15 }} className="relative p-8 md:p-10 transition-all duration-300 cursor-default" style={{ background: colors.primary, border: `1px solid ${colors.border}`, borderRadius: '2px' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${colors.accent}60`; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}>
                <p className="text-xs tracking-[0.3em] uppercase mb-6" style={{ color: colors.accent }}>{c.step} {item.step}</p>
                <div className="mb-6" style={{ color: colors.muted }}>{item.icon}</div>
                <h3 className="text-xl font-medium mb-4">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Metrics ─────────────────────────────────────────────── */}
      <section id="metrics" className="relative py-32 md:py-40" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-px" style={{ background: colors.accent }} />
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
            <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: colors.accent }}>{c.performance}</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6">{c.modelMetrics}</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.muted }}>{c.metricsSub}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="grid md:grid-cols-2 gap-6">
            <div className="p-8 md:p-10" style={{ border: `1px solid ${colors.border}`, borderRadius: '2px' }}>
              <p className="text-xs tracking-[0.3em] uppercase mb-6" style={{ color: colors.accent }}>{c.architecture}</p>
              <h3 className="font-serif text-2xl mb-4">{c.customCnn}</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: colors.muted }}>{c.archDesc}</p>
              <div className="flex flex-wrap gap-2">{['PyTorch', 'CNN', 'Transfer Learning', 'ImageNet'].map((tag) => <span key={tag} className="text-xs px-3 py-1.5 tracking-wide" style={{ border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: '1px' }}>{tag}</span>)}</div>
            </div>
            <div className="p-8 md:p-10" style={{ border: `1px solid ${colors.border}`, borderRadius: '2px' }}>
              <p className="text-xs tracking-[0.3em] uppercase mb-6" style={{ color: colors.accent }}>{c.trainingData}</p>
              <h3 className="font-serif text-2xl mb-4">{c.datasetOverview}</h3>
              <div className="space-y-4">
                {[{ label: c.inputResolution, value: '224 x 224' }].map((item) => (
                  <div key={item.label} className="flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '12px' }}><span className="text-sm" style={{ color: colors.muted }}>{item.label}</span><span className="text-sm font-medium">{item.value}</span></div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="py-16" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="max-w-6xl mx-auto px-6"><div className="flex flex-col md:flex-row items-center justify-between gap-6"><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full" style={{ background: colors.accent }} /><span className="text-xs tracking-[0.2em] uppercase" style={{ color: colors.muted }}>{c.brand}</span></div><p className="text-xs" style={{ color: colors.muted }}>{c.footer}</p></div></div>
      </footer>
    </div>
  );
}
