export function parseEDI204(ediContent) {
  const elementSeparator = ediContent.charAt(3);
  const segmentTerminator = ediContent.includes('~') ? '~' : '\n';

  const segments = ediContent
    .split(segmentTerminator)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => {
      const elements = s.split(elementSeparator);
      return {
        id: elements[0],
        elements: elements.slice(1)
      };
    });

  const result = {
    envelope: parseEnvelope(segments),
    header: parseHeader(segments),
    billTo: parseBillTo(segments),
    stops: parseStops(segments),
    totals: parseTotals(segments),
    trailer: parseTrailer(segments)
  };

  return result;
}

function parseEnvelope(segments) {
  const isa = segments.find(s => s.id === 'ISA');
  const gs = segments.find(s => s.id === 'GS');
  const st = segments.find(s => s.id === 'ST');

  return {
    interchangeControlHeader: isa ? {
      authorizationQualifier: isa.elements[0],
      authorizationInfo: isa.elements[1]?.trim(),
      securityQualifier: isa.elements[2],
      securityInfo: isa.elements[3]?.trim(),
      senderIdQualifier: isa.elements[4],
      senderId: isa.elements[5]?.trim(),
      receiverIdQualifier: isa.elements[6],
      receiverId: isa.elements[7]?.trim(),
      date: isa.elements[8],
      time: isa.elements[9],
      standardsId: isa.elements[10],
      version: isa.elements[11],
      controlNumber: isa.elements[12],
      acknowledgmentRequested: isa.elements[13],
      usageIndicator: isa.elements[14]
    } : null,
    functionalGroupHeader: gs ? {
      functionalId: gs.elements[0],
      applicationSenderCode: gs.elements[1],
      applicationReceiverCode: gs.elements[2],
      date: gs.elements[3],
      time: gs.elements[4],
      groupControlNumber: gs.elements[5],
      responsibleAgencyCode: gs.elements[6],
      version: gs.elements[7]
    } : null,
    transactionSetHeader: st ? {
      transactionSetId: st.elements[0],
      transactionSetControlNumber: st.elements[1]
    } : null
  };
}

function parseHeader(segments) {
  const b2 = segments.find(s => s.id === 'B2');
  const b2a = segments.find(s => s.id === 'B2A');
  const at5Segments = segments.filter(s => s.id === 'AT5');

  const headerL11s = [];
  let foundB2 = false;
  let foundS5 = false;
  for (const seg of segments) {
    if (seg.id === 'B2') foundB2 = true;
    if (seg.id === 'S5') foundS5 = true;
    if (foundB2 && !foundS5 && seg.id === 'L11') {
      headerL11s.push(seg);
    }
  }

  return {
    shipmentInfo: b2 ? {
      standardCarrierAlphaCode: b2.elements[1],
      shipmentId: b2.elements[3],
      shipmentMethodOfPayment: b2.elements[5]
    } : null,
    purposeCode: b2a ? {
      transactionSetPurposeCode: b2a.elements[0],
      applicationTypeCode: b2a.elements[1]
    } : null,
    references: headerL11s.map(l11 => ({
      referenceId: l11.elements[0],
      referenceIdQualifier: l11.elements[1],
      description: l11.elements[2]
    })),
    billOfLadingHandling: at5Segments.map(at5 => ({
      specialHandlingCode: at5.elements[0],
      specialServicesCode: at5.elements[1]
    })).filter(h => h.specialHandlingCode || h.specialServicesCode)
  };
}

function parseBillTo(segments) {
  let billToStart = -1;
  let billToEnd = -1;

  for (let i = 0; i < segments.length; i++) {
    if (segments[i].id === 'N1' && segments[i].elements[0] === 'BT') {
      billToStart = i;
    }
    if (billToStart >= 0 && segments[i].id === 'S5') {
      billToEnd = i;
      break;
    }
  }

  if (billToStart < 0) return null;

  const n1 = segments[billToStart];
  const n3 = segments.slice(billToStart, billToEnd).find(s => s.id === 'N3');
  const n4 = segments.slice(billToStart, billToEnd).find(s => s.id === 'N4');

  return {
    entityIdCode: n1.elements[0],
    name: n1.elements[1],
    idCodeQualifier: n1.elements[2],
    idCode: n1.elements[3],
    address: n3 ? {
      addressLine1: n3.elements[0],
      addressLine2: n3.elements[1]
    } : null,
    location: n4 ? {
      city: n4.elements[0],
      state: n4.elements[1],
      postalCode: n4.elements[2],
      country: n4.elements[3]
    } : null
  };
}

