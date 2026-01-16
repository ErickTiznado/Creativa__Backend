const CHUNK_SIZE = 1500;

export function chunkText(text){
let sentences = [];
let finalChunks = [];
let actualChunk = '';

const normalizedText = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

sentences = normalizedText.split(". ")
for(const s of sentences){
    const newS = s + ". "
    if(actualChunk.length + newS.length > CHUNK_SIZE){
        finalChunks.push(actualChunk).trim()
        actualChunk = newS
    }
    else{
        actualChunk += newS
    }
}
if(actualChunk.length > 0){
    finalChunks.push(actualChunk).trim()
}

return finalChunks;
}