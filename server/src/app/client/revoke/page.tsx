"use client";
import { useState, useEffect } from "react";

interface Cert { id: string; serialNumber: string; subjectDN: string; status: string; request: { domain: string } | null; }

export default function RevokePage() {
  const [certs, setCerts] = useState<Cert[]>([]);
  const [certificateId, setCertificateId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetch("/api/client/certificates").then((r) => r.json()).then((d) => {
      const active = d.certificates.filter((c: Cert) => c.status === "ACTIVE");
      setCerts(active);
      if (active.length > 0) setCertificateId(active[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/client/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateId, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Yêu cầu thu hồi đã được gửi cho Admin duyệt!" });
        setReason("");
      } else { setMessage({ type: "error", text: data.error }); }
    } catch { setMessage({ type: "error", text: "Lỗi kết nối" }); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Yêu cầu thu hồi chứng chỉ</h2>
        <p className="text-base-content/60 mt-1">Gửi yêu cầu thu hồi chứng chỉ X.509 đã cấp cho bạn</p>
      </div>

      {message.text && <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"} animate-fade-in`}>{message.text}</div>}

      {certs.length === 0 ? (
        <div className="alert alert-info">Bạn không có chứng chỉ active nào để thu hồi.</div>
      ) : (
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Chọn chứng chỉ cần thu hồi *</span></label>
                <select className="select select-bordered w-full" value={certificateId} onChange={(e) => setCertificateId(e.target.value)}>
                  {certs.map((c) => <option key={c.id} value={c.id}>{c.request?.domain || c.subjectDN} (SN: {c.serialNumber.slice(0, 8)}...)</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Lý do thu hồi *</span></label>
                <textarea className="textarea textarea-bordered h-24" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do..." required />
              </div>
              <div className="card-actions justify-end">
                <button type="submit" className="btn btn-error" disabled={submitting}>
                  {submitting ? <span className="loading loading-spinner loading-sm"></span> : "Gửi yêu cầu thu hồi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
