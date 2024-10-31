# SEC Filing Diff Tool

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

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any enhancements.
