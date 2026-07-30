import React, { useMemo, useState } from 'react';
import { ResumeData, ResumeDetailLevel, TemplateConfig, INITIAL_RESUME_DATA } from './types';
import { TEMPLATES } from './constants';
import { ResumePreview } from './components/ResumePreview';
import { ResumeForm } from './components/ResumeForm';
import { parseResumeDocument, translateResume } from './services/minimaxService';
import { generateDocx } from './services/docxService';
import saveAs from 'file-saver';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Camera,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Shuffle,
  Sparkles,
  Upload,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type PdfSlice = { start: number; end: number };

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

const buildPdfSlices = (canvasHeight: number, pageHeight: number, rawBoundaries: number[]): PdfSlice[] => {
  const boundaries = [...new Set(rawBoundaries.map((value) => Math.round(value)))]
    .filter((value) => value > 1 && value < canvasHeight - 1)
    .sort((left, right) => left - right);
  const slices: PdfSlice[] = [];
  let start = 0;

  while (canvasHeight - start > 1) {
    const target = Math.min(start + pageHeight, canvasHeight);
    if (target === canvasHeight) {
      slices.push({ start, end: canvasHeight });
      break;
    }

    const candidates = boundaries.filter((value) => value > start + pageHeight * 0.25 && value <= target);
    const end = candidates.at(-1) || target;
    slices.push({ start, end: end > start + 1 ? end : target });
    start = end > start + 1 ? end : target;
  }

  if (slices.length > 1) {
    const last = slices[slices.length - 1];
    const previous = slices[slices.length - 2];
    if (last.end - last.start < pageHeight * 0.32) {
      const earlierBreaks = boundaries.filter(
        (value) => value > previous.start + pageHeight * 0.55 && value < previous.end - 1,
      );
      const rebalancedBreak = earlierBreaks.at(-1);
      if (rebalancedBreak) {
        previous.end = rebalancedBreak;
        last.start = rebalancedBreak;
      }
    }
  }

  return slices.filter((slice) => slice.end - slice.start > 1);
};

