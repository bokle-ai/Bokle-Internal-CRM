
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
