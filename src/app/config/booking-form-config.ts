/**
 * Booking Form Configuration
 * 
 * This file defines the booking form fields for each subclassification.
 * When adding a new subclassification, simply add its configuration here.
 * The customer-modal component will automatically use these configurations.
 */

export interface BookingFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'toggle' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  section?: string;
  visible?: (plotType: string) => boolean;
  help?: string;
}

export interface SubclassificationConfig {
  fields: BookingFormField[];
  showAptConfig?: boolean;
  showCarParking?: boolean;
  showFoodNeeded?: boolean;
  showDateRange?: boolean;
  customSections?: string[];
}

export const BOOKING_FORM_CONFIG: Record<string, SubclassificationConfig> = {
  // Existing subclassifications
  apartment: {
    fields: [
      { name: 'customerName', label: 'Full Name', type: 'text', required: true, section: 'Customer Details' },
      { name: 'customerMobile', label: 'Mobile', type: 'tel', required: true, section: 'Customer Details' },
      { name: 'email', label: 'Email', type: 'email', section: 'Customer Details' },
      { name: 'professionId', label: 'Profession', type: 'select', section: 'Customer Details' },
      { name: 'customerType', label: 'Type', type: 'select', required: true, section: 'Customer Details', options: [
        { value: 'OWNER', label: 'Owner' },
        { value: 'TENANT', label: 'Tenant' }
      ]},
      { name: 'plotName', label: 'Plot Name', type: 'text', section: 'Plot Details' },
      { name: 'doorNo', label: 'Door Number', type: 'text', section: 'Plot Details' },
      { name: 'sqFeet', label: 'Square Feet', type: 'number', section: 'Plot Details' },
      { name: 'paymentType', label: 'Payment Frequency', type: 'select', section: 'Plot Details', options: [
        { value: 'MONTHLY', label: 'Monthly' },
        { value: 'QUARTERLY', label: 'Quarterly' },
        { value: 'HALFYEARLY', label: 'Half Yearly' },
        { value: 'YEARLY', label: 'Yearly' }
      ]},
    ],
    showAptConfig: true,
    showCarParking: false,
    showFoodNeeded: false,
    showDateRange: false,
  },

  house: {
    fields: [
      { name: 'customerName', label: 'Full Name', type: 'text', required: true, section: 'Customer Details' },
      { name: 'customerMobile', label: 'Mobile', type: 'tel', required: true, section: 'Customer Details' },
      { name: 'email', label: 'Email', type: 'email', section: 'Customer Details' },
      { name: 'professionId', label: 'Profession', type: 'select', section: 'Customer Details' },
      { name: 'customerType', label: 'Type', type: 'select', required: true, section: 'Customer Details', options: [
        { value: 'OWNER', label: 'Owner' },
        { value: 'TENANT', label: 'Tenant' }
      ]},
      { name: 'plotName', label: 'Villa Name', type: 'text', section: 'Property Details' },
      { name: 'doorNo', label: 'Door Number', type: 'text', section: 'Property Details' },
      { name: 'sqFeet', label: 'Square Feet', type: 'number', section: 'Property Details' },
      { name: 'paymentType', label: 'Payment Frequency', type: 'select', section: 'Property Details', options: [
        { value: 'MONTHLY', label: 'Monthly' },
        { value: 'QUARTERLY', label: 'Quarterly' },
        { value: 'HALFYEARLY', label: 'Half Yearly' },
        { value: 'YEARLY', label: 'Yearly' }
      ]},
    ],
    showAptConfig: false,
    showCarParking: false,
    showFoodNeeded: false,
    showDateRange: false,
  },

  pg: {
    fields: [
      { name: 'customerName', label: 'Full Name', type: 'text', required: true, section: 'Customer Details' },
      { name: 'customerMobile', label: 'Mobile', type: 'tel', required: true, section: 'Customer Details' },
      { name: 'email', label: 'Email', type: 'email', section: 'Customer Details' },
      { name: 'professionId', label: 'Profession', type: 'select', section: 'Customer Details' },
      { name: 'customerType', label: 'Type', type: 'select', required: true, section: 'Customer Details', options: [
        { value: 'OWNER', label: 'Owner' },
        { value: 'TENANT', label: 'Tenant' }
      ]},
      { name: 'plotName', label: 'Plot Name', type: 'text', section: 'Plot Details' },
      { name: 'doorNo', label: 'Door Number', type: 'text', section: 'Plot Details' },
      { name: 'sqFeet', label: 'Square Feet', type: 'number', section: 'Plot Details' },
      { name: 'paymentType', label: 'Payment Frequency', type: 'select', section: 'Plot Details', options: [
        { value: 'MONTHLY', label: 'Monthly' },
        { value: 'QUARTERLY', label: 'Quarterly' },
        { value: 'HALFYEARLY', label: 'Half Yearly' },
        { value: 'YEARLY', label: 'Yearly' }
      ]},
      { name: 'foodNeeded', label: 'Food Menu Needed?', type: 'toggle', section: 'Additional Options' },
    ],
    showAptConfig: true,
    showCarParking: false,
    showFoodNeeded: true,
    showDateRange: false,
  },

  guesthouse: {
    fields: [
      { name: 'customerName', label: 'Full Name', type: 'text', required: true, section: 'Customer Details' },
      { name: 'customerMobile', label: 'Mobile', type: 'tel', required: true, section: 'Customer Details' },
      { name: 'email', label: 'Email', type: 'email', section: 'Customer Details' },
      { name: 'professionId', label: 'Profession', type: 'select', section: 'Customer Details' },
      { name: 'customerType', label: 'Type', type: 'select', required: true, section: 'Customer Details', options: [
        { value: 'OWNER', label: 'Owner' },
        { value: 'GUEST', label: 'Guest' }
      ]},
      { name: 'plotName', label: 'Room Name', type: 'text', section: 'Plot Details' },
      { name: 'doorNo', label: 'Room Number', type: 'text', section: 'Plot Details' },
      { name: 'sqFeet', label: 'Square Feet', type: 'number', section: 'Plot Details' },
      { name: 'paymentType', label: 'Payment Frequency', type: 'select', section: 'Plot Details', options: [
        { value: 'MONTHLY', label: 'Monthly' },
        { value: 'QUARTERLY', label: 'Quarterly' },
        { value: 'HALFYEARLY', label: 'Half Yearly' },
        { value: 'YEARLY', label: 'Yearly' }
      ]},
      { name: 'fromDate', label: 'From Date', type: 'date', section: 'Booking Period' },
      { name: 'toDate', label: 'To Date', type: 'date', section: 'Booking Period' },
    ],
    showAptConfig: false,
    showCarParking: false,
    showFoodNeeded: false,
    showDateRange: true,
  },

  // Add new subclassifications here
  // Example: commercial, retail, warehouse, etc.
  commercial: {
    fields: [
      { name: 'customerName', label: 'Business Name', type: 'text', required: true, section: 'Business Details' },
      { name: 'customerMobile', label: 'Contact Number', type: 'tel', required: true, section: 'Business Details' },
      { name: 'email', label: 'Email', type: 'email', section: 'Business Details' },
      { name: 'professionId', label: 'Business Type', type: 'select', section: 'Business Details' },
      { name: 'customerType', label: 'Tenant Type', type: 'select', required: true, section: 'Business Details', options: [
        { value: 'OWNER', label: 'Owner' },
        { value: 'TENANT', label: 'Tenant' }
      ]},
      { name: 'plotName', label: 'Shop/Office Name', type: 'text', section: 'Property Details' },
      { name: 'doorNo', label: 'Shop/Office Number', type: 'text', section: 'Property Details' },
      { name: 'sqFeet', label: 'Square Feet', type: 'number', section: 'Property Details' },
      { name: 'paymentType', label: 'Payment Frequency', type: 'select', section: 'Property Details', options: [
        { value: 'MONTHLY', label: 'Monthly' },
        { value: 'QUARTERLY', label: 'Quarterly' },
        { value: 'HALFYEARLY', label: 'Half Yearly' },
        { value: 'YEARLY', label: 'Yearly' }
      ]},
    ],
    showAptConfig: false,
    showCarParking: false,
    showFoodNeeded: false,
    showDateRange: false,
  },

  parking: {
    fields: [
      { name: 'customerName', label: 'Full Name', type: 'text', required: true, section: 'Customer Details' },
      { name: 'customerMobile', label: 'Mobile', type: 'tel', required: true, section: 'Customer Details' },
      { name: 'email', label: 'Email', type: 'email', section: 'Customer Details' },
      { name: 'customerType', label: 'Type', type: 'select', required: true, section: 'Customer Details', options: [
        { value: 'OWNER', label: 'Owner' },
        { value: 'TENANT', label: 'Tenant' }
      ]},
      { name: 'plotName', label: 'Parking Spot', type: 'text', section: 'Parking Details' },
      { name: 'doorNo', label: 'Spot Number', type: 'text', section: 'Parking Details' },
      { name: 'paymentType', label: 'Payment Frequency', type: 'select', section: 'Parking Details', options: [
        { value: 'MONTHLY', label: 'Monthly' },
        { value: 'QUARTERLY', label: 'Quarterly' },
        { value: 'HALFYEARLY', label: 'Half Yearly' },
        { value: 'YEARLY', label: 'Yearly' }
      ]},
      { name: 'carParking', label: 'Vehicle Type', type: 'select', section: 'Parking Details', options: [
        { value: 'true', label: 'Car' },
        { value: 'false', label: 'Bike' }
      ]},
    ],
    showAptConfig: false,
    showCarParking: false,
    showFoodNeeded: false,
    showDateRange: false,
  },
};

