// frontend/src/pages/KnowMorePage.js

import React from 'react';
import { Link } from 'react-router-dom';

function KnowMorePage() {
  return (
    <div className="bg-gray-50 font-sans text-gray-800">
      
      {/* Header (replicated from LandingPage for consistency) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-all duration-300 ease-in-out">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/growlogonocircle.png" alt="Grow Business Development Logo" className="h-24" />
          </div>
          <nav className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-transparent rounded-md hover:bg-blue-50 transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/login" 
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/#demo-form"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-md"
            >
              Book a Demo
            </Link>
            <a
              href="/grow_brochure.pdf"
              download="Grow-Brochure.pdf"
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Download Brochure
            </a>
          </nav>
        </div>
      </header>

      <main className="pt-20">
        
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 via-gray-100 to-blue-200 py-24 md:py-32 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-4 tracking-tight">
              Built for Treasurers, Designed for Growth
            </h1>
            <h2 className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
              A powerful custody and treasury management system, crafted to prevent risks, simplify operations, and help businesses grow.
            </h2>
            <Link
              to="/#demo-form"
              className="px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg transform hover:scale-105"
            >
              Request a Demo
            </Link>
          </div>
        </section>

        {/* What We Do */}
        <section className="bg-white py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6">What We Do</h2>
            <p className="text-lg text-gray-600 text-center mx-auto max-w-prose">
              We provide a specialized treasury system with a focus on Letters of Guarantee (LG) custody, ensuring nothing slips through the cracks. From auto-renewals to tracking communications, our platform is built to make treasurers’ lives easier and businesses more secure.
            </p>
          </div>
        </section>

        {/* Problems We Solve */}
        <section className="bg-gray-100 py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">The Problems We Solve</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-600">
                <h3 className="text-xl font-semibold mb-2">Expired or missed LG renewals.</h3>
                <p className="text-gray-600">Manual tracking often leads to last-minute scrambles and potential financial risk.</p>
              </div>
              <div className="p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-600">
                <h3 className="text-xl font-semibold mb-2">Inconsistent communication.</h3>
                <p className="text-gray-600">Tracking communication with banks and internally is a daily challenge.</p>
              </div>
              <div className="p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-600">
                <h3 className="text-xl font-semibold mb-2">Lack of transparency.</h3>
                <p className="text-gray-600">LG documents and statuses are spread across emails and spreadsheets.</p>
              </div>
              <div className="p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-600">
                <h3 className="text-xl font-semibold mb-2">Manual follow-ups.</h3>
                <p className="text-gray-600">Producing reports for audits is a time-consuming and manual process.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-white py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">How It Works: A Step-by-Step Walkthrough</h2>
            <p className="text-lg text-gray-600 text-center mx-auto max-w-prose mb-12">
              Our system transforms the LG management process from a chaotic scramble into a clear, controlled workflow. Here's a look at how it works in practice.
            </p>
            {/* Suggested Visual: A simple flow diagram or image carousel could be added here */}
            <div className="max-w-4xl mx-auto space-y-12">
              
              {/* Step 1 */}
              <div>
                <h3 className="text-2xl font-bold text-blue-600 mb-4">1. Recording a New LG</h3>
                <p className="text-gray-600 mb-4">
                  Bringing an LG into the system is fast and simple. Capture all LG details in less than a minute using our AI powered recording tool.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>**Upload & Extract:** Just upload a scanned copy of the LG. Our AI-powered tool instantly auto-extracts key fields like expiry date, amount, and bank.</li>
                  <li>**Add Context:** Add your internal data, such as the internal owner, category, or project name.</li>
                  <li>**Securely Stored:** The system securely stores the scanned copy and all related documents for future reference.</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div>
                <h3 className="text-2xl font-bold text-blue-600 mb-4">2. Smart Reminders & Tracking</h3>
                <p className="text-gray-600 mb-4">
                  Manual tracking is a thing of the past. The system continuously monitors every LG and keeps you ahead of every deadline.
                </p>
                <div className="grid sm:grid-cols-3 gap-6 text-center mt-8">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl text-blue-600 mb-2">🔔</span>
                    <h4 className="font-semibold text-lg">Proactive Alerts</h4>
                    <p className="text-sm text-gray-600">Automatic reminders for expiries and renewals to all relevant parties.</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl text-blue-600 mb-2">🔄</span>
                    <h4 className="font-semibold text-lg">Automate Renewals</h4>
                    <p className="text-sm text-gray-600">The system suggests renewals and generates extension letters with one click.</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl text-blue-600 mb-2">📄</span>
                    <h4 className="font-semibold text-lg">Template Library</h4>
                    <p className="text-sm text-gray-600">Use built-in templates or your own for all LG communications.</p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <h3 className="text-2xl font-bold text-blue-600 mb-4">3. The LG Life Cycle & Action Center</h3>
                <p className="text-gray-600 mb-4">
                  No more hunting for documents or status updates. The platform gives you a single, unified view of your entire LG portfolio.
                </p>
                <div className="grid md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-lg shadow">
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Life Cycle View</h4>
                    <p className="text-gray-600">Every LG has a comprehensive, "always-on" life cycle view. You can see the current status, every action taken, and all related documents—from the original LG, its amendments to the final release.</p>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Action Center</h4>
                    <p className="text-gray-600">Think of this as your daily mission control. It’s a single hub listing everything that needs your attention: expiring LGs, pending approvals (for maker-checker workflows), and outstanding bank replies.</p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div>
                <h3 className="text-2xl font-bold text-blue-600 mb-4">4. Taking Action</h3>
                <p className="text-gray-600 mb-4">
                  When it's time to act, the system gives you the tools to get things done quickly and accurately.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>**LG Actions:** The system supports a full range of actions other than extension, including amount decrease, liquidation, partial liquidation, amendment, activate none-operative LG, and release.</li>
                  <li>**Maker–Checker Approvals:** The system properly enforces maker-checker approvals while ensuring expiry safety, even if there are delays in the approval process.</li>
                </ul>
              </div>

              {/* Step 5 */}
              <div>
                <h3 className="text-2xl font-bold text-blue-600 mb-4">5. Bank Communication & Security</h3>
                <p className="text-gray-600 mb-4">
                  Stay in control of your communication with banks and maintain airtight security.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>**Track Everything:** The system tracks the delivery of your instructions and bank responses. It will even notify you of delays and suggest reminders for non-responding banks.</li>
                  <li>**Instant Documentation:** It instantly generates the correct instructions and templates for you. All related supporting documents and bank replies are stored securely with the LG record.</li>
                </ul>
              </div>

              {/* Step 6 */}
              <div>
                <h3 className="text-2xl font-bold text-blue-600 mb-4">6. Built for Your Business</h3>
                <p className="text-gray-600 mb-4">
                  This system isn’t a rigid tool; it's a flexible platform that you can configure to fit your specific needs.
                </p>
                <div className="grid md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-lg shadow">
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Control & Flexibility</h4>
                    <p className="text-gray-600">As an administrator, you define the rules. You can set how actionable LGs are selected, the logic for reminders, renewal preferences, and other behavioral rules.</p>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Full Audit Trail</h4>
                    <p className="text-gray-600">Every action is logged. You’ll have a complete audit trail that shows who did what, when, and what changed across all users and actions. This makes internal reviews and external audits effortless.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="bg-blue-600 py-16 text-white text-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Take Control?</h2>
            <p className="text-xl mb-8">
              LG management can be simple, secure, and smart. See for yourself how a system built by treasurers can transform your operations and empower your growth.
            </p>
            <Link
              to="/#demo-form"
              className="px-8 py-3 text-lg font-bold text-blue-600 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Request a Demo Today
            </Link>
          </div>
        </section>

        {/* Footer (replicated from LandingPage for consistency) */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Grow Business Development</h4>
              <p>The LG Management System designed to empower your treasury operations.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Contact Info</h4>
              <ul className="space-y-2">
                <li>Phone: <a href="tel:+201200557551" className="hover:text-white transition-colors">+201200557551</a></li>
                <li>WhatsApp: <a href="https://wa.me/201200557551" className="hover:text-white transition-colors">+201200557551</a></li>
                <li>Email: <a href="mailto:info@growbusinessdevelopment.com" className="hover:text-white transition-colors">info@growbusinessdevelopment.com</a></li>
                <li>Address: 100 El Merghany St., Heliopolis, Cairo, Egypt</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="#" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center mt-8 pt-8 border-t border-gray-700">
            <p className="text-sm">&copy; 2025 Grow Business Development. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default KnowMorePage;