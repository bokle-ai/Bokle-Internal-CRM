
import { GoogleGenAI } from "@google/genai";
import { BOKLE_CONTEXT } from "../constants";

// Internal helper to get AI client.
// Strictly uses process.env.API_KEY as per engineering guidelines.
const getAiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const handleAiError = (error: any, context: string): string => {
    console.error(`Gemini API Error (${context}):`, error);
    return `Unable to generate content. Error: ${error.message || "Unknown error occurred."}`;
};

/**
 * THE BRAIN: Strategic query over the whole database.
 * Uses Gemini 3 Flash for high-speed, cost-effective reasoning.
 */
export const queryCompanyBrain = async (
    query: string,
    history: { role: 'user' | 'ai', text: string }[],
    knowledgeBase: string
): Promise<AsyncGenerator<string, void, unknown>> => {
    const ai = getAiClient();
    
    // Limit history for performance
    const recentHistory = history.slice(-10).map(h => ({
        role: h.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: h.text }]
    }));

    const systemInstruction = `
        YOU ARE THE BOKLE AI "BRAIN" (A bird's-eye strategic internal advisor).
        
        ${BOKLE_CONTEXT}

        YOUR KNOWLEDGE BASE (CURRENT COMPANY DATA):
        ${knowledgeBase || "No data currently in CRM."}

        INSTRUCTIONS:
        1. Answer questions about current projects, suggest strategies, or analyze business health.
        2. Be proactive and maintain a "Strategic Partner" tone.
    `;

    try {
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction,
                temperature: 0.7,
            },
            history: recentHistory
        });

        const responseStream = await chat.sendMessageStream({ message: query });
        
        async function* streamResults() {
            for await (const chunk of responseStream) {
                yield chunk.text || "";
            }
        }

        return streamResults();
    } catch (error: any) {
        console.error("Brain Query Failed:", error);
        throw error;
    }
};

export const generateSalesScript = async (
    clientType: string,
    problem: string,
    stage: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate a sales script for: ${clientType}. Problem: ${problem}. Stage: ${stage}.`,
            config: {
                systemInstruction: `You are a strategic sales assistant for Bokle AI. \n${BOKLE_CONTEXT}`,
                temperature: 0.7,
            },
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        return handleAiError(error, "Sales Script");
    }
};

export const generateOutreachSequence = async (
    prospectName: string,
    role: string,
    company: string,
    painPoint: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate a 4-step outreach for ${prospectName} at ${company} (${role}). Pain point: ${painPoint}. Use Step X: headers.`,
            config: {
                systemInstruction: `You are a strategic sales assistant for Bokle AI. \n${BOKLE_CONTEXT}`,
                temperature: 0.7,
            },
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        return handleAiError(error, "Outreach Sequence");
    }
};

export const refineOutreachSequence = async (
    currentContent: string,
    instruction: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Rewrite this sequence: ${currentContent}. Instruction: ${instruction}. Keep Step X: headers.`,
            config: {
                systemInstruction: `You are an expert copywriter for Bokle AI. \n${BOKLE_CONTEXT}`,
                temperature: 0.7,
            },
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        return handleAiError(error, "Refine Sequence");
    }
};

export const analyzeProspectList = async (csvData: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analyze these prospects: ${csvData}`,
            config: {
                systemInstruction: `You are a strategic sales director for Bokle AI. \n${BOKLE_CONTEXT}`,
                temperature: 0.5,
            },
        });
        return response.text || "No analysis generated.";
    } catch (error: any) {
        return handleAiError(error, "List Analysis");
    }
};

export const researchCompany = async (url: string): Promise<{ company: string, painPoint: string }> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Research ${url}. Identify Name, Summary, and PainPoint for an AI agency.`,
            config: {
                tools: [{googleSearch: {}}],
                systemInstruction: `You are a research assistant.`,
                temperature: 0.3,
            },
        });
        const text = response.text || "";
        const nameMatch = text.match(/Name:\s*(.*)/i);
        const ppMatch = text.match(/PainPoint:\s*(.*)/i);
        return {
            company: nameMatch ? nameMatch[1].trim() : "",
            painPoint: ppMatch ? ppMatch[1].trim() : ""
        };
    } catch (error: any) {
        console.error("Research Error:", error);
        return { company: "", painPoint: "Could not analyze URL." };
    }
};

export const explainService = async (serviceName: string, clientContext: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Explain ${serviceName} to ${clientContext}. No jargon.`,
            config: {
                systemInstruction: `You are a strategic sales assistant for Bokle AI. \n${BOKLE_CONTEXT}`,
                temperature: 0.7,
            },
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        return handleAiError(error, "Service Explainer");
    }
};

