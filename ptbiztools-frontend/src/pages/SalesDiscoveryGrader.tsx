import { ClipboardCheck, Sparkles } from 'lucide-react'
import './SalesDiscoveryGrader.css'

export default function SalesDiscoveryGrader() {
  return (
    <div className="sales-discovery-page">
      <div className="sales-discovery-card">
        <div className="sales-discovery-icon">
          <ClipboardCheck size={26} />
        </div>
        <h1>Sales Discovery Grader</h1>
        <p>
          Advisor/Admin feature stub is ready. This page is reserved for grading sales calls with
          clinic owners evaluating PT Biz services.
        </p>

        <div className="sales-discovery-bullets">
          <div>
            <strong>Status</strong>
            <span>Ready for feature implementation</span>
          </div>
          <div>
            <strong>Access</strong>
            <span>Advisors + Admin/Staff only</span>
          </div>
          <div>
            <strong>Next</strong>
            <span>Upload transcript + rubric scoring + saved records</span>
          </div>
        </div>

        <div className="sales-discovery-note">
          <Sparkles size={14} />
          <span>When you’re ready, I can wire this to its own scoring model and database records.</span>
        </div>
      </div>
    </div>
  )
}
