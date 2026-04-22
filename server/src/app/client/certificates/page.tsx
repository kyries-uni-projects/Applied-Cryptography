"use client";
import { useState, useEffect } from "react";

interface CertReq { id: string; domain: string; status: string; rejectReason: string | null; createdAt: string; }
interface Cert { id: string; certPem: string; serialNumber: string; subjectDN: string; notBefore: string; notAfter: string; status: string; request: { domain: string } | null; }

export default function CertificatesPage() {
  const [requests, setRequests] = useState<CertReq[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewCert, setViewCert] = useState<Cert | null>(null);

  useEffect(() => {
    fetch("/api/client/certificates").then((r) => r.json()).then((d) => { setRequests(d.requests); setCerts(d.certificates); }).finally(() => setLoading(false));
  }, []);

  const badge = (s: string) => {
    if (s === "PENDING") return <span className="badge badge-warning badge-sm">Chờ duyệt</span>;
    if (s === "APPROVED") return <span className="badge badge-success badge-sm">Đã duyệt</span>;
    if (s === "ACTIVE") return <span className="badge badge-success badge-sm">Active</span>;
    if (s === "REVOKED") return <span className="badge badge-error badge-sm">Revoked</span>;
    return <span className="badge badge-error badge-sm">Từ chối</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Chứng chỉ của tôi</h2>
        <p className="text-base-content/60 mt-1">Theo dõi yêu cầu CSR và chứng chỉ đã cấp</p>
      </div>

      {/* Requests */}
      <div className="card bg-base-100 border border-base-content/10 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-lg">Yêu cầu CSR ({requests.length})</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Domain</th><th>Trạng thái</th><th>Ngày tạo</th><th>Ghi chú</th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="hover">
                    <td className="font-mono text-sm">{r.domain}</td>
                    <td>{badge(r.status)}</td>
                    <td className="text-xs">{new Date(r.createdAt).toLocaleString("vi-VN")}</td>
                    <td className="text-xs text-base-content/50">{r.rejectReason || "-"}</td>
                  </tr>
                ))}
                {requests.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-base-content/50">Chưa có yêu cầu nào</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Certificates */}
      <div className="card bg-base-100 border border-base-content/10 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-lg">Chứng chỉ đã cấp ({certs.length})</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Domain</th><th>Serial</th><th>Hiệu lực</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id} className="hover">
                    <td className="font-mono text-sm">{c.request?.domain || "N/A"}</td>
                    <td className="font-mono text-xs">{c.serialNumber.slice(0, 8)}...</td>
                    <td className="text-xs">{new Date(c.notBefore).toLocaleDateString("vi-VN")} → {new Date(c.notAfter).toLocaleDateString("vi-VN")}</td>
                    <td>{badge(c.status)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-xs" onClick={() => setViewCert(c)}>Xem</button>
                        <a href={`data:application/x-pem-file;charset=utf-8,${encodeURIComponent(c.certPem)}`} download={`cert-${c.serialNumber.slice(0,8)}.pem`} className="btn btn-outline btn-xs">Download</a>
                      </div>
                    </td>
                  </tr>
                ))}
                {certs.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-base-content/50">Chưa có chứng chỉ nào</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewCert && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Chi tiết chứng chỉ</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-base-content/50">Subject</p><p className="font-mono break-all">{viewCert.subjectDN}</p></div>
              <div><p className="text-xs text-base-content/50">Serial</p><p className="font-mono break-all">{viewCert.serialNumber}</p></div>
            </div>
            <div className="divider">PEM</div>
            <div className="mockup-code text-xs max-h-48 overflow-auto"><pre><code>{viewCert.certPem}</code></pre></div>
            <div className="modal-action"><button className="btn" onClick={() => setViewCert(null)}>Đóng</button></div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setViewCert(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
