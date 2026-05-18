const ESKIZ_BASE = "https://notify.eskiz.uz/api";

let _token: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const res = await fetch(`${ESKIZ_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ESKIZ_EMAIL,
      password: process.env.ESKIZ_PASSWORD,
    }),
  });

  if (!res.ok) throw new Error("Eskiz auth failed");

  const data = await res.json();
  _token = data.data?.token as string;
  _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h cache
  return _token;
}

export async function sendSMS(phone: string, message: string): Promise<void> {
  const token = await getToken();
  const mobile_phone = phone.replace(/\D/g, "");

  const res = await fetch(`${ESKIZ_BASE}/message/sms/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mobile_phone, message, from: "4546" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "SMS send failed");
  }
}
