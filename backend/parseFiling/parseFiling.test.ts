import fs from 'fs';
import path from 'path';
import { parseFiling } from './parseFiling';

describe('parseFiling', () => {
  describe('10-Q', () => {
    const fixturesDir = path.join(__dirname, '../fixtures/10-Q');
    const fixtures = fs.readdirSync(fixturesDir);

    fixtures.forEach((fixture) => {
      const testName = path.basename(fixture, '.html');

      it(`should parse the html for ${testName}`, () => {
        const html = fs.readFileSync(path.join(fixturesDir, fixture), 'utf8');
        const result = parseFiling(html);
        expect(result).toMatchSnapshot();
      });
    });
  });

  describe('10-K', () => {
    const fixturesDir = path.join(__dirname, '../fixtures/10-K');
    const fixtures = fs.readdirSync(fixturesDir);

    fixtures.forEach((fixture) => {
      const testName = path.basename(fixture, '.html');

      it(`should parse the html for ${testName}`, () => {
        const html = fs.readFileSync(path.join(fixturesDir, fixture), 'utf8');
        const result = parseFiling(html);
        expect(result).toMatchSnapshot();
      });
    });
  });
});
