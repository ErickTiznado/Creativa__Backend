/**
 * ------------------------------------------------------------------
 * Archivo: PdfService.js
 * Ubicación: src/services/PdfService.js
 * Responsabilidad: Extraer texto de un PDF (buffer) de forma segura.
 *
 * Notas:
 * - Valida magic number "%PDF-" antes de parsear.
 * - Devuelve `info` con metadatos del PDF (si existen).
 * ------------------------------------------------------------------
 */

import pdf from 'pdf-parse';





/**
 * Lee los primeros bytes para validar que el archivo parece ser un PDF.
 */
function magicNumber(buffer){

    return buffer.toString('utf8', 0, 5)

}



/**
 * Extrae texto y metadatos desde un buffer PDF.
 * @param {Buffer} buffer
 * @returns {Promise<{fullText: string, totalPages: number, info: any}>}
 */
export async function extractTextFromPdf(buffer) {

    try {

        if(magicNumber(buffer) !== '%PDF-'){

            throw new Error('Invalid PDF file');

        }



        const data = await pdf(buffer);

        const normalizedText = data.text

            .replace(/\r\n/g, '\n')

            .replace(/\0/g, '')

            .trim();



        return {

            fullText: normalizedText,

            totalPages: data.numpages,

            info: data.info

        };

    } catch(e){

        throw new Error('Failed to extract text from PDF: ' + e.message);

    }

}

