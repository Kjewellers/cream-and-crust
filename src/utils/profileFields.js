/**
 * Canonical field definitions shared between Onboarding and Profile.
 * Each entry describes a business field, its Firestore key, display label,
 * whether it is required for completeness, and which document it lives in.
 */
export const BUSINESS_FIELDS = [
  { key: 'name', label: 'Bakery Name', required: true, doc: 'business' },
  { key: 'ownerName', label: 'Owner Name', required: true, doc: 'business' },
  { key: 'phone', label: 'Phone', required: true, doc: 'business' },
  { key: 'email', label: 'Email', required: false, doc: 'business' },
  { key: 'tagline', label: 'Tagline', required: false, doc: 'business' },
  { key: 'businessType', label: 'Business Type', required: false, doc: 'business' },
  { key: 'instagram', label: 'Instagram Handle', required: false, doc: 'business' },
  { key: 'whatsapp', label: 'WhatsApp Number', required: false, doc: 'business' },
  { key: 'website', label: 'Website', required: false, doc: 'business' },
  { key: 'pickupAddress', label: 'Pickup Address', required: true, doc: 'business' },
  { key: 'city', label: 'City', required: true, doc: 'business' },
  { key: 'deliveryAreas', label: 'Delivery Areas', required: false, doc: 'business' },
  { key: 'upiId', label: 'UPI ID', required: false, doc: 'business' },
  { key: 'gstNumber', label: 'GST Number', required: false, doc: 'business' },
];

/**
 * Calculate profile completeness as a percentage.
 * @param {object} businessData - The business document fields
 * @returns {number} Integer percentage 0–100
 */
export function calculateProfileCompleteness(businessData) {
  const total = BUSINESS_FIELDS.length;
  const filled = BUSINESS_FIELDS.filter(field => {
    const value = businessData?.[field.key];
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value && String(value).trim());
  }).length;
  return Math.round((filled / total) * 100);
}
