"use client";
import { useState, useEffect, useCallback } from "react";

interface Cert {
  id: string; certPem: string; serialNumber: string; subjectDN: string;
  issuerDN: string; notBefore: string; notAfter: string; status: string;
  revokedAt: string | null; createdAt: string;
  user: { username: string }; request: { domain: string } | null;
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewCert, setViewCert] = useState<Cert | null>(null);

  const fetchCerts = useCallback(async () => {
    const res = await fetch("/api/admin/certificates");
    setCerts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  const handleRevoke = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn thu hồi chứng chỉ này?")) return;
    setActionLoading(id);
    try {
      await fetch("/api/admin/certificates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateId: id, reason: "Admin thu hồi" }),
      });
      fetchCerts();
    } finally { setActionLoading(null); }
  };

  const handleRenew = async (id: string) => {
    if (!confirm("Gia hạn sẽ thu hồi cert cũ và tạo cert mới. Tiếp tục?")) return;
    setActionLoading(id);
    try {
      await fetch(`/api/admin/certificates/${id}/renew`, { method: "POST" });
      fetchCerts();
    } finally { setActionLoading(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Chứng chỉ đã cấp</h2>
          <p className="text-base-content/60 mt-1">Quản lý các chứng nhận X.509 đã phát hành</p>
        </div>
        <button onClick={fetchCerts} className="btn btn-ghost btn-sm">Làm mới</button>
      </div>

      <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>User</th><th>Domain</th><th>Serial (8 ký tự)</th><th>Hiệu lực</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id} className="hover">
                  <td className="font-medium">{c.user.username}</td>
                  <td className="font-mono text-xs">{c.request?.domain || "N/A"}</td>
                  <td className="font-mono text-xs">{c.serialNumber.slice(0, 8)}...</td>
                  <td className="text-xs">{new Date(c.notBefore).toLocaleDateString("vi-VN")} → {new Date(c.notAfter).toLocaleDateString("vi-VN")}</td>
                  <td>
                    <span className={`badge ${c.status === "ACTIVE" ? "badge-success" : "badge-error"}`}>
                      {c.status === "ACTIVE" ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs" onClick={() => setViewCert(c)}>Xem</button>
                      {c.status === "ACTIVE" && (
                        <>
                          <button className="btn btn-warning btn-xs" onClick={() => handleRenew(c.id)} disabled={actionLoading === c.id}>Gia hạn</button>
                          <button className="btn btn-error btn-xs" onClick={() => handleRevoke(c.id)} disabled={actionLoading === c.id}>Thu hồi</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {certs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-base-content/50">Chưa có chứng chỉ nào</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {viewCert && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Chi tiết chứng chỉ</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-base-content/50">Subject</p><p className="font-mono break-all">{viewCert.subjectDN}</p></div>
              <div><p className="text-xs text-base-content/50">Issuer</p><p className="font-mono break-all">{viewCert.issuerDN}</p></div>
              <div><p className="text-xs text-base-content/50">Serial</p><p className="font-mono break-all">{viewCert.serialNumber}</p></div>
              <div><p className="text-xs text-base-content/50">Status</p><span className={`badge ${viewCert.status === "ACTIVE" ? "badge-success" : "badge-error"}`}>{viewCert.status}</span></div>
            </div>
            <div className="divider">PEM</div>
            <div className="mockup-code text-xs max-h-48 overflow-auto"><pre><code>{viewCert.certPem}</code></pre></div>
            <div className="modal-action">
              <a href={`data:application/x-pem-file;charset=utf-8,${encodeURIComponent(viewCert.certPem)}`} download={`cert-${viewCert.serialNumber.slice(0,8)}.pem`} className="btn btn-outline btn-sm">Download</a>
              <button className="btn" onClick={() => setViewCert(null)}>Đóng</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setViewCert(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
