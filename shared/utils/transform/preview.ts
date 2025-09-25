function longString(
  str: string,
  startLength: number = 30,
  endLength: number = 10,
): string {
  if (str.length <= startLength + endLength) {
    return str;
  }

  return `${str.slice(0, startLength)}......${str.slice(-endLength)} (${str.length} characters)`;
}

function timestamp(timestamp: number) {
  return `${timestamp} (${new Date(timestamp).toISOString()})`;
}

function numbers(
  arr: number[],
  startLength: number = 10,
  endLength: number = 5,
): string {
  if (arr.length <= startLength + endLength) {
    return `[${arr.join(', ')}]`;
  }

  return `[${arr.slice(0, startLength).join(', ')}, ..., ${arr.slice(-endLength).join(', ')}] (${arr.length} elements)`;
}

export default { longString, timestamp, numbers };
