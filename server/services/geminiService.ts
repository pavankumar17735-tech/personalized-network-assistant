import { GoogleGenAI, Type } from '@google/genai';
import { UserProfile } from '../../src/types.ts';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined. Please add it via the Secrets panel.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export const geminiService = {
  /**
   * Fast pipeline: Consolidated Event Analysis & Starters Generation
   */
  async generateFullPipeline(
    profile: UserProfile,
    eventDescription: string
  ): Promise<any> {
    const ai = getGeminiClient();

    const systemInstruction = `You are an elite professional networking coach and Senior NLP Analyst. 
Your goal is to help a user network with confidence by analyzing a professional event agenda or description, 
and generating bespoke, context-aware networking starters, elevator pitches, and strategic advice.

Analyze the event description to identify key themes, topics, keywords, industries, and skills.
Then, map the user's background (bio, role, professional and personal interests) to these event themes.
Generate:
1. 10 highly customized, authentic conversation starters divided into these categories:
   - 'Icebreaker': To initiate contact naturally.
   - 'Open-ended': To open deeper dialogue on event themes.
   - 'Mutual Interest': Directly bridging user's personal/professional interests with the event.
   - 'Career': Mentorship, industry advice, or hiring context.
   - 'Technology': Focused on technical aspects, platforms, or research.
2. 3 elevator pitches (30-second introductions) for different scenarios (Academic/Project, Business/Industry, Casual).
3. 5 strategic, actionable networking tips tailored specifically to this profile at this event.
4. 3 specific, highly actionable networking goals ('quickInsights') for the user to achieve at this event, detailing a tactical approach and why it is relevant.
5. 4-5 custom, actionable networking preparation tasks ('prepChecklist') for the user to complete prior to the event (e.g. 'Update LinkedIn profile with your recent projects', 'Prepare discussion points on key themes', etc.) based on their profile and the event agenda.

Do NOT output preambles. Output strict JSON matching the requested schema. Ensure high semantic fit and confidence scores are calculated accurately.`;

    const prompt = `
User Profile:
- Name: ${profile.name}
- Role: ${profile.role}
- Professional Interests: ${profile.professionalInterests.join(', ')}
- Personal Interests & Hobbies: ${profile.personalInterests.join(', ')}
- Professional Bio: ${profile.bio}

Event/Conference Description:
${eventDescription}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analyzedThemes: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING, description: 'A 2-3 sentence overview of what this event is about.' },
                topics: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      confidence: { type: Type.NUMBER, description: 'Confidence score between 0.0 and 1.0' }
                    },
                    required: ['name', 'confidence']
                  }
                },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                industries: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['summary', 'topics', 'keywords', 'skills', 'industries']
            },
            starters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "Must be: 'Icebreaker', 'Open-ended', 'Mutual Interest', 'Career', or 'Technology'" },
                  title: { type: Type.STRING, description: 'Short catchy title' },
                  text: { type: Type.STRING, description: 'The spoken conversation starter script' },
                  whyItWorks: { type: Type.STRING, description: 'Brief explanation of why this starter is strategically effective' },
                  confidence: { type: Type.NUMBER, description: 'Relevance score between 0.0 and 1.0' }
                },
                required: ['category', 'title', 'text', 'whyItWorks', 'confidence']
              }
            },
            elevatorPitches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Pitch style e.g. "The Research Pitch", "The Casual Pitch"' },
                  text: { type: Type.STRING, description: 'Bespoke 30-second introduction' },
                  whenToUse: { type: Type.STRING, description: 'Contextual recommendation when to employ this pitch' }
                },
                required: ['title', 'text', 'whenToUse']
              }
            },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '5 personalized tactical networking guidelines.'
            },
            quickInsights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  goal: { type: Type.STRING, description: 'A highly specific, actionable networking goal for the user at this event.' },
                  tactic: { type: Type.STRING, description: 'A clear, tactical method to achieve this goal based on their profile.' },
                  relevance: { type: Type.STRING, description: 'Brief explanation of why this is highly relevant to their profile and the event.' }
                },
                required: ['goal', 'tactic', 'relevance']
              },
              description: 'Top 3 actionable networking goals / cheat sheet.'
            },
            prepChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '4-5 custom actionable prep tasks matching profile and event.'
            }
          },
          required: ['analyzedThemes', 'starters', 'elevatorPitches', 'tips', 'quickInsights', 'prepChecklist']
        }
      }
    });

    if (!response.text) {
      throw new Error('Empty response received from Gemini.');
    }

    return JSON.parse(response.text);
  },

  /**
   * Evaluates a claim/fact against Wikipedia snippets
   */
  async verifyFactWithGemini(
    query: string,
    wikipediaSnippet: string
  ): Promise<any> {
    const ai = getGeminiClient();

    const systemInstruction = `You are an elite, objective fact-checking system.
You are given a user's statement/claim, and an excerpt/snippet retrieved from Wikipedia.
Your job is to compare the claim against the Wikipedia snippet and classify its validity into one of the following states:
1. 'Verified': The Wikipedia content directly confirms the user's claim.
2. 'Partially Verified': Some aspects of the claim are true, but other parts are incorrect, unsupported, or missing critical context.
3. 'Disputed': The Wikipedia content directly refutes, disproves, or contradicts the claim.
4. 'No Information': The Wikipedia snippet does not contain enough information to make an evaluation.

Provide:
- status: The classified state.
- summary: A brief 2-sentence summary of the true facts as retrieved from Wikipedia.
- explanation: A clear explanation of why you gave this classification and how the claim compares to Wikipedia.
- confidence: Your confidence rating between 0.0 and 1.0.

Keep your response factual, neutral, and clear.`;

    const prompt = `
User Claim: "${query}"

Wikipedia Snippet/Context:
"${wikipediaSnippet}"
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            summary: { type: Type.STRING },
            explanation: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ['status', 'summary', 'explanation', 'confidence']
        }
      }
    });

    if (!response.text) {
      throw new Error('Empty verification response received from Gemini.');
    }

    return JSON.parse(response.text);
  }
};
