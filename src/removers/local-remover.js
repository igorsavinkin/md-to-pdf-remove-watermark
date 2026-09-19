import { PDFDocument, PDFName, PDFDict, PDFNumber } from 'pdf-lib';
import logger from '../utils/logger.js';

const WATERMARK_CA_THRESHOLD = 0.5;

export async function removeWatermark(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
  const context = pdfDoc.context;
  const pages = pdfDoc.getPages();
  let modifiedPages = 0;

  for (let i = 0; i < pages.length; i++) {
    const pageDict = pages[i].node;
    const resources = pageDict.lookup(PDFName.of('Resources'));
    if (!(resources instanceof PDFDict)) continue;

    const extGState = resources.lookup(PDFName.of('ExtGState'));
    if (!(extGState instanceof PDFDict)) continue;

    let pageModified = false;
    for (const [keyRef, valueRef] of extGState.entries()) {
      const gStateDict = context.lookup(valueRef);
      if (!(gStateDict instanceof PDFDict)) continue;

      const caValue = gStateDict.lookup(PDFName.of('ca'));
      if (!caValue) continue;

      const caNum = typeof caValue.valueOf === 'function' ? caValue.valueOf() : parseFloat(caValue.toString());
      if (caNum > 0 && caNum < WATERMARK_CA_THRESHOLD) {
        gStateDict.set(PDFName.of('ca'), PDFNumber.of(0));
        const caStroke = gStateDict.lookup(PDFName.of('CA'));
        if (caStroke) {
          gStateDict.set(PDFName.of('CA'), PDFNumber.of(0));
        }
        pageModified = true;
        logger.debug({ page: i + 1, gs: keyRef.toString(), originalCa: caNum }, 'Watermark opacity set to 0');
      }
    }
    if (pageModified) modifiedPages++;
  }

  if (modifiedPages === 0) {
    logger.warn('No watermark ExtGState with low opacity found. PDF may already be clean or use a different watermark method.');
  } else {
    logger.info({ pages: modifiedPages }, 'Watermark removed from PDF');
  }

  return await pdfDoc.save();
}
