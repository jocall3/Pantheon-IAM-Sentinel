
import { GoogleGenAI } from "@google/genai";
import { IamPolicyBinding, RemediationProposal, ResourceNode, AuditLogEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzePolicyWithGemini = async (
  resource: ResourceNode,
  policies: IamPolicyBinding[]
): Promise<{ score: number; recommendations: string[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the security posture of the following GCP resource and its IAM policies. 
      Return a JSON object with a security score (0-100) and a list of specific security recommendations.
      
      Resource: ${JSON.stringify(resource)}
      Policies: ${JSON.stringify(policies)}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert Cloud IAM Security Architect. You specialize in the principle of least privilege and multi-cloud security governance."
      }
    });

    return JSON.parse(response.text || '{"score": 50, "recommendations": []}');
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return { score: 0, recommendations: ["Failed to connect to AI engine."] };
  }
};

export const suggestRemediation = async (
  logs: AuditLogEntry[],
  currentPolicies: IamPolicyBinding[],
  resourceId: string
): Promise<RemediationProposal> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on these audit logs and current policies for resource ${resourceId}, suggest a remediation proposal to enforce least privilege.
      Logs: ${JSON.stringify(logs)}
      Current Policies: ${JSON.stringify(currentPolicies)}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an automated IAM remediation agent. You always output a valid RemediationProposal JSON object following the schema: { id: string, description: string, severity: 'low'|'medium'|'high'|'critical', confidence: number, reasoning: string, changes: Array<{action: 'add'|'remove'|'update', resourceId: string, binding: object}> }"
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini remediation failed", error);
    throw error;
  }
};
