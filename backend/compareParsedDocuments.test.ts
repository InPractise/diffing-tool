import fs from 'fs';
import path from 'path';
import { parseFiling } from './parseFiling/parseFiling';
import { compareParsedDocuments } from './compareParsedDocuments';

describe('compareParsedDocuments', () => {
  describe('10-Q', () => {
    it('should compare two 10-Q documents', () => {
      const oldDocumentHtml = fs.readFileSync(
        path.join(__dirname, 'fixtures/10-Q/wmt-20231031.html'),
        'utf8'
      );
      const newDocumentHtml = fs.readFileSync(
        path.join(__dirname, 'fixtures/10-Q/wmt-20240430.html'),
        'utf8'
      );

      const parsedOldDocument = parseFiling(oldDocumentHtml);
      const parsedNewDocument = parseFiling(newDocumentHtml);

      const comparedDocument = compareParsedDocuments(
        parsedNewDocument,
        parsedOldDocument
      );

      expect(comparedDocument).toMatchSnapshot();
    });
  });

  describe('10-K', () => {
    it('should compare two 10-K documents', () => {
      const oldDocumentHtml = fs.readFileSync(
        path.join(__dirname, 'fixtures/10-K/wmt-20230131.html'),
        'utf8'
      );
      const newDocumentHtml = fs.readFileSync(
        path.join(__dirname, 'fixtures/10-K/wmt-20240131.html'),
        'utf8'
      );

      const parsedOldDocument = parseFiling(oldDocumentHtml);
      const parsedNewDocument = parseFiling(newDocumentHtml);

      const comparedDocument = compareParsedDocuments(
        parsedNewDocument,
        parsedOldDocument
      );

      expect(comparedDocument).toMatchSnapshot();
    });
  });
});
