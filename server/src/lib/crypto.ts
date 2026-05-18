import forge from "node-forge";
import { CertificateRevocationList, Certificate as PKIJSCertificate, Time, RevokedCertificate } from "pkijs";
import { fromBER, Integer } from "asn1js";
import { webcrypto } from "crypto";

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
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + Math.ceil(options.validityDays / 365));

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

  // Generate a random nonce to guarantee CSR uniqueness and a unique hash
  const nonce = forge.util.bytesToHex(forge.random.getBytesSync(16));

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
    {
      name: "challengePassword",
      value: nonce,
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
  cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + options.validityDays);

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
    subjectDN: cert.subject.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", "),
    issuerDN: cert.issuer.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", "),
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

export async function generateCRL(
  rootCertPem: string,
  rootKeyPem: string,
  entries: CRLEntry[],
  hashAlgorithm: string = "SHA-256",
  nextUpdateDays: number = 30,
) {
  // Set up pkijs crypto engine with Node.js built-in WebCrypto
  // setEngine("nodeEngine", new CryptoEngine({ name: "nodeEngine", crypto: webcrypto as unknown as Crypto }) as any);

  // Parse root certificate PEM → DER → pkijs Certificate (to extract issuer)
  // https://gist.github.com/adisbladis/c84e533e591b1737fedd26658021fef2
  const rootCertB64 = rootCertPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const rootCertBuf = Buffer.from(rootCertB64, "base64");
  const rootCertArrayBuf = new Uint8Array(rootCertBuf).buffer;
  const rootCertAsn1 = fromBER(rootCertArrayBuf);
  const rootCertPkijs = new PKIJSCertificate({ schema: rootCertAsn1.result });

  // Import root private key as WebCrypto CryptoKey (via PKCS#8)
  // Idea from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#pkcs_8_import
  const rootForgeKey = forge.pki.privateKeyFromPem(rootKeyPem);
  const pkcs8Asn1 = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(rootForgeKey));
  const pkcs8Buf = Buffer.from(forge.asn1.toDer(pkcs8Asn1).getBytes(), "binary");
  const pkcs8ArrayBuf = pkcs8Buf.buffer.slice(pkcs8Buf.byteOffset, pkcs8Buf.byteOffset + pkcs8Buf.byteLength);
  const cryptoKey = await webcrypto.subtle.importKey(
    "pkcs8", 
    pkcs8ArrayBuf, 
    { name: "RSA-PSS", hash: hashAlgorithm }, 
    false, 
    ["sign"]
  );

  // Build CRL
  const thisUpdate = new Date();
  const nextUpdateDate = new Date();
  nextUpdateDate.setDate(thisUpdate.getDate() + nextUpdateDays);

  const crl = new CertificateRevocationList({
    version: 1,
    issuer: rootCertPkijs.subject,
    thisUpdate: new Time({ type: 0, value: thisUpdate }),
    nextUpdate: new Time({ type: 0, value: nextUpdateDate }),
  });

  // Add revoked certificates
  if (entries.length > 0) {
    crl.revokedCertificates = [];
    for (const entry of entries) {
      // Ensure serial number is even-length hex string
      // E.g. "1" → "01", "0A" → "0A", "1234" → "1234"
      const serialHex = entry.serialNumber.length % 2 === 0 ? entry.serialNumber : `0${entry.serialNumber}`;
      const serialBuf = Buffer.from(serialHex, "hex");
      const serialArrayBuf = serialBuf.buffer.slice(serialBuf.byteOffset, serialBuf.byteOffset + serialBuf.byteLength);
      crl.revokedCertificates.push(
        new RevokedCertificate({
          userCertificate: new Integer({ valueHex: serialArrayBuf }),
          revocationDate: new Time({ type: 0, value: entry.revocationDate }),
        }),
      );
    }
  }

  // Sign the CRL
  await crl.sign(cryptoKey, hashAlgorithm);

  // Export to PEM
  const crlDerBuf = Buffer.from(crl.toSchema(true).toBER(false));
  const crlB64 = crlDerBuf
    .toString("base64")
    .match(/.{1,64}/g)!
    .join("\n");
  const crlPem = `-----BEGIN X509 CRL-----\n${crlB64}\n-----END X509 CRL-----`;

  return {
    crlPem,
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
      subjectDN: cert.subject.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", "),
      issuerDN: cert.issuer.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", "),
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
      subject: csr.subject.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(", "),
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
