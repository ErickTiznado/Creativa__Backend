import dotenv from 'dotenv'
dotenv.config()

import path from 'path';
const requiredEnvVars = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GCP_PROJECT_ID',
  'GCS_BUCKET_NAME'
];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Falta variable de entorno requerida: ${varName}`);
  }
});
const config = {
  gcp: {
    projectId: process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION || 'us-central1',
    keyFilePath: path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    
    models: {
      geminiPro: 'gemini-2.5-pro',
      geminiFlash: 'gemini-2.5-flash',
      geminiVision: 'gemini-pro-vision',
      imagen2: 'imagegeneration@006'
    },
    
    storage: {
      bucketName: process.env.GCS_BUCKET_NAME,
      publicUrl: process.env.GCS_PUBLIC_URL || `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}`
    }
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },

  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET
  }
};


export default config