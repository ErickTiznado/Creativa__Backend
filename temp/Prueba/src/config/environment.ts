import "dotenv/config";

function requireEnvVariable(variableName: string): string {
  const value = process.env[variableName];

  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${variableName}`);
  }

  return value;
}

export const GEMINI_API_KEY = requireEnvVariable("GEMINI_API_KEY");
export const PORT = parseInt(process.env.PORT ?? "3000", 10);
