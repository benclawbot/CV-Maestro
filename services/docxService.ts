import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopPosition,
  TabStopType,
  TextRun,
  WidthType,
} from 'docx';
import { ResumeData, TemplateConfig } from '../types';

const latestYear = (value: string): number => {
  if (/present|current|today|aujourd/i.test(value)) return Number.MAX_SAFE_INTEGER;
  const years = value.match(/(?:19|20)\d{2}/g)?.map(Number) || [];
  return years.length ? Math.max(...years) : Number.MIN_SAFE_INTEGER;
};

const isCertificationSection = (title: string) => /certif|credential|accredit|qualification/i.test(title);

export const generateDocx = async (data: ResumeData, template: TemplateConfig): Promise<Blob> => {
  const { personalInfo, skills, languages } = data;
  const experience = [...data.experience];
  const education = [...data.education].sort((left, right) => latestYear(right.year) - latestYear(left.year));
  const customSections = (data.customSections || []).map((section) => ({
    ...section,
    items: isCertificationSection(section.title)
      ? [...section.items].sort((left, right) => latestYear(right) - latestYear(left))
      : section.items,
  }));
  const hasSidebar = template.layout.includes('sidebar');
  const isSidebarLeft = template.layout === 'sidebar-left';

  const createSectionHeading = (text: string) => new Paragraph({
    text: text.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    border: {
      bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    spacing: { before: 300, after: 150 },
  });

  const getLevelText = (level: number) => ['Beginner', 'Novice', 'Competent', 'Advanced', 'Expert'][Math.min(Math.max(level, 1), 5) - 1];

  const createContactInfo = () => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [
      new TextRun({ text: `${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}` }),
      ...(personalInfo.linkedin ? [new TextRun({ text: ` | ${personalInfo.linkedin}` })] : []),
      ...(personalInfo.website ? [new TextRun({ text: ` | ${personalInfo.website}` })] : []),
    ],
  });

  const createSummary = () => [
    createSectionHeading('Professional Summary'),
    new Paragraph({ children: [new TextRun(personalInfo.summary)], spacing: { after: 200 }, keepLines: true }),
  ];

  const createExperienceEntries = (items: ResumeData['experience']) => items.flatMap((item) => {
    const companyLine = item.location ? `${item.company} · ${item.location}` : item.company;
    return [
      new Paragraph({
        keepNext: true,
        keepLines: true,
        children: [
          new TextRun({ text: item.role, bold: true, size: 24 }),
          new TextRun({ text: `\t${item.duration}` }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 200, after: 30 },
      }),
      new Paragraph({
        keepNext: item.description.length > 0,
        keepLines: true,
        children: [new TextRun({ text: companyLine, italics: true })],
        spacing: { after: 50 },
      }),
      ...item.description.filter(Boolean).map((description) => new Paragraph({
        text: description,
        bullet: { level: 0 },
        keepLines: true,
        widowControl: true,
      })),
    ];
  });

  const createExperience = (items: ResumeData['experience'], continued = false) => items.length > 0
    ? [createSectionHeading(continued ? 'Professional Experience — continued' : 'Professional Experience'), ...createExperienceEntries(items)]
    : [];

  const createEducation = () => [
    createSectionHeading('Education'),
    ...education.map((item) => new Paragraph({
      keepLines: true,
      children: [
        new TextRun({ text: item.school, bold: true }),
        new TextRun({ text: `\t${item.degree}` }),
        new TextRun({ text: `\t${item.year}` }),
      ],
      tabStops: [
        { type: TabStopType.LEFT, position: 4000 },
        { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
      ],
      spacing: { before: 100, after: 50 },
    })),
  ];

  const createSkills = () => skills.length > 0 ? [
    createSectionHeading('Skills'),
    new Paragraph({
      keepLines: true,
      children: skills.map((skill, index) => new TextRun({ text: `${skill.name} (${getLevelText(skill.level)})${index < skills.length - 1 ? ', ' : ''}` })),
      spacing: { after: 200 },
    }),
  ] : [];

  const createLanguages = () => languages && languages.length > 0 ? [
    createSectionHeading('Languages'),
    new Paragraph({ text: languages.join(', '), spacing: { after: 200 }, keepLines: true }),
  ] : [];

  const createCustomSections = () => customSections.flatMap((section) => [
    createSectionHeading(section.title),
    ...section.items.map((item) => new Paragraph({ text: item, bullet: { level: 0 }, keepLines: true, widowControl: true })),
  ]);

  const children: any[] = [
    new Paragraph({
      text: personalInfo.fullName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { after: 100 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { after: 200 },
      children: [new TextRun({ text: personalInfo.jobTitle.toUpperCase(), bold: true, size: 20 })],
    }),
  ];

  if (hasSidebar) {
    const sidebarWidth = 3000;
    const mainWidth = 6000;
    const firstExperience = experience.slice(0, 1);
    const remainingExperience = experience.slice(1);
    const sidebarContent = [createContactInfo(), ...createEducation(), ...createSkills(), ...createLanguages()];
    const firstPageMainContent = [...createSummary(), ...createExperience(firstExperience)];
    const row = new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: isSidebarLeft ? sidebarWidth : mainWidth, type: WidthType.DXA },
          children: isSidebarLeft ? sidebarContent : firstPageMainContent,
          margins: { top: 200, bottom: 200, left: 200, right: 200 },
        }),
        new TableCell({
          width: { size: isSidebarLeft ? mainWidth : sidebarWidth, type: WidthType.DXA },
          children: isSidebarLeft ? firstPageMainContent : sidebarContent,
          margins: { top: 200, bottom: 200, left: 200, right: 200 },
        }),
      ],
    });
    children.push(new Table({
      rows: [row],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE },
      },
    }));
    children.push(...createExperience(remainingExperience, true), ...createCustomSections());
  } else {
    children.push(
      createContactInfo(),
      ...createSummary(),
      ...createExperience(experience),
      ...createEducation(),
      ...createSkills(),
      ...createLanguages(),
      ...createCustomSections(),
    );
  }

  const document = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBlob(document);
};
