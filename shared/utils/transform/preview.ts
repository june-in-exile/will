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

export default { longString, timestamp };