function parseStops(segments) {
  const stops = [];
  const stopIndices = [];

  segments.forEach((seg, idx) => {
    if (seg.id === 'S5') stopIndices.push(idx);
  });

  const l3Index = segments.findIndex(s => s.id === 'L3');
  const endIndex = l3Index >= 0 ? l3Index : segments.length;

  for (let i = 0; i < stopIndices.length; i++) {
    const startIdx = stopIndices[i];
    const endIdx = stopIndices[i + 1] || endIndex;
    const stopSegments = segments.slice(startIdx, endIdx);
    stops.push(parseStop(stopSegments));
  }

  return stops;
}

function parseStop(stopSegments) {
  const s5 = stopSegments.find(s => s.id === 'S5');
  const g62s = stopSegments.filter(s => s.id === 'G62');
  const at8 = stopSegments.find(s => s.id === 'AT8');

  let n1Idx = stopSegments.findIndex(s => s.id === 'N1');
  let locationN1 = null, locationN3 = null, locationN4 = null;

  if (n1Idx >= 0) {
    locationN1 = stopSegments[n1Idx];
    for (let j = n1Idx + 1; j < stopSegments.length; j++) {
      if (stopSegments[j].id === 'N3' && !locationN3) locationN3 = stopSegments[j];
      if (stopSegments[j].id === 'N4' && !locationN4) locationN4 = stopSegments[j];
      if (stopSegments[j].id === 'L5' || stopSegments[j].id === 'N1') break;
    }
  }

  const stopL11s = [];
  for (let j = 0; j < stopSegments.length; j++) {
    if (stopSegments[j].id === 'L11') {
      if (j < n1Idx || n1Idx < 0) {
        stopL11s.push(stopSegments[j]);
      }
    }
  }

  const stopType = s5 ? s5.elements[1] : null;
  const stopTypeName = stopType === 'CL' ? 'Pickup' : stopType === 'CU' ? 'Delivery' : stopType;

  return {
    stopSequence: s5 ? parseInt(s5.elements[0]) : null,
    stopReasonCode: stopType,
    stopType: stopTypeName,
    references: stopL11s.map(l11 => ({
      referenceId: l11.elements[0],
      referenceIdQualifier: l11.elements[1],
      description: l11.elements[2]
    })),
    dates: g62s.map(g62 => ({
      dateQualifier: g62.elements[0],
      dateQualifierName: getDateQualifierName(g62.elements[0]),
      date: formatDate(g62.elements[1]),
      timeQualifier: g62.elements[2],
      time: formatTime(g62.elements[3])
    })),
    weight: at8 ? {
      weightQualifier: at8.elements[0],
      weightUnitCode: at8.elements[1],
      weight: parseFloat(at8.elements[2]) || null,
      ladingQuantity: parseInt(at8.elements[4]) || null
    } : null,
    location: {
      entityIdCode: locationN1?.elements[0],
      name: locationN1?.elements[1],
      idCodeQualifier: locationN1?.elements[2],
      idCode: locationN1?.elements[3],
      address: locationN3 ? {
        addressLine1: locationN3.elements[0],
        addressLine2: locationN3.elements[1]
      } : null,
      cityStateZip: locationN4 ? {
        city: locationN4.elements[0],
        state: locationN4.elements[1],
        postalCode: locationN4.elements[2],
        country: locationN4.elements[3]
      } : null
    },
    lineItems: parseLineItems(stopSegments)
  };
}

function parseLineItems(stopSegments) {
  const lineItems = [];
  const l5Indices = [];

  stopSegments.forEach((seg, idx) => {
    if (seg.id === 'L5') l5Indices.push(idx);
  });

  for (let i = 0; i < l5Indices.length; i++) {
    const startIdx = l5Indices[i];
    const endIdx = l5Indices[i + 1] || stopSegments.length;
    const itemSegments = stopSegments.slice(startIdx, endIdx);
    lineItems.push(parseLineItem(itemSegments));
  }

  return lineItems;
}

