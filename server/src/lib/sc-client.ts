/**
 * Smart Contract Client Library
 *
 * Provides a blockchain interface that mirrors the Prisma DB operations.
 * Uses Deterministic Wallet Derivation: each user/admin's blockchain wallet
 * is derived from their existing RSA private key stored in the Prisma DB.
 *
 * Pattern:
 *   User actions  → derived wallet from user's KeyPair.privateKeyPem
 *   Admin actions → derived wallet from CaConfig.rootKeyPem (the CA root key)
 */

import { ethers } from "ethers";
import { prisma } from "./db";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./sc-config";

const AVAX_FUJI_RPC = process.env.AVAX_FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";

function getProvider() {
  return new ethers.JsonRpcProvider(AVAX_FUJI_RPC);
}

/**
 * Derives a deterministic Ethereum wallet from an arbitrary PEM string.
 * keccak256(pemString) → valid secp256k1 private key.
 */
function deriveWallet(pem: string): ethers.Wallet {
  const ethPrivateKey = ethers.keccak256(ethers.toUtf8Bytes(pem));
  return new ethers.Wallet(ethPrivateKey, getProvider());
}

/**
 * Returns a wallet derived from the user's own RSA private key.
 * The user must have at least one KeyPair in the DB.
 */
async function getUserWallet(userId: string): Promise<ethers.Wallet> {
  const keyPair = await prisma.keyPair.findFirst({ where: { userId } });
  if (!keyPair) throw new Error(`No KeyPair found for user ${userId}`);
  return deriveWallet(keyPair.privateKeyPem);
}

/**
 * Returns a wallet derived from the CA's root private key.
 * Used for all admin actions (approve, revoke, issue certificate).
 */
async function getAdminWallet(): Promise<ethers.Wallet> {
  const config = await prisma.caConfig.findFirst();
  if (!config?.rootKeyPem) throw new Error("CA root key not configured");
  return deriveWallet(config.rootKeyPem);
}

/**
 * Public helper: returns the derived blockchain wallet address for a given user.
 * Users must fund this address with Fuji AVAX to pay for gas.
 */
export async function getDerivedWalletAddress(userId: string): Promise<string> {
  const wallet = await getUserWallet(userId);
  return wallet.address;
}

/**
 * Public helper: returns the admin's derived blockchain wallet address.
 */
export async function getAdminWalletAddress(): Promise<string> {
  const wallet = await getAdminWallet();
  return wallet.address;
}

function getContract(wallet: ethers.Wallet) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
}

// RequestStatus enum values (must match Solidity enum order)
export const RequestStatus = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as const;

// ===================== Certificate Requests =====================

/**
 * Called after prisma.certificateRequest.create().
 * Submits the CSR hash on-chain so the record is immutably anchored.
 */
export async function scSubmitRequest(
  userId: string,
  requestId: string,
  domain: string,
  csrPem: string
): Promise<void> {
  try {
    const csrPemHash = ethers.sha256(ethers.toUtf8Bytes(csrPem));
    const wallet = await getUserWallet(userId);
    const contract = getContract(wallet);
    const tx = await contract.submitRequest(requestId, userId, domain, csrPemHash);
    await tx.wait();
    console.log(`[SC] submitRequest tx: ${tx.hash}`);
  } catch (err) {
    // Log but do not throw: SC failure must not break the existing Prisma flow
    console.error("[SC] submitRequest failed:", err);
  }
}

/**
 * Called when admin approves a CSR.
 * Updates the request status to APPROVED and issues the certificate on-chain.
 */
export async function scApproveRequestAndIssueCert(
  requestId: string,
  certId: string,
  serialNumber: string,
  userId: string,
  certPem: string,
  subjectDN: string,
  issuerDN: string,
  notBefore: Date,
  notAfter: Date
): Promise<void> {
  try {
    const wallet = await getAdminWallet();
    const contract = getContract(wallet);
    const certPemHash = ethers.sha256(ethers.toUtf8Bytes(certPem));

    const tx1 = await contract.updateRequestStatus(requestId, RequestStatus.APPROVED);
    await tx1.wait();

    const tx2 = await contract.issueCertificate(
      certId,
      serialNumber,
      userId,
      certPemHash,
      subjectDN,
      issuerDN,
      BigInt(Math.floor(notBefore.getTime() / 1000)),
      BigInt(Math.floor(notAfter.getTime() / 1000))
    );
    await tx2.wait();
    console.log(`[SC] issueCertificate tx: ${tx2.hash}`);
  } catch (err) {
    console.error("[SC] approve+issueCert failed:", err);
  }
}

