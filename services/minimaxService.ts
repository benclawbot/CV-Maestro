import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth/mammoth.browser.js';
import { ResumeData } from '../types';

const MODEL = import.meta.env.VITE_MINIMAX_MODEL || 'MiniMax-M2.7';
const API_PATH = '/minimax/v1/chat/completions';

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
  base_resp?: { status_msg?: string };
};

const stripThinking = (text: string) => text.replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '').trim();

const cleanJson = (text: string) =>
  stripThinking(text).replace(/^```(?:json)?\s*|\s*```$/g, '').trim();

const getResumeText = async (file: File): Promise<string> => {
  if (file.type === 'application/pdf') {
    const document = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1);
        const content = await page.getTextContent();
        return content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
      }),
    );
    return pages.join('\n');
  }

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }

  return file.text();
};

const requestCompletion = async (system: string, user: string): Promise<string> => {
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_completion_tokens: 2048,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ChatResponse;
  const message = payload.choices?.[0]?.message?.content;
  if (!response.ok || !message) {
    throw new Error(payload.error?.message || payload.base_resp?.status_msg || `MiniMax request failed (${response.status}).`);
  }

  return stripThinking(message);
};

const resumeSchema = `{
  "personalInfo": { "fullName": "string", "jobTitle": "string", "email": "string", "phone": "string", "location": "string", "summary": "string", "linkedin": "string", "website": "string" },
  "experience": [{ "id": "string", "role": "string", "company": "string", "duration": "string", "description": ["string"] }],
  "education": [{ "id": "string", "degree": "string", "school": "string", "year": "string" }],
  "skills": ["string"],
  "languages": ["string"],
  "customSections": [{ "id": "string", "title": "string", "items": ["string"] }]
}`;

export const parseResumeDocument = async (file: File): Promise<Partial<ResumeData> | null> => {
  const resumeText = await getResumeText(file);
  if (!resumeText.trim()) throw new Error('No readable text was found in this document.');

  const text = await requestCompletion(
    `You are an expert resume parser. Extract only information present in the supplied resume. Return valid JSON only, matching this schema exactly: ${resumeSchema}. Leave missing scalar fields empty and missing lists empty. Split experience descriptions into concise bullet points.`,
    `Resume content:\n${resumeText}`,
  );
  const parsed = JSON.parse(cleanJson(text)) as Record<string, unknown>;
  const timestamp = Date.now();

  for (const key of ['experience', 'education', 'customSections'] as const) {
    if (Array.isArray(parsed[key])) {
      parsed[key] = parsed[key].map((item, index) => ({ ...(item as object), id: `${key}-${timestamp}-${index}` }));
    }
  }

  return parsed as Partial<ResumeData>;
};

export const rewriteContent = async (text: string, style = 'professional'): Promise<string> =>
  requestCompletion(
    'You are an expert resume writer. Return only the rewritten text, with no preamble or markdown.',
    `Rewrite this resume content to be more ${style}, impactful, concise, and results-oriented:\n${text}`,
  );

export const generateSummary = async (currentText: string, jobTitle: string): Promise<string> =>
  requestCompletion(
    'You are an expert resume writer. Return only the summary text, with no preamble or markdown.',
    `Write or improve a 40-60 word, single-paragraph professional summary for a ${jobTitle}. Keep it confident and results-oriented. Source context: ${currentText}`,
  );

export const translateResume = async (data: ResumeData, targetLanguage: 'English' | 'French'): Promise<ResumeData> => {
  const text = await requestCompletion(
    `You are a professional translator. Translate the supplied resume JSON into ${targetLanguage}. Return valid JSON only. Maintain the exact structure and IDs. Translate content values but not company names, email addresses, or URLs.`,
    JSON.stringify(data),
  );
  return JSON.parse(cleanJson(text)) as ResumeData;
};
