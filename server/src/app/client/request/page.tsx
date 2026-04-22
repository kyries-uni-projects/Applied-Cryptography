"use client";
import { useState, useEffect } from "react";

interface KeyPairData { id: string; label: string; keyLength: number; }

export default function RequestPage() {
  const [keys, setKeys] = useState<KeyPairData[]>([]);
  const [keyPairId, setKeyPairId] = useState("");
  const [domain, setDomain] = useState("");
  const [country, setCountry] = useState("VN");
  const [organization, setOrganization] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetch("/api/client/keys").then((r) => r.json()).then((d) => { setKeys(d); if (d.length > 0) setKeyPairId(d[0].id); }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/client/csr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyPairId, domain, country, organization }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `CSR đã được tạo và gửi cho Admin duyệt! (Domain: ${domain})` });
        setDomain(""); setOrganization("");
      } else { setMessage({ type: "error", text: data.error }); }
    } catch { setMessage({ type: "error", text: "Lỗi kết nối" }); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Yêu cầu cấp chứng chỉ</h2>
        <p className="text-base-content/60 mt-1">Tạo Certificate Signing Request (CSR) cho website của bạn</p>
      </div>

      {message.text && <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"} animate-fade-in`}>{message.text}</div>}

      {keys.length === 0 ? (
        <div className="alert alert-warning">Bạn chưa có cặp khóa nào. Vui lòng tạo cặp khóa trước tại mục &quot;Cặp khóa&quot;.</div>
      ) : (
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Thông tin CSR</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Cặp khóa *</span></label>
                  <select className="select select-bordered w-full" value={keyPairId} onChange={(e) => setKeyPairId(e.target.value)}>
                    {keys.map((k) => <option key={k.id} value={k.id}>{k.label} ({k.keyLength} bits)</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Tên miền Website (CN) *</span></label>
                  <input type="text" className="input input-bordered" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Quốc gia (C)</span></label>
                  <input type="text" className="input input-bordered" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Tổ chức (O)</span></label>
                  <input type="text" className="input input-bordered" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="My Company" />
                </div>
              </div>
              <div className="card-actions justify-end">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="loading loading-spinner loading-sm"></span> : "Gửi yêu cầu CSR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
