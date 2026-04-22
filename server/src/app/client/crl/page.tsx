"use client";
import { useState, useEffect } from "react";

interface RevokedCert { serialNumber: string; subjectDN: string; revokedAt: string; }

export default function ClientCRLPage() {
  const [revokedCerts, setRevokedCerts] = useState<RevokedCert[]>([]);
  const [crlPem, setCrlPem] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/crl").then((r) => r.json()).then((d) => {
      setRevokedCerts(d.revokedCerts || []);
      if (d.crl?.crlPem) setCrlPem(d.crl.crlPem);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tra cứu CRL</h2>
        <p className="text-base-content/60 mt-1">Danh sách chứng chỉ đã thu hồi của toàn hệ thống</p>
      </div>

      <div className="card bg-base-100 border border-base-content/10 shadow-md">
        <div className="card-body">
          <h3 className="card-title">Chứng chỉ đã thu hồi ({revokedCerts.length})</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Serial Number</th><th>Subject</th><th>Ngày thu hồi</th></tr></thead>
              <tbody>
                {revokedCerts.map((c, i) => (
                  <tr key={i} className="hover">
                    <td className="font-mono text-xs">{c.serialNumber.slice(0, 16)}...</td>
                    <td className="text-xs max-w-[300px] truncate">{c.subjectDN}</td>
                    <td className="text-xs">{c.revokedAt ? new Date(c.revokedAt).toLocaleString("vi-VN") : "-"}</td>
                  </tr>
                ))}
                {revokedCerts.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-base-content/50">Chưa có chứng chỉ nào bị thu hồi</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {crlPem && (
        <div className="card bg-base-100 border border-base-content/10 shadow-md">
          <div className="card-body">
            <h3 className="card-title">CRL PEM</h3>
            <div className="mockup-code text-xs max-h-48 overflow-auto"><pre><code>{crlPem}</code></pre></div>
            <div className="card-actions justify-end">
              <a href={`data:application/x-pem-file;charset=utf-8,${encodeURIComponent(crlPem)}`} download="crl.pem" className="btn btn-outline btn-sm">Download CRL</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
