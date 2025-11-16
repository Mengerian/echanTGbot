const { getAllUserStats, decrementUserCompletionCount } = require('../../infrastructure/storage/missionStorage.js');
const { getUserAddress } = require('../../infrastructure/storage/userAddressStore.js');
const { ensureAddressWithFallback } = require('../../infrastructure/blockchain/addressUtils.js');
const { resolveTokenAlias, getTokenInfo } = require('../../infrastructure/blockchain/tokenInfo.js');
const { sendSlp, sendAlp, isMnemonicConfigured } = require('../../infrastructure/blockchain/tokenSender.js');
const { NOTIFICATION_GROUP_ID } = require('../../../config/config.js');

// Constants
const REWARD_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MISSIONS_REQUIRED = 10; // Number of missions required for reward
const REWARD_TOKEN_ALIAS = 'COR'; // Token to send as reward
const REWARD_AMOUNT = 1; // Amount of tokens to send

/**
 * Check all users and send rewards to those who completed 10+ missions
 * @param {object} bot - Telegram bot instance
 */
async function checkAndDistributeRewards(bot) {
    console.log('\n🎁 Starting mission reward check...');
    
    if (!isMnemonicConfigured()) {
        console.error('❌ MNEMONIC not configured - cannot send rewards');
        return;
    }

    try {
        // Get all user stats
        const allStats = await getAllUserStats();
        console.log(`📊 Checking ${allStats.length} users for rewards...`);

        // Filter users with 10+ completed missions
        const eligibleUsers = allStats.filter(stats => stats.totalCompleted >= MISSIONS_REQUIRED);
        console.log(`✅ Found ${eligibleUsers.length} eligible users for rewards`);

        if (eligibleUsers.length === 0) {
            console.log('ℹ️ No users eligible for rewards at this time');
            return;
        }

        // Resolve token info
        const tokenId = resolveTokenAlias(REWARD_TOKEN_ALIAS);
        const tokenInfo = await getTokenInfo(tokenId);
        const { decimals: tokenDecimals, ticker: tokenTicker, name: tokenName, protocol: tokenProtocol } = tokenInfo;

        // Process each eligible user
        for (const userStats of eligibleUsers) {
            try {
                const userId = parseInt(userStats.userId, 10);
                await processUserReward(bot, userId, userStats, tokenId, tokenDecimals, tokenTicker || tokenName, tokenProtocol);
            } catch (error) {
                console.error(`❌ Failed to process reward for user ${userStats.userId}:`, error.message);
            }
        }

        console.log('✅ Mission reward check completed');
    } catch (error) {
        console.error('❌ Error during reward distribution:', error);
    }
}

/**
 * Process reward for a single user
 * @param {object} bot - Telegram bot instance
 * @param {number} userId - User ID
 * @param {object} userStats - User statistics
 * @param {string} tokenId - Token ID to send
 * @param {number} tokenDecimals - Token decimals
 * @param {string} tokenName - Token name/ticker
 * @param {string} tokenProtocol - Token protocol (SLP or ALP)
 */
async function processUserReward(bot, userId, userStats, tokenId, tokenDecimals, tokenName, tokenProtocol) {
    // Get user's registered address
    const addressData = await getUserAddress(userId);
    if (!addressData) {
        console.log(`⚠️ User ${userId} has no registered address, skipping reward`);
        return;
    }

    const recipientAddress = ensureAddressWithFallback(addressData.address);
    const username = addressData.username || 'unknown';

    // Calculate reward amount in base units
    const amountInBaseUnits = REWARD_AMOUNT * Math.pow(10, tokenDecimals);
    const recipients = [{ address: recipientAddress, amount: amountInBaseUnits }];

    // Send tokens
    let result;
    if (tokenProtocol === 'ALP') {
        result = await sendAlp(recipients, tokenId, tokenDecimals);
    } else {
        result = await sendSlp(recipients, tokenId, tokenDecimals);
    }

    // Decrement user's mission count
    await decrementUserCompletionCount(userId, MISSIONS_REQUIRED);

    console.log(`✅ Sent ${REWARD_AMOUNT} ${tokenName} to @${username} (${userId}) for completing ${MISSIONS_REQUIRED} missions: ${result.txid}`);

    // Send notification to log group
    if (NOTIFICATION_GROUP_ID) {
        try {
            await bot.sendMessage(
                NOTIFICATION_GROUP_ID,
                `🎁 Mission Milestone Reward!\n\n` +
                `👤 User: @${username}\n` +
                `🎯 Completed: ${MISSIONS_REQUIRED} missions\n` +
                `💰 Reward: ${REWARD_AMOUNT} ${tokenName}\n` +
                `📊 Remaining missions: ${Math.max(0, userStats.totalCompleted - MISSIONS_REQUIRED)}\n` +
                `🔗 TX: ${result.txid}`
            );
        } catch (notifError) {
            console.log(`ℹ️ Could not send notification to log group: ${notifError.message}`);
        }
    }

    // Try to notify user directly (if they have a private chat with bot)
    try {
        await bot.sendMessage(
            userId,
            `🎉 Congratulations!\n\n` +
            `You've completed ${MISSIONS_REQUIRED} missions and earned:\n` +
            `💰 ${REWARD_AMOUNT} ${tokenName}\n\n` +
            `Keep completing missions to earn more rewards!\n` +
            `🔗 Transaction: ${result.txid}`
        );
    } catch (dmError) {
        // User might not have started a private chat with the bot, that's ok
        console.log(`ℹ️ Could not send DM to user ${userId}: ${dmError.message}`);
    }
}

/**
 * Start the reward scheduler
 * @param {object} bot - Telegram bot instance
 */
function startRewardScheduler(bot) {
    console.log(`🚀 Mission reward scheduler started (checking every 24 hours)`);
    console.log(`📋 Configuration: ${MISSIONS_REQUIRED} missions = ${REWARD_AMOUNT} ${REWARD_TOKEN_ALIAS}`);
    
    // Run immediately on startup
    setTimeout(() => {
        checkAndDistributeRewards(bot);
    }, 10000); // Wait 10 seconds after startup
    
    // Then run every 24 hours
    setInterval(() => {
        checkAndDistributeRewards(bot);
    }, REWARD_CHECK_INTERVAL);
}

module.exports = {
    startRewardScheduler,
    checkAndDistributeRewards
};

