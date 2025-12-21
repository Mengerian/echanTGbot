// Telegram media file helper functions.
// Infrastructure layer module.

/**
 * Get image file URLs from Telegram message
 * @param {Object} msg - Telegram message object
 * @param {Object} bot - Telegram bot instance
 * @returns {Promise<string[]>} Array of image URLs
 */
async function getImageUrls(msg, bot) {
    const imageUrls = [];
    
    // Check for photo (Telegram photos come in multiple sizes)
    if (msg.photo && msg.photo.length > 0) {
        // Get the largest photo
        const largestPhoto = msg.photo[msg.photo.length - 1];
        try {
            const fileLink = await bot.getFileLink(largestPhoto.file_id);
            imageUrls.push(fileLink);
            console.log(`Found photo in message: ${fileLink}`);
        } catch (error) {
            console.error('Failed to get photo file link:', error);
        }
    }
    
    // Handle stickers
    if (msg.sticker && msg.sticker.thumbnail) {
        try {
            const fileLink = await bot.getFileLink(msg.sticker.thumbnail.file_id);
            imageUrls.push(fileLink);
            console.log(`Found sticker thumbnail in message: ${fileLink}`);
        } catch (error) {
            console.error('Failed to get sticker file link:', error);
        }
    }

    // Handle image documents (users sending images as files)
    if (msg.document && typeof msg.document.mime_type === 'string' && msg.document.mime_type.startsWith('image/')) {
        try {
            const fileLink = await bot.getFileLink(msg.document.file_id);
            imageUrls.push(fileLink);
            console.log(`Found image document in message: ${fileLink}`);
        } catch (error) {
            console.error('Failed to get document image file link:', error);
        }
    }

    // Handle animations/GIFs (use thumbnail if available, else file)
    if (msg.animation) {
        const target = msg.animation.thumbnail ? msg.animation.thumbnail : msg.animation;
        if (target && target.file_id) {
            try {
                const fileLink = await bot.getFileLink(target.file_id);
                imageUrls.push(fileLink);
                console.log(`Found animation image in message: ${fileLink}`);
            } catch (error) {
                console.error('Failed to get animation file link:', error);
            }
        }
    }
    
    return imageUrls;
}

/**
 * Get photo file URL using manual URL construction (for backward compatibility)
 * @param {Object} bot - Telegram bot instance
 * @param {string} fileId - Telegram file ID
 * @param {string} telegramToken - Telegram bot token
 * @returns {Promise<string>} File URL
 */
async function getPhotoUrl(bot, fileId, telegramToken) {
    const file = await bot.getFile(fileId);
    return `https://api.telegram.org/file/bot${telegramToken}/${file.file_path}`;
}

/**
 * Get photo file URL using convenience method
 * @param {Object} bot - Telegram bot instance
 * @param {string} fileId - Telegram file ID
 * @returns {Promise<string>} File URL
 */
async function getPhotoUrlSimple(bot, fileId) {
    return await bot.getFileLink(fileId);
}

module.exports = {
    getImageUrls,
    getPhotoUrl,
    getPhotoUrlSimple,
};

