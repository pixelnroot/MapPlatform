import { generateReport } from '../../utils/reportGenerator'

export default function ReportButton({ regionName, analytics, score }) {
  function handleClick() {
    if (!analytics) return alert('No analytics data to export')
    generateReport(regionName || 'Region', analytics, score)
  }

  return (
    <button className="btn-primary" onClick={handleClick}>
      Generate PDF Report
    </button>
  )
}
