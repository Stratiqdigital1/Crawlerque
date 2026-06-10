export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-extrabold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-3 font-mono text-sm text-white/35">Last updated: June 2026</p>

        <div className="mt-12 space-y-10 text-[15px] leading-relaxed text-white/60">

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">1. Information We Collect</h2>
            <p>When you use Crawler Que, we collect information you provide directly to us, including your name, email address, and payment information when you subscribe to a paid plan. We also collect the URLs you submit for auditing and the reports generated from those audits.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send transactional emails, and respond to your requests. We do not sell your personal information to third parties.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">3. Data Storage</h2>
            <p>Your account data and audit reports are stored securely in our database hosted on Neon (PostgreSQL). Payment information is processed and stored by Stripe and is never stored on our servers. We retain your data for as long as your account is active or as needed to provide services.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">4. Third-Party Services</h2>
            <p>Crawler Que uses the following third-party services to deliver its functionality: DataForSEO for SEO and keyword data, Google PageSpeed Insights for performance data, Stripe for payment processing, and Resend for transactional emails. Each service has its own privacy policy governing their use of data.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">5. Cookies</h2>
            <p>We use a single session cookie named <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-sm text-[#C5FF3D]">stratiq_session</code> to keep you logged in. This cookie contains a signed JWT token and no personal data. It expires after 7 days.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">6. Your Rights</h2>
            <p>You may request deletion of your account and all associated data at any time by contacting us at <a href="mailto:hello@stratiqdigital.com" className="text-[#C5FF3D] underline">hello@stratiqdigital.com</a>. We will process deletion requests within 30 days.</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">7. Contact</h2>
            <p>For privacy-related questions, contact us at <a href="mailto:info@crawlerque.com" className="text-[#C5FF3D] underline">info@crawlerque.com</a>.</p>
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