import forge from "node-forge";

// ===================== KEY GENERATION =====================

export function generateKeyPair(bits: number = 2048) {
  const keys = forge.pki.rsa.generateKeyPair(bits);
  return {
    publicKeyPem: forge.pki.publicKeyToPem(keys.publicKey),
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

// ===================== ROOT CERTIFICATE =====================

export interface RootCertOptions {
  keyLength: number;
  hashAlgorithm: string;
  validityDays: number;
  commonName?: string;
  organization?: string;
  country?: string;
}

export function generateRootCertificate(options: RootCertOptions) {
  const keys = forge.pki.rsa.generateKeyPair(options.keyLength);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(
    cert.validity.notBefore.getFullYear() + Math.ceil(options.validityDays / 365)
  );

  const attrs = [
    { name: "commonName", value: options.commonName || "CA Root Certificate" },
    { name: "countryName", value: options.country || "VN" },
    { name: "organizationName", value: options.organization || "Certificate Authority" },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: "basicConstraints", cA: true, critical: true },
    {
      name: "keyUsage",
      keyCertSign: true,
      digitalSignature: true,
      cRLSign: true,
      critical: true,
    },
    {
      name: "subjectKeyIdentifier",
    },
  ]);

  const md = getMessageDigest(options.hashAlgorithm);
  cert.sign(keys.privateKey, md);

  return {
    certPem: forge.pki.certificateToPem(cert),
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    publicKeyPem: forge.pki.publicKeyToPem(keys.publicKey),
  };
}

// ===================== CSR =====================

export interface CSROptions {
  privateKeyPem: string;
  domain: string;
  country?: string;
  organization?: string;
  hashAlgorithm?: string;
}

export function generateCSR(options: CSROptions) {
  const privateKey = forge.pki.privateKeyFromPem(options.privateKeyPem);
  const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);

  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = publicKey;

  csr.setSubject([
    { name: "commonName", value: options.domain },
    { name: "countryName", value: options.country || "VN" },
    { name: "organizationName", value: options.organization || "Personal" },
  ]);

  csr.setAttributes([
    {
      name: "extensionRequest",
      extensions: [
        {
          name: "subjectAltName",
          altNames: [{ type: 2, value: options.domain }],
        },
      ],
    },
  ]);

  const md = getMessageDigest(options.hashAlgorithm || "SHA-256");
  csr.sign(privateKey, md);

  return forge.pki.certificationRequestToPem(csr);
}

// ===================== SIGN CERTIFICATE =====================

export interface SignCertOptions {
  csrPem: string;
  rootCertPem: string;
  rootKeyPem: string;
  serialNumber: string;
  validityDays: number;
  hashAlgorithm: string;
}

