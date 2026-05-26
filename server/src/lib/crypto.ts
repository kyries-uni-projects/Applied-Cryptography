import forge from "node-forge";
import { CertificateRevocationList, Certificate as PKIJSCertificate, Time, RevokedCertificate } from "pkijs";
import { fromBER, Integer } from "asn1js";
import { webcrypto } from "crypto";

// ===================== MISC =====================
/**
 * Node Forge cannot parse certificate which public key OID that are not in RSA/it doesn't support, e.g. ECC keys.
 * So we use pkijs for parsing instead, which supports more key types and extensions.
 * @param certPem string PEM-encoded certificate
 * @returns PKIJSCertificate
 * @description Parse root certificate PEM → DER → pkijs Certificate (to extract issuer)
 * @see https://gist.github.com/adisbladis/c84e533e591b1737fedd26658021fef2
 */
function pemToPkijsCert(pem: string): PKIJSCertificate {
	const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
	const buf = Buffer.from(b64, "base64");
	const arrayBuf = new Uint8Array(buf).buffer;
	const asn1 = fromBER(arrayBuf);
	return new PKIJSCertificate({ schema: asn1.result });
}

/**
 * Get OID human-readable name from pkijs Certificate's signatureAlgorithm.algorithmId
 * @param oid string OID string, e.g. "1.2.840.113549.1.1.11"
 * @returns string
 * @see https://github.com/digitalbazaar/forge/blob/7a43db987bd0ecdc5b41f6d73f58ba6ca5bf9ae1/lib/oids.js
 * @see https://github.com/digitalbazaar/forge/blob/7a43db987bd0ecdc5b41f6d73f58ba6ca5bf9ae1/lib/x509.js
 */
function getOIDName(oid: string): string {
	// https://github.com/digitalbazaar/forge/blob/7a43db987bd0ecdc5b41f6d73f58ba6ca5bf9ae1/lib/x509.js#L130-L144
	const shortNames = {
		commonName: "CN",
		countryName: "C",
		localityName: "L",
		stateOrProvinceName: "ST",
		organizationName: "O",
		organizationalUnitName: "OU",
		emailAddress: "E",
	};

	//@ts-expect-error Short names may not cover all OIDs, but we can still return the OID string as fallback
	return shortNames[forge.pki.oids[oid]] || forge.pki.oids[oid] || oid;
}

// ===================== KEY GENERATION =====================

export function generateKeyPair(password: string, bits: number = 2048) {
	const keys = forge.pki.rsa.generateKeyPair(bits);
	return {
		publicKeyPem: forge.pki.publicKeyToPem(keys.publicKey),
		privateKeyPem: forge.pki.encryptRsaPrivateKey(keys.privateKey, password),
	};
}

export function decryptPrivateKeyToPem(encryptedPem: string, password: string): string {
  const privateKey = forge.pki.decryptRsaPrivateKey(encryptedPem, password);
  if (!privateKey) {
    throw new Error("Mật khẩu giải mã không đúng hoặc dữ liệu khoá bị hỏng");
  }
  return forge.pki.privateKeyToPem(privateKey);
}

// ===================== ROOT CERTIFICATE =====================

export interface RootCertOptions {
	keyLength: number;
	hashAlgorithm: string;
	validityDays: number;
	commonName?: string;
	organization?: string;
	country?: string;
	passphrase?: string;
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

	const encryptedRootKey = options.passphrase 
    ? forge.pki.encryptRsaPrivateKey(keys.privateKey, options.passphrase)
    : forge.pki.privateKeyToPem(keys.privateKey);

	return {
		certPem: forge.pki.certificateToPem(cert),
		privateKeyPem: encryptedRootKey,
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
	passphrase?: string;
}

export function signCertificate(options: SignCertOptions) {
	const csr = forge.pki.certificationRequestFromPem(options.csrPem);
	const rootCert = forge.pki.certificateFromPem(options.rootCertPem);
	const rootKey = options.passphrase
		? forge.pki.decryptRsaPrivateKey(options.rootKeyPem, options.passphrase)
		: forge.pki.privateKeyFromPem(options.rootKeyPem);

	if (!rootKey) throw new Error("Không thể giải mã Root CA Key");

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
	passphrase?: string
) {
	// Set up pkijs crypto engine with Node.js built-in WebCrypto
	// setEngine("nodeEngine", new CryptoEngine({ name: "nodeEngine", crypto: webcrypto as unknown as Crypto }) as any);

	const rootCertPkijs = pemToPkijsCert(rootCertPem);

	// Import root private key as WebCrypto CryptoKey (via PKCS#8)
	// Idea from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#pkcs_8_import
	const rootForgeKey = passphrase 
		? forge.pki.decryptRsaPrivateKey(rootKeyPem, passphrase)
		: forge.pki.privateKeyFromPem(rootKeyPem);
	
	if (!rootForgeKey) throw new Error("Không thể giải mã Root CA Key để sinh CRL");

	const pkcs8Asn1 = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(rootForgeKey));
	const pkcs8Buf = Buffer.from(forge.asn1.toDer(pkcs8Asn1).getBytes(), "binary");
	const pkcs8ArrayBuf = pkcs8Buf.buffer.slice(pkcs8Buf.byteOffset, pkcs8Buf.byteOffset + pkcs8Buf.byteLength);
	const cryptoKey = await webcrypto.subtle.importKey("pkcs8", pkcs8ArrayBuf, { name: "RSA-PSS", hash: hashAlgorithm }, false, ["sign"]);

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

/**
 * Node Forge cannot parse certificate which public key OID that are not in RSA/it doesn't support, e.g. ECC keys.
 * So we use pkijs for parsing instead, which supports more key types and extensions.
 */
export async function parseCertificate(certPem: string) {
	const certPkijs = pemToPkijsCert(certPem);
	return {
		serialNumber: certPkijs.serialNumber.toBigInt(),
		subjectDN: certPkijs.subject.typesAndValues.map((a) => `${getOIDName(a.type)}=${a.value.valueBlock.value}`).join(", "),
		issuerDN: certPkijs.issuer.typesAndValues.map((a) => `${getOIDName(a.type)}=${a.value.valueBlock.value}`).join(", "),
		notBefore: certPkijs.notBefore,
		notAfter: certPkijs.notAfter,
		publicKey: await certPkijs.getPublicKey(),
		extensions: certPkijs.extensions?.map((e) => ({
			name: e.extnID,
			critical: e.critical,
		})),
		signatureAlgorithm: getOIDName(certPkijs.signatureAlgorithm.algorithmId),
	};
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
