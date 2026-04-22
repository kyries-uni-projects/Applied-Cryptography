"use client";
import { useState, useEffect, useCallback } from "react";

interface Revocation {
  id: string; reason: string; status: string; createdAt: string;
  user: { username: string };
  certificate: { serialNumber: string; subjectDN: string };
}

export default function RevocationsPage() {
  const [revocations, setRevocations] = useState<Revocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/revocations");
    setRevocations(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    setActionLoading(id);
    try {
      await fetch("/api/admin/revocations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocationId: id, action }),
      });
      fetchData();
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
      <div>
        <h2 className="text-2xl font-bold">Yêu cầu thu hồi chứng chỉ</h2>
        <p className="text-base-content/60 mt-1">Phê duyệt hoặc từ chối yêu cầu thu hồi từ người dùng</p>
      </div>

      <div className="card bg-base-100 border border-base-content/10 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>User</th><th>Serial (cert)</th><th>Subject</th><th>Lý do</th><th>Trạng thái</th><th>Ngày</th><th>Hành động</th></tr></thead>
            <tbody>
              {revocations.map((r) => (
                <tr key={r.id} className="hover">
                  <td className="font-medium">{r.user.username}</td>
                  <td className="font-mono text-xs">{r.certificate.serialNumber.slice(0, 8)}...</td>
                  <td className="text-xs max-w-[200px] truncate">{r.certificate.subjectDN}</td>
                  <td className="text-xs max-w-[200px] truncate">{r.reason}</td>
                  <td>{badge(r.status)}</td>
                  <td className="text-xs">{new Date(r.createdAt).toLocaleString("vi-VN")}</td>
                  <td>
                    {r.status === "PENDING" && (
                      <div className="flex gap-1">
                        <button className="btn btn-success btn-xs" onClick={() => handleAction(r.id, "APPROVE")} disabled={actionLoading === r.id}>Duyệt</button>
                        <button className="btn btn-error btn-xs" onClick={() => handleAction(r.id, "REJECT")} disabled={actionLoading === r.id}>Từ chối</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {revocations.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-base-content/50">Chưa có yêu cầu thu hồi nào</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