export function signCertificate(options: SignCertOptions) {
  const csr = forge.pki.certificationRequestFromPem(options.csrPem);
  const rootCert = forge.pki.certificateFromPem(options.rootCertPem);
  const rootKey = forge.pki.privateKeyFromPem(options.rootKeyPem);

  // Verify CSR signature
  if (!csr.verify()) {
    throw new Error("CSR signature verification failed");
  }

  const cert = forge.pki.createCertificate();
  cert.publicKey = csr.publicKey!;
  cert.serialNumber = options.serialNumber;

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(
    cert.validity.notBefore.getDate() + options.validityDays
  );

  cert.setSubject(csr.subject.attributes);
  cert.setIssuer(rootCert.subject.attributes);

  // Copy extensions from CSR
  const extReq = csr.getAttribute({ name: "extensionRequest" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions: any[] = [
    { name: "basicConstraints", cA: false },
    {
      name: "keyUsage",
      digitalSignature: true,
      keyEncipherment: true,
    },
    {
      name: "extKeyUsage",
      serverAuth: true,
      clientAuth: true,
    },
  ];

  if (extReq) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exts = (extReq as any).extensions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanExt = exts?.find((e: any) => e.name === "subjectAltName");
    if (sanExt) {
      extensions.push(sanExt);
    }
  }

  cert.setExtensions(extensions);

  const md = getMessageDigest(options.hashAlgorithm);
  cert.sign(rootKey, md);

  return {
    certPem: forge.pki.certificateToPem(cert),
    serialNumber: cert.serialNumber,
    subjectDN: cert.subject.attributes
      .map((a) => `${a.shortName || a.name}=${a.value}`)
      .join(", "),
    issuerDN: cert.issuer.attributes
      .map((a) => `${a.shortName || a.name}=${a.value}`)
      .join(", "),
    notBefore: cert.validity.notBefore,
    notAfter: cert.validity.notAfter,
  };
}

// ===================== CRL =====================

export interface CRLEntry {
  serialNumber: string;
  revocationDate: Date;
  reason?: string;
}

export function generateCRL(
  rootCertPem: string,
  rootKeyPem: string,
  entries: CRLEntry[],
  hashAlgorithm: string = "SHA-256",
  nextUpdateDays: number = 30
) {
  const rootCert = forge.pki.certificateFromPem(rootCertPem);
  const rootKey = forge.pki.privateKeyFromPem(rootKeyPem);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pki = forge.pki as any;

  const crl = pki.createCrl();
  crl.setIssuer(rootCert.subject.attributes);

  const thisUpdate = new Date();
  const nextUpdateDate = new Date();
  nextUpdateDate.setDate(thisUpdate.getDate() + nextUpdateDays);

  crl.thisUpdate = thisUpdate;
  crl.nextUpdate = nextUpdateDate;

  for (const entry of entries) {
    crl.addRevokedCertificate({
      serialNumber: entry.serialNumber,
      revocationDate: entry.revocationDate,
    });
  }

  const md = getMessageDigest(hashAlgorithm);
  crl.sign(rootKey, md);

  return {
    crlPem: pki.crlToPem(crl),
    issuedAt: thisUpdate,
    nextUpdate: nextUpdateDate,
  };
}

// ===================== CERTIFICATE PARSING =====================

export function parseCertificate(certPem: string) {
  try {
    const cert = forge.pki.certificateFromPem(certPem);
    return {
      serialNumber: cert.serialNumber,
      subjectDN: cert.subject.attributes
        .map((a) => `${a.shortName || a.name}=${a.value}`)
        .join(", "),
      issuerDN: cert.issuer.attributes
        .map((a) => `${a.shortName || a.name}=${a.value}`)
        .join(", "),
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter,
      publicKey: forge.pki.publicKeyToPem(cert.publicKey as forge.pki.rsa.PublicKey),
      extensions: cert.extensions.map((e) => ({
        name: e.name,
        critical: e.critical,
      })),
      signatureAlgorithm: (cert as unknown as { siginfo: { algorithmOid: string } }).siginfo?.algorithmOid || "Unknown",
    };
  } catch {
    throw new Error("Invalid certificate PEM format");
  }
}

export function parseCSR(csrPem: string) {
  try {
    const csr = forge.pki.certificationRequestFromPem(csrPem);
    return {
      subject: csr.subject.attributes
        .map((a) => `${a.shortName || a.name}=${a.value}`)
        .join(", "),
      publicKey: forge.pki.publicKeyToPem(csr.publicKey as forge.pki.rsa.PublicKey),
      valid: csr.verify(),
    };
  } catch {
    throw new Error("Invalid CSR PEM format");
  }
}

// ===================== HELPERS =====================

function getMessageDigest(algorithm: string) {
  switch (algorithm.toUpperCase()) {
    case "SHA-1":
      return forge.md.sha1.create();
    case "SHA-256":
      return forge.md.sha256.create();
    case "SHA-384":
      return forge.md.sha384.create();
    case "SHA-512":
      return forge.md.sha512.create();
    default:
      return forge.md.sha256.create();
  }
}

export function generateSerialNumber(): string {
  return forge.util.bytesToHex(forge.random.getBytesSync(16));
}
