import Link from "next/link";

type KycResult = {
  residencestatus?: string | null;
  digilockerstatus?: string | null;
  wetsignaturestatus?: string | null;
  esignstatus?: string | null;
  errorcode?: string | null;
  digilockerchosen?: string | null;
  manualkycupdated?: string | null;
  videoipvuploaded?: string | null;
};

function decodeResult(raw?: string): KycResult | null {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

const isDone = (v?: string | null) => (v || "").toLowerCase() === "completed";

export default async function KycSuccess({
  searchParams,
}: {
  searchParams: Promise<{ kycResult?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.kycResult)
    ? params.kycResult[0]
    : params.kycResult;
  const result = decodeResult(raw);

  const steps = result
    ? [
        { label: "Personal details", value: result.residencestatus },
        { label: "DigiLocker verification", value: result.digilockerstatus },
        { label: "Signature upload", value: result.wetsignaturestatus },
        { label: "eSign", value: result.esignstatus },
      ]
    : [];
  const success =
    !!result && !result.errorcode && steps.every((s) => isDone(s.value));

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center text-gray-800">
        <div
          className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
            success ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          }`}
        >
          {success ? "✓" : "!"}
        </div>
        <h1 className="text-2xl font-bold">
          {success
            ? "Your KYC is complete"
            : result
              ? "Your KYC is not finished yet"
              : "We couldn't read your KYC result"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {success
            ? "Thank you! Your verification was submitted successfully. You don't need to do anything else."
            : result
              ? "Some steps are still pending. You can start again from the home page to finish them."
              : "This page opens after you finish the KYC process. Please start from the home page."}
        </p>

        {result && (
          <ul className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 text-left text-sm">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center justify-between px-4 py-3">
                <span>{s.label}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isDone(s.value)
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {s.value || "Pending"}
                </span>
              </li>
            ))}
          </ul>
        )}

        {result?.errorcode && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Something went wrong (code {result.errorcode}). Please try again.
          </p>
        )}

        <Link
          href="/"
          className="mt-8 inline-block w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
