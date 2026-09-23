import StatusBadge from '../../shared/components/StatusBadge';
import { getInternsCompletingSoon } from '../services/tl.service';
import { useState, useEffect } from 'react';
import './InternCompletionView.css';

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  end.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function InternCompletionView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interns, setInterns] = useState([]);

  const fetchInterns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInternsCompletingSoon();
      setInterns(data.interns || []);
    } catch (err) {
      setError(err.message || 'Failed to load interns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterns();
  }, []);

  return (
    <section className="completion-panel" aria-labelledby="completion-title">
      <div className="completion-heading">
        <div>
          <p className="admin-eyebrow">UPCOMING COMPLETIONS</p>
          <h2 id="completion-title">Interns Completing Soon</h2>
          <p>Interns whose internship ends within the next 3 days.</p>
        </div>
        {!loading && !error && (
          <span className="completion-count">{interns.length} found</span>
        )}
      </div>

      {loading && (
        <div className="completion-list" aria-label="Loading interns">
          {[1, 2, 3].map((item) => <div className="completion-skeleton" key={item} />)}
        </div>
      )}

      {!loading && error && (
        <div className="completion-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={fetchInterns}>Retry</button>
        </div>
      )}

      {!loading && !error && interns.length === 0 && (
        <p className="completion-state">No interns completing within the next 3 days.</p>
      )}

      {!loading && !error && interns.length > 0 && (
        <div className="completion-list">
          {interns.map((intern) => {
            const daysRemaining = getDaysRemaining(intern.endDate);
            return (
              <article className="completion-row" key={intern._id || intern.id || intern.email}>
                <div className="completion-row-heading">
                  <div>
                    <h3>{intern.fullName}</h3>
                    <p>{intern.email}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <StatusBadge status={intern.internshipDetails?.status} />
                    <span className={`days-badge ${daysRemaining <= 0 ? 'overdue' : daysRemaining <= 1 ? 'urgent' : 'warning'}`}>
                      {daysRemaining <= 0 ? 'Due today' : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left`}
                    </span>
                  </div>
                </div>
                <div className="completion-details">
                  <div><span>Domain</span><strong>{intern.domain || '—'}</strong></div>
                  <div><span>End date</span><strong>{formatDate(intern.endDate)}</strong></div>
                  <div><span>Mentor</span><strong>{intern.internshipDetails?.mentor || '—'}</strong></div>
                  <div><span>College</span><strong>{intern.internshipDetails?.collegeName || '—'}</strong></div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
