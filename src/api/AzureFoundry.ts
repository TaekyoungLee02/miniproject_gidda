import { AzureOpenAI } from "openai";

export const client = new AzureOpenAI({
  endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT,
  apiKey: process.env.AZURE_AI_FOUNDRY_KEY,
  deployment: process.env.AZURE_DEPLOYMENT_NAME,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
});