"use client";
import { useState, useEffect } from "react";

interface RevokedCert {
	serialNumber: string;
	subjectDN: string;
	revokedAt: string;
}

interface ParsedCRL {
	version: number;
	issuerDN: string;
	thisUpdate: string;
	nextUpdate: string | null;
	signatureAlgorithm: string;
	revokedCertificates: { serialNumber: string; revocationDate: string }[];
	totalRevoked: number;
}

export default function ClientCRLPage() {
	const [revokedCerts, setRevokedCerts] = useState<RevokedCert[]>([]);
	const [crlPem, setCrlPem] = useState("");
	const [parsed, setParsed] = useState<ParsedCRL | null>(null);
	const [loading, setLoading] = useState(true);
	const [showPem, setShowPem] = useState(false);

	useEffect(() => {
		fetch("/api/client/crl")
			.then((r) => r.json())
			.then((d) => {
				setRevokedCerts(d.revokedCerts || []);
				if (d.crl?.crlPem) setCrlPem(d.crl.crlPem);
				if (d.parsed) setParsed(d.parsed);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading)
		return (
			<div className="flex justify-center py-20">
				<span className="loading loading-spinner loading-lg text-primary"></span>
			</div>
		);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Tra cứu CRL</h2>
				<p className="text-base-content/60 mt-1">Danh sách chứng chỉ đã thu hồi của toàn hệ thống</p>
			</div>

			{/* CRL Info Card */}
			{parsed && (
				<div className="card bg-base-100 border border-base-content/10 shadow-md">
					<div className="card-body">
						<h3 className="card-title">Thông tin CRL</h3>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
							<div>
								<p className="text-xs text-base-content/50 uppercase">Phiên bản</p>
								<p className="font-medium">v{parsed.version}</p>
							</div>
							<div>
								<p className="text-xs text-base-content/50 uppercase">Ngày phát hành</p>
								<p className="font-medium">{new Date(parsed.thisUpdate).toLocaleString("vi-VN")}</p>
							</div>
							<div>
								<p className="text-xs text-base-content/50 uppercase">Cập nhật tiếp theo</p>
								<p className="font-medium">{parsed.nextUpdate ? new Date(parsed.nextUpdate).toLocaleString("vi-VN") : "-"}</p>
							</div>
							<div className="col-span-2 md:col-span-3">
								<p className="text-xs text-base-content/50 uppercase">Nhà phát hành (Issuer)</p>
								<p className="font-medium font-mono text-sm">{parsed.issuerDN}</p>
							</div>
							<div>
								<p className="text-xs text-base-content/50 uppercase">Thuật toán ký</p>
								<p className="font-medium">{parsed.signatureAlgorithm}</p>
							</div>
							<div>
								<p className="text-xs text-base-content/50 uppercase">Tổng chứng chỉ thu hồi</p>
								<p className="font-medium text-error">{parsed.totalRevoked}</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Revoked Certificates Table */}
			<div className="card bg-base-100 border border-base-content/10 shadow-md">
				<div className="card-body">
					<h3 className="card-title">Chứng chỉ đã thu hồi ({revokedCerts.length})</h3>
					<div className="overflow-x-auto">
						<table className="table table-sm">
							<thead>
								<tr>
									<th>Serial Number</th>
									<th>Subject</th>
									<th>Ngày thu hồi</th>
								</tr>
							</thead>
							<tbody>
								{revokedCerts.map((c, i) => (
									<tr key={i} className="hover">
										<td className="font-mono text-xs">{c.serialNumber}</td>
										<td className="text-xs max-w-[300px] truncate">{c.subjectDN}</td>
										<td className="text-xs">{c.revokedAt ? new Date(c.revokedAt).toLocaleString("vi-VN") : "-"}</td>
									</tr>
								))}
								{revokedCerts.length === 0 && (
									<tr>
										<td colSpan={3} className="text-center py-8 text-base-content/50">
											Chưa có chứng chỉ nào bị thu hồi
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* CRL PEM (collapsible) */}
			{crlPem && (
				<div className="card bg-base-100 border border-base-content/10 shadow-md">
					<div className="card-body">
						<div className="flex justify-between items-center">
							<h3 className="card-title">CRL PEM</h3>
							<button className="btn btn-ghost btn-sm" onClick={() => setShowPem(!showPem)}>
								{showPem ? "Ẩn" : "Hiện"}
							</button>
						</div>
						{showPem && (
							<pre className="bg-base-300 rounded-box p-4 text-xs max-h-48 overflow-auto whitespace-pre-wrap break-all mt-2">{crlPem}</pre>
						)}
						<div className="card-actions justify-end mt-2">
							<a
								href={`data:application/x-pem-file;charset=utf-8,${encodeURIComponent(crlPem)}`}
								download="crl.pem"
								className="btn btn-outline btn-sm"
							>
								Download CRL
							</a>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
