import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    HeadingLevel, 
    AlignmentType, 
    TabStopType, 
    TabStopPosition, 
    BorderStyle,
    Table,
    TableRow,
    TableCell,
    WidthType,
} from "docx";
import { ResumeData, TemplateConfig } from "../types";

export const generateDocx = async (data: ResumeData, template: TemplateConfig): Promise<Blob> => {
    const { personalInfo, experience, education, skills, languages, customSections } = data;
    const hasSidebar = template.layout.includes('sidebar');
    const isSidebarLeft = template.layout === 'sidebar-left';

    // --- Helpers ---

    const createSectionHeading = (text: string) => {
        return new Paragraph({
            text: text.toUpperCase(),
            heading: HeadingLevel.HEADING_2,
            border: {
                bottom: {
                    color: "000000",
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 6,
                },
            },
            spacing: {
                before: 300,
                after: 150,
            },
        });
    };

    const getLevelText = (level: number) => {
        const levels = ["Beginner", "Novice", "Competent", "Advanced", "Expert"];
        return levels[Math.min(Math.max(level, 1), 5) - 1];
    };

    // --- Component Generators ---

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
        createSectionHeading("Professional Summary"),
        new Paragraph({
            children: [new TextRun(personalInfo.summary)],
            spacing: { after: 200 },
        }),
    ];

    const createExperience = () => [
        createSectionHeading("Professional Experience"),
        ...experience.flatMap(exp => [
            new Paragraph({
                children: [
                    new TextRun({
                        text: exp.role,
                        bold: true,
                        size: 24,
                    }),
                    new TextRun({
                        text: `\t${exp.company}`,
                        italics: true,
                    }),
                    new TextRun({
                        text: `\t${exp.duration}`,
                    }),
                ],
                tabStops: [
                    { type: TabStopType.LEFT, position: 4000 },
                    { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
                ],
                spacing: { before: 200, after: 50 },
            }),
            ...exp.description.map(desc => new Paragraph({
                text: desc,
                bullet: { level: 0 },
            })),
        ]),
    ];

    const createEducation = () => [
        createSectionHeading("Education"),
        ...education.map(edu => new Paragraph({
            children: [
                new TextRun({
                    text: edu.school,
                    bold: true,
                }),
                new TextRun({
                    text: `\t${edu.degree}`,
                }),
                new TextRun({
                    text: `\t${edu.year}`,
                }),
            ],
            tabStops: [
                { type: TabStopType.LEFT, position: 4000 },
                { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
            ],
            spacing: { before: 100, after: 50 },
        })),
    ];

    const createSkills = () => (skills.length > 0 ? [
        createSectionHeading("Skills"),
        new Paragraph({
            children: skills.map((skill, i) => new TextRun({
                text: `${skill.name} (${getLevelText(skill.level)})${i < skills.length - 1 ? ", " : ""}`,
            })),
            spacing: { after: 200 },
        })
    ] : []);

    const createLanguages = () => (languages && languages.length > 0 ? [
        createSectionHeading("Languages"),
        new Paragraph({
            text: languages.join(", "),
            spacing: { after: 200 },
        })
    ] : []);

    const createCustomSections = () => (customSections || []).flatMap(sec => [
        createSectionHeading(sec.title),
        ...sec.items.map(item => new Paragraph({
            text: item,
            bullet: { level: 0 }
        }))
    ]);


    // --- Layout Logic ---

    let children = [];

    // Header is common
    children.push(
        new Paragraph({
            text: personalInfo.fullName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        }),
        new Paragraph({
            text: personalInfo.jobTitle.toUpperCase(),
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({
                    text: personalInfo.jobTitle.toUpperCase(),
                    bold: true,
                    size: 20,
                })
            ]
        })
    );

    if (hasSidebar) {
        // Create Sidebar Layout using a Table
        // Column Widths: 30% Sidebar, 70% Main
        const sidebarWidth = 3000;
        const mainWidth = 6000;

        const sidebarContent = [
            createContactInfo(),
            ...createEducation(),
            ...createSkills(),
            ...createLanguages()
        ];

        const mainContent = [
             ...createSummary(),
             ...createExperience(),
             ...createCustomSections()
        ];

        const row = new TableRow({
            children: [
                new TableCell({
                    width: { size: isSidebarLeft ? sidebarWidth : mainWidth, type: WidthType.DXA },
                    children: isSidebarLeft ? sidebarContent : mainContent,
                    margins: { top: 200, bottom: 200, left: 200, right: 200 }
                }),
                new TableCell({
                    width: { size: isSidebarLeft ? mainWidth : sidebarWidth, type: WidthType.DXA },
                    children: isSidebarLeft ? mainContent : sidebarContent,
                    margins: { top: 200, bottom: 200, left: 200, right: 200 }
                })
            ]
        });

        const table = new Table({
            rows: [row],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
            }
        });

        children.push(table);

    } else {
        // Standard Single Column / Header Centered
        children.push(
            createContactInfo(),
            ...createSummary(),
            ...createExperience(),
            ...createEducation(),
            ...createSkills(),
            ...createLanguages(),
            ...createCustomSections()
        );
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    return await Packer.toBlob(doc);
};