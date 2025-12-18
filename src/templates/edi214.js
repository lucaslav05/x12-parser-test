import {
  formatDate,
  formatTime,
  getDateQualifierName,
  trimField,
  parseNumber,
  parseInteger,
  unformatDate,
  unformatTime
} from '../utils.js';
import {
  buildSegment,
  buildISA,
  buildGS,
  buildST,
  buildSE,
  buildGE,
  buildIEA,
  assembleEDI
} from '../ediWriter.js';

export const transactionSetId = '214';
export const name = 'Transportation Carrier Shipment Status';

export function parse(parsedEDI) {
  const { segments } = parsedEDI;
  return {
    envelope: parseEnvelope(parsedEDI),
    header: parseHeader(parsedEDI),
    shipment: parseShipment(parsedEDI),
    stops: parseStops(parsedEDI),
    trailer: parseTrailer(parsedEDI)
  };
}

/* -------------------- Envelope -------------------- */
function parseEnvelope(parsedEDI) {
  const { segments } = parsedEDI;
  const isa = segments.find(s => s.identifier === 'ISA');
  const gs = segments.find(s => s.identifier === 'GS');
  const st = segments.find(s => s.identifier === 'ST');

  return {
    interchangeControlHeader: isa ? {
      authorizationQualifier: trimField(isa.elements[0]),
      authorizationInfo: trimField(isa.elements[1]),
      securityQualifier: trimField(isa.elements[2]),
      securityInfo: trimField(isa.elements[3]),
      senderIdQualifier: trimField(isa.elements[4]),
      senderId: trimField(isa.elements[5]),
      receiverIdQualifier: trimField(isa.elements[6]),
      receiverId: trimField(isa.elements[7]),
      date: trimField(isa.elements[8]),
      time: trimField(isa.elements[9]),
      standardsId: trimField(isa.elements[10]),
      version: trimField(isa.elements[11]),
      controlNumber: trimField(isa.elements[12]),
      acknowledgmentRequested: trimField(isa.elements[13]),
      usageIndicator: trimField(isa.elements[14])
    } : null,
    functionalGroupHeader: gs ? {
      functionalId: trimField(gs.elements[0]),
      applicationSenderCode: trimField(gs.elements[1]),
      applicationReceiverCode: trimField(gs.elements[2]),
      date: trimField(gs.elements[3]),
      time: trimField(gs.elements[4]),
      groupControlNumber: trimField(gs.elements[5]),
      responsibleAgencyCode: trimField(gs.elements[6]),
      version: trimField(gs.elements[7])
    } : null,
    transactionSetHeader: st ? {
      transactionSetId: trimField(st.elements[0]),
      transactionSetControlNumber: trimField(st.elements[1])
    } : null
  };
}

/* -------------------- Header -------------------- */
function parseHeader(parsedEDI) {
  const { segments } = parsedEDI;
  const b10 = segments.find(s => s.identifier === 'B10');
  const l11Refs = segments.filter(s => s.identifier === 'L11');
  const at5s = segments.filter(s => s.identifier === 'AT5');

  return {
    shipmentInfo: b10 ? {
      shipmentId: trimField(b10.elements[1]),
      carrierId: trimField(b10.elements[2]),
      shipmentMethod: trimField(b10.elements[3])
    } : null,
    references: l11Refs.map(l11 => ({
      referenceId: trimField(l11.elements[0]),
      referenceIdQualifier: trimField(l11.elements[1]),
      description: trimField(l11.elements[2]) || undefined
    })),
    statusHandling: at5s.map(at5 => ({
      specialHandlingCode: trimField(at5.elements[0]),
      specialServicesCode: trimField(at5.elements[1])
    }))
  };
}

/* -------------------- Shipment -------------------- */
function parseShipment(parsedEDI) {
  const { segments } = parsedEDI;
  const n1s = segments.filter(s => s.identifier === 'N1');

  return n1s.map(n1 => {
    const n3 = segments.find((s, i) => s.identifier === 'N3' && i > segments.indexOf(n1));
    const n4 = segments.find((s, i) => s.identifier === 'N4' && i > segments.indexOf(n1));

    return {
      entityIdCode: trimField(n1.elements[0]),
      name: trimField(n1.elements[1]),
      address: n3 ? {
        addressLine1: trimField(n3.elements[0]),
        ...(n3.elements[1] && { addressLine2: trimField(n3.elements[1]) })
      } : null,
      location: n4 ? {
        city: trimField(n4.elements[0]),
        state: trimField(n4.elements[1]),
        postalCode: trimField(n4.elements[2]),
        country: trimField(n4.elements[3])
      } : null
    };
  });
}

/* -------------------- Stops -------------------- */
function parseStops(parsedEDI) {
  const { segments } = parsedEDI;
  const lxIndices = segments.map((s, i) => s.identifier === 'LX' ? i : -1).filter(i => i >= 0);
  const stops = [];

  for (let idx = 0; idx < lxIndices.length; idx++) {
    const start = lxIndices[idx];
    const end = (idx < lxIndices.length - 1) ? lxIndices[idx + 1] : segments.length;
    stops.push(parseStop(segments, start, end));
  }

  return stops;
}

function parseStop(segments, startIndex, endIndex) {
  const lx = segments[startIndex];
  const at7s = [];
  const l11Refs = [];
  for (let i = startIndex + 1; i < endIndex; i++) {
    const seg = segments[i];
    if (seg.identifier === 'AT7') at7s.push(seg);
    if (seg.identifier === 'L11') l11Refs.push(seg);
  }

  return {
    stopNumber: parseInteger(lx.elements[0]),
    events: at7s.map(at7 => ({
      statusCode: trimField(at7.elements[0]),
      date: formatDate(at7.elements[1]),
      time: formatTime(at7.elements[2]),
      weight: at7.elements[3] ? parseNumber(at7.elements[3]) : undefined
    })),
    references: l11Refs.map(l11 => ({
      referenceId: trimField(l11.elements[0]),
      referenceIdQualifier: trimField(l11.elements[1]),
      description: trimField(l11.elements[2]) || undefined
    }))
  };
}

