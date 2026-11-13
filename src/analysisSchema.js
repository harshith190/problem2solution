import { Type } from '@google/genai';

// Gemini structured-output schema (OpenAPI style, used with config.responseSchema).
// Shared by server.js and geminiService.js.
export const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    domain: { type: Type.STRING },
    difficulty: { type: Type.STRING },
    impact: { type: Type.STRING },
    estimatedCost: { type: Type.STRING },
    timeline: { type: Type.STRING },
    skillsNeeded: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          critical: { type: Type.BOOLEAN }
        },
        required: ['name', 'critical']
      }
    },
    solution: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        architecture: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ['title', 'description', 'architecture']
    },
    skillGap: {
      type: Type.OBJECT,
      properties: {
        coveredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        summary: { type: Type.STRING }
      },
      required: ['coveredSkills', 'missingSkills', 'summary']
    },
    matchedPeople: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          matchScore: { type: Type.INTEGER },
          matchReason: { type: Type.STRING },
          role: { type: Type.STRING }
        },
        required: ['name', 'matchScore', 'matchReason']
      }
    },
    nextTasks: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: [
    'title', 'domain', 'difficulty', 'impact', 'estimatedCost',
    'timeline', 'skillsNeeded', 'solution', 'skillGap', 'matchedPeople', 'nextTasks'
  ]
};
