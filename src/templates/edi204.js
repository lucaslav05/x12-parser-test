import {
  formatDate,
  formatTime,
  getDateQualifierName,
  getStopType,
  trimField,
  parseNumber,
  parseInteger
} from '../utils.js';

export const transactionSetId = '204';
export const name = 'Motor Carrier Load Tender';

export function parse(parsedEDI) {
  const { segments } = parsedEDI;
  const result = {
    envelope: parseEnvelope(parsedEDI),
    header: parseHeader(parsedEDI),
    billTo: parseBillTo(parsedEDI),
    stops: parseStops(parsedEDI),
    totals: parseTotals(parsedEDI),
    trailer: parseTrailer(parsedEDI)
  };
  return result;
}

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

function parseHeader(parsedEDI) {
  const { segments } = parsedEDI;
  const b2 = segments.find(s => s.identifier === 'B2');
  const b2a = segments.find(s => s.identifier === 'B2A');

  const firstS5Index = segments.findIndex(s => s.identifier === 'S5');
  const headerEndIndex = firstS5Index > -1 ? firstS5Index : segments.length;

  const headerL11s = [];
  const headerAT5s = [];

  for (let i = 0; i < headerEndIndex; i++) {
    const seg = segments[i];
    if (seg.identifier === 'L11') {
      headerL11s.push(seg);
    } else if (seg.identifier === 'AT5') {
      headerAT5s.push(seg);
    }
  }

  return {
    shipmentInfo: b2 ? {
      standardCarrierAlphaCode: trimField(b2.elements[1]),
      shipmentId: trimField(b2.elements[3]),
      shipmentMethodOfPayment: trimField(b2.elements[5])
    } : null,
    purposeCode: b2a ? {
      transactionSetPurposeCode: trimField(b2a.elements[0]),
      applicationTypeCode: trimField(b2a.elements[1])
    } : null,
    references: headerL11s.map(l11 => ({
      referenceId: trimField(l11.elements[0]),
      referenceIdQualifier: trimField(l11.elements[1]),
      description: trimField(l11.elements[2]) || undefined
    })).filter(r => r.referenceId),
    billOfLadingHandling: headerAT5s.map(at5 => {
      const obj = {};
      if (at5.elements[0]) obj.specialHandlingCode = trimField(at5.elements[0]);
      else obj.specialHandlingCode = '';
      if (at5.elements[1]) obj.specialServicesCode = trimField(at5.elements[1]);
      return obj;
    })
  };
}

function parseBillTo(parsedEDI) {
  const { segments } = parsedEDI;
  const firstS5Index = segments.findIndex(s => s.identifier === 'S5');
  const searchEndIndex = firstS5Index > -1 ? firstS5Index : segments.length;

  let btN1Index = -1;
  for (let i = 0; i < searchEndIndex; i++) {
    if (segments[i].identifier === 'N1' && segments[i].elements[0] === 'BT') {
      btN1Index = i;
      break;
    }
  }

  if (btN1Index === -1) return null;

  const n1 = segments[btN1Index];
  let n3 = null;
  let n4 = null;

  for (let i = btN1Index + 1; i < searchEndIndex; i++) {
    const seg = segments[i];
    if (seg.identifier === 'N3' && !n3) n3 = seg;
    else if (seg.identifier === 'N4' && !n4) n4 = seg;
    else if (seg.identifier === 'N1') break;
  }

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
}

function parseStops(parsedEDI) {
  const { segments } = parsedEDI;
  const stops = [];

  const s5Indices = [];
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].identifier === 'S5') {
      s5Indices.push(i);
    }
  }

  const l3Index = segments.findIndex(s => s.identifier === 'L3');
  const seIndex = segments.findIndex(s => s.identifier === 'SE');
  const stopsEndIndex = l3Index > -1 ? l3Index : (seIndex > -1 ? seIndex : segments.length);

  for (let stopIdx = 0; stopIdx < s5Indices.length; stopIdx++) {
    const startIndex = s5Indices[stopIdx];
    const endIndex = stopIdx < s5Indices.length - 1 ? s5Indices[stopIdx + 1] : stopsEndIndex;

    const stop = parseStop(segments, startIndex, endIndex);
    stops.push(stop);
  }

  return stops;
}

