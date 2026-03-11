interface PrintLayoutProps {
  children: React.ReactNode
  title?: string
}

/** Clean print-friendly layout for invoices, quotes, reports */
export function PrintLayout({ children, title }: PrintLayoutProps) {
  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto print:p-0">
      {/* Print-only header */}
      <div className="print:block hidden mb-8">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>

      {/* Screen controls */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          &larr; Back
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-brand-600 text-white rounded text-sm font-medium hover:bg-brand-700"
        >
          Print / PDF
        </button>
      </div>

      {/* Content */}
      <div className="bg-white border border-border rounded-lg shadow-card p-8 print:border-0 print:shadow-none print:p-0">
        {children}
      </div>
    </div>
  )
}
