import { compareParsedDocuments } from "./compareParsedDocuments";
import { parseFiling } from "./parseFiling/parseFiling";

export const getComparisonDocuments = procedure
  .input(
    z.object({
      filingIdNew: z.string(),
      filingIdOld: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Parse new filing
    const filingNew = await prisma.company_filing.findFirstOrThrow({
      where: { id: { equals: input.filingIdNew } },
      include: {
        company: true,
      },
    });
    if (!["10-Q", "10-K"].includes(filingNew.form || "")) {
      throw new Error("Filing new is not a 10-Q or 10-K");
    }
    const filingNewUrl =
      filingNew.primary_document && filingNew.filing_json_index_url
        ? filingNew.filing_json_index_url.replace("index.json", filingNew.primary_document)
        : null;
    if (!filingNewUrl) {
      throw new Error("Filing new URL not found");
    }
    const filingNewDocumentHtml = await fetch(filingNewUrl).then((res) => res.text());
    const filingNewParsedHtml = parseFiling(filingNewDocumentHtml);

    // Parse old filing
    const filingOld = await prisma.company_filing.findFirstOrThrow({
      where: { id: { equals: input.filingIdOld } },
      include: {
        company: true,
      },
    });
    if (!["10-Q", "10-K"].includes(filingOld.form || "")) {
      throw new Error("Filing old is not a 10-Q or 10-K");
    }
    const filingOldUrl =
      filingOld.primary_document && filingOld.filing_json_index_url
        ? filingOld.filing_json_index_url.replace("index.json", filingOld.primary_document)
        : null;
    if (!filingOldUrl) {
      throw new Error("Filing old URL not found");
    }
    const filingOldDocumentHtml = await fetch(filingOldUrl).then((res) => res.text());
    const filingOldParsedHtml = parseFiling(filingOldDocumentHtml);

    const comparison = compareParsedDocuments(filingNewParsedHtml, filingOldParsedHtml);

    return {
      filingNew: {
        ...filingNew,
        url: filingNewUrl,
        documentHtml: filingNewDocumentHtml,
      },
      filingOld: {
        ...filingOld,
        url: filingOldUrl,
        documentHtml: filingOldDocumentHtml,
      },
      comparison,
    };
  });