/* -------------------- Trailer -------------------- */
function parseTrailer(parsedEDI) {
  const { segments } = parsedEDI;
  const se = segments.find(s => s.identifier === 'SE');
  const ge = segments.find(s => s.identifier === 'GE');
  const iea = segments.find(s => s.identifier === 'IEA');

  return {
    transactionSetTrailer: se ? {
      numberOfIncludedSegments: parseInteger(se.elements[0]),
      transactionSetControlNumber: trimField(se.elements[1])
    } : null,
    functionalGroupTrailer: ge ? {
      numberOfTransactionSets: parseInteger(ge.elements[0]),
      groupControlNumber: trimField(ge.elements[1])
    } : null,
    interchangeControlTrailer: iea ? {
      numberOfIncludedFunctionalGroups: parseInteger(iea.elements[0]),
      interchangeControlNumber: trimField(iea.elements[1])
    } : null
  };
}

export function build(jsonData, meta = {}) {
  const fieldDelimiter = meta.fieldDelimiter || '*';
  const segmentDelimiter = meta.segmentDelimiter || '~';

  const segments = [];
  const bodySegments = [];

  segments.push(buildISA(jsonData.envelope, fieldDelimiter, segmentDelimiter));
  segments.push(buildGS(jsonData.envelope, fieldDelimiter));
  segments.push(buildST(jsonData.envelope, fieldDelimiter));

  if (jsonData.header) {
    const b10Seg = buildB10(jsonData.header, fieldDelimiter);
    if (b10Seg) bodySegments.push(b10Seg);

    if (jsonData.header.references) {
      jsonData.header.references.forEach(ref => {
        const l11Seg = buildL11(ref, fieldDelimiter);
        if (l11Seg) bodySegments.push(l11Seg);
      });
    }

    if (jsonData.header.statusHandling) {
      jsonData.header.statusHandling.forEach(at => {
        const at5Seg = buildAT5(at, fieldDelimiter);
        if (at5Seg) bodySegments.push(at5Seg);
      });
    }
  }

  if (jsonData.shipment) {
    jsonData.shipment.forEach(entity => {
      const n1Seg = buildN1(entity, fieldDelimiter);
      if (n1Seg) bodySegments.push(n1Seg);

      if (entity.address) {
        const n3Seg = buildN3(entity.address, fieldDelimiter);
        if (n3Seg) bodySegments.push(n3Seg);
      }

      if (entity.location) {
        const n4Seg = buildN4(entity.location, fieldDelimiter);
        if (n4Seg) bodySegments.push(n4Seg);
      }
    });
  }

  if (jsonData.stops) {
    jsonData.stops.forEach(stop => {
      const stopSegs = buildStop(stop, fieldDelimiter);
      bodySegments.push(...stopSegs);
    });
  }

  segments.push(...bodySegments);

  const segmentCount = bodySegments.length + 1;
  segments.push(buildSE(segmentCount, jsonData.envelope, fieldDelimiter));
  segments.push(buildGE(1, jsonData.envelope, fieldDelimiter));
  segments.push(buildIEA(1, jsonData.envelope, fieldDelimiter));

  return assembleEDI(segments, segmentDelimiter);
}

function buildB10(header, fieldDelimiter) {
  if (!header.shipmentInfo) return null;
  const info = header.shipmentInfo;
  return buildSegment('B10', [
    '',
    info.shipmentId || '',
    info.carrierId || '',
    info.shipmentMethod || ''
  ], fieldDelimiter);
}

function buildL11(ref, fieldDelimiter) {
  return buildSegment('L11', [
    ref.referenceId || '',
    ref.referenceIdQualifier || '',
    ref.description || ''
  ], fieldDelimiter);
}

function buildAT5(at, fieldDelimiter) {
  return buildSegment('AT5', [
    at.specialHandlingCode || '',
    at.specialServicesCode || ''
  ], fieldDelimiter);
}

function buildN1(entity, fieldDelimiter) {
  return buildSegment('N1', [
    entity.entityIdCode || '',
    entity.name || ''
  ], fieldDelimiter);
}

function buildN3(address, fieldDelimiter) {
  return buildSegment('N3', [
    address.addressLine1 || '',
    address.addressLine2 || ''
  ], fieldDelimiter);
}

function buildN4(location, fieldDelimiter) {
  return buildSegment('N4', [
    location.city || '',
    location.state || '',
    location.postalCode || '',
    location.country || ''
  ], fieldDelimiter);
}

function buildStop(stop, fieldDelimiter) {
  const segments = [];

  const lxSeg = buildSegment('LX', [
    stop.stopNumber || ''
  ], fieldDelimiter);
  segments.push(lxSeg);

  if (stop.events) {
    stop.events.forEach(event => {
      const at7Seg = buildSegment('AT7', [
        event.statusCode || '',
        unformatDate(event.date) || '',
        unformatTime(event.time) || '',
        event.weight || ''
      ], fieldDelimiter);
      segments.push(at7Seg);
    });
  }

  if (stop.references) {
    stop.references.forEach(ref => {
      const l11Seg = buildL11(ref, fieldDelimiter);
      if (l11Seg) segments.push(l11Seg);
    });
  }

  return segments;
}
