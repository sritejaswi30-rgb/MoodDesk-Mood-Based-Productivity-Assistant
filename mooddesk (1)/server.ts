import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { analyzeMoodLocally } from './src/moodEngine.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

// Initialize Gemini client if key is present
let ai: GoogleGenAI | null = null;
const api_key = process.env.GEMINI_API_KEY;

if (api_key && api_key !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey: api_key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini AI system successfully loaded.');
  } catch (err) {
    console.warn('Failed to construct GoogleGenAI instance:', err);
  }
} else {
  console.log('Gemini API key is not configured. Falling back to local NLP engine.');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Analyze endpoint
  app.post('/api/analyze', async (req, res) => {
    try {
      const { text, useAI } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Text input is required' });
        return;
      }

      // If AI mode requested and we have the API, use Gemini
      if (useAI && ai) {
        console.log(`Analyzing journaling text via Gemini AI...`);
        try {
          const sysPrompt = `
You are an expert EQ coach, psychologist, and NLP analyzer.
Analyze the user's journal / text input and detect their primary emotional state out of these 5 mood states:
1. "Happy" (optimistic, joyful, positive, grateful)
2. "Sad" (sorrowful, reflective, down, lonely, blue)
3. "Stressed" (anxious, overwhelmed, tired, tense, busy, burnt out)
4. "Motivated" (focused, energized, driven, achieving, working)
5. "Neutral" (calm, resting, balanced, custom, routine)

Map the percentages/scores for each of these 5 states out of a total sum.
Provide a confidence score (from 0 to 100) on how confident you are in this classification.
Provide a supportive, beautifully-written 2-sentence empathetic reflection or guidance ("explanation") that mirrors this mood and gives gentle guidance. Keeping it human, authentic, and professional.

You MUST return a JSON response matching the requested schema.
`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `User journal entry: "${text}"`,
            config: {
              systemInstruction: sysPrompt,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  mood: {
                    type: Type.STRING,
                    description: 'One of: Happy, Sad, Stressed, Neutral, Motivated',
                  },
                  confidence: {
                    type: Type.INTEGER,
                    description: 'Confidence percentage (0 to 100)',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Empathetic 2-sentence coaching reflection aligned with this mood',
                  },
                  scores: {
                    type: Type.OBJECT,
                    description: 'Individual scoring metrics for each mood category',
                    properties: {
                      Happy: { type: Type.NUMBER, description: 'Weight score for Happy' },
                      Sad: { type: Type.NUMBER, description: 'Weight score for Sad' },
                      Stressed: { type: Type.NUMBER, description: 'Weight score for Stressed' },
                      Neutral: { type: Type.NUMBER, description: 'Weight score for Neutral' },
                      Motivated: { type: Type.NUMBER, description: 'Weight score for Motivated' },
                    },
                    required: ['Happy', 'Sad', 'Stressed', 'Neutral', 'Motivated']
                  }
                },
                required: ['mood', 'confidence', 'explanation', 'scores']
              },
            }
          });

          const jsonText = response.text ? response.text.trim() : '';
          const analysis = JSON.parse(jsonText);
          
          res.json({
            ...analysis,
            isAI: true,
            wordMatches: [] // handled purely in AI
          });
          return;
        } catch (aiErr) {
          console.error('Gemini call failed, falling back to local NLP:', aiErr);
          // fall through to local
        }
      }

      // Local analysis
      const localAnalysis = analyzeMoodLocally(text);
      res.json({
        ...localAnalysis,
        isAI: false
      });
    } catch (error: any) {
      console.error('Error analyzing mood:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Check if Gemini is configured (for UI indicator)
  app.get('/api/config', (req, res) => {
    res.json({
      hasGeminiKey: !!ai
    });
  });

  // Configure Vite / static file serving
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from compiled dist folder
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('Vite dist/ static files directory not found. Please run build!');
    }
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`MoodDesk Server is running at http://0.0.0.0:${port} [NODE_ENV=${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer();
