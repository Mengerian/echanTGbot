const {
    isPotentialNameImpersonation,
    decideAfterAvatarCheck,
} = require('../../domain/policies/impersonationPolicy.js');

const {
    getCachedAdmins,
    setCachedAdmins,
    isUserInWhitelist,
    addUserToWhitelist,
    getWhitelistStats,
    getStoredAdmins
} = require('../../infrastructure/storage/impersonationCache.js');

const {
    getChatAdmins,
    getUserAvatarUrl,
    getChatMemberInfo,
    isBotAdmin,
    banUser,
    sendMessage
} = require('../../infrastructure/telegram/impersonationActions.js');

const { compareAvatars } = require('../../infrastructure/ai/avatarComparison.js');
const { deleteMessage } = require('../../infrastructure/telegram/adminActions.js');

async function ensureAdminCache(chatId, bot) {
    const cachedAdmins = getCachedAdmins(chatId);
    if (cachedAdmins) {
        return true;
    }
    
    const adminData = await getChatAdmins(bot, chatId);
    
    if (adminData && adminData.length > 0) {
        setCachedAdmins(chatId, adminData);
        return true;
    }
    
    return false;
}

async function checkImpersonation(user, chatId, bot) {
    if (isUserInWhitelist(chatId, user.id)) {
        console.log(`User in whitelist, skip: ${user.username ? '@' + user.username : 'ID:' + user.id}`);
        return { isImpersonation: false, inWhitelist: true };
    }
    
    const hasCacheSuccess = await ensureAdminCache(chatId, bot);
    if (!hasCacheSuccess) {
        return { isImpersonation: false };
    }
    
    const admins = getCachedAdmins(chatId);
    let userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    
    if ((!userFullName || userFullName.replace(/\s+/g, '') === '') && bot) {
        const memberInfo = await getChatMemberInfo(bot, chatId, user.id);
        if (memberInfo && memberInfo.fullName && memberInfo.fullName.replace(/\s+/g, '') !== '') {
            userFullName = memberInfo.fullName;
            user.first_name = memberInfo.firstName;
            user.last_name = memberInfo.lastName;
        }
    }
    
    if (!userFullName || userFullName.replace(/\s+/g, '') === '') {
        return { isImpersonation: false };
    }
    
    for (const admin of admins) {
        if (!admin.fullName || admin.fullName.replace(/\s+/g, '') === '') {
            continue;
        }
        
        const potential = isPotentialNameImpersonation({
            user: { id: user.id, username: user.username || null, fullName: userFullName },
            admin,
        });
        if (!potential) continue;

        console.log(`Name match detected, comparing avatars: ${user.username ? '@' + user.username : 'ID:' + user.id} vs "${admin.fullName}"`);

        const userAvatarUrl = await getUserAvatarUrl(bot, user.id);
        const adminAvatarUrl = await getUserAvatarUrl(bot, admin.userId);

        if (!userAvatarUrl || !adminAvatarUrl) {
            console.log(`Skip avatar check, missing avatar: user=${!!userAvatarUrl}, admin=${!!adminAvatarUrl}`);
            continue;
        }

        const avatarsSimilar = await compareAvatars(userAvatarUrl, adminAvatarUrl, user.id);
        const decision = decideAfterAvatarCheck({ avatarsSimilar });

        if (decision.isImpersonation) {
            console.log(`Impersonation confirmed: ${user.username ? '@' + user.username : 'ID:' + user.id} impersonating "${admin.fullName}"`);
            return {
                isImpersonation: true,
                impersonatedAdmin: admin,
                impersonatorDisplayName: userFullName,
                impersonatorUsername: user.username || null,
                avatarComparison: decision.avatarComparison,
            };
        }

        console.log(`Avatar not similar, not impersonation: ${user.username ? '@' + user.username : 'ID:' + user.id}`);
        if (decision.addToWhitelist) {
            addUserToWhitelist(chatId, user.id, 'avatar_check_passed');
        }
        return {
            isImpersonation: false,
            avatarComparison: decision.avatarComparison,
            addedToWhitelist: !!decision.addToWhitelist,
        };
    }
    
    return { isImpersonation: false };
}

async function handleImpersonation(msg, bot, impersonationData) {
    const { impersonatedAdmin, impersonatorDisplayName, impersonatorUsername } = impersonationData;
    
    try {
        const botIsAdmin = await isBotAdmin(bot, msg.chat.id);
        
        if (!botIsAdmin) {
            console.log('Bot is not admin, cannot ban user');
            return;
        }
        
        await banUser(bot, msg.chat.id, msg.from.id);
        
        try {
            await deleteMessage(bot, msg.chat.id, msg.message_id);
            console.log(`Message deleted: ${msg.message_id}`);
        } catch (deleteError) {
            console.log('Failed to delete message:', deleteError);
        }
        
        const userIdentifier = impersonatorUsername ? `@${impersonatorUsername}` : `User (ID: ${msg.from.id})`;
        const adminIdentifier = impersonatedAdmin.username ? `@${impersonatedAdmin.username}` : `Admin (ID: ${impersonatedAdmin.userId})`;
        
        const notificationMessage = `⚠️ ${userIdentifier} has been removed for impersonating administrator "${impersonatedAdmin.fullName}" (${adminIdentifier}). Their message has been deleted.`;
        await sendMessage(bot, msg.chat.id, notificationMessage);
        
        const NOTIFICATION_GROUP_ID = -4815444028;
        const adminReport = `🚨 Display Name Impersonation Alert\n\n` +
            `Group: ${msg.chat.title || 'Unknown'} (ID: ${msg.chat.id})\n` +
            `Impersonator: ${userIdentifier} (ID: ${msg.from.id})\n` +
            `Display Name Used: "${impersonatorDisplayName}"\n` +
            `Impersonated Admin: ${adminIdentifier} (ID: ${impersonatedAdmin.userId})\n` +
            `Admin Display Name: "${impersonatedAdmin.fullName}"\n` +
            `Action: User kicked from group and message deleted\n` +
            `Message ID: ${msg.message_id}`;
        
        try {
            await sendMessage(bot, NOTIFICATION_GROUP_ID, adminReport);
            console.log('Report sent to notification group');
        } catch (error) {
            console.log('Failed to send report:', error);
        }
        
        console.log(`User banned and message deleted: ${userIdentifier} (impersonating "${impersonatedAdmin.fullName}")`);
        
    } catch (error) {
        console.error('Error handling impersonation:', error.message);
        
        try {
            const userIdentifier = impersonatorUsername ? `@${impersonatorUsername}` : `User (ID: ${msg.from.id})`;
            const adminIdentifier = impersonatedAdmin.username ? `@${impersonatedAdmin.username}` : `Admin (ID: ${impersonatedAdmin.userId})`;
            const errorMessage = `⚠️ Detected ${userIdentifier} impersonating "${impersonatedAdmin.fullName}" (${adminIdentifier}), but failed to remove. Please check manually.`;
            await sendMessage(bot, msg.chat.id, errorMessage);
        } catch (sendError) {
            console.error('Failed to send error message:', sendError);
        }
    }
}

module.exports = {
    checkImpersonation,
    handleImpersonation,
    ensureAdminCache,
    getStoredAdmins,
    getWhitelistStats,
    isUserInWhitelist,
    addUserToWhitelist
};
