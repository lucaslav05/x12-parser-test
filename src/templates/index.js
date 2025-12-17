import * as edi204 from './edi204.js';

const templates = {
  '204': edi204
};

export function getTemplate(transactionSetId) {
  return templates[transactionSetId] || null;
}

export function getAvailableTemplates() {
  return Object.entries(templates).map(([id, template]) => ({
    id,
    name: template.name
  }));
}

export function hasTemplate(transactionSetId) {
  return !!templates[transactionSetId];
}
