"use client";
import { useState, useEffect, useCallback } from "react";

interface KeyPairData { id: string; label: string; publicKeyPem: string; privateKeyPem: string; keyLength: number; createdAt: string; }

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyPairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [label, setLabel] = useState("");
  const [keyLength, setKeyLength] = useState(2048);
  const [viewKey, setViewKey] = useState<KeyPairData | null>(null);

  const fetchKeys = useCallback(async () => {
    const res = await fetch("/api/client/keys");
    setKeys(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/client/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, keyLength }),
      });
      if (res.ok) { setLabel(""); fetchKeys(); }
    } finally { setGenerating(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Cặp khóa RSA</h2>
        <p className="text-base-content/60 mt-1">Phát sinh và quản lý cặp khóa Public/Private</p>
      </div>

      {/* Generate Form */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg">Tạo cặp khóa mới</h3>
          <form onSubmit={handleGenerate} className="flex flex-wrap gap-4 items-end">
            <div className="form-control flex-1 min-w-[200px]">
              <label className="label"><span className="label-text">Tên / Nhãn</span></label>
              <input type="text" className="input input-bordered" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="VD: Website Key" required />
            </div>
            <div className="form-control w-40">
              <label className="label"><span className="label-text">Độ dài khóa</span></label>
              <select className="select select-bordered" value={keyLength} onChange={(e) => setKeyLength(parseInt(e.target.value))}>
                <option value={1024}>1024 bits</option>
                <option value={2048}>2048 bits</option>
                <option value={4096}>4096 bits</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={generating}>
              {generating ? <span className="loading loading-spinner loading-sm"></span> : "Tạo khóa"}
            </button>
          </form>
        </div>
      </div>

      {/* Keys List */}
      <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Nhãn</th><th>Độ dài</th><th>Ngày tạo</th><th>Hành động</th></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="hover">
                  <td className="font-medium">{k.label}</td>
                  <td>{k.keyLength} bits</td>
                  <td className="text-xs">{new Date(k.createdAt).toLocaleString("vi-VN")}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs" onClick={() => setViewKey(k)}>Xem</button>
                      <a href={`data:application/x-pem-file;charset=utf-8,${encodeURIComponent(k.publicKeyPem)}`} download={`${k.label}-public.pem`} className="btn btn-outline btn-xs">Public</a>
                      <a href={`data:application/x-pem-file;charset=utf-8,${encodeURIComponent(k.privateKeyPem)}`} download={`${k.label}-private.pem`} className="btn btn-outline btn-xs btn-warning">Private</a>
                    </div>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-base-content/50">Chưa có cặp khóa nào. Tạo mới ở trên.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {viewKey && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg">{viewKey.label} ({viewKey.keyLength} bits)</h3>
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-xs font-semibold text-base-content/50 uppercase mb-1">Public Key</p>
                <div className="mockup-code text-xs max-h-40 overflow-auto"><pre><code>{viewKey.publicKeyPem}</code></pre></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-base-content/50 uppercase mb-1">Private Key</p>
                <div className="mockup-code text-xs max-h-40 overflow-auto"><pre><code>{viewKey.privateKeyPem}</code></pre></div>
              </div>
            </div>
            <div className="modal-action"><button className="btn" onClick={() => setViewKey(null)}>Đóng</button></div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setViewKey(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
