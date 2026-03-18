import { jsPDF } from 'jspdf'

export function generateReport(regionName, analytics, score) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Title
  doc.setFontSize(20)
  doc.setTextColor(0, 100, 200)
  doc.text('Region Analysis Report', pageWidth / 2, y, { align: 'center' })
  y += 12

  // Subtitle
  doc.setFontSize(14)
  doc.setTextColor(60, 60, 60)
  doc.text(regionName, pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' })
  y += 15

  // Summary stats
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Summary', 20, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(`Total Places: ${analytics.total_places}`, 20, y); y += 6

  if (analytics.source_breakdown) {
    for (const s of analytics.source_breakdown) {
      doc.text(`  ${s.source}: ${s.count}`, 25, y); y += 6
    }
  }

  if (analytics.density?.area_sq_km) {
    doc.text(`Area: ${analytics.density.area_sq_km} sq km`, 20, y); y += 6
    doc.text(`Density: ${analytics.density.places_per_sq_km} places/sq km`, 20, y); y += 6
  }
  y += 5

  // Category breakdown
  if (analytics.category_breakdown?.length) {
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Category Breakdown', 20, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    for (const cat of analytics.category_breakdown) {
      const name = cat.name || 'Uncategorized'
      doc.text(`${name}: ${cat.count}`, 25, y)
      y += 6
      if (y > 270) { doc.addPage(); y = 20 }
    }
  }
  y += 5

  // Road stats
  if (analytics.road_stats?.length) {
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Road Statistics', 20, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    for (const road of analytics.road_stats) {
      doc.text(`${road.type}: ${road.count} segments (${road.total_length_m}m)`, 25, y)
      y += 6
      if (y > 270) { doc.addPage(); y = 20 }
    }
  }
  y += 5

  // Coverage score
  if (score) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Coverage Score', 20, y)
    y += 8

    doc.setFontSize(16)
    doc.setTextColor(0, 100, 200)
    doc.text(`${score.overall_score}/100`, 20, y)
    y += 10

    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    const b = score.breakdown
    doc.text(`Category Diversity: ${b.category_diversity.score}/100`, 25, y); y += 6
    doc.text(`Essential Services: ${b.essential_services.score}/100`, 25, y); y += 6
    doc.text(`Road Density: ${b.road_density.score}/100`, 25, y); y += 6
    doc.text(`Land Use Mix: ${b.land_use_mix.score}/100`, 25, y); y += 6
  }

  doc.save(`${regionName.replace(/\s+/g, '_')}_report.pdf`)
}
