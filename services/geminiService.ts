import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData } from '../types';
import mammoth from "mammoth";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const parseResumeDocument = async (file: File): Promise<Partial<ResumeData> | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    let promptContent: any[] = [];
    
    // Handle different file types
    if (file.type === 'application/pdf') {
      // PDF: Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      promptContent = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data
          }
        }
      ];
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX: Extract text using mammoth
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        promptContent = [{ text: `Resume Content:\n${text}` }];
      } catch (e) {
        console.error("Mammoth extraction failed", e);
        throw new Error("Could not extract text from Word document.");
      }
    } else {
      // Fallback for other text based formats
       console.warn("Unsupported file type for direct parsing, trying plain text extraction if possible.");
       const text = await file.text();
       promptContent = [{ text: `Resume Content:\n${text}` }];
    }

    const systemPrompt = `You are an expert Resume Parser. Your job is to extract resume information from the provided document and structure it into a specific JSON schema.
    
    Strictly follow this JSON schema:
    {
      "personalInfo": {
        "fullName": "string",
        "jobTitle": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "summary": "string (professional summary)",
        "linkedin": "string",
        "website": "string"
      },
      "experience": [
        {
          "id": "string (unique)",
          "role": "string",
          "company": "string",
          "duration": "string",
          "description": ["string (bullet point)"]
        }
      ],
      "education": [
        {
          "id": "string (unique)",
          "degree": "string",
          "school": "string",
          "year": "string"
        }
      ],
      "skills": ["string"],
      "languages": ["string"],
      "customSections": [
         {
            "id": "string (unique)",
            "title": "string (e.g. Certifications, Awards, Projects)",
            "items": ["string (bullet point)"]
         }
      ]
    }

    Rules:
    - If a field is not found, leave it as an empty string or empty array.
    - For 'description' in experience, ensure you split paragraphs into bullet points.
    - Extract any section that doesn't fit into standard categories (like Certifications, Volunteering, Projects) into 'customSections'.
    - Do NOT hallucinate information. Only use what is in the document.
    `;

    promptContent.push({ text: systemPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Strong reasoning for document parsing
      contents: {
        parts: promptContent
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;
    
    // Explicit cast to ignore TS errors on structure mismatch during parsing step 
    // (We handle the conversion of string[] skills to object[] in the component if needed)
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanedText) as any;
    
    // Post-process to ensure IDs are unique if Gemini hallucinated duplicates or simple placeholders
    if (parsed.experience) {
        parsed.experience = parsed.experience.map((exp: any, i: number) => ({ ...exp, id: `exp-${Date.now()}-${i}` }));
    }
    if (parsed.education) {
        parsed.education = parsed.education.map((edu: any, i: number) => ({ ...edu, id: `edu-${Date.now()}-${i}` }));
    }
    if (parsed.customSections) {
        parsed.customSections = parsed.customSections.map((sec: any, i: number) => ({ ...sec, id: `cust-${Date.now()}-${i}` }));
    }

    return parsed as Partial<ResumeData>;

  } catch (error) {
    console.error("Error parsing resume:", error);
    throw error;
  }
};

export const enhancePhoto = async (currentImageBase64: string, prompt: string): Promise<string | null> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
        // Remove header if present
        const cleanBase64 = currentImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Capable of image editing tasks
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: cleanBase64
                        }
                    },
                    {
                        text: `Edit this image. ${prompt}. Return the image.`
                    }
                ]
            }
        });

        // Loop through parts to find the image
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/jpeg;base64,${part.inlineData.data}`;
                }
            }
        }
        return null;

    } catch (e) {
        console.error("Error enhancing photo:", e);
        return null;
    }
}

export const analyzePhotoAndSuggest = async (imageBase64: string): Promise<string[]> => {
    const ai = getAiClient();
    if (!ai) return ["Make it professional"];

    try {
         const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

         const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash-image',
             contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                    { text: "Analyze this professional headshot. Suggest 3 specific improvements to make it look more suitable for a high-end resume (e.g. background, lighting, attire, cropping). Return ONLY a raw JSON array of strings, no markdown formatting." }
                ]
             }
         });
         
         if (response.text) {
             const cleanedText = response.text.replace(/```json\n?|\n?```/g, '').trim();
             try {
                return JSON.parse(cleanedText);
             } catch (parseError) {
                console.warn("Failed to parse JSON from analyzePhotoAndSuggest, falling back to regex extraction", parseError);
                // Fallback: try to extract strings between quotes if JSON parse fails
                const matches = cleanedText.match(/"([^"]+)"/g);
                if (matches) {
                    return matches.map(m => m.replace(/"/g, ''));
                }
                return ["Improve lighting", "Professional background", "Crop to headshot"];
             }
         }
         return [];
    } catch(e) {
        console.error("Error analyzing photo:", e);
        return ["Remove background", "Improve lighting", "Crop to headshot"];
    }
}

export const rewriteContent = async (text: string, style: string = "professional"): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return text;
  
  try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Rewrite the following resume content to be more ${style}, impactful, and results-oriented. Keep it concise.\n\nContent: "${text}"`
      });
      return response.text || text;
  } catch (e) {
      console.error(e);
      return text;
  }
}

export const generateSummary = async (currentText: string, jobTitle: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return currentText;
  
  try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `You are an expert resume writer.
          Action: Rewrite or create a professional resume summary for a "${jobTitle}".
          Input Context: "${currentText}"
          
          Requirements:
          1. Length: Approximately 3 lines (40-60 words).
          2. Tone: High-end, professional, confident, and results-oriented.
          3. Structure: A single cohesive paragraph. No bullet points.
          4. Content: Highlight key experience and value proposition based on the input. If the input is weak, enhance it significantly.
          5. Variety: If the input looks like a previously generated summary, provide a variation with a slightly different focus or phrasing.
          
          Return ONLY the summary text.`
      });
      return response.text?.trim() || currentText;
  } catch (e) {
      console.error(e);
      return currentText;
  }
}

export const translateResume = async (data: ResumeData, targetLanguage: 'English' | 'French'): Promise<ResumeData | null> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are a professional translator. 
            
            Task: Translate the following JSON resume data into ${targetLanguage}.
            
            Rules:
            1. Maintain the EXACT JSON structure. Do not add or remove keys.
            2. Translate all content values: 'summary', 'jobTitle', 'role', 'description' (bullet points), 'customSections', 'skills' names.
            3. Do NOT translate proper names of companies (e.g., "Google", "Microsoft") unless there is a standard translation.
            4. Do NOT translate URLs or email addresses.
            5. Ensure the tone remains professional and suitable for a CV.
            
            Data to translate:
            ${JSON.stringify(data)}`,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) return null;
        
        // Clean potential markdown fencing from the response
        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanedText) as ResumeData;
    } catch (e) {
        console.error("Translation failed:", e);
        return null;
    }
}