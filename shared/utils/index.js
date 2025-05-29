// 共用工具函數
export function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
export function formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString();
}
//# sourceMappingURL=index.js.map