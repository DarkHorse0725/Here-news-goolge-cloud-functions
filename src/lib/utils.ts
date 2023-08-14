export const containsOneURL = (input: string): boolean => {
    const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    const matches = input.match(urlRegex);
    
    return matches !== null && matches.length === 1;
  }
  