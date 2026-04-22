"use client";
import { useState, useEffect } from "react";

export default function CRLPage() {
  const [crl, setCrl] = useState<{ crlPem: string; issuedAt: string; nextUpdate: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetch("/api/admin/crl").then((r) => r.json()).then((d) => { if (d?.crlPem) setCrl(d); }).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true); setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/admin/crl", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCrl({ crlPem: data.crlPem, issuedAt: new Date().toISOString(), nextUpdate: new Date(Date.now() + 30 * 86400000).toISOString() });
        setMessage({ type: "success", text: `CRL cập nhật thành công! (${data.entriesCount} chứng chỉ thu hồi)` });
      } else { setMessage({ type: "error", text: data.error }); }
    } catch { setMessage({ type: "error", text: "Lỗi kết nối" }); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

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
        <div className="card bg-base-100 border border-base-content/10 shadow-md">
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><p className="text-xs text-base-content/50 uppercase">Ngày phát hành</p><p className="font-medium">{new Date(crl.issuedAt).toLocaleString("vi-VN")}</p></div>
              <div><p className="text-xs text-base-content/50 uppercase">Cập nhật tiếp theo</p><p className="font-medium">{new Date(crl.nextUpdate).toLocaleString("vi-VN")}</p></div>
            </div>
            <div className="divider">CRL PEM</div>
            <div className="mockup-code text-xs max-h-64 overflow-auto"><pre><code>{crl.crlPem}</code></pre></div>
            <div className="card-actions justify-end mt-4">
              <a href={`data:application/x-pem-file;charset=utf-8,${encodeURIComponent(crl.crlPem)}`} download="crl.pem" className="btn btn-outline btn-sm">Download CRL</a>
            </div>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 border border-base-content/10"><div className="card-body text-center py-12"><p className="text-base-content/50">Chưa có CRL nào. Nhấn &quot;Cập nhật CRL&quot; để tạo.</p></div></div>
      )}
    </div>
  );
}