const App: React.FC = () => {
  const [data, setData] = useState<ResumeData>(INITIAL_RESUME_DATA);
  const [selectedTemplateId, setSelectedTemplateId] = useState('t18');
  const [customTemplates, setCustomTemplates] = useState<TemplateConfig[]>([]);
  const [showPhoto, setShowPhoto] = useState(true);
  const [photoSettings, setPhotoSettings] = useState<{ size: 'small' | 'medium' | 'large'; align: 'left' | 'center' | 'right' }>({ size: 'medium', align: 'center' });
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const [skillSettings, setSkillSettings] = useState<{ showLevel: boolean; style: 'bar' | 'dots' | 'text' }>({ showLevel: true, style: 'bar' });
  const [detailLevel, setDetailLevel] = useState<ResumeDetailLevel>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const allTemplates = useMemo(() => [...TEMPLATES, ...customTemplates], [customTemplates]);
  const currentTemplate = allTemplates.find((template) => template.id === selectedTemplateId) || TEMPLATES[0];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const parsedData = await parseResumeDocument(file, detailLevel);
      if (parsedData) {
        setData((previous) => {
          let skills = parsedData.skills || previous.skills;
          if (skills.length > 0 && typeof (skills[0] as unknown) === 'string') {
            skills = (skills as unknown as string[]).map((name) => ({ name, level: 3 }));
          }
          return {
            ...previous,
            ...parsedData,
            personalInfo: {
              ...previous.personalInfo,
              ...parsedData.personalInfo,
              photoUrl: parsedData.personalInfo?.photoUrl || previous.personalInfo.photoUrl,
            },
            experience: parsedData.experience?.length ? parsedData.experience : previous.experience,
            education: parsedData.education?.length ? parsedData.education : previous.education,
            skills: skills.length ? skills : previous.skills,
            languages: parsedData.languages?.length ? parsedData.languages : previous.languages,
            customSections: parsedData.customSections?.length ? parsedData.customSections : previous.customSections,
          };
        });
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Please ensure it is a valid PDF or DOCX file.';
      alert(`Failed to parse document: ${message}`);
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const handleLanguageChange = async (newLanguage: 'en' | 'fr') => {
    if (newLanguage === language || isProcessing) return;
    setIsProcessing(true);
    try {
      const translated = await translateResume(data, newLanguage === 'en' ? 'English' : 'French');
      setData(translated);
      setLanguage(newLanguage);
    } catch (error) {
      console.error('Translation error:', error);
      alert('An error occurred during translation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const photoUrl = loadEvent.target?.result as string;
      setData((previous) => ({ ...previous, personalInfo: { ...previous.personalInfo, photoUrl } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSurpriseMe = () => {
    const randomPick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
    const template: TemplateConfig = {
      id: `gen-${Date.now()}`,
      name: `Custom Design ${customTemplates.length + 1}`,
      fontFamily: randomPick(['sans', 'serif', 'mono', 'classic'] as const),
      layout: randomPick(['sidebar-left', 'sidebar-right', 'single-column', 'header-centered', 'minimal'] as const),
      colorTheme: randomPick(['slate', 'blue', 'emerald', 'rose', 'amber', 'violet', 'gold', 'black'] as const),
      density: randomPick(['compact', 'spacious'] as const),
      accentStyle: randomPick(['underline', 'block', 'border', 'none'] as const),
    };
    setCustomTemplates((previous) => [...previous, template]);
    setSelectedTemplateId(template.id);
  };

  const handleExportPDF = async () => {
    const element = document.querySelector('.resume-preview-container') as HTMLElement | null;
    if (!element) return;
    setIsExporting(true);

    const originalStyles = {
      transform: element.style.transform,
      width: element.style.width,
      minHeight: element.style.minHeight,
      height: element.style.height,
      margin: element.style.margin,
      boxShadow: element.style.boxShadow,
    };

    try {
      Object.assign(element.style, {
        transform: 'none',
        width: '210mm',
        minHeight: '297mm',
        height: 'auto',
        margin: '0',
        boxShadow: 'none',
      });
      await nextPaint();

      const rootRect = element.getBoundingClientRect();
      const measuredBreaks = Array.from(element.querySelectorAll<HTMLElement>('[data-pdf-break-after="true"]'))
        .map((node) => node.getBoundingClientRect().bottom - rootRect.top)
        .filter((value) => Number.isFinite(value) && value > 0);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDocument) => {
          const clone = clonedDocument.querySelector('.resume-preview-container') as HTMLElement | null;
          if (clone) Object.assign(clone.style, { transform: 'none', width: '210mm', minHeight: '297mm', height: 'auto', margin: '0', boxShadow: 'none' });
        },
      });

      const canvasScale = canvas.width / element.scrollWidth;
      const pageCanvasHeight = Math.round(canvas.width * (297 / 210));
      const slices = buildPdfSlices(canvas.height, pageCanvasHeight, measuredBreaks.map((value) => value * canvasScale));
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      slices.forEach((slice, index) => {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = pageCanvasHeight;
        const context = pageCanvas.getContext('2d');
        if (!context) throw new Error('Could not prepare a PDF page canvas.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        const sliceHeight = Math.min(slice.end - slice.start, pageCanvasHeight);
        context.drawImage(canvas, 0, slice.start, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        if (index > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, pdfHeight);
      });

      pdf.save(`${data.personalInfo.fullName.replace(/\s+/g, '_')}_CV.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Could not generate PDF directly. Opening system print dialog.');
      window.print();
    } finally {
      Object.assign(element.style, originalStyles);
      setIsExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    setIsExportingDocx(true);
    try {
      saveAs(await generateDocx(data, currentTemplate), `${data.personalInfo.fullName.replace(/\s+/g, '_')}_ATS_Compatible.docx`);
    } catch (error) {
      console.error('DOCX Export failed:', error);
      alert('Failed to generate DOCX.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-900 overflow-hidden font-sans">
      <aside className="w-96 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full z-10 no-print">
        <div className="p-5 border-b border-neutral-800 bg-neutral-900">
          <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight"><Sparkles size={20} className="text-white" /> CV Maestro</h1>
          <p className="text-xs text-neutral-400 mt-1">MiniMax-Powered High-End Resume Builder</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
          <section className="bg-neutral-800 p-4 border border-neutral-700">
            <h3 className="text-xs font-bold text-neutral-300 mb-3 uppercase tracking-wider flex items-center gap-2"><Upload size={12} /> Import Source</h3>
            <fieldset className="mb-3">
              <legend className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Detail retained</legend>
              <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Resume detail retained">
                {([
                  { value: 'one-page', label: '1 pager' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'full', label: 'Full detail' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={detailLevel === option.value}
                    onClick={() => setDetailLevel(option.value)}
                    disabled={isProcessing}
                    className={`min-h-10 px-1 py-2 text-[9px] leading-tight font-bold uppercase transition-colors ${
                      detailLevel === option.value
                        ? 'bg-white text-black'
                        : 'bg-neutral-900 text-neutral-500 border border-neutral-700 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
                {detailLevel === 'one-page' && 'Prioritizes the strongest content for a one-page CV.'}
                {detailLevel === 'medium' && 'Balances completeness with concise, readable wording.'}
                {detailLevel === 'full' && 'Keeps every distinct fact and entry from the source.'}
              </p>
            </fieldset>
            <label className="flex items-center justify-center w-full py-3 bg-white cursor-pointer hover:bg-neutral-200 transition-colors text-xs font-bold text-black uppercase tracking-wide">
              {isProcessing ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Analyzing...</span> : <span>Upload PDF / Word</span>}
              <input type="file" className="hidden" accept=".pdf,.docx,.doc" onChange={handleFileUpload} disabled={isProcessing} />
            </label>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Design</h3>
              <button onClick={handleSurpriseMe} className="text-xs flex items-center gap-1 text-white hover:text-neutral-300 font-bold uppercase"><Shuffle size={12} /> Surprise Me</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {customTemplates.length > 0 && selectedTemplateId.startsWith('gen') && <button className="h-12 border text-[10px] font-bold uppercase bg-white text-black border-white">Generated</button>}
              {TEMPLATES.slice(0, 8).map((template) => (
                <button key={template.id} onClick={() => setSelectedTemplateId(template.id)} className={`h-12 border text-[10px] font-bold uppercase ${selectedTemplateId === template.id ? 'bg-white text-black border-white' : 'border-neutral-700 bg-neutral-900 text-neutral-500 hover:border-neutral-500 hover:text-white'}`}>
                  {template.name}
                </button>
              ))}
            </div>
          </section>

          <section className="border-t border-neutral-800 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2"><Camera size={12} /> Headshot</h3>
              <button onClick={() => setShowPhoto((value) => !value)} className={showPhoto ? 'text-white' : 'text-neutral-600'}>{showPhoto ? <Eye size={16} /> : <EyeOff size={16} />}</button>
            </div>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 bg-neutral-800 overflow-hidden shrink-0 border border-neutral-700">
                {data.personalInfo.photoUrl ? <img src={data.personalInfo.photoUrl} className="w-full h-full object-cover" alt="Headshot" /> : <div className="w-full h-full flex items-center justify-center text-neutral-600"><Camera size={20} /></div>}
              </div>
              <div className="flex-1">
                <label className="block text-[10px] uppercase font-bold text-white cursor-pointer hover:text-neutral-300 mb-2">Upload Image<input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} /></label>
                <p className="text-[10px] leading-relaxed text-neutral-500">Photo editing is unavailable with MiniMax text models; your uploaded image is kept unchanged.</p>
              </div>
            </div>
            {showPhoto && (
              <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-500 mb-2 block">Size</label>
                  <div className="flex bg-neutral-800 p-1">{(['small', 'medium', 'large'] as const).map((size) => <button key={size} onClick={() => setPhotoSettings({ ...photoSettings, size })} className={`flex-1 py-1 text-[10px] uppercase ${photoSettings.size === size ? 'bg-white text-black font-bold' : 'text-neutral-500 hover:text-white'}`}>{size[0].toUpperCase()}</button>)}</div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-500 mb-2 block">Position</label>
                  <div className="flex bg-neutral-800 p-1">{([{ value: 'left', icon: AlignLeft }, { value: 'center', icon: AlignCenter }, { value: 'right', icon: AlignRight }] as const).map(({ value, icon: Icon }) => <button key={value} onClick={() => setPhotoSettings({ ...photoSettings, align: value })} className={`flex-1 py-1 flex justify-center ${photoSettings.align === value ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}><Icon size={14} /></button>)}</div>
                </div>
              </div>
            )}
          </section>

          <section className="border-t border-neutral-800 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Content Editor</h3>
              <div className="flex bg-neutral-800 rounded border border-neutral-700 p-0.5">
                {(['en', 'fr'] as const).map((item) => <button key={item} onClick={() => handleLanguageChange(item)} disabled={isProcessing} className={`px-3 py-0.5 text-[10px] font-bold uppercase ${language === item ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}>{item}</button>)}
              </div>
            </div>
            <ResumeForm data={data} onChange={setData} skillSettings={skillSettings} onSkillSettingsChange={setSkillSettings} />
          </section>
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-900 grid grid-cols-2 gap-2">
          <button onClick={handleExportPDF} disabled={isExporting} className="bg-white hover:bg-neutral-200 disabled:bg-neutral-600 text-black py-3 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {isExporting ? 'PDF...' : 'PDF'}
          </button>
          <button onClick={handleExportDOCX} disabled={isExportingDocx} className="bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-600 border border-neutral-600 text-white py-3 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            {isExportingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} {isExportingDocx ? 'DOCX...' : 'DOCX'}
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-neutral-200 overflow-hidden relative flex flex-col">
        <div className="h-12 bg-white border-b border-neutral-300 flex items-center px-4 justify-between shadow-sm z-10 no-print">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">{currentTemplate.name}</span>
          <div className="text-[10px] uppercase font-bold text-neutral-400">A4 • {showPhoto ? 'Photo On' : 'Photo Off'} • {currentTemplate.layout}</div>
        </div>
        <div className="flex-1 overflow-auto p-8 flex justify-center items-start print:p-0">
          <div className="print-container transition-all duration-500 ease-in-out">
            <ResumePreview data={data} template={currentTemplate} showPhoto={showPhoto} photoSettings={photoSettings} skillSettings={skillSettings} language={language} scale={0.8} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
