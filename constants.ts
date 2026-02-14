import { TemplateConfig } from './types';

// Generate 20 distinct high-end templates variations
export const TEMPLATES: TemplateConfig[] = [
  { id: 't1', name: 'Executive Suite', fontFamily: 'serif', layout: 'sidebar-left', colorTheme: 'slate', density: 'spacious', accentStyle: 'block' },
  { id: 't2', name: 'Modern Minimalist', fontFamily: 'sans', layout: 'single-column', colorTheme: 'black', density: 'compact', accentStyle: 'border' },
  { id: 't3', name: 'Creative Bold', fontFamily: 'sans', layout: 'header-centered', colorTheme: 'violet', density: 'spacious', accentStyle: 'underline' },
  { id: 't4', name: 'Tech Innovator', fontFamily: 'mono', layout: 'sidebar-right', colorTheme: 'blue', density: 'compact', accentStyle: 'none' },
  { id: 't5', name: 'Classic Elegance', fontFamily: 'classic', layout: 'single-column', colorTheme: 'gold', density: 'spacious', accentStyle: 'border' },
  { id: 't6', name: 'Swiss Clean', fontFamily: 'sans', layout: 'sidebar-left', colorTheme: 'rose', density: 'spacious', accentStyle: 'none' },
  { id: 't7', name: 'Slate Professional', fontFamily: 'sans', layout: 'sidebar-right', colorTheme: 'slate', density: 'compact', accentStyle: 'block' },
  { id: 't8', name: 'Emerald City', fontFamily: 'serif', layout: 'header-centered', colorTheme: 'emerald', density: 'spacious', accentStyle: 'underline' },
  { id: 't9', name: 'Noir', fontFamily: 'sans', layout: 'minimal', colorTheme: 'black', density: 'compact', accentStyle: 'none' },
  { id: 't10', name: 'Amber Horizon', fontFamily: 'sans', layout: 'sidebar-left', colorTheme: 'amber', density: 'spacious', accentStyle: 'border' },
  { id: 't11', name: 'Ivy League', fontFamily: 'classic', layout: 'single-column', colorTheme: 'slate', density: 'spacious', accentStyle: 'underline' },
  { id: 't12', name: 'Start Up', fontFamily: 'sans', layout: 'header-centered', colorTheme: 'blue', density: 'compact', accentStyle: 'block' },
  { id: 't13', name: 'Designer Portfolio', fontFamily: 'sans', layout: 'sidebar-right', colorTheme: 'violet', density: 'spacious', accentStyle: 'none' },
  { id: 't14', name: 'Compact Data', fontFamily: 'mono', layout: 'single-column', colorTheme: 'emerald', density: 'compact', accentStyle: 'border' },
  { id: 't15', name: 'Royal', fontFamily: 'serif', layout: 'sidebar-left', colorTheme: 'gold', density: 'spacious', accentStyle: 'block' },
  { id: 't16', name: 'Soft Rose', fontFamily: 'sans', layout: 'header-centered', colorTheme: 'rose', density: 'spacious', accentStyle: 'underline' },
  { id: 't17', name: 'Corporate Ladder', fontFamily: 'serif', layout: 'sidebar-right', colorTheme: 'slate', density: 'compact', accentStyle: 'border' },
  { id: 't18', name: 'Grid System', fontFamily: 'sans', layout: 'sidebar-left', colorTheme: 'black', density: 'compact', accentStyle: 'block' },
  { id: 't19', name: 'Oceanic', fontFamily: 'sans', layout: 'single-column', colorTheme: 'blue', density: 'spacious', accentStyle: 'none' },
  { id: 't20', name: 'Timeless', fontFamily: 'classic', layout: 'header-centered', colorTheme: 'slate', density: 'spacious', accentStyle: 'border' },
];

export const COLORS = {
  slate: { bg: 'bg-slate-900', text: 'text-slate-900', accent: 'text-slate-600', border: 'border-slate-300', bgLight: 'bg-slate-100' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-900', accent: 'text-blue-600', border: 'border-blue-200', bgLight: 'bg-blue-50' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-900', accent: 'text-emerald-600', border: 'border-emerald-200', bgLight: 'bg-emerald-50' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-900', accent: 'text-rose-600', border: 'border-rose-200', bgLight: 'bg-rose-50' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-900', accent: 'text-amber-600', border: 'border-amber-200', bgLight: 'bg-amber-50' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-900', accent: 'text-violet-600', border: 'border-violet-200', bgLight: 'bg-violet-50' },
  gold: { bg: 'bg-yellow-600', text: 'text-stone-800', accent: 'text-yellow-600', border: 'border-yellow-600', bgLight: 'bg-stone-50' },
  black: { bg: 'bg-black', text: 'text-black', accent: 'text-gray-700', border: 'border-gray-900', bgLight: 'bg-white' },
};
