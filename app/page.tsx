import Link from "next/link";
import { ArrowRight, Box, BrainCircuit, Users, Building2, BarChart3, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-green-100 selection:text-green-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight">FlowStock<span className="text-green-700">.ai</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="#solutions" className="hover:text-green-700 transition">Solutions</Link>
            <Link href="#stakeholders" className="hover:text-green-700 transition">Stakeholders</Link>
            <Link href="#ai" className="hover:text-green-700 transition">AI Intelligence</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900">Sign in</Link>
            <Link href="/register" className="text-sm font-semibold bg-gray-900 text-white px-5 py-2.5 rounded-full hover:bg-gray-800 transition shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-50 via-white to-white" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-bold uppercase tracking-wider mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Enterprise Grade Inventory
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-gray-900 mb-8 max-w-4xl mx-auto leading-[1.1]">
            Intelligent Supply Chain & <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-700 to-green-500">Booking Infrastructure</span>
          </h1>
          <p className="text-lg lg:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Unify your enterprise operations. From warehouse predicting to direct buyer bookings, FlowStock AI connects every stakeholder with real-time, actionable data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto text-base font-bold bg-green-700 text-white px-8 py-4 rounded-full hover:bg-green-800 transition flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 hover:shadow-xl hover:shadow-green-900/20">
              Register as a Buyer <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto text-base font-bold bg-gray-50 text-gray-900 border border-gray-200 px-8 py-4 rounded-full hover:bg-gray-100 transition flex items-center justify-center">
              Access Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* SOLUTIONS SECTION */}
      <section id="solutions" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-4">Enterprise Architecture</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Scalable solutions designed for modern logistics, food enterprise, and FMCG operations.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Atomic Inventory", desc: "Real-time, zero-latency transaction ledgers ensuring perfect truth across all warehouses.", icon: Box },
              { title: "Smart Sales Pipelines", desc: "Empower your field agents with mobile-ready dashboards, live quotas, and automated routing.", icon: BarChart3 },
              { title: "Compliance & Security", desc: "Enterprise-grade role-based access controls with full audit trails for every transaction.", icon: ShieldCheck },
            ].map((sol, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-6">
                  <sol.icon className="w-6 h-6 text-green-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{sol.title}</h3>
                <p className="text-gray-500 leading-relaxed">{sol.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STAKEHOLDERS SECTION */}
      <section id="stakeholders" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-6">Built for Every Stakeholder</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                A unified ecosystem that adapts to the specific needs of your team. Clear visibility, strict security, and tailored workflows.
              </p>
              <div className="space-y-6">
                {[
                  { role: "Global Admin", desc: "Complete oversight, system configuration, and holistic financial control." },
                  { role: "Operations Supervisor", desc: "Real-time tracking of sales performance, team assignments, and territory management." },
                  { role: "Field Salesman", desc: "On-the-go access to customer routing, targets, and direct booking capabilities." },
                  { role: "Registered Buyer", desc: "Self-service portal to browse product availability and submit purchase orders directly." },
                ].map((s, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{s.role}</h4>
                      <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 w-full">
              <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100 aspect-square flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent" />
                <Users className="w-32 h-32 text-green-700/20 relative z-10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI INSIGHTS SECTION */}
      <section id="ai" className="py-24 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-6">
              <BrainCircuit className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-4">Powered by Google Gemini</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Stop guessing. Formulate strategies using natural language through our deeply integrated AI analysis engine.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
              <h3 className="text-lg font-bold text-green-400 mb-2">Predictive Restocking</h3>
              <p className="text-gray-400 text-sm leading-relaxed">The AI constantly analyzes velocity to alert you before you run out of fast-moving products.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
              <h3 className="text-lg font-bold text-green-400 mb-2">Conversational Data</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Ask "Who is my top salesman?" or "What's low on stock?" natively in English, Tagalog, or Bisaya.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 bg-white relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-6">Become a Partner Today</h2>
          <p className="text-xl text-gray-500 mb-10">
            Register your store to gain access to our corporate supply chain. Faster bookings, transparent pricing, and robust fulfillment.
          </p>
          <Link href="/register" className="inline-flex items-center justify-center gap-3 bg-green-700 text-white font-bold text-lg px-10 py-5 rounded-full hover:bg-green-800 transition shadow-xl shadow-green-900/10 hover:shadow-2xl hover:-translate-y-1">
            <Building2 className="w-6 h-6" />
            Register Store Account
          </Link>
          <p className="text-sm text-gray-400 mt-6 font-medium uppercase tracking-wider">Approval Required upon Submission</p>
        </div>
      </section>

      <footer className="py-10 border-t border-gray-100 bg-gray-50 text-center">
        <p className="text-gray-400 text-sm font-medium">© {new Date().getFullYear()} FlowStock AI. Advanced Supply Chain Infrastructure.</p>
      </footer>
    </div>
  );
}
