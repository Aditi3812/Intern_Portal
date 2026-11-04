import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { verifyCertificate } from '../services/verify.service';
import './VerifyPage.css';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export default function VerifyPage() {
  const { verifyId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const performVerification = useCallback(async () => {
    if (!verifyId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setError(null);

    try {
      const res = await verifyCertificate(verifyId);
      setData(res);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Unable to connect to verification service. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [verifyId]);

  useEffect(() => {
    performVerification();
  }, [performVerification]);

  const isValid = data && data.status === 'valid';
  const isRevoked = data && data.status === 'revoked';

  return (
    <div className="verify-page-shell">
      {/* Background Ambience */}
      <div className="verify-backdrop-glow" aria-hidden="true" />

      {/* Main Container */}
      <main className="verify-container">
        {/* Brand Header */}
        <header className="verify-header">
          <div className="verify-logo">
            <span className="verify-logo-badge">UP</span>
            <div className="verify-logo-text">
              <span className="verify-brand-name">UPTOSKILL</span>
              <span className="verify-brand-sub">Credential Verification</span>
            </div>
          </div>
          <span className="verify-secure-tag">
            <svg
              className="verify-shield-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Official Record
          </span>
        </header>

        {/* State: Loading Skeleton */}
        {loading && (
          <div className="verify-card skeleton-card" role="status" aria-label="Verifying certificate">
            <div className="skeleton-badge shimmer" />
            <div className="skeleton-title shimmer" />
            <div className="skeleton-sub shimmer" />
            <div className="skeleton-grid">
              <div className="skeleton-cell shimmer" />
              <div className="skeleton-cell shimmer" />
              <div className="skeleton-cell shimmer" />
              <div className="skeleton-cell shimmer" />
            </div>
            <p className="verify-loading-text">Confirming authenticity with UPTOSKILL registry…</p>
          </div>
        )}

        {/* State: Network / Rate Limit Error */}
        {!loading && error && (
          <div className="verify-card error-card" role="alert">
            <div className="verify-status-icon error-icon" aria-hidden="true">⚠️</div>
            <h2>Verification Unavailable</h2>
            <p className="verify-desc">{error}</p>
            <button
              type="button"
              className="verify-retry-btn"
              onClick={performVerification}
            >
              ↻ Try Again
            </button>
          </div>
        )}

        {/* State: Not Found */}
        {!loading && !error && notFound && (
          <div className="verify-card not-found-card" role="status">
            <div className="verify-status-icon not-found-icon" aria-hidden="true">🔍</div>
            <span className="verify-status-badge badge-neutral">Not Found</span>
            <h2 className="verify-card-title">Certificate Not Recognized</h2>
            <p className="verify-desc">
              This verification link does not correspond to any active or archived credentials issued by UPTOSKILL.
            </p>
            <div className="verify-notice-box">
              <p>Please double-check the scanned QR code or URL to make sure the verification code is intact.</p>
            </div>
          </div>
        )}

        {/* State: Valid Certificate (Green Card) */}
        {!loading && !error && isValid && (
          <div className="verify-card valid-card" role="status">
            <div className="verify-card-top">
              <div className="verify-status-icon valid-icon" aria-hidden="true">✓</div>
              <span className="verify-status-badge badge-valid">Officially Verified</span>
            </div>

            <h1 className="verify-recipient-name">{data.recipientName}</h1>
            <p className="verify-cert-title">{data.certificateTitle}</p>

            <div className="verify-details-grid">
              <div className="verify-detail-item">
                <span className="verify-detail-label">Certificate Number</span>
                <code className="verify-detail-value cert-code">{data.certificateNumber}</code>
              </div>

              {data.domain && (
                <div className="verify-detail-item">
                  <span className="verify-detail-label">Domain / Specialization</span>
                  <span className="verify-detail-value">{data.domain}</span>
                </div>
              )}

              <div className="verify-detail-item">
                <span className="verify-detail-label">Issue Date</span>
                <span className="verify-detail-value">{formatDate(data.issuedAt)}</span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-detail-label">Status</span>
                <span className="verify-detail-value valid-status-text">Genuine & Active</span>
              </div>
            </div>

            <div className="verify-footer-note">
              <p>
                ✓ This credential has been cryptographically confirmed as authentic and was officially awarded by UptoSkills.
              </p>
            </div>
          </div>
        )}

        {/* State: Revoked Certificate (Red Card) */}
        {!loading && !error && isRevoked && (
          <div className="verify-card revoked-card" role="status">
            <div className="verify-card-top">
              <div className="verify-status-icon revoked-icon" aria-hidden="true">✕</div>
              <span className="verify-status-badge badge-revoked">Certificate Revoked</span>
            </div>

            <h1 className="verify-recipient-name">{data.recipientName}</h1>
            <p className="verify-cert-title">{data.certificateTitle}</p>

            <div className="verify-alert-banner">
              <strong>Notice:</strong> This certificate was officially revoked on{' '}
              <strong>{formatDate(data.revokedAt)}</strong> and is no longer valid.
            </div>

            <div className="verify-details-grid">
              <div className="verify-detail-item">
                <span className="verify-detail-label">Certificate Number</span>
                <code className="verify-detail-value cert-code">{data.certificateNumber}</code>
              </div>

              {data.domain && (
                <div className="verify-detail-item">
                  <span className="verify-detail-label">Domain</span>
                  <span className="verify-detail-value">{data.domain}</span>
                </div>
              )}

              <div className="verify-detail-item">
                <span className="verify-detail-label">Original Issue Date</span>
                <span className="verify-detail-value">{formatDate(data.issuedAt)}</span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-detail-label">Revocation Date</span>
                <span className="verify-detail-value revoked-status-text">{formatDate(data.revokedAt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Page Footer */}
        <footer className="verify-footer">
          <p>© {new Date().getFullYear()} UptoSkills Education Services. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
