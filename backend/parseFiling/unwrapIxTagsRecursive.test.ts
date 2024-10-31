import { JSDOM } from 'jsdom';
import { unwrapIxTagsRecursive } from './unwrapIxTagsRecursive';

// Update the normalizeHTML function
function normalizeHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function sortAttributes(element: Element) {
    const attributes = Array.from(element.attributes);
    attributes.sort((a, b) => a.name.localeCompare(b.name));
    attributes.forEach((attr) => {
      element.removeAttribute(attr.name);
      element.setAttribute(attr.name, attr.value);
    });

    element.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        sortAttributes(child as Element);
      } else if (child.nodeType === Node.TEXT_NODE) {
        child.textContent =
          child.textContent?.trim().replace(/\s+/g, ' ') || '';
      }
    });
  }

  sortAttributes(doc.body);
  return doc.body.innerHTML.replace(/>\s+</g, '><').trim();
}

describe('unwrapIxTagsRecursive', () => {
  let document: Document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('should unwrap ix tags and preserve content', () => {
    document.body.innerHTML = `
      <ix:continuation>
        <div>
          <span>Text content</span>
          <ix:nonnumeric>
            <div>Nested content</div>
          </ix:nonnumeric>
        </div>
      </ix:continuation>
    `;

    unwrapIxTagsRecursive(document.body);

    expect(normalizeHTML(document.body.innerHTML)).toBe(
      normalizeHTML(`
        <div>
          <span>Text content</span>
          <div>Nested content</div>
        </div>
      `)
    );
  });

  it('should handle deeply nested ix tags', () => {
    document.body.innerHTML = `
      <ix:continuation>
        <div>
          <ix:nonnumeric>
            <span>
              <ix:continuation>Deeply nested</ix:continuation>
            </span>
          </ix:nonnumeric>
        </div>
      </ix:continuation>
    `;

    unwrapIxTagsRecursive(document.body);

    expect(normalizeHTML(document.body.innerHTML)).toBe(
      normalizeHTML('<div><span>Deeply nested</span></div>')
    );
  });

  it('should not modify non-ix tags', () => {
    document.body.innerHTML = `
      <div>
        <span>Normal content</span>
        <p>More content</p>
      </div>
    `;

    unwrapIxTagsRecursive(document.body);

    expect(normalizeHTML(document.body.innerHTML)).toBe(
      normalizeHTML(`
        <div>
          <span>Normal content</span>
          <p>More content</p>
        </div>
      `)
    );
  });

  it('should store the metadata in the element', () => {
    document.body.innerHTML = `
      <div>
        <span>Note 1.  <ix:nonnumeric contextref="c-1" name="us-gaap:OrganizationConsolidationAndPresentationOfFinancialStatementsDisclosureTextBlock" id="f-482" continuedat="f-482-1" escape="true">Summary of Significant Accounting Policies</ix:nonnumeric></span>
      </div>
    `;

    unwrapIxTagsRecursive(document.body);

    expect(normalizeHTML(document.body.innerHTML)).toBe(
      normalizeHTML(`
        <div>
          <span data-ix-contextref="c-1" data-ix-name="us-gaap:OrganizationConsolidationAndPresentationOfFinancialStatementsDisclosureTextBlock" id="f-482" data-ix-continuedat="f-482-1">Note 1. Summary of Significant Accounting Policies</span>
        </div>
      `)
    );
  });

  it('should work with tables', () => {
    document.body.innerHTML = `
<ix:nonnumeric
  contextref="c-1"
  name="us-gaap:PropertyPlantAndEquipmentPolicyTextBlock"
  id="f-502"
  continuedat="f-502-1"
  escape="true"
>
  <div>
    <span>Property and Equipment</span>
  </div>
  <div>
    <span
      >Property and equipment are initially recorded at cost. Gains or losses on disposition are
      recognized as earned or incurred. Costs of major improvements are capitalized, while costs of
      normal repairs and maintenance are expensed as incurred.
      <ix:nonnumeric
        >The following table summarizes the Company's property and equipment balances and includes
        the estimated useful lives that are generally used to depreciate the assets on a
        straight-line basis:</ix:nonnumeric
      >
    </span>
  </div>
  <ix:continuation id="f-503-1">
    <div>
      <table>
        <tbody>
          <tr>
          <td
            >
              <div>
                <span><ix:nonnumeric
                    contextref="c-74"
                    name="us-gaap:PropertyPlantAndEquipmentUsefulLife"
                    format="ixt-sec:duryear"
                    id="f-510"
                    >2</ix:nonnumeric
                  >
                  -
                  <ix:nonnumeric
                    contextref="c-75"
                    name="us-gaap:PropertyPlantAndEquipmentUsefulLife"
                    format="ixt-sec:duryear"
                    id="f-511"
                    >30</ix:nonnumeric
                  ></span
                >
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </ix:continuation>
</ix:nonnumeric>
    `;

    unwrapIxTagsRecursive(document.body);

    expect(normalizeHTML(document.body.innerHTML)).toBe(
      normalizeHTML(`
  <div>
    <span>Property and Equipment</span>
  </div>
  <div>
    <span>Property and equipment are initially recorded at cost. Gains or losses on disposition are
      recognized as earned or incurred. Costs of major improvements are capitalized, while costs of
      normal repairs and maintenance are expensed as incurred. The following table summarizes the Company's property and equipment balances and includes
        the estimated useful lives that are generally used to depreciate the assets on a
        straight-line basis:
    </span>
  </div>
    <div>
      <table>
        <tbody>
          <tr>
            <td>
              <div>
                <span data-ix-contextref="c-75" data-ix-name="us-gaap:PropertyPlantAndEquipmentUsefulLife" id="f-511">2 - 30</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
      `)
    );
  });
});
