import { createApiClient } from '@/shared/config/api.config';

const publicApi = createApiClient();

/**
 * Public certificate verification.
 * Does not attach any auth headers or authentication logic.
 *
 * @param {string} verifyId
 * @returns {Promise<{
 *   certificateNumber: string,
 *   recipientName: string,
 *   certificateTitle: string,
 *   domain: string,
 *   issuedAt: string,
 *   status: 'valid' | 'revoked',
 *   revokedAt?: string
 * }>}
 */
export const verifyCertificate = async (verifyId) => {
  const response = await publicApi.get(`/api/verify/${encodeURIComponent(verifyId)}`);
  return response.data;
};

export default {
  verifyCertificate,
};
