export interface ResumeData {
  personalInfo: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    linkedin?: string;
    website?: string;
    photoUrl?: string; // Base64 or URL
  };
  experience: Array<{
    id: string;
    role: string;
    company: string;
    duration: string;
    description: string[]; // Bullet points
  }>;
  education: Array<{
    id: string;
    degree: string;
    school: string;
    year: string;
  }>;
  skills: Array<{
    name: string;
    level: number; // 1-5
  }>;
  languages?: string[];
  interests?: string[];
  customSections?: Array<{
    id: string;
    title: string;
    items: string[];
  }>;
}

export interface TemplateConfig {
  id: string;
  name: string;
  fontFamily: 'sans' | 'serif' | 'mono' | 'classic';
  layout: 'sidebar-left' | 'sidebar-right' | 'single-column' | 'header-centered' | 'minimal';
  colorTheme: 'slate' | 'blue' | 'emerald' | 'rose' | 'amber' | 'violet' | 'gold' | 'black';
  density: 'compact' | 'spacious';
  accentStyle: 'underline' | 'block' | 'border' | 'none';
}

export const INITIAL_RESUME_DATA: ResumeData = {
  personalInfo: {
    fullName: "Alex Sterling",
    jobTitle: "Senior Product Designer",
    email: "alex.sterling@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    summary: "Visionary product designer with 8+ years of experience crafting intuitive digital experiences. Expert in bridging the gap between user needs and business goals through data-driven design systems.",
    linkedin: "linkedin.com/in/alexsterling",
    website: "alexsterling.design"
  },
  experience: [
    {
      id: '1',
      role: "Lead Product Designer",
      company: "InnovateTech",
      duration: "2020 - Present",
      description: [
        "Spearheaded the redesign of the core SaaS platform, increasing user retention by 25%.",
        "Managed a team of 5 designers, establishing a unified design system used across 4 products.",
        "Collaborated closely with engineering to implement pixel-perfect responsive interfaces."
      ]
    },
    {
      id: '2',
      role: "UI/UX Designer",
      company: "Creative Pulse Agency",
      duration: "2017 - 2020",
      description: [
        "Delivered award-winning web designs for Fortune 500 clients including Nike and Tesla.",
        "Conducted user research and usability testing to validate design concepts.",
        "Streamlined the design-to-development handover process, reducing implementation time by 30%."
      ]
    }
  ],
  education: [
    {
      id: '1',
      degree: "Bachelor of Fine Arts in Interaction Design",
      school: "California College of the Arts",
      year: "2016"
    }
  ],
  skills: [
    { name: "Figma", level: 5 },
    { name: "React", level: 4 },
    { name: "Design Systems", level: 5 },
    { name: "Prototyping", level: 4 },
    { name: "User Research", level: 4 },
    { name: "Adobe Creative Suite", level: 3 },
    { name: "HTML/CSS", level: 4 }
  ],
  languages: ["English (Native)", "Spanish (Fluent)"]
};