import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(_error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        // oxlint-disable-next-line no-console
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        window.location.href = '/';
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-2xl w-full border-t-4 border-rose-500 text-slate-800 dark:text-slate-200">
                        <h2 className="text-2xl font-bold mb-4 text-rose-600 dark:text-rose-400">Qualcosa è andato storto! (Errore Frontend)</h2>
                        <p className="mb-4">Si è verificato un errore inaspettato nel rendering della pagina.</p>
                        <details className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm border border-slate-200 dark:border-slate-700">
                            <summary className="font-bold cursor-pointer text-blue-600 dark:text-blue-400 mb-2">Dettagli Errore (Per Sviluppatori)</summary>
                            <pre className="text-rose-500 mt-2 whitespace-pre-wrap">{this.state.error && this.state.error.toString()}</pre>
                            <pre className="text-slate-500 dark:text-slate-400 mt-2">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                        </details>
                        <button 
                            onClick={this.handleReset}
                            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            Torna alla Home
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
