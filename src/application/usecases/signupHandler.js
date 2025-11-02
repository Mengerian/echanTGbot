const { ensureAddressWithFallback, InvalidAddressError } = require('../../infrastructure/blockchain/addressUtils.js');
const { saveUserAddress, getUserAddress } = require('../../infrastructure/storage/userAddressStore.js');
const { escapeMarkdown } = require('../../domain/formatting/markdown.js');

async function handleSignup(msg, bot) {
    const parts = msg.text.trim().split(/\s+/);
    
    if (parts.length < 2) {
        await bot.sendMessage(
            msg.chat.id, 
            '❌ Usage: /signup <ecash_address>\n\nExample:\n/signup ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'
        );
        return;
    }

    const rawAddress = parts[1].trim();
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'unknown';

    try {
        const validAddress = ensureAddressWithFallback(rawAddress);
        
        const existingData = await getUserAddress(userId);
        
        const success = await saveUserAddress(userId, validAddress, username);
        
        if (success) {
            if (existingData) {
                await bot.sendMessage(
                    msg.chat.id, 
                    `✅ Your eCash address has been updated!\n\n📍 Address: \`${validAddress}\``,
                    { parse_mode: 'Markdown' }
                );
                console.log(`Address updated for @${username} (${userId}): ${validAddress}`);
            } else {
                await bot.sendMessage(
                    msg.chat.id, 
                    `✅ Your eCash address has been registered successfully!\n\n📍 Address: \`${validAddress}\``,
                    { parse_mode: 'Markdown' }
                );
                console.log(`New address registered for @${username} (${userId}): ${validAddress}`);
            }
        } else {
            await bot.sendMessage(msg.chat.id, '❌ Failed to save your address. Please try again later.');
        }
    } catch (error) {
        if (error instanceof InvalidAddressError || error.name === 'InvalidAddressError') {
            await bot.sendMessage(
                msg.chat.id, 
                '❌ Invalid eCash address. Please check your address and try again.\n\nAccepted formats:\n- ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035\n- qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035'
            );
            console.log(`Invalid address attempt by @${username} (${userId}): ${rawAddress}`);
        } else {
            console.error('Error in handleSignup:', error);
            await bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again later.');
        }
    }
}

async function handleGetAddress(msg, bot) {
    const parts = msg.text.trim().split(/\s+/);
    
    if (parts.length < 2) {
        await bot.sendMessage(
            msg.chat.id, 
            '❌ Usage: /getaddress @username\n\nExample:\n/getaddress @alice'
        );
        return;
    }

    const targetUsername = parts[1].replace('@', '').trim();
    
    try {
        const { getAllUsers } = require('../../infrastructure/storage/userAddressStore.js');
        const allUsers = await getAllUsers();
        
        const userData = allUsers.find(user => 
            user.username && user.username.toLowerCase() === targetUsername.toLowerCase()
        );
        
        if (!userData) {
            await bot.sendMessage(
                msg.chat.id, 
                `❌ No registered address found for @${escapeMarkdown(targetUsername)}.\n\nThe user may not have registered yet, or the username doesn't match our records.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        await bot.sendMessage(
            msg.chat.id,
            `📋 Address for @${escapeMarkdown(userData.username)}:\n\n` +
            `📍 Address: \`${userData.address}\`\n` +
            `👤 User ID: \`${userData.userId}\`\n` +
            `📅 Registered: ${new Date(userData.createdAt).toLocaleString()}\n` +
            `🔄 Last updated: ${new Date(userData.updatedAt).toLocaleString()}`,
            { parse_mode: 'Markdown' }
        );
        
        console.log(`Address queried: @${userData.username} by @${msg.from.username}`);
    } catch (error) {
        console.error('Error in handleGetAddress:', error);
        await bot.sendMessage(msg.chat.id, '❌ Failed to retrieve address. Please try again later.');
    }
}

async function handleListAddresses(msg, bot, page = 0) {
    const ITEMS_PER_PAGE = 20;
    
    try {
        const { getAllUsers } = require('../../infrastructure/storage/userAddressStore.js');
        const allUsers = await getAllUsers();
        
        if (allUsers.length === 0) {
            await bot.sendMessage(msg.chat.id, '📋 No users have registered their addresses yet.');
            return;
        }

        allUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const totalPages = Math.ceil(allUsers.length / ITEMS_PER_PAGE);
        const currentPage = Math.max(0, Math.min(page, totalPages - 1));
        const startIndex = currentPage * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allUsers.length);
        const pageUsers = allUsers.slice(startIndex, endIndex);
        
        const displayPage = currentPage + 1;
        let message = `📋 Registered Addresses (${allUsers.length} total)\n`;
        message += `📄 Page ${displayPage} of ${totalPages}\n\n`;
        
        pageUsers.forEach((user, index) => {
            const globalIndex = startIndex + index + 1;
            const displayUsername = escapeMarkdown(user.username || 'unknown');
            message += `${globalIndex}. @${displayUsername} (ID: ${user.userId})\n`;
            message += `\`${user.address}\`\n`;
            message += `📅 ${new Date(user.createdAt).toLocaleDateString()}\n\n`;
        });
        
        if (totalPages > 1) {
            message += `\n💡 Use /listaddresses <page> to view other pages\n`;
            if (currentPage > 0) {
                message += `   ← Previous: /listaddresses ${currentPage}\n`;
            }
            if (currentPage < totalPages - 1) {
                message += `   → Next: /listaddresses ${currentPage + 2}\n`;
            }
        }
        
        await bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
        
        console.log(`Address list (page ${displayPage}/${totalPages}) viewed by @${msg.from.username}`);
    } catch (error) {
        console.error('Error in handleListAddresses:', error);
        await bot.sendMessage(msg.chat.id, '❌ Failed to retrieve address list. Please try again later.');
    }
}

module.exports = {
    handleSignup,
    handleGetAddress,
    handleListAddresses
};

