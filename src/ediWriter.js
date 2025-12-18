import { padRight } from './utils.js';

export function buildSegment(identifier, elements, fieldDelimiter = '*') {
  const filteredElements = elements.map(el => el === null || el === undefined ? '' : String(el));
  return identifier + fieldDelimiter + filteredElements.join(fieldDelimiter);
}

export function buildISA(envelope, fieldDelimiter = '*', segmentDelimiter = '~') {
  const isa = envelope.interchangeControlHeader;
  if (!isa) return null;

  const elements = [
    padRight(isa.authorizationQualifier || '00', 2),
    padRight(isa.authorizationInfo || '', 10),
    padRight(isa.securityQualifier || '00', 2),
    padRight(isa.securityInfo || '', 10),
    padRight(isa.senderIdQualifier || 'ZZ', 2),
    padRight(isa.senderId || '', 15),
    padRight(isa.receiverIdQualifier || 'ZZ', 2),
    padRight(isa.receiverId || '', 15),
    isa.date || '',
    isa.time || '',
    padRight(isa.standardsId || 'U', 1),
    padRight(isa.version || '00401', 5),
    padRight(isa.controlNumber || '000000001', 9),
    isa.acknowledgmentRequested || '0',
    isa.usageIndicator || 'P',
    segmentDelimiter
  ];

  return 'ISA' + fieldDelimiter + elements.join(fieldDelimiter);
}

export function buildGS(envelope, fieldDelimiter = '*') {
  const gs = envelope.functionalGroupHeader;
  if (!gs) return null;

  return buildSegment('GS', [
    gs.functionalId || 'SM',
    gs.applicationSenderCode || '',
    gs.applicationReceiverCode || '',
    gs.date || '',
    gs.time || '',
    gs.groupControlNumber || '1',
    gs.responsibleAgencyCode || 'X',
    gs.version || '004010'
  ], fieldDelimiter);
}

export function buildST(envelope, fieldDelimiter = '*') {
  const st = envelope.transactionSetHeader;
  if (!st) return null;

  return buildSegment('ST', [
    st.transactionSetId || '204',
    st.transactionSetControlNumber || '0001'
  ], fieldDelimiter);
}

export function buildSE(segmentCount, envelope, fieldDelimiter = '*') {
  const st = envelope.transactionSetHeader;
  return buildSegment('SE', [
    segmentCount,
    st?.transactionSetControlNumber || '0001'
  ], fieldDelimiter);
}

export function buildGE(transactionCount, envelope, fieldDelimiter = '*') {
  const gs = envelope.functionalGroupHeader;
  return buildSegment('GE', [
    transactionCount,
    gs?.groupControlNumber || '1'
  ], fieldDelimiter);
}

export function buildIEA(groupCount, envelope, fieldDelimiter = '*') {
  const isa = envelope.interchangeControlHeader;
  return buildSegment('IEA', [
    groupCount,
    (isa?.controlNumber || '000000001').trim()
  ], fieldDelimiter);
}

export function assembleEDI(segments, segmentDelimiter = '~') {
  return segments.filter(s => s).join(segmentDelimiter) + segmentDelimiter;
}
