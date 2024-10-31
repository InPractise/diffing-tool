export const normalizeText = (text: string) => {
  return text
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

export const getNormalizedText = (element: Element) => {
  if (!element.textContent) return null;
  const text = normalizeText(element.textContent);
  if (!text) return null;
  return text;
};