/**
 * Get booking form configuration for a subclassification
 * Falls back to a default configuration if subclassification is not found
 */
export function getBookingFormConfig(plotType: string | undefined, plotName?: string): SubclassificationConfig {
  const type = (plotType || '').toLowerCase();
  let config = BOOKING_FORM_CONFIG[type];

  if (!config) {
    // Default fallback
    config = {
      fields: [
        { name: 'customerName', label: 'Full Name', type: 'text', required: true, section: 'Customer Details' },
        { name: 'customerMobile', label: 'Mobile', type: 'tel', required: true, section: 'Customer Details' },
        { name: 'email', label: 'Email', type: 'email', section: 'Customer Details' },
        { name: 'professionId', label: 'Profession', type: 'select', section: 'Customer Details' },
        { name: 'customerType', label: 'Type', type: 'select', required: true, section: 'Customer Details', options: [
          { value: 'OWNER', label: 'Owner' },
          { value: 'TENANT', label: 'Tenant' }
        ]},
        { name: 'plotName', label: 'Plot Name', type: 'text', section: 'Plot Details' },
        { name: 'doorNo', label: 'Door Number', type: 'text', section: 'Plot Details' },
        { name: 'sqFeet', label: 'Square Feet', type: 'number', section: 'Plot Details' },
        { name: 'paymentType', label: 'Payment Frequency', type: 'select', section: 'Plot Details', options: [
          { value: 'MONTHLY', label: 'Monthly' },
          { value: 'QUARTERLY', label: 'Quarterly' },
          { value: 'HALFYEARLY', label: 'Half Yearly' },
          { value: 'YEARLY', label: 'Yearly' }
        ]},
      ],
      showAptConfig: false,
      showCarParking: false,
      showFoodNeeded: false,
      showDateRange: false,
    };
  }

  // Clone to avoid mutating the original constant
  const finalConfig: SubclassificationConfig = {
    ...config,
    fields: [...config.fields]
  };

  // Logic: If plot name has "pg", ensure foodNeeded toggle is shown
  const isPgByName = plotName?.toLowerCase().includes('pg');
  if (isPgByName && !finalConfig.fields.some(f => f.name === 'foodNeeded')) {
    finalConfig.fields.push({ 
      name: 'foodNeeded', 
      label: 'Food Menu Needed?', 
      type: 'toggle', 
      section: 'Additional Options' 
    });
    finalConfig.showFoodNeeded = true;
  }

  return finalConfig;
}

/**
 * Get all fields for a specific section
 */
export function getFieldsBySection(plotType: string | undefined, section: string, plotName?: string): BookingFormField[] {
  const config = getBookingFormConfig(plotType, plotName);
  return config.fields.filter(f => f.section === section);
}

/**
 * Get all unique sections for a subclassification
 */
export function getSections(plotType: string | undefined, plotName?: string): string[] {
  const config = getBookingFormConfig(plotType, plotName);
  const sections = new Set(config.fields.map(f => f.section || 'General'));
  return Array.from(sections);
}
