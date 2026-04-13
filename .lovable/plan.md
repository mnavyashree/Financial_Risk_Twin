

## Plan: Enable PDF & DOCX Parsing to Auto-Fill Input Fields

Currently, only CSV files are parsed and used to auto-populate the financial input form. PDF and DOCX files are just stored. This plan adds intelligent parsing for both formats.

### Approach

Since PDF and DOCX files contain unstructured text (unlike CSV's tabular format), we'll use AI to extract the 12 financial metrics from the document content. The frontend will read the file's text, send it to a new backend function, which uses the Lovable AI Gateway (Gemini) to identify and extract field values.

### Changes

**1. New Edge Function: `parse-document`**

A new backend function that:
- Receives raw text content extracted from a PDF or DOCX on the client side
- Sends it to the Lovable AI Gateway with a structured prompt asking it to extract the 12 financial fields (company name, industry, monthly revenue, burn rate, etc.)
- Returns a JSON object matching the same format as the CSV parser output
- Uses `LOVABLE_API_KEY` (already available from the AI insights function)

**2. Update `FileUpload.tsx`**

- For PDF files: use the browser's `FileReader` to read as `ArrayBuffer`, then use the `pdf.js` library (added to dependencies) to extract text from all pages client-side
- For DOCX files: use the `mammoth` library (added to dependencies) to extract raw text client-side
- Send the extracted text to the new `parse-document` edge function
- Apply the returned fields to the form via the existing `onCSVParsed` callback
- Update the loading text from "Parsing CSV..." to "Parsing Document..."
- Update the description text to reflect that all three formats now auto-fill fields

**3. Dependencies Added**

- `pdfjs-dist` — client-side PDF text extraction
- `mammoth` — client-side DOCX text extraction

### Technical Details

- Text extraction happens client-side (no need for server-side PDF libraries in Deno)
- AI extraction happens server-side via the Lovable AI Gateway (Gemini Flash for speed)
- The AI prompt requests strict JSON output with only the 12 known field names
- Fallback: if AI can't find a field, it's simply omitted (partial fill is fine)
- Same field mapping and validation as the CSV parser

### Files Modified/Created

| File | Action |
|------|--------|
| `supabase/functions/parse-document/index.ts` | **Create** — AI-powered document field extractor |
| `src/components/FileUpload.tsx` | **Modify** — Add PDF/DOCX text extraction and call new function |
| `package.json` | **Modify** — Add `pdfjs-dist` and `mammoth` |

