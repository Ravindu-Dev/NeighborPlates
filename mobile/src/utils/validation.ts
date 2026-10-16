/**
 * Form Validation Utilities for NeighborPlates Mobile App
 */

export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email.trim());
};

/**
 * Validates Sri Lankan mobile numbers:
 * Accepts: 07XXXXXXXX (10 digits), +947XXXXXXXX (12 digits), or 7XXXXXXXX (9 digits).
 * Allows hyphens, spaces, and parentheses.
 */
export const isValidSriLankanPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(?:\+94|0)?7[0-9]{8}$/.test(cleaned);
};

export interface LoginValidationErrors {
  email?: string;
  password?: string;
}

export const validateLoginFields = (email: string, password: string): {
  isValid: boolean;
  errors: LoginValidationErrors;
} => {
  const errors: LoginValidationErrors = {};

  if (!email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address (e.g., rider@example.com).';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export interface RiderRegisterValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  district?: string;
  town?: string;
  vehiclePlate?: string;
}

export const validateRiderRegisterFields = (fields: {
  name: string;
  email: string;
  phone: string;
  password: string;
  district: string;
  town: string;
  vehicleType: string;
  vehiclePlate?: string;
}): {
  isValid: boolean;
  errors: RiderRegisterValidationErrors;
} => {
  const errors: RiderRegisterValidationErrors = {};

  // Full Name
  if (!fields.name.trim()) {
    errors.name = 'Full name is required.';
  } else if (fields.name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(fields.name.trim())) {
    errors.name = 'Full name should only contain letters and spaces.';
  }

  // Email
  if (!fields.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(fields.email)) {
    errors.email = 'Please enter a valid email address (e.g., rider@example.com).';
  }

  // Phone
  if (!fields.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!isValidSriLankanPhone(fields.phone)) {
    errors.phone = 'Enter a valid Sri Lankan mobile number (e.g., 077 123 4567 or +94 77 123 4567).';
  }

  // Password
  if (!fields.password) {
    errors.password = 'Password is required.';
  } else if (fields.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  // District
  if (!fields.district) {
    errors.district = 'Please select your operating district.';
  }

  // Town / Hub
  if (!fields.town) {
    errors.town = 'Please select your operating town / hub.';
  }

  // Optional vehicle plate
  if (fields.vehiclePlate && fields.vehiclePlate.trim().length > 0 && fields.vehiclePlate.trim().length < 2) {
    errors.vehiclePlate = 'Vehicle plate must be at least 2 characters if provided.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
