const { fetchAddressData } = require('../../infrastructure/blockchain/chronikClient.js');
const { decodeAddressWithFallback, ensureAddressWithFallback, InvalidAddressError } = require('../../infrastructure/blockchain/addressUtils.js');

async function handleExplorerAddress(rawAddress, page = 0, pageSize = 10) {
    const { type, hash } = decodeAddressWithFallback(rawAddress);
    const resolvedAddress = ensureAddressWithFallback(rawAddress);
    const data = await fetchAddressData(type, hash, page, pageSize, resolvedAddress);
    return { ...data, address: resolvedAddress, type, hash };
}

module.exports = {
    handleExplorerAddress,
    InvalidAddressError,
};


