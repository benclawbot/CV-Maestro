import React from 'react';
import { ResumeData, TemplateConfig } from '../types';
import { COLORS } from '../constants';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';

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
  theme: (typeof COLORS)[keyof typeof COLORS];
}

const latestYear = (value: string): number => {
  if (/present|current|today|aujourd/i.test(value)) return Number.MAX_SAFE_INTEGER;
  const years = value.match(/(?:19|20)\d{2}/g)?.map(Number) || [];
  return years.length ? Math.max(...years) : Number.MIN_SAFE_INTEGER;
};

const isCertificationSection = (title: string) => /certif|credential|accredit|qualification/i.test(title);

const SkillItemRenderer: React.FC<SkillItemRendererProps> = ({ skill, settings, isDark, theme }) => {
  const level = Math.min(Math.max(skill.level, 1), 5);
  const textLevels = ['Beginner', 'Novice', 'Competent', 'Advanced', 'Expert'];
  const skillTextStyle: React.CSSProperties = { wordSpacing: '0.14em', letterSpacing: '0.01em' };

  if (!settings.showLevel) {
    return (
      <span className={`text-xs px-2 py-1 rounded leading-relaxed ${isDark ? 'bg-zinc-800 text-gray-200' : 'bg-white shadow-sm text-slate-700'}`} style={skillTextStyle}>
        {skill.name}
      </span>
    );
  }

  const barBg = isDark ? 'bg-zinc-700' : 'bg-gray-200';
  const barFill = isDark ? 'bg-gray-300' : theme.bg;

  if (settings.style === 'bar') {
    return (
      <div className="mb-3">
        <div className="flex justify-between text-xs font-semibold mb-1 opacity-90 leading-relaxed">
          <span style={skillTextStyle}>{skill.name}</span>
        </div>
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${barBg}`}>
          <div className={`h-full ${barFill}`} style={{ width: `${level * 20}%` }} />
        </div>
      </div>
    );
  }

  if (settings.style === 'dots') {
    return (
      <div className="flex justify-between items-center mb-2 gap-2">
        <span className="text-xs font-semibold opacity-90 leading-relaxed" style={skillTextStyle}>{skill.name}</span>
        <div className="flex gap-1 shrink-0">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full border ${isDark ? 'border-gray-500' : 'border-gray-300'} ${index <= level ? (isDark ? 'bg-gray-300' : theme.bg) : 'bg-transparent'}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-baseline gap-2 mb-2 border-b border-dashed border-gray-300/30 pb-1">
      <span className="text-xs font-semibold opacity-90 leading-relaxed" style={skillTextStyle}>{skill.name}</span>
      <span className={`text-[10px] font-medium uppercase tracking-wider opacity-70 shrink-0 ${isDark ? 'text-gray-400' : theme.accent}`}>
        {textLevels[level - 1]}
      </span>
    </div>
  );
};

export const ResumePreview: React.FC<ResumePreviewProps> = ({ data, template, showPhoto, scale = 1, photoSettings, skillSettings, language }) => {
  const { personalInfo, experience, skills, languages } = data;
  const education = React.useMemo(
    () => [...data.education].sort((left, right) => latestYear(right.year) - latestYear(left.year)),
    [data.education],
  );
  const customSections = React.useMemo(
    () => (data.customSections || []).map((section) => ({
      ...section,
      items: isCertificationSection(section.title)
        ? [...section.items].sort((left, right) => latestYear(right) - latestYear(left))
        : section.items,
    })),
    [data.customSections],
  );
  const theme = COLORS[template.colorTheme];
  const hasSidebar = template.layout.includes('sidebar');
  const isCompact = template.density === 'compact';

  const labels = {
    en: { contact: 'Contact', skills: 'Skills', languages: 'Languages', education: 'Education', experience: 'Experience' },
    fr: { contact: 'Contact', skills: 'Compétences', languages: 'Langues', education: 'Formation', experience: 'Expérience' },
  }[language];

  const sizeClasses = { small: 'w-24 h-24', medium: 'w-32 h-32', large: 'w-48 h-48' };
  const alignClasses = { left: 'justify-start', center: 'justify-center', right: 'justify-end' };
  const imgClass = `${sizeClasses[photoSettings.size]} object-cover rounded-full border-4 border-white shadow-lg`;
  const photoContainerClass = `${isCompact ? 'mb-5' : 'mb-8'} flex ${alignClasses[photoSettings.align]}`;
  const fontClass = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono', classic: 'font-classic' }[template.fontFamily];

  const SectionTitle = ({ title, first = false }: { title: string; first?: boolean }) => {
    const classes = {
      underline: `border-b-2 ${theme.border} pb-1 mb-4`,
      block: `bg-slate-100 px-3 py-1 mb-4 ${theme.text} font-bold`,
      border: `border-l-4 ${theme.border} pl-3 mb-4`,
      none: `mb-4 uppercase tracking-wider ${theme.accent} font-bold`,
    };
    const textColor = template.colorTheme === 'black' && template.accentStyle === 'none' ? 'text-black' : theme.text;
    return <h3 className={`text-lg font-bold uppercase ${first ? 'mt-0' : isCompact ? 'mt-6' : 'mt-8'} ${classes[template.accentStyle]} ${textColor}`}>{title}</h3>;
  };

  const ContactItem = ({ icon: Icon, text, link }: { icon: React.ComponentType<{ size?: number; className?: string }>; text?: string; link?: string }) => {
    if (!text) return null;
    return (
      <div className="flex items-center gap-2 text-sm mb-2 opacity-90 leading-relaxed">
        <Icon size={14} className={`${theme.accent} shrink-0 translate-y-[1px]`} />
        {link ? <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="hover:underline break-all">{text}</a> : <span>{text}</span>}
      </div>
    );
  };

  const BulletList = ({ items, individuallyBreakable = false }: { items: string[]; individuallyBreakable?: boolean }) => (
    <ul className="space-y-1.5 text-sm text-gray-600 leading-relaxed">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 pl-0" {...(individuallyBreakable ? { 'data-pdf-break-after': 'true' } : {})}>
          <span className="mt-[0.68em] w-1 h-1 rounded-full bg-gray-400 shrink-0" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

  const renderSidebar = () => {
    const isDark = template.colorTheme === 'black';
    const floatClass = template.layout === 'sidebar-left' ? 'float-left mr-0' : 'float-right ml-0';
    return (
      <aside
        className={`resume-sidebar min-h-[297mm] box-border ${isDark ? 'bg-zinc-900 text-white' : theme.bgLight} ${isCompact ? 'p-7' : 'p-8'} ${floatClass} w-1/3 print:bg-gray-100`}
        data-pdf-break-after="true"
      >
        {showPhoto && personalInfo.photoUrl && (
          <div className={photoContainerClass}><img src={personalInfo.photoUrl} alt="Profile" className={imgClass} /></div>
        )}
        <div className={isCompact ? 'space-y-6' : 'space-y-8'}>
          <div>
            <h4 className={`font-bold uppercase mb-4 ${isDark ? 'text-gray-300' : theme.accent} tracking-wider text-xs border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-1`}>{labels.contact}</h4>
            <ContactItem icon={Mail} text={personalInfo.email} />
            <ContactItem icon={Phone} text={personalInfo.phone} />
            <ContactItem icon={MapPin} text={personalInfo.location} />
            <ContactItem icon={Linkedin} text={personalInfo.linkedin} link={personalInfo.linkedin} />
            <ContactItem icon={Globe} text={personalInfo.website} link={personalInfo.website} />
          </div>

          {skills.length > 0 && (
            <div>
              <h4 className={`font-bold uppercase mb-4 ${isDark ? 'text-gray-300' : theme.accent} tracking-wider text-xs border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-1`}>{labels.skills}</h4>
              <div className={!skillSettings?.showLevel ? 'flex flex-wrap gap-2' : 'block'}>
                {skills.map((skill, index) => <SkillItemRenderer key={`${skill.name}-${index}`} skill={skill} settings={skillSettings || ({ showLevel: false, style: 'text' } as const)} isDark={isDark} theme={theme} />)}
              </div>
            </div>
          )}

          {languages && languages.length > 0 && (
            <div>
              <h4 className={`font-bold uppercase mb-4 ${isDark ? 'text-gray-300' : theme.accent} tracking-wider text-xs border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-1`}>{labels.languages}</h4>
              <ul className="text-sm space-y-1.5">
                {languages.map((item) => <li key={item} className="flex items-start gap-2"><span className={`mt-[0.68em] w-1 h-1 rounded-full ${theme.bg} shrink-0`} /> <span>{item}</span></li>)}
              </ul>
            </div>
          )}

          {education.length > 0 && (
            <div>
              <h4 className={`font-bold uppercase mb-4 ${isDark ? 'text-gray-300' : theme.accent} tracking-wider text-xs border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} pb-1`}>{labels.education}</h4>
              <div className="space-y-4">
                {education.map((item) => (
                  <div key={item.id} className="break-inside-avoid">
                    <div className="font-bold text-sm leading-snug">{item.school}</div>
                    <div className="text-xs opacity-75 leading-relaxed">{item.degree}</div>
                    <div className="text-xs opacity-60 mt-0.5">{item.year}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  };

  const renderExperience = (item: ResumeData['experience'][number], index: number) => {
    const [firstBullet, ...remainingBullets] = item.description.filter(Boolean);
    return (
      <React.Fragment key={item.id}>
        <div className={`${index > 0 ? (isCompact ? 'mt-5' : 'mt-7') : ''} break-inside-avoid`} data-pdf-break-after="true">
          {index === 0 && <SectionTitle title={labels.experience} first />}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 mb-2">
            <h4 className="font-bold text-lg text-slate-800 leading-snug">{item.role}</h4>
            <span className={`text-sm ${theme.accent} font-medium whitespace-nowrap`}>{item.duration}</span>
          </div>
          <div className="text-md font-semibold text-slate-600 mb-3 leading-relaxed">
            {item.company}{item.location ? <span className="font-normal text-slate-500"> · {item.location}</span> : null}
          </div>
          {firstBullet && <BulletList items={[firstBullet]} />}
        </div>
        {remainingBullets.length > 0 && <div className="mt-1"><BulletList items={remainingBullets} individuallyBreakable /></div>}
      </React.Fragment>
    );
  };

  const renderMainContent = () => (
    <main className={`resume-main w-full box-border ${isCompact ? 'p-8' : 'p-10'}`}>
      {hasSidebar && (
        <div className={`${isCompact ? 'mb-7 pb-6' : 'mb-10 pb-8'} border-b border-gray-100 break-inside-avoid`} data-pdf-break-after="true">
          <h1 className={`text-5xl font-bold mb-3 ${theme.text} leading-tight`}>{personalInfo.fullName}</h1>
          <p className={`text-xl ${theme.accent} font-medium tracking-wide`}>{personalInfo.jobTitle}</p>
          {personalInfo.summary && <p className={`${isCompact ? 'mt-4' : 'mt-6'} text-sm leading-relaxed text-gray-600 max-w-2xl`}>{personalInfo.summary}</p>}
        </div>
      )}

      {!hasSidebar && (
        <div className={`${isCompact ? 'mb-8 pb-7' : 'mb-12 pb-10'} ${template.layout === 'header-centered' ? 'text-center' : ''} ${template.layout === 'minimal' ? '' : 'border-b'} ${theme.border} break-inside-avoid`} data-pdf-break-after="true">
          {showPhoto && personalInfo.photoUrl && <div className={photoContainerClass}><img src={personalInfo.photoUrl} alt="Profile" className={imgClass.replace('border-4', 'border-2')} /></div>}
          <h1 className="text-6xl font-bold mb-4 tracking-tight text-slate-900 leading-tight">{personalInfo.fullName}</h1>
          <p className={`text-xl ${theme.accent} mb-6 uppercase tracking-widest text-sm font-bold`}>{personalInfo.jobTitle}</p>
          <div className={`flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 mb-8 ${template.layout === 'header-centered' ? 'justify-center' : ''}`}>
            <span className="flex items-center gap-1"><Mail size={12} className="translate-y-[1px]" /> {personalInfo.email}</span>
            <span aria-hidden="true">•</span>
            <span className="flex items-center gap-1"><Phone size={12} className="translate-y-[1px]" /> {personalInfo.phone}</span>
            <span aria-hidden="true">•</span>
            <span className="flex items-center gap-1"><MapPin size={12} className="translate-y-[1px]" /> {personalInfo.location}</span>
            {personalInfo.linkedin && <><span aria-hidden="true">•</span><span className="flex items-center gap-1"><Linkedin size={12} className="translate-y-[1px]" /> {personalInfo.linkedin}</span></>}
          </div>
          {personalInfo.summary && <p className="max-w-3xl mx-auto leading-relaxed text-gray-600 text-base">{personalInfo.summary}</p>}
        </div>
      )}

      {experience.length > 0 && <section className={isCompact ? 'mb-6' : 'mb-8'}>{experience.map(renderExperience)}</section>}

      {!hasSidebar && education.length > 0 && (
        <section className={isCompact ? 'mb-6' : 'mb-8'}>
          {education.map((item, index) => (
            <div key={item.id} className={`${index > 0 ? 'mt-5' : ''} break-inside-avoid`} data-pdf-break-after="true">
              {index === 0 && <SectionTitle title={labels.education} first />}
              <div className="flex justify-between items-baseline gap-3">
                <h4 className="font-bold text-lg text-slate-800 leading-snug">{item.school}</h4>
                <span className="text-sm text-gray-500 whitespace-nowrap">{item.year}</span>
              </div>
              <div className={`text-md ${theme.accent}`}>{item.degree}</div>
            </div>
          ))}
        </section>
      )}

      {!hasSidebar && (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${isCompact ? 'mb-6' : 'mb-8'} break-inside-avoid`} data-pdf-break-after="true">
          {skills.length > 0 && (
            <section>
              <SectionTitle title={labels.skills} first />
              <div className={!skillSettings?.showLevel ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-x-8 gap-y-2'}>
                {skills.map((skill, index) => <SkillItemRenderer key={`${skill.name}-${index}`} skill={skill} settings={skillSettings || ({ showLevel: false, style: 'text' } as const)} isDark={false} theme={theme} />)}
              </div>
            </section>
          )}
          {languages && languages.length > 0 && (
            <section>
              <SectionTitle title={labels.languages} first />
              <BulletList items={languages} />
            </section>
          )}
        </div>
      )}

      {customSections.map((section) => {
        const [firstItem, ...remainingItems] = section.items.filter(Boolean);
        return (
          <section key={section.id} className={isCompact ? 'mb-6' : 'mb-8'}>
            <div className="break-inside-avoid" data-pdf-break-after="true">
              <SectionTitle title={section.title} first />
              {firstItem && <BulletList items={[firstItem]} />}
            </div>
            {remainingItems.length > 0 && <div className="mt-1"><BulletList items={remainingItems} individuallyBreakable /></div>}
          </section>
        );
      })}
    </main>
  );

  return (
    <div
      className={`resume-preview-container bg-white shadow-2xl mx-auto overflow-hidden ${fontClass}`}
      style={{ width: '210mm', minHeight: '297mm', transform: `scale(${scale})`, transformOrigin: 'top center' }}
    >
      {template.layout === 'sidebar-left' && renderSidebar()}
      {template.layout === 'sidebar-right' && renderSidebar()}
      {renderMainContent()}
      <div className="clear-both" />
    </div>
  );
};
