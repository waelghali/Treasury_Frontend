import React from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
  }

  handleCopyDiagnostics = () => {
    const diagnostics = `URL: ${window.location.href}\nUserAgent: ${navigator.userAgent}\nError: ${this.state.error?.toString()}\nComponentStack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard?.writeText(diagnostics).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-200 text-amber-600">
              <AlertTriangle size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Display Notice</h1>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              We encountered an issue loading this view. Please try reloading or copy the diagnostics below to share with treasury support.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all shadow-sm shadow-blue-500/20"
              >
                <RefreshCw size={16} /> Reload Page
              </button>
              <button
                onClick={this.handleCopyDiagnostics}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-all"
              >
                {this.state.copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {this.state.copied ? 'Diagnostics Copied!' : 'Copy Diagnostics'}
              </button>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950 text-slate-300 p-4 rounded-xl text-xs font-mono overflow-auto max-h-40 border border-slate-800">
                <p className="text-red-400 font-semibold mb-1">{this.state.error.toString()}</p>
                <p className="text-slate-500 text-[11px] whitespace-pre-wrap">{this.state.errorInfo?.componentStack?.slice(0, 300)}</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
