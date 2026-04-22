"use client";

import { useState, useEffect, useCallback } from "react";

interface CertRequest {
  id: string;
  domain: string;
  status: string;
  rejectReason: string | null;
  csrPem: string;
  createdAt: string;
  user: { username: string };
  keyPair: { label: string; keyLength: number };
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<CertRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewCsr, setViewCsr] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/admin/requests");
    setRequests(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/requests/${id}/approve`, { method: "POST" });
      if (res.ok) fetchRequests();
    } finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActionLoading(rejectId);
    try {
      await fetch(`/api/admin/requests/${rejectId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectId(null); setRejectReason(""); fetchRequests();
    } finally { setActionLoading(null); }
  };

  const badge = (s: string) => {
    if (s === "PENDING") return <span className="badge badge-warning">Chờ duyệt</span>;
    if (s === "APPROVED") return <span className="badge badge-success">Đã duyệt</span>;
    return <span className="badge badge-error">Từ chối</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Yêu cầu CSR</h2>
          <p className="text-base-content/60 mt-1">Phê duyệt hoặc từ chối CSR</p>
        </div>
        <button onClick={fetchRequests} className="btn btn-ghost btn-sm">Làm mới</button>
      </div>

      <div className="card bg-base-100 border border-base-content/10 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>User</th><th>Domain</th><th>Key</th><th>Trạng thái</th><th>Ngày</th><th>Hành động</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="hover">
                  <td className="font-medium">{r.user.username}</td>
                  <td className="font-mono text-sm">{r.domain}</td>
                  <td className="text-xs">{r.keyPair.label} ({r.keyPair.keyLength}bit)</td>
                  <td>{badge(r.status)}</td>
                  <td className="text-xs">{new Date(r.createdAt).toLocaleString("vi-VN")}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs" onClick={() => setViewCsr(r.csrPem)}>Xem</button>
                      {r.status === "PENDING" && (
                        <>
                          <button className="btn btn-success btn-xs" onClick={() => handleApprove(r.id)} disabled={actionLoading === r.id}>
                            {actionLoading === r.id ? <span className="loading loading-spinner loading-xs"></span> : "Duyệt"}
                          </button>
                          <button className="btn btn-error btn-xs" onClick={() => setRejectId(r.id)}>Từ chối</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-base-content/50">Chưa có yêu cầu nào</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {rejectId && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Từ chối CSR</h3>
            <textarea className="textarea textarea-bordered w-full mt-4" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Lý do..." />
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => { setRejectId(null); setRejectReason(""); }}>Hủy</button>
              <button className="btn btn-error" onClick={handleReject}>Từ chối</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setRejectId(null)}>close</button></form>
        </dialog>
      )}

      {viewCsr && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg">CSR PEM</h3>
            <div className="mockup-code text-xs mt-4 max-h-96 overflow-auto"><pre><code>{viewCsr}</code></pre></div>
            <div className="modal-action"><button className="btn" onClick={() => setViewCsr(null)}>Đóng</button></div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setViewCsr(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
