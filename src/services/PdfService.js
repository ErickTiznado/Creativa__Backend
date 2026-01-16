import pdf from 'pdf-parse';





function magicNumber(buffer){

    return buffer.toString('utf8', 0, 5)

}



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

