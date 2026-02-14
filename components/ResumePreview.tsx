import React from 'react';
import { ResumeData, TemplateConfig } from '../types';
import { COLORS } from '../constants';
import { Mail, Phone, MapPin, Linkedin, Globe, ExternalLink } from 'lucide-react';

interface ResumePreviewProps {
  data: ResumeData;
  template: TemplateConfig;
  showPhoto: boolean;
  scale?: number;
  photoSettings: {
    size: 'small' | 'medium' | 'large';
    align: 'left' | 'center' | 'right';
  };
  skillSettings?: {
    showLevel: boolean;
    style: 'bar' | 'dots' | 'text';
  };
  language: 'en' | 'fr';
}

interface SkillItemRendererProps {
  skill: { name: string; level: number };
  settings: { showLevel: boolean; style: string };
  isDark: boolean;
  theme: any;
}

const SkillItemRenderer: React.FC<SkillItemRendererProps> = ({ skill, settings, isDark, theme }) => {
  const level = Math.min(Math.max(skill.level, 1), 5);
  
  const textLevels = ["Beginner", "Novice", "Competent", "Advanced", "Expert"];
  
  if (!settings.showLevel) {
      // Fallback to simple tag style if levels hidden
      return (
         <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-zinc-800 text-gray-200' : 'bg-white shadow-sm text-slate-700'}`}>
            {skill.name}
         </span>
      );
  }

  const barBg = isDark ? 'bg-zinc-700' : 'bg-gray-200';
  const barFill = isDark ? 'bg-gray-300' : theme.bg;

  if (settings.style === 'bar') {
      return (
          <div className="mb-3">
              <div className="flex justify-between text-xs font-semibold mb-1 opacity-90">
                  <span>{skill.name}</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${barBg}`}>
                  <div className={`h-full ${barFill}`} style={{ width: `${level * 20}%` }}></div>
              </div>
          </div>
      );
  }

  if (settings.style === 'dots') {
      return (
          <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold opacity-90">{skill.name}</span>
              <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full border ${isDark ? 'border-gray-500' : 'border-gray-300'} ${i <= level ? (isDark ? 'bg-gray-300' : theme.bg) : 'bg-transparent'}`} 
                      />
                  ))}
              </div>
          </div>
      );
  }
  
  if (settings.style === 'text') {
       return (
          <div className="flex justify-between items-baseline mb-2 border-b border-dashed border-gray-300/30 pb-1">
              <span className="text-xs font-semibold opacity-90">{skill.name}</span>
              <span className={`text-[10px] font-medium uppercase tracking-wider opacity-70 ${isDark ? 'text-gray-400' : theme.accent}`}>
                  {textLevels[level - 1]}
              </span>
          </div>
       );
  }

  return null;
};

