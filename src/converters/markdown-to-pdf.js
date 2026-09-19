import config from '../config.js';
import logger from '../utils/logger.js';

export async function convertMarkdownToPdf(markdownContent, filename) {
  const { apiKey, baseUrl, timeoutMs } = config.markdownToPdf;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        markdown: markdownContent,
        filename: filename || 'output.pdf',
        response: 'pdf',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      switch (response.status) {
        case 401:
          throw new Error('Invalid API key. Check MARKDOWNTOPDF_API_KEY in .env');
        case 402:
          throw new Error('API subscription required. The sandbox key produces watermarked PDFs.');
        case 429:
          throw Object.assign(new Error('Rate limit exceeded'), { code: 'RATE_LIMIT' });
        case 422:
          throw new Error(`Invalid request: ${errorBody}`);
        case 503:
          throw Object.assign(new Error('Service unavailable'), { code: 'SERVICE_UNAVAILABLE' });
        default:
          throw new Error(`API error ${response.status}: ${errorBody}`);
      }
    }

    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    logger.info({ size: pdfBuffer.length }, 'PDF generated from markdown');
    return pdfBuffer;
  } finally {
    clearTimeout(timeout);
  }
}
