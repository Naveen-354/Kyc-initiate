"use client";

import { useState } from "react";

const CALLBACK_URL =
  process.env.NEXT_PUBLIC_KYC_CALLBACK_URL ||
  "https://kyc-initiate-xn94.vercel.app/kyc/success";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResultCard({ data }: { data: any }) {
  const d = data?.data;
  const failed = !d || data?.Success === false || data?.success === false;
  const message =
    data?.message || data?.Message || data?.error || d?.Message || null;
  const kycDone =
    !failed &&
    /verified|registered/i.test(`${d?.KYCStatusDesc || ""}`);

  const rows: [string, string | undefined][] = d
    ? [
        ["Name", d.Name],
        ["PAN", d.PanNo],
        ["KRA", d.KRAName],
        ["KYC status", d.KYCStatusDesc],
        ["Last updated", d.KYCStatusDate],
        ["Hold reason", d.KYCHoldReason],
      ]
    : [];

  return (
    <div
      className={`mt-6 rounded-xl border p-5 ${
        failed
          ? "border-red-200 bg-red-50"
          : kycDone
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
      }`}
    >
      <h3 className="text-lg font-semibold">
        {failed
          ? "We couldn't complete this request"
          : kycDone
            ? "Great news — this PAN is KYC compliant"
            : "Here's the current KYC status"}
      </h3>
      {failed && (
        <p className="mt-1 text-sm text-gray-600">
          {message || "Please check the details and try again."}
        </p>
      )}
      {!failed && (
        <dl className="mt-3 grid grid-cols-3 gap-y-2 text-sm">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-gray-500">{k}</dt>
                <dd className="col-span-2 font-medium">{v}</dd>
              </div>
            ))}
        </dl>
      )}
      <details className="mt-3 text-xs text-gray-500">
        <summary className="cursor-pointer">Technical details</summary>
        <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function KycInitiate() {
  const [formData, setFormData] = useState({
    name: "",
    panNo: "",
    emailId: "",
    mobilePrefix: "+91",
    mobileNo: "",
    dob: "",
  });

  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [responseData, setResponseData] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id } = e.target;
    let { value } = e.target;

    if (id === "panNo") {
      // Letters/digits only, always uppercase
      value = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
    } else if (id === "dob") {
      // Digits only, auto-insert "/" after day and month (dd/MM/yyyy)
      const digits = value.replace(/\D/g, "").slice(0, 8);
      value = digits;
      if (digits.length > 4) {
        value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      } else if (digits.length > 2) {
        value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      }
    } else if (id === "mobileNo") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const processKyc = async () => {
    const { name, panNo, emailId, mobilePrefix, mobileNo, dob } = formData;
    setResponseData(null);

    if (!name || !panNo || !emailId || !mobilePrefix || !mobileNo || !dob) {
      alert("Please fill out all mandatory fields.");
      return;
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNo)) {
      alert("Please enter a valid 10-character PAN number.");
      return;
    }

    if (!/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(19|20)\d{2}$/.test(dob)) {
      alert("Please enter a valid date of birth in dd/MM/yyyy format.");
      return;
    }

    setLoading(true);

    const baseUrl = "https://api.midfin360.com/api/v1/mfu-box";

    try {
      // Step 1: Check Status
      const statusResponse = await fetch(`${baseUrl}/kra/kyc-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panNo: panNo }),
      });
      const statusData = await statusResponse.json();

      if (!statusResponse.ok || !statusData.data) {
        setResponseData(statusData);
        setLoading(false);
        return;
      }

      const kycStatusDetails = statusData.data;
      const initiateType = (kycStatusDetails.KYCInitiateType || "").toLowerCase();
      const initiateTypeDetail = (
        kycStatusDetails.KYCInitiateTypeDetail || ""
      ).toLowerCase();

      // Check if New or ReKYC
      const isNewOrReKyc =
        initiateType.includes("new") ||
        initiateType.includes("rekyc") ||
        initiateTypeDetail.includes("new") ||
        initiateTypeDetail.includes("rekyc");

      if (isNewOrReKyc) {
        // Step 2: Initiate KYC
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const initiatePayload: any = {
          PanNo: panNo,
          PanValidationFlag: "N",
          Name: name,
          MobileNumberPrefix: mobilePrefix,
          MobileNo: mobileNo,
          Emailid: emailId,
          DateOfBirth: dob,
          VerifyKYCStatusWithKRA: "Y",
          IsIndividual: "Y",
          CallbackURL: CALLBACK_URL,
        };

        if (kycStatusDetails.KYCStatus) {
          initiatePayload.KRAStatusCode = kycStatusDetails.KYCStatus;
        }

        const initResponse = await fetch(`${baseUrl}/kyc/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(initiatePayload),
        });

        const initData = await initResponse.json();

        if (
          initData.data &&
          (initData.data.KYCOnboardingURL || initData.data.redirectUrl)
        ) {
          window.location.href =
            initData.data.KYCOnboardingURL || initData.data.redirectUrl;
        } else {
          setResponseData(initData);
        }
      } else {
        // Step 3: Just show status response if not New or ReKYC
        setResponseData(statusData);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setResponseData({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 sm:p-8 flex justify-center items-start pt-8 sm:pt-16">
      <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-[600px] w-full shadow-xl text-gray-800">
        <h2 className="text-2xl font-bold text-center">KYC Process</h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Check your KYC status or start a new verification in minutes.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block mb-1 font-semibold text-sm">
              Name *
            </label>
            <input
              type="text"
              id="name"
              maxLength={50}
              placeholder="John Doe"
              required
              className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="panNo" className="block mb-1 font-semibold text-sm">
              PAN Number *
            </label>
            <input
              type="text"
              id="panNo"
              placeholder="ABCDE1234F"
              required
              className="w-full p-2.5 border border-gray-300 rounded uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.panNo}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="emailId" className="block mb-1 font-semibold text-sm">
              Email ID *
            </label>
            <input
              type="email"
              id="emailId"
              maxLength={50}
              placeholder="user@example.com"
              required
              className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.emailId}
              onChange={handleChange}
            />
          </div>

          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="sm:w-[100px] shrink-0">
              <label htmlFor="mobilePrefix" className="block mb-1 font-semibold text-sm">
                Code *
              </label>
              <input
                type="text"
                id="mobilePrefix"
                required
                maxLength={5}
                className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.mobilePrefix}
                onChange={handleChange}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="mobileNo" className="block mb-1 font-semibold text-sm">
                Mobile Number *
              </label>
              <input
                type="text"
                id="mobileNo"
                placeholder="9876543210"
                required
                className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.mobileNo}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="dob" className="block mb-1 font-semibold text-sm">
              Date of Birth (dd/MM/yyyy) *
            </label>
            <input
              type="text"
              id="dob"
              placeholder="15/08/1990"
              inputMode="numeric"
              required
              className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.dob}
              onChange={handleChange}
            />
          </div>

          <button
            onClick={processKyc}
            disabled={loading}
            className="w-full p-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded mt-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Check Status & Initiate"}
          </button>
        </div>

        {loading && (
          <div className="text-center italic text-gray-500 mt-4">
            Processing...
          </div>
        )}

        {responseData && <ResultCard data={responseData} />}
      </div>
    </div>
  );
}
