/**
 * Smart Contract configuration.
 * CertificateRegistry is deployed on Avalanche Fuji Testnet (chain ID 43113).
 * Deployed address: 0x0E27ff2B02840BeE6d7B74CAFb9ca7CA4306D18b
 *
 * Set CERTIFICATE_REGISTRY_ADDRESS in your .env to override.
 */

export const CONTRACT_ADDRESS =
  (process.env.CERTIFICATE_REGISTRY_ADDRESS as `0x${string}`) ??
  "0x0E27ff2B02840BeE6d7B74CAFb9ca7CA4306D18b";

export const CONTRACT_ABI = [
  // Admin Management
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    inputs: [{ internalType: "address", name: "_admin", type: "address" }],
    name: "addAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_admin", type: "address" }],
    name: "removeAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // Certificate Requests
  {
    inputs: [
      { internalType: "string", name: "_id", type: "string" },
      { internalType: "string", name: "_userId", type: "string" },
      { internalType: "string", name: "_domain", type: "string" },
      { internalType: "string", name: "_csrPemHash", type: "string" },
    ],
    name: "submitRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_id", type: "string" },
      { internalType: "uint8", name: "_status", type: "uint8" }, // enum RequestStatus
    ],
    name: "updateRequestStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "", type: "string" }],
    name: "requests",
    outputs: [
      { internalType: "string", name: "id", type: "string" },
      { internalType: "string", name: "userId", type: "string" },
      { internalType: "string", name: "domain", type: "string" },
      { internalType: "string", name: "csrPemHash", type: "string" },
      { internalType: "uint8", name: "status", type: "uint8" },
      { internalType: "uint256", name: "createdAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_userId", type: "string" }],
    name: "getUserRequests",
    outputs: [{ internalType: "string[]", name: "", type: "string[]" }],
    stateMutability: "view",
    type: "function",
  },

  // Certificates
  {
    inputs: [
      { internalType: "string", name: "_id", type: "string" },
      { internalType: "string", name: "_serialNumber", type: "string" },
      { internalType: "string", name: "_userId", type: "string" },
      { internalType: "string", name: "_certPemHash", type: "string" },
      { internalType: "string", name: "_subjectDN", type: "string" },
      { internalType: "string", name: "_issuerDN", type: "string" },
      { internalType: "uint256", name: "_notBefore", type: "uint256" },
      { internalType: "uint256", name: "_notAfter", type: "uint256" },
    ],
    name: "issueCertificate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_id", type: "string" },
      { internalType: "string", name: "_certPemHash", type: "string" },
      { internalType: "uint256", name: "_notBefore", type: "uint256" },
      { internalType: "uint256", name: "_notAfter", type: "uint256" },
    ],
    name: "updateCertificate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_userId", type: "string" }],
    name: "getUserCertificates",
    outputs: [{ internalType: "string[]", name: "", type: "string[]" }],
    stateMutability: "view",
    type: "function",
  },

  // Revocations
  {
    inputs: [
      { internalType: "string", name: "_serialNumber", type: "string" },
      { internalType: "string", name: "_reason", type: "string" },
    ],
    name: "revokeCertificate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_serialNumber", type: "string" }],
    name: "isRevoked",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },

  // Revocation Requests
  {
    inputs: [
      { internalType: "string", name: "_id", type: "string" },
      { internalType: "string", name: "_certificateId", type: "string" },
      { internalType: "string", name: "_userId", type: "string" },
      { internalType: "string", name: "_reason", type: "string" },
    ],
    name: "submitRevocationRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_id", type: "string" },
      { internalType: "uint8", name: "_status", type: "uint8" },
    ],
    name: "updateRevocationRequestStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_userId", type: "string" }],
    name: "getUserRevocationRequests",
    outputs: [{ internalType: "string[]", name: "", type: "string[]" }],
    stateMutability: "view",
    type: "function",
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "string", name: "requestId", type: "string" },
      { indexed: true, internalType: "string", name: "userId", type: "string" },
      { indexed: false, internalType: "string", name: "domain", type: "string" },
    ],
    name: "RequestSubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "string", name: "certId", type: "string" },
      { indexed: true, internalType: "string", name: "serialNumber", type: "string" },
      { indexed: false, internalType: "string", name: "userId", type: "string" },
    ],
    name: "CertificateIssued",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "string", name: "certId", type: "string" },
      { indexed: false, internalType: "uint256", name: "newNotBefore", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "newNotAfter", type: "uint256" },
    ],
    name: "CertificateUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "string", name: "serialNumber", type: "string" },
      { indexed: false, internalType: "string", name: "reason", type: "string" },
    ],
    name: "CertificateRevoked",
    type: "event",
  },
] as const;
