"use client";

import { useState } from "react";

export function LeadForm({ sourcePath = "" }: { sourcePath?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(formData: FormData) {
    setState("sending");
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, sourcePath }),
    });
    setState(response.ok ? "sent" : "error");
  }

  if (state === "sent") {
    return (
      <div className="form-success" role="status">
        <h3>Thank you.</h3>
        <p>One of our travel designers will contact you shortly.</p>
      </div>
    );
  }

  return (
    <form action={submit} className="lead-form">
      <label>
        Name
        <input name="name" required minLength={2} autoComplete="name" />
      </label>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" autoComplete="tel" />
      </label>
      <label>
        Where would you like to go?
        <input name="destination" />
      </label>
      <label className="wide">
        Tell us about your ideal journey
        <textarea name="message" rows={4} required minLength={10} />
      </label>
      <label className="honey" aria-hidden="true">
        Company
        <input name="company" tabIndex={-1} autoComplete="off" />
      </label>
      <button disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Start planning"}</button>
      {state === "error" && <p className="form-error" role="alert">We couldn’t send your request. Please try again.</p>}
    </form>
  );
}

export default LeadForm;
