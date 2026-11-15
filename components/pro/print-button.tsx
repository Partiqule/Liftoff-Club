'use client'

export function PrintButton() {
  return (
    <button className="btn pro-print-hide" type="button" onClick={() => window.print()}>
      Print or save PDF
    </button>
  )
}
