function bytesToMatrix(bytes: number[]): number[][] {
    return Array.from({ length: 4 }, (_, i) => bytes.slice(i * 4, i * 4 + 4));
}

export { bytesToMatrix };