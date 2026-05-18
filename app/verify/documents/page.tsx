"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Step = 1 | 2 | 3;

interface UploadZoneProps {
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File) => void;
}

function UploadZone({ label, hint, file, onFile }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) onFile(f);
  }, [onFile]);

  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
        dragging
          ? "border-[#14A800] bg-green-50"
          : file
          ? "border-[#14A800] bg-green-50"
          : "border-gray-200 hover:border-gray-300 bg-gray-50"
      }`}
      style={{ minHeight: 160 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-white text-sm font-semibold bg-black/50 px-3 py-1.5 rounded-lg">
              Заменить фото
            </span>
          </div>
          <div className="absolute top-2 right-2 bg-[#14A800] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            ✓
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="text-3xl mb-2">📷</div>
          <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
          <p className="text-xs text-gray-400">{hint}</p>
          <p className="text-xs text-gray-400 mt-2">Нажмите или перетащите фото</p>
        </div>
      )}
    </div>
  );
}

export default function VerifyDocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const steps = [
    { n: 1, label: "Паспорт" },
    { n: 2, label: "Селфи" },
    { n: 3, label: "Отправка" },
  ];

  async function submit() {
    if (!agreed) { setError("Подтвердите согласие"); return; }
    if (!passportFile || !selfieFile) { setError("Загрузите оба фото"); return; }
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("passportPhoto", passportFile);
      fd.append("selfiePhoto", selfieFile);
      const res = await fetch("/api/verification/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка отправки"); return; }
      setSubmitted(true);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return null;
  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <Link href="/login" className="btn-primary">Войти</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⏳</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Документы отправлены!</h1>
        <p className="text-gray-500 mb-2">Проверка займёт 1–2 рабочих дня.</p>
        <p className="text-gray-500 text-sm mb-8">Мы уведомим вас о результате.</p>
        <Link href="/verify/status" className="btn-primary">Смотреть статус</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => { if (s.n < step) setStep(s.n as Step); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                step === s.n
                  ? "bg-[#14A800] text-white ring-4 ring-green-100"
                  : step > s.n
                  ? "bg-[#14A800] text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {step > s.n ? "✓" : s.n}
            </button>
            <span className={`text-xs font-medium ${step >= s.n ? "text-[#14A800]" : "text-gray-400"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${step > s.n ? "bg-[#14A800]" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        {step === 1 && (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900 mb-1">Фото паспорта</h1>
              <p className="text-gray-500 text-sm">Сфотографируйте разворот с фотографией и данными</p>
            </div>
            <UploadZone
              label="Паспорт (разворот)"
              hint="Страница с фото, ФИО и датой рождения"
              file={passportFile}
              onFile={setPassportFile}
            />
            <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
              Убедитесь что все данные читаются чётко, без бликов и теней
            </div>
            <button
              onClick={() => { if (!passportFile) { setError("Загрузите фото паспорта"); return; } setError(""); setStep(2); }}
              className="btn-primary w-full justify-center py-3 mt-5"
            >
              Далее →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900 mb-1">Селфи с паспортом</h1>
              <p className="text-gray-500 text-sm">Держите паспорт открытым рядом с лицом</p>
            </div>
            <UploadZone
              label="Селфи с паспортом"
              hint="Ваше лицо и страница паспорта должны быть видны"
              file={selfieFile}
              onFile={setSelfieFile}
            />
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              Убедитесь что ваше лицо и данные паспорта хорошо видны
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setError(""); setStep(1); }} className="btn-secondary flex-1">← Назад</button>
              <button
                onClick={() => { if (!selfieFile) { setError("Загрузите селфи с паспортом"); return; } setError(""); setStep(3); }}
                className="btn-primary flex-1 justify-center"
              >
                Далее →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900 mb-1">Подтверждение</h1>
              <p className="text-gray-500 text-sm">Проверьте фото перед отправкой</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500">Паспорт</p>
                {passportFile && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(passportFile)}
                    alt="Паспорт"
                    className="w-full h-32 object-cover rounded-xl border border-gray-100"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500">Селфи</p>
                {selfieFile && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(selfieFile)}
                    alt="Селфи"
                    className="w-full h-32 object-cover rounded-xl border border-gray-100"
                  />
                )}
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#14A800]"
              />
              <span className="text-sm text-gray-600">
                Я подтверждаю, что предоставленные документы принадлежат мне и данные являются достоверными.
                Согласен на обработку персональных данных.
              </span>
            </label>

            <div className="flex gap-3">
              <button onClick={() => { setError(""); setStep(2); }} className="btn-secondary flex-1">← Назад</button>
              <button
                onClick={submit}
                disabled={loading || !agreed}
                className="btn-primary flex-1 justify-center"
              >
                {loading ? "Отправляем..." : "Отправить на проверку"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
