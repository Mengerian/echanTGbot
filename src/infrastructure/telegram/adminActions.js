// Telegram administrative actions: delete message, kick user, forward message, etc.
// Infrastructure layer module.

// Permanently ban user from the chat (kick + prevent rejoin)
async function banUser(bot, chatId, userId) {
  try {
    await bot.banChatMember(chatId, userId);
    return true;
  } catch (error) {
    if (error.message.includes('method is available for supergroup and channel chats only')) {
      console.log('⚠️ Cannot ban user - regular group limitation');
      return false;
    }
    console.error('Failed to ban user:', error);
    return false;
  }
}

// Alias for backward compatibility
const kickUser = banUser;

// Unban user (allow them to rejoin)
async function unbanUser(bot, chatId, userId) {
  try {
    await bot.unbanChatMember(chatId, userId);
    return true;
  } catch (error) {
    console.error('Failed to unban user:', error);
    return false;
  }
}

async function deleteMessage(bot, chatId, messageId) {
  try {
    await bot.deleteMessage(chatId, messageId);
    return true;
  } catch (error) {
    console.error('Failed to delete message:', error);
    return false;
  }
}

async function forwardMessage(bot, targetChatId, fromChatId, messageId) {
  try {
    await bot.forwardMessage(targetChatId, fromChatId, messageId);
    return true;
  } catch (error) {
    console.error('Failed to forward message:', error);
    return false;
  }
}

async function getIsAdmin(bot, chatId, userId) {
  try {
    const chatMember = await bot.getChatMember(chatId, userId);
    return ['creator', 'administrator'].includes(chatMember.status);
  } catch (error) {
    console.error('Failed to get chat member information:', error);
    return false;
  }
}

module.exports = {
  kickUser,
  unbanUser,
  deleteMessage,
  forwardMessage,
  getIsAdmin,
};



