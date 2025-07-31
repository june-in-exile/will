function truncate(str: string, startLength: number = 20, endLength: number = 5): string {
    if (str.length <= startLength + endLength) {
        return str;
    }

    return `${str.slice(0, startLength)}...${str.slice(-endLength)}`;
}

export { truncate };