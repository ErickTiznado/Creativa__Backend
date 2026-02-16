import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenAI({});

export default genAI;