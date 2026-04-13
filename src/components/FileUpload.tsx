import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { StartupInputs } from '@/types/risk';

const ALLOWED_TYPES = [
  'text/csv',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface FileUploadProps {
  onCSVParsed: (data: Partial<StartupInputs>) => void;
}

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];
  const maxPages = Math.min(pdf.numPages, 20); // Limit to 20 pages

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n');
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function isCSV(file: File): boolean {
  return file.type === 'text/csv' || file.name.endsWith('.csv');
}

function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.endsWith('.pdf');
}

function isDOCX(file: File): boolean {
  return (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword' ||
    file.name.endsWith('.docx') ||
    file.name.endsWith('.doc')
  );
}

export function FileUpload({ onCSVParsed }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsingLabel, setParsingLabel] = useState('Parsing...');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setStatus(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      setStatus({ type: 'error', message: 'Only CSV, PDF, and DOCX files are allowed.' });
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      setStatus({ type: 'error', message: 'File must be under 5MB.' });
      return;
    }

    // Upload to storage
    setUploading(true);
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(filePath, file);

    if (uploadError) {
      setStatus({ type: 'error', message: 'Upload failed: ' + uploadError.message });
      setUploading(false);
      return;
    }

    setUploading(false);
    toast({ title: 'File uploaded', description: `${file.name} stored securely.` });

    // Parse file based on type
    if (isCSV(file)) {
      setParsing(true);
      setParsingLabel('Parsing CSV...');
      try {
        const csvText = await file.text();
        const { data, error } = await supabase.functions.invoke('parse-csv', {
          body: { csvContent: csvText },
        });

        if (error) throw error;
        if (data?.data) {
          onCSVParsed(data.data);
          setStatus({ type: 'success', message: `Parsed ${Object.keys(data.data).length} fields from CSV.` });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to parse CSV';
        setStatus({ type: 'error', message });
      }
      setParsing(false);
    } else if (isPDF(file) || isDOCX(file)) {
      setParsing(true);
      const fileType = isPDF(file) ? 'PDF' : 'DOCX';
      setParsingLabel(`Extracting text from ${fileType}...`);

      try {
        // Step 1: Extract text client-side
        let textContent: string;
        if (isPDF(file)) {
          textContent = await extractTextFromPDF(file);
        } else {
          textContent = await extractTextFromDOCX(file);
        }

        if (!textContent || textContent.trim().length < 10) {
          setStatus({ type: 'error', message: `Could not extract readable text from this ${fileType}. The file may be scanned or image-based.` });
          setParsing(false);
          if (fileRef.current) fileRef.current.value = '';
          return;
        }

        // Step 2: Send to AI for field extraction
        setParsingLabel(`AI extracting financial data...`);

        const { data, error } = await supabase.functions.invoke('parse-document', {
          body: { textContent },
        });

        if (error) throw error;

        if (data?.data && Object.keys(data.data).length > 0) {
          onCSVParsed(data.data);
          setStatus({
            type: 'success',
            message: `AI extracted ${data.fieldsExtracted || Object.keys(data.data).length} fields from ${fileType}.`,
          });
        } else {
          setStatus({
            type: 'error',
            message: `No financial data could be identified in this ${fileType}. Ensure it contains financial metrics like revenue, burn rate, etc.`,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : `Failed to parse ${fileType}`;
        setStatus({ type: 'error', message });
      }
      setParsing(false);
    }

    // Reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <motion.div
      className="glass-card p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Upload Data</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Upload CSV, PDF, or DOCX to auto-fill financial fields using AI extraction.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.pdf,.docx,.doc"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || parsing}
      >
        {uploading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
        ) : parsing ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {parsingLabel}</>
        ) : (
          <><Upload className="h-4 w-4 mr-2" /> Choose File</>
        )}
      </Button>

      {status && (
        <motion.div
          className={`flex items-start gap-2 p-2 rounded-md text-xs ${
            status.type === 'success'
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          )}
          {status.message}
        </motion.div>
      )}
    </motion.div>
  );
}
