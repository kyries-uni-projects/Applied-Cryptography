"use client";

import { useState, useEffect } from "react";
import { parseCertificate } from "@/lib/crypto";

export default function RootCertPage() {
  const [certPem, setCertPem] = useState("");
  const [certInfo, setCertInfo] = useState<ReturnType<typeof parseCertificate> | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Form
  const [commonName, setCommonName] = useState("CA Root Certificate");
  const [organization, setOrganization] = useState("Certificate Authority");
  const [country, setCountry] = useState("VN");

  useEffect(() => {
    fetch("/api/admin/root-cert")
      .then((r) => r.json())
      .then((data) => {
        if (data.exists && data.certPem) {
          setExists(true);
          setCertPem(data.certPem);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/root-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commonName, organization, country }),
      });

      const data = await res.json();
      if (res.ok) {
        setCertPem(data.certPem);
        setExists(true);
        setMessage({ type: "success", text: "Tạo Root Certificate thành công!" });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối server" });
    } finally {
      setGenerating(false);
    }
  };

  // Parse cert info on client for display
  useEffect(() => {
    if (certPem) {
      try {
        const info = parseCertificate(certPem);
        setCertInfo(info);
      } catch {
        setCertInfo(null);
      }
    }
  }, [certPem]);

  if (loading) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Root Certificate</h2>
        <p className="text-base-content/60 mt-1">Phát sinh cặp khóa và chứng chỉ gốc cho hệ thống CA</p>
      </div>

      {message.text && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"} animate-fade-in`}>
          {message.text}
        </div>
      )}

      {!exists ? (
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              Chưa có Root Certificate
            </h3>
            <p className="text-base-content/60">Hệ thống cần Root Certificate để ký và cấp phát chứng chỉ. Vui lòng tạo Root Certificate.</p>

            <div className="divider"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Common Name (CN)</span></label>
                <input type="text" className="input input-bordered" value={commonName} onChange={(e) => setCommonName(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Organization (O)</span></label>
                <input type="text" className="input input-bordered" value={organization} onChange={(e) => setOrganization(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Country (C)</span></label>
                <input type="text" className="input input-bordered" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} />
              </div>
            </div>

            <div className="card-actions justify-end mt-4">
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <><span className="loading loading-spinner loading-sm"></span> Đang tạo...</>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    Tạo Root Key &amp; Certificate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Certificate Info */}
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body">
              <h3 className="card-title text-success gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Root Certificate đã được tạo
              </h3>

              {certInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide">Subject</p>
                    <p className="font-mono text-sm break-all">{certInfo.subjectDN}</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide">Issuer</p>
                    <p className="font-mono text-sm break-all">{certInfo.issuerDN}</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide">Serial Number</p>
                    <p className="font-mono text-sm">{certInfo.serialNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide">Hiệu lực</p>
                    <p className="text-sm">{new Date(certInfo.notBefore).toLocaleDateString("vi-VN")} - {new Date(certInfo.notAfter).toLocaleDateString("vi-VN")}</p>
                  </div>
                </div>
              )}

              <div className="divider">PEM Certificate</div>
              <div className="mockup-code text-xs max-h-48 overflow-auto">
                <pre><code>{certPem}</code></pre>
              </div>

              <div className="card-actions justify-between mt-4">
                <a
                  href={`data:application/x-pem-file;charset=utf-8,${encodeURIComponent(certPem)}`}
                  download="root-certificate.pem"
                  className="btn btn-outline btn-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Download PEM
                </a>
                <button className="btn btn-warning btn-sm" onClick={handleGenerate} disabled={generating}>
                  {generating ? <span className="loading loading-spinner loading-sm"></span> : "Tạo lại Root Certificate"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
