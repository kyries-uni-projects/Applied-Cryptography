"use client";
import { useState, useEffect, useCallback } from "react";

interface UploadedCert { id: string; label: string; subjectDN: string; issuerDN: string; notBefore: string; notAfter: string; certPem: string; createdAt: string; }

export default function UploadPage() {
  const [certs, setCerts] = useState<UploadedCert[]>([]);
  const [certPem, setCertPem] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [viewCert, setViewCert] = useState<UploadedCert | null>(null);

  const fetchCerts = useCallback(async () => {
    const res = await fetch("/api/client/upload");
    setCerts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCertPem(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true); setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/client/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certPem, label }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Upload chứng chỉ thành công!" });
        setCertPem(""); setLabel("");
        fetchCerts();
      } else { setMessage({ type: "error", text: data.error }); }
    } catch { setMessage({ type: "error", text: "Lỗi kết nối" }); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Upload chứng chỉ</h2>
        <p className="text-base-content/60 mt-1">Upload chứng chỉ bên ngoài để theo dõi và xem thông tin</p>
      </div>

      {message.text && <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"} animate-fade-in`}>{message.text}</div>}

      <div className="card bg-base-100 border border-base-content/10 shadow-md">
        <div className="card-body">
          <h3 className="card-title">Upload Certificate PEM</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Nhãn (tùy chọn)</span></label>
              <input type="text" className="input input-bordered" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="VD: Google SSL Cert" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">File PEM hoặc paste nội dung</span></label>
              <input type="file" accept=".pem,.crt,.cer" onChange={handleFileChange} className="file-input file-input-bordered w-full" />
            </div>
            <div className="form-control">
              <textarea className="textarea textarea-bordered h-32 font-mono text-xs" value={certPem} onChange={(e) => setCertPem(e.target.value)} placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----" />
            </div>
            <div className="card-actions justify-end">
              <button type="submit" className="btn btn-primary" disabled={uploading || !certPem}>
                {uploading ? <span className="loading loading-spinner loading-sm"></span> : "Upload"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Uploaded certs list */}
      <div className="card bg-base-100 border border-base-content/10 shadow-md overflow-hidden">
        <div className="card-body">
          <h3 className="card-title">Chứng chỉ đã upload ({certs.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>Nhãn</th><th>Subject</th><th>Issuer</th><th>Hiệu lực</th><th>Hành động</th></tr></thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id} className="hover">
                  <td className="font-medium">{c.label}</td>
                  <td className="text-xs max-w-[200px] truncate">{c.subjectDN}</td>
                  <td className="text-xs max-w-[200px] truncate">{c.issuerDN}</td>
                  <td className="text-xs whitespace-nowrap">{new Date(c.notBefore).toLocaleDateString("vi-VN")} → {new Date(c.notAfter).toLocaleDateString("vi-VN")}</td>
                  <td><button className="btn btn-ghost btn-xs" onClick={() => setViewCert(c)}>Xem</button></td>
                </tr>
              ))}
              {certs.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-base-content/50">Chưa upload chứng chỉ nào</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {viewCert && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">{viewCert.label}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-base-content/50">Subject</p><p className="font-mono break-all text-xs">{viewCert.subjectDN}</p></div>
              <div><p className="text-xs text-base-content/50">Issuer</p><p className="font-mono break-all text-xs">{viewCert.issuerDN}</p></div>
              <div><p className="text-xs text-base-content/50">Hiệu lực từ</p><p>{new Date(viewCert.notBefore).toLocaleString("vi-VN")}</p></div>
              <div><p className="text-xs text-base-content/50">Hiệu lực đến</p><p>{new Date(viewCert.notAfter).toLocaleString("vi-VN")}</p></div>
            </div>
            <div className="divider">PEM</div>
            <div className="mockup-code text-xs max-h-40 overflow-auto"><pre><code>{viewCert.certPem}</code></pre></div>
            <div className="modal-action"><button className="btn" onClick={() => setViewCert(null)}>Đóng</button></div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setViewCert(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
