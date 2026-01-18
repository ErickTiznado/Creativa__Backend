/**
 * ------------------------------------------------------------------
 * Archivo: test-vertex-adapter.js
 * Ubicación: src/test/test-vertex-adapter.js
 * Responsabilidad: Smoke tests manuales para `vertexAdapter`.
 *
 * Nota: requiere configuración completa de GCP (credenciales + bucket).
 * Ejecutar manualmente (si se agrega script): `node src/test/test-vertex-adapter.js`.
 * ------------------------------------------------------------------
 */

import vertexAdapter from "../services/vertexAdapter.js";

async function testVertexAdapter() {
  console.log('🧪 Iniciando tests de Vertex AI Adapter...\n');

  try {
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 1: Gemini Pro - Generación de texto');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const textPrompt = 'Escribe un eslogan creativo para una campaña de marketing de café orgánico';
    const generatedText = await vertexAdapter.generateText(textPrompt, {
      temperature: 0.9,
      maxOutputTokens: 100
    });
    
    console.log('📝 Prompt:', textPrompt);
    console.log('✨ Resultado:', generatedText);
    console.log('\n✅ Test 1: PASADO\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 2: Imagen 2 - Generación de imagen');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const imagePrompt = 'A modern coffee shop with minimalist design, warm lighting, wooden furniture, and plants. Professional photography style.';
    const generatedImage = await vertexAdapter.generateImage(imagePrompt, {
      aspectRatio: '16:9',
      folder: 'test'
    });
    
    console.log('🎨 Prompt:', imagePrompt);
    console.log('🖼️  URL:', generatedImage.url);
    console.log('📐 Aspect Ratio:', generatedImage.aspectRatio);
    console.log('\n✅ Test 2: PASADO\n');

    // Test 3: Generar texto streaming (simulación de chatbot)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 3: Gemini Pro Streaming');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const streamPrompt = 'Dame 3 ideas de campañas para redes sociales sobre café';
    console.log('📝 Prompt:', streamPrompt);
    console.log('💬 Respuesta en streaming:\n');
    
    let streamedText = '';
    await vertexAdapter.generateTextStream(
      streamPrompt,
      (chunk) => {
        process.stdout.write(chunk);
        streamedText += chunk;
      },
      { temperature: 0.8 }
    );
    
    console.log('\n\n✅ Test 3: PASADO\n');

    // Resumen
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TODOS LOS TESTS PASARON EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 Resumen:');
    console.log('   ✅ Gemini Pro (texto): Funcionando');
    console.log('   ✅ Imagen 2 (imagen): Funcionando');
    console.log('   ✅ Streaming: Funcionando');
    console.log('   ✅ Cloud Storage: Funcionando\n');

    console.log('🔗 Imagen generada disponible en:');
    console.log(`   ${generatedImage.url}\n`);

  } catch (error) {
    console.error('\n❌ ERROR EN LOS TESTS:', error.message);
    console.error('\n📋 Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}


