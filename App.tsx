import React, { useState, useMemo } from 'react';
import { ResumeData, TemplateConfig, INITIAL_RESUME_DATA } from './types';
import { TEMPLATES } from './constants';
import { ResumePreview } from './components/ResumePreview';
import { ResumeForm } from './components/ResumeForm';
import { parseResumeDocument, enhancePhoto, analyzePhotoAndSuggest, translateResume } from './services/geminiService';
import { generateDocx } from './services/docxService';
import saveAs from 'file-saver';
import { Upload, Shuffle, Download, Eye, EyeOff, Camera, Loader2, Sparkles, Wand2, AlignLeft, AlignCenter, AlignRight, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const [data, setData] = useState<ResumeData>(INITIAL_RESUME_DATA);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('t18'); // Default to Grid System
  // State to hold generated templates
  const [customTemplates, setCustomTemplates] = useState<TemplateConfig[]>([]);
  
  const [showPhoto, setShowPhoto] = useState<boolean>(true);
  const [photoSettings, setPhotoSettings] = useState<{size: 'small' | 'medium' | 'large', align: 'left' | 'center' | 'right'}>({
    size: 'medium',
    align: 'center'
  });
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  
  const [skillSettings, setSkillSettings] = useState<{ showLevel: boolean; style: 'bar' | 'dots' | 'text' }>({
    showLevel: true,
    style: 'bar'
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [photoSuggestions, setPhotoSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');
  
  // Combine static and custom templates
  const allTemplates = useMemo(() => [...TEMPLATES, ...customTemplates], [customTemplates]);
  const currentTemplate = allTemplates.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    try {
      const parsedData = await parseResumeDocument(file);
      if (parsedData) {
        setData(prev => {
           let newSkills = parsedData.skills || prev.skills;
           // If the parser returned raw strings (as per the prompt inside parseResumeDocument), we need to map them
           // Ensure we cast to any to check against 'string' type safely even if interface says object
           if (newSkills.length > 0 && typeof (newSkills[0] as any) === 'string') {
                newSkills = (newSkills as unknown as string[]).map(s => ({ name: s, level: 3 }));
           }

           return {
             ...prev,
             ...parsedData,
             personalInfo: { 
                ...prev.personalInfo, 
                ...parsedData.personalInfo,
                photoUrl: parsedData.personalInfo?.photoUrl || prev.personalInfo.photoUrl 
             },
             experience: parsedData.experience?.length ? parsedData.experience : prev.experience,
             education: parsedData.education?.length ? parsedData.education : prev.education,
             skills: newSkills.length ? newSkills : prev.skills,
             languages: parsedData.languages?.length ? parsedData.languages : prev.languages,
             customSections: parsedData.customSections?.length ? parsedData.customSections : prev.customSections,
           };
        });
      }
    } catch (error) {
      console.error(error);
      alert("Failed to parse document. Please ensure it is a valid PDF or DOCX file.");
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleLanguageChange = async (newLang: 'en' | 'fr') => {
      if (newLang === language || isProcessing) return;
      
      setIsProcessing(true);
      try {
          const target = newLang === 'en' ? 'English' : 'French';
          const translatedData = await translateResume(data, target);
          
          if (translatedData) {
              setData(translatedData);
              setLanguage(newLang);
          } else {
              alert("Translation failed. Please try again.");
          }
      } catch (error) {
          console.error("Translation error:", error);
          alert("An error occurred during translation.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, photoUrl: base64 } }));
      
      const suggestions = await analyzePhotoAndSuggest(base64);
      setPhotoSuggestions(suggestions);
    };
    reader.readAsDataURL(file);
  };

  const applyPhotoEnhancement = async () => {
    if (!data.personalInfo.photoUrl || !selectedSuggestion) return;
    setIsProcessing(true);
    const enhancedUrl = await enhancePhoto(data.personalInfo.photoUrl, selectedSuggestion);
    if (enhancedUrl) {
      setData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, photoUrl: enhancedUrl } }));
      setPhotoSuggestions([]); 
      setSelectedSuggestion('');
    }
    setIsProcessing(false);
  };

  // Generate a totally new random design
  const handleSurpriseMe = () => {
    const fonts = ['sans', 'serif', 'mono', 'classic'] as const;
    const layouts = ['sidebar-left', 'sidebar-right', 'single-column', 'header-centered', 'minimal'] as const;
    const themes = ['slate', 'blue', 'emerald', 'rose', 'amber', 'violet', 'gold', 'black'] as const;
    const densities = ['compact', 'spacious'] as const;
    const accents = ['underline', 'block', 'border', 'none'] as const;

    const randomPick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const newTemplate: TemplateConfig = {
        id: `gen-${Date.now()}`,
        name: `Custom Design ${customTemplates.length + 1}`,
        fontFamily: randomPick(fonts),
        layout: randomPick(layouts),
        colorTheme: randomPick(themes),
        density: randomPick(densities),
        accentStyle: randomPick(accents),
    };

    setCustomTemplates(prev => [...prev, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
  };

  const handleExportPDF = async () => {
    const element = document.querySelector('.resume-preview-container') as HTMLElement;
    if (!element) return;
    
    setIsExporting(true);
    
    try {
        const canvas = await html2canvas(element, {
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.querySelector('.resume-preview-container') as HTMLElement;
                if (clonedElement) {
                    clonedElement.style.transform = 'none'; 
                    clonedElement.style.width = '210mm';
                    clonedElement.style.minHeight = '297mm';
                    clonedElement.style.height = 'auto'; 
                    clonedElement.style.margin = '0';
                    clonedElement.style.boxShadow = 'none';
                }
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = pdfImgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfImgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfImgHeight);
            heightLeft -= pdfHeight;
        }
        
        pdf.save(`${data.personalInfo.fullName.replace(/\s+/g, '_')}_CV.pdf`);

    } catch (error) {
        console.error("Export failed:", error);
        alert("Could not generate PDF directly. Opening system print dialog.");
        window.print();
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    setIsExportingDocx(true);
    try {
        const blob = await generateDocx(data, currentTemplate);
        saveAs(blob, `${data.personalInfo.fullName.replace(/\s+/g, '_')}_ATS_Compatible.docx`);
    } catch (error) {
        console.error("DOCX Export failed:", error);
        alert("Failed to generate DOCX.");
    } finally {
        setIsExportingDocx(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-900 overflow-hidden font-sans">
      {/* Sidebar Controls - Flat Dark Design */}
      <div className="w-96 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full z-10 no-print">
        <div className="p-5 border-b border-neutral-800 bg-neutral-900">
           <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
             <Sparkles size={20} className="text-white" />
             CV Maestro
           </h1>
           <p className="text-xs text-neutral-400 mt-1">AI-Powered High-End Resume Builder</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
           {/* Import Section */}
           <div className="bg-neutral-800 p-4 border border-neutral-700">
              <h3 className="text-xs font-bold text-neutral-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Upload size={12} /> Import Source
              </h3>
              <label className="flex items-center justify-center w-full py-3 bg-white border border-transparent cursor-pointer hover:bg-neutral-200 transition-colors text-xs font-bold text-black uppercase tracking-wide">
                 {isProcessing ? (
                   <div className="flex items-center gap-2">
                     <Loader2 className="animate-spin" size={14} />
                     <span>Analyzing...</span>
                   </div>
                 ) : (
                   <span>Upload PDF / Word</span>
                 )}
                 <input type="file" className="hidden" accept=".pdf,.docx,.doc" onChange={handleFileUpload} disabled={isProcessing} />
              </label>
           </div>

           {/* Templates */}
           <div>
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Design</h3>
                 <button onClick={handleSurpriseMe} className="text-xs flex items-center gap-1 text-white hover:text-neutral-300 font-bold uppercase transition-colors">
                   <Shuffle size={12} /> Surprise Me
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 {/* Show generated templates first if selected */}
                 {customTemplates.length > 0 && selectedTemplateId.startsWith('gen') && (
                    <button 
                        className="h-12 border text-[10px] flex items-center justify-center font-bold transition-all uppercase bg-white text-black border-white"
                    >
                        Generated
                    </button>
                 )}
                 {TEMPLATES.slice(0, 8).map(t => (
                   <button 
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`h-12 border text-[10px] flex items-center justify-center font-bold transition-all uppercase ${selectedTemplateId === t.id ? 'bg-white text-black border-white' : 'border-neutral-700 bg-neutral-900 text-neutral-500 hover:border-neutral-500 hover:text-white'}`}
                   >
                      {t.name}
                   </button>
                 ))}
              </div>
           </div>

           {/* Photo Section */}
           <div className="border-t border-neutral-800 pt-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                    <Camera size={12} /> Headshot
                 </h3>
                 <button onClick={() => setShowPhoto(!showPhoto)} className={`transition-colors ${showPhoto ? 'text-white' : 'text-neutral-600'}`}>
                    {showPhoto ? <Eye size={16} /> : <EyeOff size={16} />}
                 </button>
              </div>
              
              <div className="flex items-start gap-4 mb-4">
                 <div className="w-16 h-16 bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                    {data.personalInfo.photoUrl ? (
                      <img src={data.personalInfo.photoUrl} className="w-full h-full object-cover" alt="Headshot" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600"><Camera size={20} /></div>
                    )}
                 </div>
                 <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-white cursor-pointer hover:text-neutral-300 mb-2 transition-colors">
                       Upload Image
                       <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                    {photoSuggestions.length > 0 && (
                       <div className="space-y-2 mt-2">
                          <select 
                            className="w-full text-xs p-1.5 bg-neutral-800 border border-neutral-700 text-white rounded-none focus:outline-none focus:border-white"
                            onChange={(e) => setSelectedSuggestion(e.target.value)}
                            value={selectedSuggestion}
                          >
                             <option value="">AI Enhancement...</option>
                             {photoSuggestions.map((s, i) => <option key={i} value={s}>{s}</option>)}
                          </select>
                          <button 
                            disabled={!selectedSuggestion || isProcessing}
                            onClick={applyPhotoEnhancement}
                            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] uppercase font-bold py-1.5 border border-neutral-700 flex items-center justify-center gap-1 disabled:opacity-50 transition-colors"
                          >
                             {isProcessing ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />} Apply
                          </button>
                       </div>
                    )}
                 </div>
              </div>

              {/* Photo Controls */}
              {showPhoto && (
                  <div className="mt-4 space-y-3 pt-3 border-t border-neutral-800 animate-fadeIn">
                     <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-neutral-500 mb-2 block">Size</label>
                            <div className="flex bg-neutral-800 p-1">
                                {['small', 'medium', 'large'].map((s) => (
                                    <button
                                    key={s}
                                    onClick={() => setPhotoSettings({...photoSettings, size: s as any})}
                                    className={`flex-1 py-1 text-[10px] uppercase tracking-wide transition-all ${photoSettings.size === s ? 'bg-white text-black font-bold' : 'text-neutral-500 hover:text-white'}`}
                                    >
                                    {s === 'small' ? 'S' : s === 'medium' ? 'M' : 'L'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-neutral-500 mb-2 block">Position</label>
                            <div className="flex bg-neutral-800 p-1">
                                {[
                                    { v: 'left', icon: AlignLeft }, 
                                    { v: 'center', icon: AlignCenter }, 
                                    { v: 'right', icon: AlignRight }
                                ].map((opt) => (
                                    <button
                                    key={opt.v}
                                    onClick={() => setPhotoSettings({...photoSettings, align: opt.v as any})}
                                    className={`flex-1 py-1 flex justify-center transition-all ${photoSettings.align === opt.v ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                                    >
                                    <opt.icon size={14} />
                                    </button>
                                ))}
                            </div>
                        </div>
                     </div>
                  </div>
              )}
           </div>

           {/* Content Editor */}
           <div className="border-t border-neutral-800 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Content Editor</h3>
                <div className="flex bg-neutral-800 rounded border border-neutral-700 p-0.5">
                   <button 
                      onClick={() => handleLanguageChange('en')}
                      disabled={isProcessing}
                      className={`px-3 py-0.5 text-[10px] font-bold uppercase transition-all rounded-sm flex items-center gap-1 ${language === 'en' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'}`}
                   >
                      {isProcessing && language !== 'en' ? <Loader2 size={8} className="animate-spin" /> : null} EN
                   </button>
                   <button 
                      onClick={() => handleLanguageChange('fr')}
                      disabled={isProcessing}
                      className={`px-3 py-0.5 text-[10px] font-bold uppercase transition-all rounded-sm flex items-center gap-1 ${language === 'fr' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'}`}
                   >
                      {isProcessing && language !== 'fr' ? <Loader2 size={8} className="animate-spin" /> : null} FR
                   </button>
                </div>
              </div>
              <ResumeForm 
                data={data} 
                onChange={setData} 
                skillSettings={skillSettings}
                onSkillSettingsChange={setSkillSettings}
              />
           </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900 grid grid-cols-2 gap-2">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="bg-white hover:bg-neutral-200 disabled:bg-neutral-600 text-black py-3 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:cursor-wait"
            >
               {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
               {isExporting ? 'PDF...' : 'PDF'}
            </button>
            <button 
              onClick={handleExportDOCX}
              disabled={isExportingDocx}
              className="bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-600 border border-neutral-600 text-white py-3 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:cursor-wait"
            >
               {isExportingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
               {isExportingDocx ? 'DOCX...' : 'DOCX'}
            </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 bg-neutral-200 overflow-hidden relative flex flex-col">
         {/* Toolbar */}
         <div className="h-12 bg-white border-b border-neutral-300 flex items-center px-4 justify-between shadow-sm z-10 no-print">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">{currentTemplate.name}</span>
            <div className="text-[10px] uppercase font-bold text-neutral-400">A4 • {showPhoto ? 'Photo On' : 'Photo Off'} • {currentTemplate.layout}</div>
         </div>

         {/* Preview Canvas */}
         <div className="flex-1 overflow-auto p-8 flex justify-center items-start print:p-0">
             <div className="print-container transition-all duration-500 ease-in-out">
                <ResumePreview 
                   data={data} 
                   template={currentTemplate} 
                   showPhoto={showPhoto}
                   photoSettings={photoSettings}
                   skillSettings={skillSettings}
                   language={language}
                   scale={0.8} 
                />
             </div>
         </div>
      </div>
    </div>
  );
};

export default App;