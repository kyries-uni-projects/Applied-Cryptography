"use client";
import { useState, useEffect, useCallback } from "react";

interface Log { id: string; username: string; action: string; details: string; createdAt: string; }

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/logs?page=${page}&limit=25`);
    const data = await res.json();
    setLogs(data.logs); setTotal(data.total);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Nhật ký hệ thống</h2>
        <p className="text-base-content/60 mt-1">Theo dõi các hoạt động chính của hệ thống ({total} mục)</p>
      </div>

      <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary"></span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Chi tiết</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="hover">
                    <td className="text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString("vi-VN")}</td>
                    <td><span className="badge badge-ghost badge-sm">{l.username}</span></td>
                    <td><span className="font-mono text-xs badge badge-outline badge-sm">{l.action}</span></td>
                    <td className="text-xs text-base-content/70 max-w-md truncate">{l.details}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-base-content/50">Chưa có nhật ký nào</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center py-4">
            <div className="join">
              <button className="join-item btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>«</button>
              <button className="join-item btn btn-sm">Trang {page}/{totalPages}</button>
              <button className="join-item btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