function parseLineItem(itemSegments) {
  const l5 = itemSegments.find(s => s.id === 'L5');
  const at8 = itemSegments.find(s => s.id === 'AT8');
  const g61 = itemSegments.find(s => s.id === 'G61');
  const l11s = itemSegments.filter(s => s.id === 'L11');
  const lh1 = itemSegments.find(s => s.id === 'LH1');
  const lh2 = itemSegments.find(s => s.id === 'LH2');
  const lh3 = itemSegments.find(s => s.id === 'LH3');
  const lfh = itemSegments.find(s => s.id === 'LFH');

  const item = {
    description: l5?.elements[1],
    commodityCode: l5?.elements[2],
    commodityCodeQualifier: l5?.elements[3],
    packagingCode: l5?.elements[4],
    ladingDescription: l5?.elements[5],
    weightQualifier: l5?.elements[6],
    hazardousMaterialCode: l5?.elements[7],
    nmfcCode: l5?.elements[8],
    weight: at8 ? {
      weightQualifier: at8.elements[0],
      weightUnitCode: at8.elements[1],
      weight: parseFloat(at8.elements[2]) || null,
      ladingQuantity: parseInt(at8.elements[4]) || null
    } : null,
    contact: g61 ? {
      contactFunctionCode: g61.elements[0],
      name: g61.elements[1],
      communicationNumberQualifier: g61.elements[2],
      communicationNumber: g61.elements[3]
    } : null,
    references: l11s.map(l11 => ({
      referenceId: l11.elements[0],
      referenceIdQualifier: l11.elements[1],
      description: l11.elements[2]
    }))
  };

  if (lh1 || lh2 || lh3 || lfh) {
    item.hazardousMaterial = {
      unitOrBasisForMeasurementCode: lh1?.elements[0],
      ladingQuantity: lh1 ? parseInt(lh1.elements[1]) : null,
      unOrNaIdNumber: lh1?.elements[2],
      packingGroupCode: lh1?.elements[9],
      hazardousClass: lh2?.elements[0],
      properShippingName: lh3?.elements[0],
      hazardousClassQualifier: lh3?.elements[1],
      nosIndicator: lh3?.elements[2],
      hazardousMaterialDescription: lfh ? {
        hazardousCode: lfh.elements[0],
        hazardousDescription: lfh.elements[1]
      } : null
    };
  }

  return item;
}

function parseTotals(segments) {
  const l3 = segments.find(s => s.id === 'L3');
  if (!l3) return null;

  return {
    weight: parseFloat(l3.elements[0]) || null,
    weightQualifier: l3.elements[1],
    freightRate: parseFloat(l3.elements[2]) || null,
    rateValueQualifier: l3.elements[3],
    charge: parseFloat(l3.elements[4]) || null,
    ladingQuantity: parseInt(l3.elements[10]) || null
  };
}

function parseTrailer(segments) {
  const se = segments.find(s => s.id === 'SE');
  const ge = segments.find(s => s.id === 'GE');
  const iea = segments.find(s => s.id === 'IEA');

  return {
    transactionSetTrailer: se ? {
      numberOfIncludedSegments: parseInt(se.elements[0]),
      transactionSetControlNumber: se.elements[1]
    } : null,
    functionalGroupTrailer: ge ? {
      numberOfTransactionSets: parseInt(ge.elements[0]),
      groupControlNumber: ge.elements[1]
    } : null,
    interchangeControlTrailer: iea ? {
      numberOfIncludedFunctionalGroups: parseInt(iea.elements[0]),
      interchangeControlNumber: iea.elements[1]
    } : null
  };
}

function getDateQualifierName(code) {
  const qualifiers = {
    '37': 'Requested Ship Date',
    '38': 'Requested Delivery Date',
    '53': 'Delivered Date',
    '54': 'Last Delivery Date'
  };
  return qualifiers[code] || code;
}

function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

function formatTime(timeStr) {
  if (!timeStr || timeStr.length < 4) return timeStr;
  return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
}

export default parseEDI204;