export const generateHandover = async (clientName: string, agreedScope: string, timeline: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Technical handover for ${clientName}. Scope: ${agreedScope}. Timeline: ${timeline}.`,
            config: {
                systemInstruction: `You are a technical product manager for Bokle AI. \n${BOKLE_CONTEXT}`,
                temperature: 0.5,
            },
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        return handleAiError(error, "Handover");
    }
};

export const generateDocument = async (docType: string, details: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate ${docType}: ${details}`,
            config: {
                systemInstruction: `You are an operations assistant for Bokle AI. \n${BOKLE_CONTEXT}`,
                temperature: 0.7,
            },
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        return handleAiError(error, "Document Generator");
    }
};

export const generateStageArtifact = async (stage: string, artifactType: string, clientName: string, context: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate ${artifactType} for stage ${stage}. Client: ${clientName}. Context: ${context}.`,
            config: {
                systemInstruction: `You are a Delivery Manager for Bokle AI. \n${BOKLE_CONTEXT}`,
                temperature: 0.5,
            },
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        return handleAiError(error, "Autopilot");
    }
};

// Stage → available document types (Module E)
export const STAGE_DOC_TYPES: Record<string, string[]> = {
    'Lead':          ['Welcome Email Draft', 'Lead Qualification Checklist'],
    'Discovery':     ['Discovery Call Prep Brief', 'Post-Call AI Summary', 'Follow-Up Email Draft'],
    'Proposal':      ['Full Proposal', 'Service Overview Deck', 'Pricing Sheet'],
    'Negotiation':   ['Revised Proposal', 'NDA', 'Alignment Call Notes'],
    'Closed Won':    ['Statement of Work (SOW)', 'Business Requirements Document (BRD)', 'Client Onboarding Checklist', 'Invoice #1'],
    'Tech Handover': ['Tech Ticket', 'Internal Briefing Note'],
    'Delivery':      ['Progress Report', 'Stand-Up Call Summary', 'Mid-Project Review'],
    'Completed':     ['Project Completion Report', 'Final Invoice', 'Client Feedback Request', 'Case Study Draft'],
};

export const generateStageDocument = async (
    stage: string,
    docType: string,
    dealContext: string,
    extraNotes?: string
): Promise<string> => {
    try {
        const ai = getAiClient();
        const stageInstructions: Record<string, string> = {
            'Lead':          'This is an early-stage lead. Be warm, professional, and focus on qualifying the prospect.',
            'Discovery':     'This is the discovery phase. Focus on understanding the client problem deeply and preparing the right questions.',
            'Proposal':      'This is the proposal stage. Be persuasive, clear on value, and professional. Include scope, timeline, and pricing.',
            'Negotiation':   'This is the negotiation phase. Be flexible but firm. Protect the core value while addressing client concerns.',
            'Closed Won':    'The deal is closed. Be operational and precise. This document will govern the working relationship.',
            'Tech Handover': 'This goes to the dev team. Be technical, specific, and actionable. No fluff.',
            'Delivery':      'Project is in progress. Be factual, show progress clearly, flag any blockers, state next steps.',
            'Completed':     'Project is complete. Celebrate the win, document what was built, request a testimonial, suggest next engagement.',
        };

        const prompt = `Generate a professional "${docType}" document for the "${stage}" stage.

Stage context: ${stageInstructions[stage] || 'Be professional and thorough.'}

Deal / Client Context:
${dealContext}

${extraNotes ? `Additional Notes:\n${extraNotes}` : ''}

Output the document in clean Markdown. Use proper headings, sections, and formatting. Be specific — fill in real content based on the context provided, do not use placeholder text.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: `You are an expert business document writer for Bokle AI.\n${BOKLE_CONTEXT}`,
                temperature: 0.6,
            },
        });
        return response.text || 'No content generated.';
    } catch (error: any) {
        return handleAiError(error, 'Stage Document');
    }
};

