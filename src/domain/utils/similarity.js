/**
 * Tokenize text into words/terms
 * @param {string} text - The text to tokenize
 * @returns {string[]} Array of tokens
 */
function tokenize(text) {
    // Split by whitespace and punctuation, filter out empty strings
    return text.toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // Keep alphanumeric and Chinese characters
        .split(/\s+/)
        .filter(word => word.length > 0);
}

/**
 * Create term frequency vector from tokens
 * @param {string[]} tokens - Array of tokens
 * @returns {Object} Term frequency vector
 */
function createTermFrequencyVector(tokens) {
    const vector = {};
    for (const token of tokens) {
        vector[token] = (vector[token] || 0) + 1;
    }
    return vector;
}

/**
 * Calculate cosine similarity between two term frequency vectors
 * @param {Object} vector1 - First term frequency vector
 * @param {Object} vector2 - Second term frequency vector
 * @returns {number} Cosine similarity (0-1)
 */
function cosineSimilarity(vector1, vector2) {
    // Get all unique terms from both vectors
    const allTerms = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (const term of allTerms) {
        const val1 = vector1[term] || 0;
        const val2 = vector2[term] || 0;
        
        dotProduct += val1 * val2;
        magnitude1 += val1 * val1;
        magnitude2 += val2 * val2;
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    // Avoid division by zero
    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calculate similarity percentage between two strings using cosine similarity
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity percentage (0-100)
 */
function calculateTextSimilarity(str1, str2) {
    // Normalize strings: trim
    const normalizedStr1 = str1.trim();
    const normalizedStr2 = str2.trim();

    // Handle edge cases
    if (normalizedStr1 === normalizedStr2) {
        return 100;
    }
    if (!normalizedStr1 || !normalizedStr2) {
        return 0;
    }

    // Tokenize both strings
    const tokens1 = tokenize(normalizedStr1);
    const tokens2 = tokenize(normalizedStr2);
    
    // Handle empty token lists
    if (tokens1.length === 0 || tokens2.length === 0) {
        return 0;
    }
    
    // Create term frequency vectors
    const vector1 = createTermFrequencyVector(tokens1);
    const vector2 = createTermFrequencyVector(tokens2);
    
    // Calculate cosine similarity and convert to percentage
    const similarity = cosineSimilarity(vector1, vector2);
    
    return similarity * 100;
}

module.exports = {
    calculateTextSimilarity,
    tokenize,
    createTermFrequencyVector,
    cosineSimilarity,
};

