import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "../config/environment.js";

export const geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