export const ResumePreview: React.FC<ResumePreviewProps> = ({ data, template, showPhoto, scale = 1, photoSettings, skillSettings, language }) => {
  const { personalInfo, experience, education, skills, languages, customSections } = data;
  const theme = COLORS[template.colorTheme];

  const containerRef = React.useRef<HTMLDivElement>(null);
  const hasSidebar = template.layout.includes('sidebar');

  const LABELS = {
    en: {
      contact: "Contact",
      skills: "Skills",
      languages: "Languages",
      education: "Education",
      experience: "Experience"
    },
    fr: {
      contact: "Contact",
      skills: "Compétences",
      languages: "Langues",
      education: "Formation",
      experience: "Expérience"
    }
  };
  const t = LABELS[language];

  // Photo Style Logic
  const getPhotoStyles = () => {
    const sizeClasses = {
      small: 'w-24 h-24',
      medium: 'w-32 h-32',
      large: 'w-48 h-48'
    };
    
    const alignClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end'
    };

    return {
       // Sidebar photos usually look good with a border. Main header photos might vary, but keeping consistent for now.
       imgClass: `${sizeClasses[photoSettings.size]} object-cover rounded-full border-4 border-white shadow-lg`,
       containerClass: `mb-8 flex ${alignClasses[photoSettings.align]}`
    };
  };

  const { imgClass, containerClass } = getPhotoStyles();


  // Layout Helper Components
  const SectionTitle = ({ title }: { title: string }) => {
    const classes = {
      'underline': `border-b-2 ${theme.border} pb-1 mb-4`,
      'block': `bg-slate-100 px-3 py-1 mb-4 ${theme.text} font-bold`,
      'border': `border-l-4 ${theme.border} pl-3 mb-4`,
      'none': `mb-4 uppercase tracking-wider ${theme.accent} font-bold`
    };
    // Adjust logic if theme is black/dark
    const textColor = template.colorTheme === 'black' && template.accentStyle === 'none' ? 'text-black' : theme.text;
    
    return (
      <h3 className={`text-lg font-bold uppercase mt-8 ${classes[template.accentStyle]} ${textColor}`}>
        {title}
      </h3>
    );
  };

  const ContactItem = ({ icon: Icon, text, link }: { icon: any, text?: string, link?: string }) => {
    if (!text) return null;
    return (
      <div className="flex items-center gap-2 text-sm mb-2 opacity-90">
        <Icon size={14} className={theme.accent} />
        {link ? <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="hover:underline">{text}</a> : <span>{text}</span>}
      </div>
    );
  };

  // Font Classes
  const fontClass = {
    'sans': 'font-sans',
    'serif': 'font-serif',
    'mono': 'font-mono',
    'classic': 'font-classic'
  }[template.fontFamily];

  // Render Sidebar Content (Contact, Skills, Languages, Education)
  const renderSidebar = () => {
    const isDark = template.colorTheme === 'black';
    return (
    <div className={`h-full min-h-[297mm] ${isDark ? 'bg-zinc-900 text-white' : theme.bgLight} p-8 ${template.layout === 'sidebar-left' ? 'order-1' : 'order-2'} w-1/3 shrink-0 print:bg-gray-100`}>
      {showPhoto && personalInfo.photoUrl && (
         <div className={containerClass}>
            <img src={personalInfo.photoUrl} alt="Profile" className={imgClass} />
         </div>
      )}
      
      <div className="space-y-8">
        <div>
          <h4 className={`font-bold uppercase mb-4 ${isDark ? 'text-gray-300' : theme.accent} tracking-wider text-xs border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-1`}>{t.contact}</h4>
          <div className="space-y-2">
            <ContactItem icon={Mail} text={personalInfo.email} />
            <ContactItem icon={Phone} text={personalInfo.phone} />
            <ContactItem icon={MapPin} text={personalInfo.location} />
            <ContactItem icon={Linkedin} text={personalInfo.linkedin} link={personalInfo.linkedin} />
            <ContactItem icon={Globe} text={personalInfo.website} link={personalInfo.website} />
          </div>
        </div>

        {skills && skills.length > 0 && (
          <div>
            <h4 className={`font-bold uppercase mb-4 ${isDark ? 'text-gray-300' : theme.accent} tracking-wider text-xs border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-1`}>{t.skills}</h4>
            <div className={`${!skillSettings?.showLevel ? 'flex flex-wrap gap-2' : 'block'}`}>
              {skills.map((s, i) => (
                 <SkillItemRenderer key={i} skill={s} settings={skillSettings || { showLevel: false, style: 'text' }} isDark={isDark} theme={theme} />
              ))}
            </div>
          </div>
        )}

        {languages && languages.length > 0 && (
          <div>
            <h4 className={`font-bold uppercase mb-4 ${isDark ? 'text-gray-300' : theme.accent} tracking-wider text-xs border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-1`}>{t.languages}</h4>
            <ul className="text-sm space-y-1">
              {languages.map(l => <li key={l} className="flex items-center gap-2"><div className={`w-1 h-1 rounded-full ${theme.bg}`}></div>{l}</li>)}
            </ul>
          </div>
        )}

        {/* Education in Sidebar */}
        {education.length > 0 && (
          <div>
             <h4 className={`font-bold uppercase mb-4 ${isDark ? 'text-gray-300' : theme.accent} tracking-wider text-xs border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-1`}>{t.education}</h4>
             <div className="space-y-4">
                {education.map(edu => (
                  <div key={edu.id}>
                    <div className="font-bold text-sm">{edu.school}</div>
                    <div className="text-xs opacity-75">{edu.degree}</div>
                    <div className="text-xs opacity-60 mt-0.5">{edu.year}</div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  )};

  // Render Main Content (Experience, Custom Sections, maybe Education/Skills if not in sidebar)
  const renderMainContent = () => (
    <div className={`p-10 ${hasSidebar ? 'w-2/3' : 'w-full'} ${template.layout === 'sidebar-left' ? 'order-2' : 'order-1'}`}>
      {/* Header Area for Sidebar Layouts (Title in Main Content) */}
      {hasSidebar && (
        <div className="mb-10 border-b pb-8 border-gray-100">
           <h1 className={`text-5xl font-bold mb-3 ${theme.text} leading-tight`}>{personalInfo.fullName}</h1>
           <p className={`text-xl ${theme.accent} font-medium tracking-wide`}>{personalInfo.jobTitle}</p>
           {personalInfo.summary && <p className="mt-6 text-sm leading-relaxed text-gray-600 max-w-2xl">{personalInfo.summary}</p>}
        </div>
      )}

      {/* Header Area for Single Column / Centered Layouts */}
      {!hasSidebar && (
         <div className={`mb-12 ${template.layout === 'header-centered' ? 'text-center' : ''} ${template.layout === 'minimal' ? '' : 'border-b pb-10'} ${theme.border}`}>
            {showPhoto && personalInfo.photoUrl && (
              <div className={containerClass}>
                 <img src={personalInfo.photoUrl} alt="Profile" className={imgClass.replace('border-4', 'border-2')} />
              </div>
            )}
            <h1 className="text-6xl font-bold mb-4 tracking-tight text-slate-900">{personalInfo.fullName}</h1>
            <p className={`text-xl ${theme.accent} mb-6 uppercase tracking-widest text-sm font-bold`}>{personalInfo.jobTitle}</p>
            
            <div className={`flex flex-wrap gap-4 text-sm text-gray-500 mb-8 ${template.layout === 'header-centered' ? 'justify-center' : ''}`}>
               <span className="flex items-center gap-1"><Mail size={12}/> {personalInfo.email}</span>
               <span>•</span>
               <span className="flex items-center gap-1"><Phone size={12}/> {personalInfo.phone}</span>
               <span>•</span>
               <span className="flex items-center gap-1"><MapPin size={12}/> {personalInfo.location}</span>
               {personalInfo.linkedin && (
                 <><span>•</span><span className="flex items-center gap-1"><Linkedin size={12}/> {personalInfo.linkedin}</span></>
               )}
            </div>
            
            {personalInfo.summary && <p className="max-w-3xl mx-auto leading-relaxed text-gray-600 text-base">{personalInfo.summary}</p>}
         </div>
      )}

      {/* Experience Section */}
      {experience.length > 0 && (
        <div className="mb-8">
          <SectionTitle title={t.experience} />
          <div className="space-y-8">
            {experience.map((exp) => (
              <div key={exp.id} className="break-inside-avoid">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-2">
                  <h4 className="font-bold text-lg text-slate-800">{exp.role}</h4>
                  <span className={`text-sm ${theme.accent} font-medium whitespace-nowrap`}>{exp.duration}</span>
                </div>
                <div className="text-md font-semibold text-slate-600 mb-3">{exp.company}</div>
                <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm text-gray-600 marker:text-gray-400 leading-relaxed">
                  {exp.description.map((desc, i) => (
                    <li key={i} className="pl-1">{desc}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education Section (Only for non-sidebar layouts) */}
      {!hasSidebar && education.length > 0 && (
        <div className="mb-8">
           <SectionTitle title={t.education} />
           <div className="grid grid-cols-1 gap-6">
             {education.map(edu => (
                <div key={edu.id} className="break-inside-avoid">
                   <div className="flex justify-between items-baseline">
                      <h4 className="font-bold text-lg text-slate-800">{edu.school}</h4>
                      <span className="text-sm text-gray-500">{edu.year}</span>
                   </div>
                   <div className={`text-md ${theme.accent}`}>{edu.degree}</div>
                </div>
             ))}
           </div>
        </div>
      )}

      {/* Skills & Languages (Only for non-sidebar layouts) */}
      {!hasSidebar && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {skills.length > 0 && (
               <div>
                  <SectionTitle title={t.skills} />
                  <div className={`${!skillSettings?.showLevel ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-x-8 gap-y-2'}`}>
                     {skills.map((s, i) => (
                        <SkillItemRenderer key={i} skill={s} settings={skillSettings || { showLevel: false, style: 'text' }} isDark={false} theme={theme} />
                     ))}
                  </div>
               </div>
            )}
            {languages && languages.length > 0 && (
               <div>
                  <SectionTitle title={t.languages} />
                  <ul className="space-y-2 text-sm text-gray-600">
                     {languages.map(l => (
                        <li key={l} className="flex items-center gap-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${theme.bg}`}></div>
                           {l}
                        </li>
                     ))}
                  </ul>
               </div>
            )}
         </div>
      )}

      {/* Custom Sections */}
      {customSections && customSections.map(section => (
         <div key={section.id} className="mb-8 break-inside-avoid">
            <SectionTitle title={section.title} />
            <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm text-gray-600 marker:text-gray-400 leading-relaxed">
               {section.items.map((item, i) => (
                  <li key={i} className="pl-1">{item}</li>
               ))}
            </ul>
         </div>
      ))}

    </div>
  );

  return (
    <div 
        className={`resume-preview-container bg-white shadow-2xl mx-auto overflow-hidden flex ${hasSidebar ? 'flex-row' : 'flex-col'} ${fontClass}`}
        style={{ 
            width: '210mm', 
            minHeight: '297mm', 
            transform: `scale(${scale})`, 
            transformOrigin: 'top center' 
        }}
        ref={containerRef}
    >
        {template.layout === 'sidebar-left' && renderSidebar()}
        {renderMainContent()}
        {template.layout === 'sidebar-right' && renderSidebar()}
    </div>
  );
};