export const fillProposalTokens = async (
    dealContext: string,
    tokens: string[]
): Promise<Record<string, string>> => {
    try {
        const ai = getAiClient();
        const tokenList = tokens.join(', ');
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Based on this deal context, generate values for these proposal template tokens: ${tokenList}.\n\nDeal Context:\n${dealContext}\n\nRespond ONLY with a valid JSON object mapping each token name (without curly braces) to its value. Be concise and professional.`,
            config: {
                systemInstruction: `You are a proposal writer for Bokle AI.\n${BOKLE_CONTEXT}`,
                temperature: 0.5,
            },
        });
        const raw = response.text || '{}';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return {};
    } catch {
        return {};
    }
};

export const generateProposalJSON = async (dealContext: string): Promise<any> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Based on the following deal context, generate a comprehensive project proposal. Return ONLY a valid JSON object with no markdown wrappers.

Deal Context:
${dealContext}

Return this exact JSON structure, filling every field with specific, professional content tailored to the client:
{
  "clientName": "...",
  "clientCompany": "...",
  "projectTitle": "...",
  "projectSubtitle": "... (ALL CAPS, e.g. 'SALESFORCE CRM & ZENDESK INTEGRATION')",
  "date": "...(e.g. May 2026)",
  "executiveSummary": "...(2-3 sentences)",
  "keyOutcomes": ["...", "...", "...", "...", "..."],
  "engagementType": "Fixed-Price Development",
  "timeline": "6 Weeks",
  "investment": "...(e.g. 8,500 AUD – 10,000 AUD)",
  "problemContext": "...(2 sentences about their current pain)",
  "challenges": [{"title":"...","description":"..."}, {"title":"...","description":"..."}, {"title":"...","description":"..."}, {"title":"...","description":"..."}, {"title":"...","description":"..."}],
  "objectives": ["...", "...", "...", "...", "...", "..."],
  "solutionOverview": "...(2-3 sentences)",
  "solutionWorkflow": ["...", "...", "...", "...", "...", "..."],
  "solutionComponents": [{"component":"...","technology":"...","responsibility":"..."}, {"component":"...","technology":"...","responsibility":"..."}, {"component":"...","technology":"...","responsibility":"..."}, {"component":"...","technology":"...","responsibility":"..."}, {"component":"...","technology":"...","responsibility":"..."}, {"component":"...","technology":"...","responsibility":"..."}],
  "phases": [
    {"number":"01","title":"DISCOVERY & PLANNING","description":"Requirements finalisation, technical architecture, API access setup, project kickoff","week":"Week 1"},
    {"number":"02","title":"FOUNDATION & INTEGRATION","description":"Core scaffold, third-party integrations, database schema design","week":"Week 2"},
    {"number":"03","title":"CORE FEATURE DEVELOPMENT","description":"Primary feature build, business logic, edge case handling","week":"Week 3 – 4"},
    {"number":"04","title":"SECURITY & HARDENING","description":"Security review, input validation, error handling, performance tuning","week":"Week 5"},
    {"number":"05","title":"TESTING & QA","description":"Unit, integration, end-to-end tests, load testing, UAT with client","week":"Week 6 Early"},
    {"number":"06","title":"DEPLOYMENT & HANDOVER","description":"Production deployment, monitoring setup, documentation, team training","week":"Week 6 Final"}
  ],
  "costItems": [{"item":"Discovery, Planning & Architecture","hours":"12","rate":"155 AUD","cost":"1,860 AUD"}, {"item":"Foundation & Integration Scaffold","hours":"16","rate":"155 AUD","cost":"2,480 AUD"}, {"item":"Core Feature Development","hours":"24","rate":"155 AUD","cost":"3,720 AUD"}, {"item":"Security & Hardening","hours":"10","rate":"155 AUD","cost":"1,550 AUD"}, {"item":"Testing, QA & Bug Fixes","hours":"12","rate":"125 AUD","cost":"1,500 AUD"}, {"item":"Deployment, Documentation & Handover","hours":"8","rate":"125 AUD","cost":"1,000 AUD"}],
  "totalHours": "82 Hours",
  "totalCost": "12,110 AUD",
  "futureItems": ["...", "...", "...", "...", "..."],
  "contactName": "Gautam — Bokle AI",
  "contactEmail": "hello@bokle.ai",
  "contactPhone": "+61 400 000 000",
  "contactWebsite": "www.bokle.ai"
}`,
            config: {
                systemInstruction: `You are a senior business development manager at Bokle AI. Generate detailed, professional proposal content. Return ONLY raw JSON — no backticks, no markdown.`,
                temperature: 0.6,
            },
        });
        const raw = response.text || '{}';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('No JSON in response');
    } catch (error: any) {
        console.error('Proposal JSON generation failed:', error);
        throw error;
    }
};

export const refineArtifactContent = async (currentContent: string, instructions: string, artifactType: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Refine ${artifactType}: ${currentContent}. Instruction: ${instructions}.`,
            config: {
                systemInstruction: `You are an expert editor for Bokle AI. \n${BOKLE_CONTEXT}`,
                temperature: 0.7,
            },
        });
        return response.text || "No response generated.";
    } catch (error: any) {
        return handleAiError(error, "Refine Artifact");
    }
}
