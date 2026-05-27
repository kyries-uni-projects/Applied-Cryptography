"use client";
import { useState, useEffect } from "react";

interface ParsedCRL {
	version: number;
	issuerDN: string;
	thisUpdate: string;
	nextUpdate: string | null;
	signatureAlgorithm: string;
	revokedCertificates: { serialNumber: string; revocationDate: string }[];
	totalRevoked: number;
}

interface CRLData {
	crlPem: string;
	issuedAt: string;
	nextUpdate: string;
	parsed?: ParsedCRL;
}

export default function CRLPage() {
	const [crl, setCrl] = useState<CRLData | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [showPem, setShowPem] = useState(false);

	const loadCRL = () => {
		fetch("/api/admin/crl")
			.then((r) => r.json())
			.then((d) => {
				if (d?.crlPem) setCrl(d);
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadCRL();
	}, []);

	const handleGenerate = async () => {
		setGenerating(true);
		setMessage({ type: "", text: "" });
		try {
			const res = await fetch("/api/admin/crl", { method: "POST" });
			const data = await res.json();
			if (res.ok) {
				setMessage({ type: "success", text: `CRL cập nhật thành công! (${data.entriesCount} chứng chỉ thu hồi)` });
				// Reload to get parsed data
				loadCRL();
			} else {
				setMessage({ type: "error", text: data.error });
			}
		} catch {
			setMessage({ type: "error", text: "Lỗi kết nối" });
		} finally {
			setGenerating(false);
		}
	};

	if (loading)
		return (
			<div className="flex justify-center py-20">
				<span className="loading loading-spinner loading-lg text-primary"></span>
			</div>
		);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-2xl font-bold">Certificate Revocation List (CRL)</h2>
					<p className="text-base-content/60 mt-1">Danh sách chứng chỉ đã thu hồi</p>
				</div>
				<button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
					{generating ? <span className="loading loading-spinner loading-sm"></span> : "Cập nhật CRL"}
				</button>
			</div>

			{message.text && <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"} animate-fade-in`}>{message.text}</div>}

			{crl ? (
				<>
					{/* CRL Info Card */}
					<div className="card bg-base-100 border border-base-content/10 shadow-md">
						<div className="card-body">
							<h3 className="card-title">Thông tin CRL</h3>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<div>
									<p className="text-xs text-base-content/50 uppercase">Phiên bản</p>
									<p className="font-medium">v{crl.parsed?.version ?? "?"}</p>
								</div>
								<div>
									<p className="text-xs text-base-content/50 uppercase">Ngày phát hành</p>
									<p className="font-medium">{new Date(crl.issuedAt).toLocaleString("vi-VN")}</p>
								</div>
								<div>
									<p className="text-xs text-base-content/50 uppercase">Cập nhật tiếp theo</p>
									<p className="font-medium">{new Date(crl.nextUpdate).toLocaleString("vi-VN")}</p>
								</div>
								<div className="col-span-2 md:col-span-3">
									<p className="text-xs text-base-content/50 uppercase">Nhà phát hành (Issuer)</p>
									<p className="font-medium font-mono text-sm">{crl.parsed?.issuerDN ?? "-"}</p>
								</div>
								<div>
									<p className="text-xs text-base-content/50 uppercase">Thuật toán ký</p>
									<p className="font-medium">{crl.parsed?.signatureAlgorithm ?? "-"}</p>
								</div>
								<div>
									<p className="text-xs text-base-content/50 uppercase">Tổng chứng chỉ thu hồi</p>
									<p className="font-medium text-error">{crl.parsed?.totalRevoked ?? 0}</p>
								</div>
							</div>
						</div>
					</div>

					{/* Revoked Certificates Table */}
					<div className="card bg-base-100 border border-base-content/10 shadow-md">
						<div className="card-body">
							<h3 className="card-title">Chứng chỉ đã thu hồi ({crl.parsed?.totalRevoked ?? 0})</h3>
							<div className="overflow-x-auto">
								<table className="table table-sm">
									<thead>
										<tr>
											<th>#</th>
											<th>Serial Number</th>
											<th>Ngày thu hồi</th>
										</tr>
									</thead>
									<tbody>
										{crl.parsed?.revokedCertificates.map((rc, i) => (
											<tr key={i} className="hover">
												<td className="text-base-content/50">{i + 1}</td>
												<td className="font-mono text-xs">{rc.serialNumber}</td>
												<td className="text-xs">{new Date(rc.revocationDate).toLocaleString("vi-VN")}</td>
											</tr>
										))}
										{(!crl.parsed?.revokedCertificates || crl.parsed.revokedCertificates.length === 0) && (
											<tr>
												<td colSpan={3} className="text-center py-8 text-base-content/50">
													Chưa có chứng chỉ nào bị thu hồi trong CRL
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* CRL PEM (collapsible) */}
					<div className="card bg-base-100 border border-base-content/10 shadow-md">
						<div className="card-body">
							<div className="flex justify-between items-center">
								<h3 className="card-title">CRL PEM</h3>
								<button className="btn btn-ghost btn-sm" onClick={() => setShowPem(!showPem)}>
									{showPem ? "Ẩn" : "Hiện"}
								</button>
							</div>
							{showPem && (
								<pre className="bg-base-300 rounded-box p-4 text-xs max-h-64 overflow-auto whitespace-pre-wrap break-all mt-2">{crl.crlPem}</pre>
							)}
							<div className="card-actions justify-end mt-2">
								<a
									href={`data:application/x-pem-file;charset=utf-8,${encodeURIComponent(crl.crlPem)}`}
									download="crl.pem"
									className="btn btn-outline btn-sm"
								>
									Download CRL
								</a>
							</div>
						</div>
					</div>
				</>
			) : (
				<div className="card bg-base-100 border border-base-content/10">
					<div className="card-body text-center py-12">
						<p className="text-base-content/50">Chưa có CRL nào. Nhấn &quot;Cập nhật CRL&quot; để tạo.</p>
					</div>
				</div>
			)}
		</div>
	);
}
