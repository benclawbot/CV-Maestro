<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CV Maestro

CV Maestro is a local, MiniMax-powered resume builder. Its AI features parse
text from PDF/DOCX files, improve resume writing, and translate resumes.

## Run Locally

**Prerequisites:** Node.js 20+ and a MiniMax API key.


1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `MINIMAX_API_KEY`.
3. Start the local app: `npm run dev`
4. Open the URL shown by Vite (normally http://localhost:3000).

The local server and deployed Site proxy calls to MiniMax, so the API key remains
out of the browser bundle. `VITE_MINIMAX_MODEL` defaults to the currently
documented `MiniMax-M2.7`. To use MiniMax M3, set it to `MiniMax-M3` after M3
is enabled for your MiniMax account.

MiniMax's text models currently do not accept image or document inputs. CV
Maestro therefore extracts PDF/DOCX text locally and keeps uploaded headshots
unchanged; the writing, parsing, and translation features use MiniMax.
