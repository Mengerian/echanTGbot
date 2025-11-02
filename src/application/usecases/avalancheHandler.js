const { fetchAvalancheSummary, fetchAvalancheAPY, fetchXecSimplePrice } = require('../../infrastructure/data/avalancheProvider.js');

async function getAvalancheData() {
    try {
        const [summaryData, apyData, priceData] = await Promise.all([
            fetchAvalancheSummary(),
            fetchAvalancheAPY(),
            fetchXecSimplePrice()
        ]);

        const xecPrice = priceData.ecash?.usd || 0;
        const totalStakedValue = summaryData.totalStake * xecPrice;

        return {
            totalStake: summaryData.totalStake,
            nodeCount: summaryData.nodeCount,
            proofCount: summaryData.proofCount,
            apy: apyData.apy,
            xecPrice: xecPrice,
            totalStakedValue: totalStakedValue,
            timeStamp: summaryData.timeStamp,
            date: summaryData.date
        };
    } catch (error) {
        console.error('Failed to fetch Avalanche data:', error.message);
        throw error;
    }
}

async function handleAvalancheCommand() {
    try {
        const avalancheData = await getAvalancheData();
        return avalancheData;
    } catch (error) {
        console.error('Failed to handle Avalanche command:', error.message);
        throw error;
    }
}

module.exports = {
    getAvalancheData,
    handleAvalancheCommand
}; 