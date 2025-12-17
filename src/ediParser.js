export function parseEDI(ediContent) {
  const normalized = ediContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let segmentDelimiter = '~';
  let fieldDelimiter = '*';

  if (normalized.startsWith('ISA')) {
    fieldDelimiter = normalized.charAt(3);
    const isaSegment = normalized.substring(0, 106);
    segmentDelimiter = isaSegment.charAt(105);
  }

  const segmentStrings = normalized
    .split(segmentDelimiter)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const segments = segmentStrings.map(segStr => {
    const fields = segStr.split(fieldDelimiter);
    const identifier = fields[0];
    const elements = fields.slice(1);
    return { identifier, elements, raw: segStr };
  });

  return {
    segments,
    fieldDelimiter,
    segmentDelimiter,
    getTransactionSetId: () => {
      const stSegment = segments.find(s => s.identifier === 'ST');
      return stSegment ? stSegment.elements[0] : null;
    },
    findSegment: (identifier, startIndex = 0) => {
      for (let i = startIndex; i < segments.length; i++) {
        if (segments[i].identifier === identifier) {
          return { segment: segments[i], index: i };
        }
      }
      return null;
    },
    findAllSegments: (identifier, startIndex = 0, endIndex = segments.length) => {
      const results = [];
      for (let i = startIndex; i < endIndex; i++) {
        if (segments[i].identifier === identifier) {
          results.push({ segment: segments[i], index: i });
        }
      }
      return results;
    },
    findSegmentWithQualifier: (identifier, qualifierPosition, qualifierValue, startIndex = 0, endIndex = segments.length) => {
      for (let i = startIndex; i < endIndex; i++) {
        if (segments[i].identifier === identifier &&
            segments[i].elements[qualifierPosition] === qualifierValue) {
          return { segment: segments[i], index: i };
        }
      }
      return null;
    },
    findAllSegmentsWithQualifier: (identifier, qualifierPosition, qualifierValue, startIndex = 0, endIndex = segments.length) => {
      const results = [];
      for (let i = startIndex; i < endIndex; i++) {
        if (segments[i].identifier === identifier &&
            segments[i].elements[qualifierPosition] === qualifierValue) {
          results.push({ segment: segments[i], index: i });
        }
      }
      return results;
    },
    getSegmentRange: (startIdentifier, endIdentifiers, startIndex = 0) => {
      const start = segments.findIndex((s, i) => i >= startIndex && s.identifier === startIdentifier);
      if (start === -1) return null;

      let end = segments.length;
      for (let i = start + 1; i < segments.length; i++) {
        if (endIdentifiers.includes(segments[i].identifier)) {
          end = i;
          break;
        }
      }
      return { startIndex: start, endIndex: end };
    },
    findAllSegmentRanges: (startIdentifier, endIdentifiers, startIndex = 0, endIndex = segments.length) => {
      const ranges = [];
      let currentIndex = startIndex;

      while (currentIndex < endIndex) {
        const startPos = segments.findIndex((s, i) => i >= currentIndex && i < endIndex && s.identifier === startIdentifier);
        if (startPos === -1) break;

        let endPos = endIndex;
        for (let i = startPos + 1; i < endIndex; i++) {
          if (endIdentifiers.includes(segments[i].identifier) || segments[i].identifier === startIdentifier) {
            endPos = i;
            break;
          }
        }

        ranges.push({ startIndex: startPos, endIndex: endPos });
        currentIndex = endPos;
      }

      return ranges;
    }
  };
}
