# SEC Filing Diff Tool (Experimental)

> ⚠️ **Experimental Status**: This tool represents significant research and experimentation in parsing SEC filings. SEC documents are notably complex and inconsistent, and this implementation reflects months of testing against various filing formats and edge cases.

A sophisticated tool for parsing and comparing SEC filings (10-K, 10-Q, etc.) to identify and visualize changes between documents. This tool helps analysts, investors, and researchers efficiently track changes in company disclosures over time.

## Overview

The SEC Filing Diff Tool processes SEC filings through several stages:
1. Document parsing and normalization
2. Section identification and matching
3. Intelligent text comparison
4. Change visualization

### Key Features

- **Intelligent Section Matching**: Automatically identifies and aligns corresponding sections between documents, even when titles or ordering changes slightly
- **Multi-pass Text Comparison**: Uses a three-pass algorithm with varying similarity thresholds to accurately match content:
  - First pass: Exact matches
  - Second pass: High similarity (90%+)
  - Third pass: Moderate similarity (50%+)
- **Table Handling**: Special handling for tables using MD5 hashing to detect changes
- **Page-aware Processing**: Maintains page number references for easy navigation
- **HTML & Markdown Support**: Processes both HTML input and provides Markdown output

## How It Works

### 1. Document Parsing (`parseFiling.ts`)

The parser processes raw SEC filing HTML documents through several steps:
- Unwraps special SEC EDGAR tags
- Builds a hierarchical document structure
- Identifies and processes the table of contents
- Segments the document into logical sections
- Tracks page numbers and section relationships

### 2. Text Normalization (`getNormalizedText.ts`)

To improve matching accuracy, the tool normalizes text by:
- Removing special characters
- Standardizing whitespace
- Converting to lowercase
- Maintaining semantic meaning while reducing noise

### 3. Document Comparison (`compareParsedDocuments.ts`)

The comparison engine:
- Matches sections between documents using titles and content
- Identifies added, removed, and modified sections
- Uses Levenshtein distance to calculate text similarity
- Generates detailed diffs showing exact changes
- Handles special cases like tables and lists

### 4. API Integration (`route.get.comparison-documents.ts`)

The tool provides an API endpoint that:
- Accepts filing IDs for comparison
- Fetches documents from SEC EDGAR
- Processes and compares the filings
- Returns structured comparison results

## Use Cases

- **Regulatory Compliance**: Track changes in risk factors, business descriptions, and other key disclosures
- **Investment Research**: Quickly identify material changes in company filings
- **Legal Review**: Efficiently review disclosure evolution over time
- **Academic Research**: Analyze patterns in corporate disclosures

## Technical Details

The tool uses several key libraries:
- `@sanity/diff-match-patch` for text diffing
- `fast-levenshtein` for similarity calculations
- `turndown` for HTML to Markdown conversion
- `JSDOM` for HTML parsing

## Performance

The comparison algorithm is optimized for both accuracy and speed:
- Multi-pass matching reduces computational complexity
- Smart section matching limits comparison scope
- Efficient text normalization improves match quality
- Specialized handling for tables and complex structures

## Future Improvements

- Support for more SEC filing types
- Enhanced table comparison algorithms
- Machine learning-based section matching
- Interactive diff visualization
- Batch processing capabilities
- Export functionality for different formats

## Limitations

While the tool handles many common cases well, users should be aware of certain limitations:

- Some highly unusual filing formats may not parse correctly
- Very old filings (pre-2005) may have inconsistent results
- Extremely large tables might have matching issues
- Some company-specific formatting may require special handling
- The tool works best with 10-K and 10-Q filings; other forms may have reduced accuracy

## Development Challenges

Building this tool required overcoming several significant challenges:

### SEC Filing Complexity
- SEC filings lack consistent structure across companies and years
- Documents mix HTML, plain text, and proprietary EDGAR tags
- Table formats vary dramatically between companies
- Section titles and hierarchies aren't standardized
- Companies frequently reorganize their filing structures

### Edge Cases
Through extensive testing across hundreds of filings, we encountered and addressed:
- Inconsistent HTML formatting
- Missing or malformed tables of contents
- Varying approaches to section numbering
- Mixed usage of tables vs. text for similar content
- Incomplete or incorrect EDGAR tags
- Historical filing format changes
- Company-specific formatting quirks

### Parsing Reliability
The current implementation represents many iterations of refinement:
- Multiple parsing strategies were tested and combined
- Section matching algorithms were tuned through trial and error
- Text normalization rules evolved based on real-world examples
- Table handling required special consideration for different formats
- Page number tracking needed to account for various document structures

## Contributing

Given the experimental nature of this tool, we especially welcome:
- Reports of parsing failures with specific examples
- Additional test cases from different companies/years
- Improvements to section matching algorithms
- Enhanced table parsing strategies
- Documentation of company-specific edge cases
