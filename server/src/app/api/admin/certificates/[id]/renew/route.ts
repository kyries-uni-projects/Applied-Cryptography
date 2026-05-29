import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signCertificate, generateSerialNumber } from "@/lib/crypto";
import { logAction } from "@/lib/audit";
import { scIssueCertificate, scRevokeCertificate } from "@/lib/sc-client";
import { MASTER_KEY } from "@/lib/env";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const userId = request.headers.get("x-user-id");
		const username = request.headers.get("x-username") || "admin";

		const cert = await prisma.certificate.findUnique({
			where: { id },
			include: {
				request: true,
				user: { select: { username: true } },
			},
		});

		if (!cert) {
			return NextResponse.json({ error: "Chứng chỉ không tồn tại" }, { status: 404 });
		}

		let requestId = cert.requestId ?? cert.request?.id ?? null;
		let csrPem = cert.request?.csrPem ?? null;
		if (!requestId || !csrPem) {
			const previousWithRequest = await prisma.certificate.findFirst({
				where: {
					userId: cert.userId,
					subjectDN: cert.subjectDN,
					requestId: { not: null },
				},
				orderBy: { createdAt: "desc" },
				select: {
					requestId: true,
					request: {
						select: {
							id: true,
							csrPem: true,
						},
					},
				},
			});

			requestId = previousWithRequest?.requestId ?? previousWithRequest?.request?.id ?? null;
			csrPem = previousWithRequest?.request?.csrPem ?? null;
		}

		if (!requestId || !csrPem) {
			return NextResponse.json({ error: "Không tìm thấy CSR gốc" }, { status: 400 });
		}

		const config = await prisma.caConfig.findFirst();
		if (!config?.rootCertPem || !config?.rootKeyPem) {
			return NextResponse.json({ error: "Root Certificate chưa được tạo" }, { status: 400 });
		}

		// Sign new cert with same CSR
		const serialNumber = generateSerialNumber();
		const result = signCertificate({
			csrPem,
			rootCertPem: config.rootCertPem,
			rootKeyPem: config.rootKeyPem,
			serialNumber,
			validityDays: config.validityDays,
			hashAlgorithm: config.hashAlgorithm,
			passphrase: MASTER_KEY,
		});

		const newCert = await prisma.$transaction(async (tx) => {
			// Move requestId from old cert to new cert so domain/CSR linkage survives renewals.
			await tx.certificate.update({
				where: { id },
				data: { status: "REVOKED", revokedAt: new Date(), requestId: null },
			});

			return tx.certificate.create({
				data: {
					requestId,
					userId: cert.userId,
					certPem: result.certPem,
					serialNumber: result.serialNumber,
					subjectDN: result.subjectDN,
					issuerDN: result.issuerDN,
					notBefore: result.notBefore,
					notAfter: result.notAfter,
				},
			});
		});

		try {
			// Anchor revocation of old cert on-chain
			await scRevokeCertificate(cert.serialNumber, "Superseded (Renewed)");

			// Issue the new certificate on-chain
			await scIssueCertificate(
				newCert.id,
				newCert.serialNumber,
				newCert.userId,
				result.certPem,
				result.subjectDN,
				result.issuerDN,
				result.notBefore,
				result.notAfter
			);
		} catch (err) {
			// Revert DB on blockchain failure
			await prisma.$transaction([
				prisma.certificate.delete({ where: { id: newCert.id } }),
				prisma.certificate.update({
					where: { id: cert.id },
					data: { status: "ACTIVE", revokedAt: null, requestId: cert.requestId },
				}),
			]);
			throw err;
		}

		await logAction(
			userId,
			username,
			"RENEW_CERT",
			`Gia hạn chứng chỉ SN:${cert.serialNumber.slice(0, 16)}... → SN:${newCert.serialNumber.slice(0, 16)}... (user: ${cert.user.username})`,
		);

		return NextResponse.json({ success: true, newCertId: newCert.id });
	} catch (error) {
		console.error("Renew certificate error:", error);
		return NextResponse.json({ error: "Lỗi gia hạn chứng chỉ" }, { status: 500 });
	}
}
