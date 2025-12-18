export function formatDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return dateStr;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

export function formatTime(timeStr) {
  if (!timeStr) return timeStr;
  const padded = timeStr.padStart(4, '0');
  const hours = padded.substring(0, 2);
  const minutes = padded.substring(2, 4);
  return `${hours}:${minutes}`;
}

export const DATE_QUALIFIERS = {
  '37': 'Requested Ship Date',
  '38': 'Requested Delivery Date',
  '53': 'Delivered Date',
  '54': 'Last Delivery Date',
  '64': 'Tender Date',
  '69': 'Promised Delivery Date',
  '70': 'Scheduled Ship Date',
  '76': 'Actual Ship Date',
  '77': 'Actual Delivery Date'
};

export const STOP_REASON_CODES = {
  'CL': 'Pickup',
  'CU': 'Delivery',
  'PL': 'Partial Load',
  'PU': 'Partial Unload'
};

export const ENTITY_ID_CODES = {
  'BT': 'Bill To',
  'BY': 'Buyer',
  'CA': 'Carrier',
  'CN': 'Consignee',
  'CR': 'Customer',
  'DE': 'Depositor',
  'PA': 'Party to Receive Documents',
  'PF': 'Party to Receive Freight Bill',
  'SE': 'Seller',
  'SF': 'Ship From',
  'SH': 'Shipper',
  'ST': 'Ship To',
  'WH': 'Warehouse'
};

export function getDateQualifierName(code) {
  return DATE_QUALIFIERS[code] || code;
}

export function getStopType(reasonCode) {
  return STOP_REASON_CODES[reasonCode] || reasonCode;
}

export function getEntityIdName(code) {
  return ENTITY_ID_CODES[code] || code;
}

export function trimField(value) {
  return value ? value.trim() : '';
}

export function parseNumber(value) {
  if (!value || value.trim() === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

export function parseInteger(value) {
  if (!value || value.trim() === '') return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

export const DATE_QUALIFIERS_REVERSE = Object.fromEntries(
  Object.entries(DATE_QUALIFIERS).map(([k, v]) => [v, k])
);

export const STOP_REASON_CODES_REVERSE = Object.fromEntries(
  Object.entries(STOP_REASON_CODES).map(([k, v]) => [v, k])
);

export const ENTITY_ID_CODES_REVERSE = Object.fromEntries(
  Object.entries(ENTITY_ID_CODES).map(([k, v]) => [v, k])
);

export function getDateQualifierCode(name) {
  return DATE_QUALIFIERS_REVERSE[name] || name;
}

export function getStopReasonCode(type) {
  return STOP_REASON_CODES_REVERSE[type] || type;
}

export function getEntityIdCode(name) {
  return ENTITY_ID_CODES_REVERSE[name] || name;
}

export function unformatDate(dateStr) {
  if (!dateStr) return '';
  const cleaned = dateStr.replace(/[-/]/g, '');
  return cleaned;
}

export function unformatTime(timeStr) {
  if (!timeStr) return '';
  const cleaned = timeStr.replace(/:/g, '');
  return cleaned.padStart(4, '0');
}

export function padLeft(str, length, char = ' ') {
  str = String(str || '');
  while (str.length < length) {
    str = char + str;
  }
  return str;
}

export function padRight(str, length, char = ' ') {
  str = String(str || '');
  while (str.length < length) {
    str = str + char;
  }
  return str;
}