/**
 * Called when admin rejects a CSR.
 */
export async function scRejectRequest(requestId: string): Promise<void> {
  try {
    const wallet = await getAdminWallet();
    const contract = getContract(wallet);
    const tx = await contract.updateRequestStatus(requestId, RequestStatus.REJECTED);
    await tx.wait();
    console.log(`[SC] rejectRequest tx: ${tx.hash}`);
  } catch (err) {
    console.error("[SC] rejectRequest failed:", err);
  }
}

// ===================== Certificates =====================

/**
 * Called when admin renews a certificate.
 * Updates the on-chain record with the new PEM hash and validity period.
 */
export async function scUpdateCertificate(
  certId: string,
  certPem: string,
  notBefore: Date,
  notAfter: Date
): Promise<void> {
  try {
    const wallet = await getAdminWallet();
    const contract = getContract(wallet);
    const certPemHash = ethers.sha256(ethers.toUtf8Bytes(certPem));
    const tx = await contract.updateCertificate(
      certId,
      certPemHash,
      BigInt(Math.floor(notBefore.getTime() / 1000)),
      BigInt(Math.floor(notAfter.getTime() / 1000))
    );
    await tx.wait();
    console.log(`[SC] updateCertificate tx: ${tx.hash}`);
  } catch (err) {
    console.error("[SC] updateCertificate failed:", err);
  }
}

// ===================== Revocation Requests =====================

/**
 * Called when a user submits a revocation request.
 */
export async function scSubmitRevocationRequest(
  userId: string,
  revocationId: string,
  certificateId: string,
  reason: string
): Promise<void> {
  try {
    const wallet = await getUserWallet(userId);
    const contract = getContract(wallet);
    const tx = await contract.submitRevocationRequest(revocationId, certificateId, userId, reason);
    await tx.wait();
    console.log(`[SC] submitRevocationRequest tx: ${tx.hash}`);
  } catch (err) {
    console.error("[SC] submitRevocationRequest failed:", err);
  }
}

/**
 * Called when admin approves a revocation request.
 * Updates status on-chain and adds the serial number to the CRL.
 */
export async function scApproveRevocation(
  revocationId: string,
  serialNumber: string,
  reason: string
): Promise<void> {
  try {
    const wallet = await getAdminWallet();
    const contract = getContract(wallet);

    const tx1 = await contract.updateRevocationRequestStatus(revocationId, RequestStatus.APPROVED);
    await tx1.wait();

    const tx2 = await contract.revokeCertificate(serialNumber, reason);
    await tx2.wait();
    console.log(`[SC] revokeCertificate tx: ${tx2.hash}`);
  } catch (err) {
    console.error("[SC] approveRevocation failed:", err);
  }
}

/**
 * Called when admin rejects a revocation request.
 */
export async function scRejectRevocation(revocationId: string): Promise<void> {
  try {
    const wallet = await getAdminWallet();
    const contract = getContract(wallet);
    const tx = await contract.updateRevocationRequestStatus(revocationId, RequestStatus.REJECTED);
    await tx.wait();
    console.log(`[SC] rejectRevocation tx: ${tx.hash}`);
  } catch (err) {
    console.error("[SC] rejectRevocation failed:", err);
  }
}

// ===================== Read-Only Queries =====================

/**
 * Verifies that the certPem in the local DB has not been tampered with
 * by comparing its hash against the immutable on-chain record.
 */
export async function scVerifyCertificateIntegrity(
  certId: string,
  certPem: string
): Promise<boolean> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const onChainData = await contract.certificates(certId);
    const localHash = ethers.sha256(ethers.toUtf8Bytes(certPem));
    return onChainData.certPemHash === localHash;
  } catch {
    return false;
  }
}

/**
 * Checks whether a certificate serial number has been revoked on-chain.
 */
export async function scIsRevoked(serialNumber: string): Promise<boolean> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    return await contract.isRevoked(serialNumber);
  } catch {
    return false;
  }
}