function parseStop(segments, startIndex, endIndex) {
  const s5 = segments[startIndex];

  const stopSequence = parseInteger(s5.elements[0]);
  const stopReasonCode = trimField(s5.elements[1]);

  const references = [];
  const dates = [];
  let weight = null;
  let location = null;
  const lineItems = [];

  let n1LocationIndex = -1;
  for (let i = startIndex + 1; i < endIndex; i++) {
    const seg = segments[i];
    if (seg.identifier === 'N1' && (seg.elements[0] === 'SH' || seg.elements[0] === 'CN' || seg.elements[0] === 'SF' || seg.elements[0] === 'ST')) {
      n1LocationIndex = i;
      break;
    }
  }

  const headerEnd = findFirstL5Index(segments, startIndex, endIndex);

  for (let i = startIndex + 1; i < (headerEnd > -1 ? headerEnd : endIndex); i++) {
    const seg = segments[i];
    if (seg.identifier === 'L11') {
      references.push({
        referenceId: trimField(seg.elements[0]),
        referenceIdQualifier: trimField(seg.elements[1]),
        description: trimField(seg.elements[2]) || undefined
      });
    } else if (seg.identifier === 'G62') {
      dates.push({
        dateQualifier: trimField(seg.elements[0]),
        dateQualifierName: getDateQualifierName(seg.elements[0]),
        date: formatDate(seg.elements[1]),
        timeQualifier: trimField(seg.elements[2]),
        time: formatTime(seg.elements[3])
      });
    } else if (seg.identifier === 'AT8' && !weight) {
      weight = {
        weightQualifier: trimField(seg.elements[0]),
        weightUnitCode: trimField(seg.elements[1]),
        weight: parseNumber(seg.elements[2]),
        ladingQuantity: parseInteger(seg.elements[4])
      };
    } else if (seg.identifier === 'N1' && n1LocationIndex === i) {
      location = parseStopLocation(segments, i, headerEnd > -1 ? headerEnd : endIndex);
    }
  }

  const l5Indices = [];
  for (let i = startIndex; i < endIndex; i++) {
    if (segments[i].identifier === 'L5') {
      l5Indices.push(i);
    }
  }

  for (let lineIdx = 0; lineIdx < l5Indices.length; lineIdx++) {
    const lineStart = l5Indices[lineIdx];
    const lineEnd = lineIdx < l5Indices.length - 1 ? l5Indices[lineIdx + 1] : endIndex;
    const lineItem = parseLineItem(segments, lineStart, lineEnd);
    lineItems.push(lineItem);
  }

  return {
    stopSequence,
    stopReasonCode,
    stopType: getStopType(stopReasonCode),
    references,
    dates,
    weight,
    location,
    lineItems
  };
}

function findFirstL5Index(segments, startIndex, endIndex) {
  for (let i = startIndex; i < endIndex; i++) {
    if (segments[i].identifier === 'L5') {
      return i;
    }
  }
  return -1;
}

function parseStopLocation(segments, n1Index, endIndex) {
  const n1 = segments[n1Index];
  let n3 = null;
  let n4 = null;

  for (let i = n1Index + 1; i < endIndex; i++) {
    const seg = segments[i];
    if (seg.identifier === 'N3' && !n3) n3 = seg;
    else if (seg.identifier === 'N4' && !n4) n4 = seg;
    else if (seg.identifier === 'N1' || seg.identifier === 'L5' || seg.identifier === 'S5') break;
  }

  const location = {
    entityIdCode: trimField(n1.elements[0]),
    name: trimField(n1.elements[1])
  };

  if (n1.elements[2]) location.idCodeQualifier = trimField(n1.elements[2]);
  if (n1.elements[3]) location.idCode = trimField(n1.elements[3]);

  if (n3) {
    location.address = {
      addressLine1: trimField(n3.elements[0])
    };
    if (n3.elements[1]) {
      location.address.addressLine2 = trimField(n3.elements[1]);
    }
  }

  if (n4) {
    location.cityStateZip = {
      city: trimField(n4.elements[0]),
      state: trimField(n4.elements[1]),
      postalCode: trimField(n4.elements[2]),
      country: trimField(n4.elements[3])
    };
  }

  return location;
}

