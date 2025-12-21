const sharp = require('sharp');

/**
 * In-memory cache for spam images
 */
const spamImageCache = {
    images: [],
    maxSize: 20, // Maximum number of spam images to cache

    /**
     * Add a spam image to the cache
     * @param {Object} imageData - The spam image data
     */
    add(imageData) {
        this.images.push({
            hash: imageData.hash,
            fileId: imageData.fileId,
            userId: imageData.userId,
            metadata: imageData.metadata,
            addedAt: imageData.addedAt,
            imageSize: imageData.imageSize,
            imageData: imageData.imageData
        });
        // Keep only the most recent images
        if (this.images.length > this.maxSize) {
            this.images.shift();
        }
    },

    /**
     * Get all cached spam images (with automatic cleanup)
     * @returns {Array} Array of spam image data
     */
    getAll() {
        // Clean up images older than 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.images = this.images.filter(img => img.addedAt > oneDayAgo);
        return this.images;
    },

    /**
     * Get the current cache size
     * @returns {number} Number of cached images
     */
    size() {
        return this.images.length;
    },

    /**
     * Clear all cached images
     */
    clear() {
        this.images = [];
    }
};

/**
 * Download image and return buffer
 */
async function downloadImage(bot, fileId) {
    try {
        const axios = require('axios');
        const file = await bot.getFile(fileId);
        const response = await axios.get(`https://api.telegram.org/file/bot${bot.token}/${file.file_path}`, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Failed to download image:', error);
        return null;
    }
}

/**
 * Calculate dHash (difference hash) for image similarity comparison
 */
async function calculateDHash(imageBuffer) {
    try {
        const resizedBuffer = await sharp(imageBuffer)
            .resize(9, 8, { fit: 'fill' })
            .greyscale()
            .raw()
            .toBuffer();

        let hash = '';
        for (let i = 0; i < resizedBuffer.length - 1; i++) {
            const current = resizedBuffer[i];
            const next = resizedBuffer[i + 1];
            hash += (current > next) ? '1' : '0';
        }

        return hash;
    } catch (error) {
        console.error('Failed to calculate dHash:', error);
        return null;
    }
}

/**
 * Calculate Hamming distance
 */
function hammingDistance(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) {
        return Infinity;
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
}

/**
 * Add spam image to cache
 */
async function addSpamImage(bot, fileId, userId, metadata = {}) {
    try {
        const imageBuffer = await downloadImage(bot, fileId);
        if (!imageBuffer) return false;

        const imageHash = await calculateDHash(imageBuffer);
        if (!imageHash) return false;

        const data = {
            hash: imageHash,
            fileId,
            userId,
            metadata,
            addedAt: Date.now(),
            imageSize: imageBuffer.length,
            imageData: imageBuffer.toString('base64')
        };

        spamImageCache.add(data);
        console.log(`Added spam image with hash: ${imageHash.substring(0, 16)}... Cache size: ${spamImageCache.size()}`);
        return true;
    } catch (error) {
        console.error('Failed to add spam image:', error);
        return false;
    }
}

/**
 * Check if image is spam (through similarity comparison)
 */
async function isSpamImage(bot, fileId, threshold = 85) {
    try {
        const imageBuffer = await downloadImage(bot, fileId);
        if (!imageBuffer) return false;

        const newImageHash = await calculateDHash(imageBuffer);
        if (!newImageHash) return false;

        const cachedSpamImages = spamImageCache.getAll();

        for (const imageData of cachedSpamImages) {
            if (imageData.hash) {
                const distance = hammingDistance(newImageHash, imageData.hash);
                const maxDistance = newImageHash.length; // 64 bits
                const similarity = ((maxDistance - distance) / maxDistance) * 100;

                if (similarity >= threshold) {
                    console.log(`Found similar spam image (${similarity.toFixed(2)}% match, hash: ${imageData.hash.substring(0, 16)}...)`);
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error('Failed to check spam image:', error);
        return false;
    }
}

/**
 * Get all spam image hashes (for debugging)
 */
async function getAllSpamImageHashes() {
    try {
        const cachedSpamImages = spamImageCache.getAll();
        return cachedSpamImages.map(img => ({
            hash: img.hash,
            addedAt: img.addedAt,
            userId: img.userId
        }));
    } catch (error) {
        console.error('Failed to get spam image hashes:', error);
        return [];
    }
}

/**
 * Clear all cached spam images
 */
function clearSpamImageCache() {
    spamImageCache.clear();
    console.log('✅ Spam image cache cleared');
}

module.exports = {
    addSpamImage,
    isSpamImage,
    getAllSpamImageHashes,
    clearSpamImageCache,
    spamImageCache
};
