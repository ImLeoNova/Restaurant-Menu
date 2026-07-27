export function sanitizeHtml(input: string): string {
  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'em',
    'ul',
    'ol',
    'li',
    'div',
    'span',
    'img',
    'a',
  ]);

  const allowedAttributes = new Set([
    'src',
    'alt',
    'title',
    'href',
    'class',
    'width',
    'height',
  ]);
  const allowedSchemes = new Set(['http', 'https', 'mailto', 'tel']);

  const tagRegex = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  const attrRegex = /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

  const sanitizeAttributeValue = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
      return '';
    }

    const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z\d+.-]*):/);
    if (schemeMatch && !allowedSchemes.has(schemeMatch[1].toLowerCase())) {
      return '';
    }

    return trimmed;
  };

  const markdownImageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  const imageUrlRegex =
    /(^|\s)(https?:\/\/[^"]+?\.(?:png|jpe?g|gif|webp|svg))(?![^<]*>)(?=\s|$)/gi;

  const convertMarkdownImages = (text: string): string => {
    return text.replace(markdownImageRegex, (match, alt, src, title) => {
      const sanitizedSrc = sanitizeAttributeValue(src);
      if (!sanitizedSrc) {
        return '';
      }

      const sanitizedAlt = alt.replace(/"/g, '&quot;');
      const sanitizedTitle = title ? title.replace(/"/g, '&quot;') : '';
      const titleAttr = sanitizedTitle ? ` title="${sanitizedTitle}"` : '';

      return `<img src="${sanitizedSrc}" alt="${sanitizedAlt}"${titleAttr}>`;
    });
  };

  const convertImageUrls = (text: string): string => {
    return text.replace(imageUrlRegex, (match, prefix, url) => {
      const sanitizedSrc = sanitizeAttributeValue(url);
      if (!sanitizedSrc) {
        return match;
      }
      return `${prefix}<img src="${sanitizedSrc}" alt="AI image">`;
    });
  };

  const convertedInput = convertImageUrls(convertMarkdownImages(input));

  return convertedInput.replace(
    tagRegex,
    (match, tagName: string, attrs: string) => {
      const lowerTag = tagName.toLowerCase();
      if (!allowedTags.has(lowerTag)) {
        return '';
      }

      const sanitizedAttrs: string[] = [];
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        if (!allowedAttributes.has(attrName)) {
          continue;
        }

        if (attrName === 'href' || attrName === 'src') {
          const sanitizedValue = sanitizeAttributeValue(
            attrMatch[3] ?? attrMatch[4] ?? '',
          );
          if (sanitizedValue) {
            sanitizedAttrs.push(`${attrName}="${sanitizedValue}"`);
          }
          continue;
        }

        sanitizedAttrs.push(
          `${attrName}="${(attrMatch[3] ?? attrMatch[4] ?? '').replace(/"/g, '&quot;')}"`,
        );
      }

      const attrString = sanitizedAttrs.length
        ? ` ${sanitizedAttrs.join(' ')}`
        : '';
      return match.startsWith('</')
        ? `</${lowerTag}>`
        : `<${lowerTag}${attrString}>`;
    },
  );
}
