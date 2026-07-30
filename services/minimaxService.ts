import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth/mammoth.browser.js';
import { ResumeData, ResumeDetailLevel } from '../types';

const MODEL = import.meta.env.VITE_MINIMAX_MODEL || 'MiniMax-M2.7';
const API_PATH = '/minimax/v1/text/chatcompletion_v2';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type ChatResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string; reasoning_content?: string };
  }>;
  error?: { message?: string };
  base_resp?: { status_msg?: string };
};

const stripThinking = (text: string) => text.replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '').trim();
const cleanJson = (text: string) => stripThinking(text).replace(/^```(?:json)?\s*|\s*```$/g, '').trim();

const getResumeText = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();
  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    try {
      const document = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = await Promise.all(
        Array.from({ length: document.numPages }, async (_, index) => {
          const page = await document.getPage(index + 1);
          const content = await page.getTextContent();
          return content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
        }),
      );
      const text = pages.join('\n').trim();
      if (!text) throw new Error('No selectable text was found in this PDF.');
      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PDF extraction error';
      throw new Error(`Could not read this PDF: ${message}`);
    }
  }

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      if (!result.value.trim()) throw new Error('No readable text was found in this Word document.');
      return result.value;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Word extraction error';
      throw new Error(`Could not read this Word document: ${message}`);
    }
  }

  return file.text();
};

const requestCompletion = async (system: string, user: string, maxCompletionTokens = 8192): Promise<string> => {
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
      max_completion_tokens: maxCompletionTokens,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ChatResponse;
  const choice = payload.choices?.[0];
  const message = choice?.message?.content;
  if (!response.ok || !message) {
    throw new Error(payload.error?.message || payload.base_resp?.status_msg || `MiniMax request failed (${response.status}).`);
  }
  if (choice?.finish_reason === 'length') {
    throw new Error('MiniMax reached its response limit before completing the resume.');
  }
  return stripThinking(message);
};

const resumeSchema = `{
  "personalInfo": { "fullName": "string", "jobTitle": "string", "email": "string", "phone": "string", "location": "string", "summary": "string", "linkedin": "string", "website": "string" },
  "experience": [{ "id": "string", "role": "string", "company": "string", "location": "string", "duration": "string", "description": ["string"] }],
  "education": [{ "id": "string", "degree": "string", "school": "string", "year": "string" }],
  "skills": ["string"],
  "languages": ["string"],
  "customSections": [{ "id": "string", "title": "string", "items": ["string"] }]
}`;

const detailInstructions: Record<ResumeDetailLevel, { standard: string; retry: string; maxCompletionTokens: number }> = {
  'one-page': {
    standard: 'Create a true one-page synthesis. Preserve every role and education entry, but keep at most one high-value bullet per experience, limit the summary to 220 characters, and include at most two items per custom section. Prefer measurable achievements and information relevant to the candidate’s current positioning.',
    retry: 'Return a shorter one-page version while still preserving every role, its location when present, and every education entry. Use at most one brief bullet per experience and one item per custom section.',
    maxCompletionTokens: 8192,
  },
  medium: {
    standard: 'Create a balanced synthesis. Preserve every role, education entry, certification, language, and distinct skill present in the source. Keep up to three concise bullets per experience and up to four items per custom section. Remove only repetition or clearly low-value wording; do not remove whole roles or substantive achievements.',
    retry: 'Return a more compact but complete synthesis. Preserve every role, education entry, certification, language, and distinct skill. Shorten wording before removing information, and keep up to two bullets per experience.',
    maxCompletionTokens: 12288,
  },
  full: {
    standard: 'Preserve the source resume in full detail. Extract every role, responsibility, achievement, project, education entry, certification, publication, language, skill, and other substantive item present. Keep all distinct bullets and facts; do not summarize, merge, rank, or omit content merely to shorten the resume. Wording may be cleaned only when its meaning and level of detail remain unchanged.',
    retry: 'Return a complete full-detail resume. Preserve every distinct source fact and all entries. Shorten wording only if needed to complete valid JSON; never remove roles, bullets, education, certifications, publications, skills, languages, or custom-section items.',
    maxCompletionTokens: 24576,
  },
};

export const parseResumeDocument = async (file: File, detailLevel: ResumeDetailLevel = 'medium'): Promise<Partial<ResumeData> | null> => {
  const resumeText = await getResumeText(file);
  if (!resumeText.trim()) throw new Error('No readable text was found in this document.');

  const instructions = detailInstructions[detailLevel];
  const userPrompt = `Resume content:\n${resumeText}`;
  const sharedPrompt = `You are an expert resume parser. Extract only information present in the supplied resume. Return valid JSON only, matching this schema exactly: ${resumeSchema}. Leave missing scalar fields empty and missing lists empty. For every experience, extract its city, region, or country into the experience location field when present; this is especially important for roles outside Switzerland or in German-speaking Switzerland.`;
  const standardPrompt = `${sharedPrompt} ${instructions.standard}`;
  const retryPrompt = `${sharedPrompt} The previous structured response was too long or incomplete. ${instructions.retry} Never leave a JSON string or object unfinished.`;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleanJson(await requestCompletion(standardPrompt, userPrompt, instructions.maxCompletionTokens))) as Record<string, unknown>;
  } catch (firstError) {
    try {
      parsed = JSON.parse(cleanJson(await requestCompletion(retryPrompt, userPrompt, instructions.maxCompletionTokens))) as Record<string, unknown>;
    } catch (retryError) {
      const message = retryError instanceof Error ? retryError.message : 'Invalid JSON response';
      throw new Error(`MiniMax could not return a complete structured resume: ${message}`, { cause: firstError });
    }
  }

  const timestamp = Date.now();
  for (const key of ['experience', 'education', 'customSections'] as const) {
    if (Array.isArray(parsed[key])) {
      parsed[key] = parsed[key].map((item, index) => ({ ...(item as object), id: `${key}-${timestamp}-${index}` }));
    }
  }
  if (Array.isArray(parsed.experience)) {
    parsed.experience = parsed.experience.map((item) => ({ location: '', ...(item as object) }));
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
    `You are a professional translator. Translate the supplied resume JSON into ${targetLanguage}. Return valid JSON only. Maintain the exact structure and IDs. Translate content values but not company names, locations, email addresses, or URLs.`,
    JSON.stringify(data),
  );
  return JSON.parse(cleanJson(text)) as ResumeData;
};
