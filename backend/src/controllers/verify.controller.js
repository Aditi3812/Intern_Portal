import Certificate from '../models/Certificate.js';

/**
 * Public certificate verification endpoint.
 * GET /api/verify/:verifyId
 *
 * Requirements:
 * - No authentication
 * - Rate-limited
 * - Returns only: certificateNumber, recipientName, certificateTitle, domain, issuedAt, status (valid | revoked), and revokedAt if revoked.
 * - Never returns email, intern code, mobile number, or internal IDs.
 * - Uniform 404 response shape for both unknown and malformed IDs.
 */
export const verifyCertificate = async (req, res) => {
  const notFoundResponse = () =>
    res.status(404).json({ message: 'Certificate not found' });

  try {
    const { verifyId } = req.params;

    // Check for malformed verifyId - uniform 404 shape
    if (
      !verifyId ||
      typeof verifyId !== 'string' ||
      verifyId.length < 4 ||
      verifyId.length > 64 ||
      !/^[a-zA-Z0-9_-]+$/.test(verifyId)
    ) {
      return notFoundResponse();
    }

    // Only finalized/issued certificates can be verified publicly. Drafts cannot.
    const cert = await Certificate.findOne({
      verifyId,
      status: { $in: ['finalized', 'issued', 'revoked'] },
    })
      .select(
        'certificateNumber recipientName certificateTitle domain issuedAt issuedDate finalizedAt isRevoked revokedAt status'
      )
      .lean();

    if (!cert) {
      return notFoundResponse();
    }

    const isRevoked = Boolean(cert.isRevoked || cert.status === 'revoked');
    const status = isRevoked ? 'revoked' : 'valid';

    return res.status(200).json({
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName || 'Intern',
      certificateTitle: cert.certificateTitle || 'Certificate',
      domain: cert.domain || '',
      issuedAt: cert.issuedAt || cert.issuedDate || cert.finalizedAt || null,
      status,
      ...(isRevoked ? { revokedAt: cert.revokedAt || null } : {}),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Verification check failed',
      error: error.message,
    });
  }
};
