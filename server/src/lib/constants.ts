export const APP_NAME = "Certificate Authority";
export const JWT_SECRET = process.env.JWT_SECRET || "ca-server-jwt-secret-key-change-in-production";
export const JWT_EXPIRATION = "24h";

export const ROLES = {
  ADMIN: "ADMIN",
  CLIENT: "CLIENT",
} as const;

export const CERT_STATUS = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
} as const;

export const REQUEST_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const DEFAULT_CA_CONFIG = {
  algorithm: "RSA",
  hashAlgorithm: "SHA-256",
  keyLength: 2048,
  validityDays: 365,
};
