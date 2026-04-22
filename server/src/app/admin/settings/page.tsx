"use client";

import { useState, useEffect } from "react";

interface CaConfig {
  id: string;
  algorithm: string;
  hashAlgorithm: string;
  keyLength: number;
  validityDays: number;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<CaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algorithm: config.algorithm,
          hashAlgorithm: config.hashAlgorithm,
          keyLength: config.keyLength,
          validityDays: config.validityDays,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Cập nhật cấu hình thành công!" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối server" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  }

  if (!config) {
    return <div className="alert alert-error">Không tìm thấy cấu hình CA</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Thông số kỹ thuật CA</h2>
        <p className="text-base-content/60 mt-1">Thiết lập thông số chuẩn cho việc cấp phát chứng nhận</p>
      </div>

      {message.text && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"} animate-fade-in`}>
          {message.text}
        </div>
      )}

      <div className="card bg-base-100 border border-base-content/10 shadow-md">
        <div className="card-body">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Thuật toán bất đối xứng</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={config.algorithm}
                  onChange={(e) => setConfig({ ...config, algorithm: e.target.value })}
                >
                  <option value="RSA">RSA</option>
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/50">Thuật toán mã hóa cho cặp khóa</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Hàm băm mật mã</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={config.hashAlgorithm}
                  onChange={(e) => setConfig({ ...config, hashAlgorithm: e.target.value })}
                >
                  <option value="SHA-1">SHA-1</option>
                  <option value="SHA-256">SHA-256</option>
                  <option value="SHA-384">SHA-384</option>
                  <option value="SHA-512">SHA-512</option>
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/50">Hàm hash dùng khi ký chứng chỉ</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Độ dài khóa (bits)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={config.keyLength}
                  onChange={(e) => setConfig({ ...config, keyLength: parseInt(e.target.value) })}
                >
                  <option value={1024}>1024 bits</option>
                  <option value={2048}>2048 bits</option>
                  <option value={4096}>4096 bits</option>
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/50">Độ dài khóa RSA mặc định</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Hiệu lực mặc định (ngày)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={config.validityDays}
                  onChange={(e) => setConfig({ ...config, validityDays: parseInt(e.target.value) || 365 })}
                  min={1}
                  max={3650}
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">Thời hạn hiệu lực cho chứng chỉ cấp mới</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Lưu cấu hình
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
