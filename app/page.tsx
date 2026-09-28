"use client";

import { useState } from "react";

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
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const processKyc = async () => {
    const { name, panNo, emailId, mobilePrefix, mobileNo, dob } = formData;
    setResponseData(null);

    if (!name || !panNo || !emailId || !mobilePrefix || !mobileNo || !dob) {
      alert("Please fill out all mandatory fields.");
      return;
    }

    if (!/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/.test(panNo)) {
      alert("Please enter a valid 10-character PAN number.");
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
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex justify-center items-start pt-8 sm:pt-16">
      <div className="bg-white p-6 sm:p-8 rounded-lg max-w-[600px] w-full shadow-md text-gray-800">
        <h2 className="text-2xl font-bold text-center mb-6">KYC Process</h2>

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
              className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              maxLength={10}
              className="w-full p-2.5 border border-gray-300 rounded uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                maxLength={10}
                placeholder="9876543210"
                required
                className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              required
              className="w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.dob}
              onChange={handleChange}
            />
          </div>

          <button
            onClick={processKyc}
            disabled={loading}
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded mt-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Check Status & Initiate"}
          </button>
        </div>

        {loading && (
          <div className="text-center italic text-gray-500 mt-4">
            Processing...
          </div>
        )}

        {responseData && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded overflow-auto text-sm whitespace-pre-wrap break-words text-gray-700">
            {JSON.stringify(responseData, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
}
