export default function ReturnPolicyPage() {
  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070707]/96 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C5FF3D]">
              <span className="font-mono text-[10px] font-black text-black">CQ</span>
            </div>
            <span className="text-sm font-bold text-white">Crawler Que</span>
          </a>
          <a href="/" className="font-mono text-[11px] uppercase tracking-wider text-white/40 transition hover:text-white">
            &#8592; Back
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-5 py-16 md:px-8">
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">Legal</div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white">Return &amp; Refund Policy</h1>
        <p className="mt-3 font-mono text-sm text-white/35">Last updated: June 2026</p>

        <div className="mt-12 space-y-10 text-[15px] leading-relaxed text-white/60">

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">1. Subscription Cancellation</h2>
            <p>You may cancel your Crawler Que subscription at any time through the billing portal in your dashboard. Your subscription will remain active until the end of the current billing period. No partial refunds are issued for unused time within an active billing period.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">2. Free Trial</h2>
            <p>All plans include a 7-day free trial. You will not be charged during the trial period. You may cancel before the trial ends without incurring any charges.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">3. Refund Eligibility</h2>
            <p>Refunds may be issued at our discretion in the following circumstances: if you were charged due to a technical error on our platform, if you cancel within 48 hours of your first charge and have not used the service. To request a refund, contact us within 7 days of the charge at <a href="mailto:info@crawlerque.com" className="text-[#C5FF3D] underline">info@crawlerque.com</a> with your account email and a brief description.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">4. Non-Refundable Items</h2>
            <p>Audit credits consumed prior to a refund request are not refundable. Partial months are not refundable. Downgrade requests do not generate refunds for the price difference.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">5. How to Cancel</h2>
            <p>Log into your Crawler Que account, go to the Subscription tab in your dashboard, and click Manage Subscription. This opens the Stripe billing portal where you can cancel, update your payment method, or download invoices.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">6. Contact</h2>
            <p>For refund requests or billing questions, contact us at <a href="mailto:info@crawlerque.com" className="text-[#C5FF3D] underline">info@crawlerque.com</a>. We respond within 2 business days.</p>
          </div>

        </div>
      </div>

      <footer className="border-t border-white/5 px-5 py-8 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/14">
          &#169; 2026 Crawler Que &nbsp;&#183;&nbsp; Powered by Strat IQ Digital
        </p>
      </footer>
    </main>
  );
}