function parseLineItem(segments, startIndex, endIndex) {
  const l5 = segments[startIndex];

  const item = {
    description: trimField(l5.elements[1]),
    commodityCode: trimField(l5.elements[2]),
    commodityCodeQualifier: trimField(l5.elements[3]),
    packagingCode: trimField(l5.elements[4]),
    ladingDescription: trimField(l5.elements[5]),
    weightQualifier: trimField(l5.elements[6]),
    hazardousMaterialCode: trimField(l5.elements[7]),
    nmfcCode: trimField(l5.elements[8])
  };

  let at8 = null;
  let g61 = null;
  const l11Refs = [];
  let lh1 = null;
  let lh2 = null;
  let lh3 = null;
  let lfh = null;

  for (let i = startIndex + 1; i < endIndex; i++) {
    const seg = segments[i];
    if (seg.identifier === 'AT8' && !at8) {
      at8 = seg;
    } else if (seg.identifier === 'G61' && !g61) {
      g61 = seg;
    } else if (seg.identifier === 'L11') {
      l11Refs.push(seg);
    } else if (seg.identifier === 'LH1' && !lh1) {
      lh1 = seg;
    } else if (seg.identifier === 'LH2' && !lh2) {
      lh2 = seg;
    } else if (seg.identifier === 'LH3' && !lh3) {
      lh3 = seg;
    } else if (seg.identifier === 'LFH' && !lfh) {
      lfh = seg;
    }
  }

  if (at8) {
    item.weight = {
      weightQualifier: trimField(at8.elements[0]),
      weightUnitCode: trimField(at8.elements[1]),
      weight: parseNumber(at8.elements[2]),
      ladingQuantity: parseInteger(at8.elements[4])
    };
  }

  if (g61) {
    item.contact = {
      contactFunctionCode: trimField(g61.elements[0]),
      name: trimField(g61.elements[1]),
      communicationNumberQualifier: trimField(g61.elements[2]),
      communicationNumber: trimField(g61.elements[3])
    };
  }

  if (l11Refs.length > 0) {
    item.references = l11Refs.map(l11 => ({
      referenceId: trimField(l11.elements[0]),
      referenceIdQualifier: trimField(l11.elements[1]),
      description: trimField(l11.elements[2]) || undefined
    }));
  }

  if (lh1) {
    item.hazardousMaterial = {
      unitOrBasisForMeasurementCode: trimField(lh1.elements[0]),
      ladingQuantity: parseInteger(lh1.elements[1]),
      unOrNaIdNumber: trimField(lh1.elements[2]),
      packingGroupCode: trimField(lh1.elements[9])
    };

    if (lh2) {
      item.hazardousMaterial.hazardousClass = trimField(lh2.elements[0]);
    }

    if (lh3) {
      item.hazardousMaterial.properShippingName = trimField(lh3.elements[0]);
      item.hazardousMaterial.hazardousClassQualifier = trimField(lh3.elements[1]);
      if (lh3.elements[2]) {
        item.hazardousMaterial.nosIndicator = trimField(lh3.elements[2]);
      }
    }

    if (lfh) {
      item.hazardousMaterial.hazardousMaterialDescription = {
        hazardousCode: trimField(lfh.elements[0]),
        hazardousDescription: trimField(lfh.elements[1])
      };
    } else {
      item.hazardousMaterial.hazardousMaterialDescription = null;
    }
  }

  return item;
}

function parseTotals(parsedEDI) {
  const { segments } = parsedEDI;
  const l3 = segments.find(s => s.identifier === 'L3');

  if (!l3) return null;

  return {
    weight: parseNumber(l3.elements[0]),
    weightQualifier: trimField(l3.elements[1]),
    freightRate: parseNumber(l3.elements[2]),
    rateValueQualifier: trimField(l3.elements[3]),
    charge: parseInteger(l3.elements[4]),
    ladingQuantity: parseInteger(l3.elements[10])
  };
}

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
