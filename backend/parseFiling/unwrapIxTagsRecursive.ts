export const unwrapIxTagsRecursive = (element: Element) => {
  const ixRegex = /^ix:/i;

  // Process all child nodes first
  const childNodes = Array.from(element.childNodes);
  for (const child of childNodes) {
    if (child.nodeType === 1) {
      unwrapIxTagsRecursive(child as Element);
    }
  }

  // Then unwrap the current element if it's an ix tag
  if (ixRegex.test(element.tagName)) {
    const parent = element.parentNode;
    if (parent) {
      // Transfer specific attributes from ix tag to parent
      const importantAttributes = ['contextref', 'name', 'continuedat'];
      const p = parent as any;
      for (const attr of Array.from(element.attributes)) {
        if (typeof p.setAttribute !== 'function') {
          continue;
        }
        if (attr.name === 'id') {
          p.setAttribute('id', attr.value);
        } else if (importantAttributes.includes(attr.name.toLowerCase())) {
          p.setAttribute(`data-ix-${attr.name}`, attr.value);
        }
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
    }
  }
};
