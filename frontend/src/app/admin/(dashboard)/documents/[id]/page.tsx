"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { adminApiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  Database,
  Layers,
  Settings,
  Search,
  CheckCircle2,
  Terminal,
  Activity,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

interface Chunk {
  id: string;
  content: string;
  chunkIndex: number;
  tokenCount: number | null;
  pageNumber: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface DocumentDetail {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: "PDF" | "DOCX" | "TXT" | "MD";
  mimeType: string;
  fileSize: number;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  currentStep: "UPLOADED" | "FETCHING" | "PARSING" | "CHUNKING" | "EMBEDDING" | "STORING" | "COMPLETED" | "FAILED" | null;
  errorMessage: string | null;
  chunkSize: number;
  chunkOverlap: number;
  createdAt: string;
  chunks: Chunk[];
}

interface SseEvent {
  step: string;
  message: string;
  done?: boolean;
  error?: string;
}

const PIPELINE_STEPS = [
  { key: "FETCHING", label: "Fetching", desc: "Downloading file from storage" },
  { key: "PARSING", label: "Parsing", desc: "Extracting raw text contents" },
  { key: "CHUNKING", label: "Chunking", desc: "Splitting text into fragments" },
  { key: "EMBEDDING", label: "Embedding", desc: "Generating vector embeddings" },
  { key: "STORING", label: "Storing", desc: "Saving vectors and chunks to DB" },
];

export default function DocumentDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SSE Pipeline Streaming states
  const [sseActive, setSseActive] = useState(false);
  const [sseLogs, setSseLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Chunks browsing states
  const [chunkQuery, setChunkQuery] = useState("");
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const chunksPerPage = 10;

  const eventSourceRef = useRef<EventSource | null>(null);
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [retrying, setRetrying] = useState(false);

  const handleRetryPipeline = async () => {
    setRetrying(true);
    setPipelineError(null);
    setSseLogs([]);
    try {
      const res = await adminApiFetch<{
        status: string;
        data: { documentId: string; sseToken: string };
      }>(`/admin/documents/${id}/retry`, { method: "POST" });

      if (res.status === "success" && res.data?.sseToken) {
        setDocument((prev) =>
          prev
            ? {
                ...prev,
                status: "PENDING",
                currentStep: "UPLOADED",
                errorMessage: null,
                chunks: [],
              }
            : null
        );
        setCurrentStep("UPLOADED");
        setupSseStream(res.data.sseToken);
      } else {
        alert("Failed to restart the ingestion pipeline.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while attempting to retry ingestion.");
    } finally {
      setRetrying(false);
    }
  };

  const handleViewFile = () => {
    if (document?.fileUrl) {
      window.open(document.fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const fetchDocumentDetails = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await adminApiFetch<{ status: string; data: DocumentDetail }>(
        `/admin/documents/${id}`
      );
      if (res.status === "success") {
        setDocument(res.data);
        setCurrentStep(res.data.currentStep);
        setPipelineError(res.data.errorMessage);
        setError(null);

        // If the document is currently running, initialize the SSE stream
        if (
          (res.data.status === "PENDING" || res.data.status === "PROCESSING") &&
          !eventSourceRef.current
        ) {
          setupSseStream(tokenFromUrl);
        }
      } else {
        setError("Document details not found.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while loading document details.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const setupSseStream = async (initialToken?: string | null) => {
    try {
      setSseActive(true);
      setSseLogs((prev) => [...prev, "Initiating status stream connection..."]);

      let sseToken = initialToken;

      if (!sseToken) {
        // 1. Fetch SSE Token from new endpoint
        const tokenRes = await adminApiFetch<{ status: string; data: { sseToken: string } }>(
          `/admin/documents/${id}/token`
        );
        if (tokenRes.status !== "success" || !tokenRes.data?.sseToken) {
          throw new Error("Failed to authorize stream");
        }
        sseToken = tokenRes.data.sseToken;
      } else {
        setSseLogs((prev) => [...prev, "Authorized stream with upload response token."]);
      }

      // 2. Setup EventSource
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const sseUrl = `${apiUrl}/admin/documents/${id}/stream?token=${sseToken}`;

      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseLogs((prev) => [...prev, "Connected to pipeline status stream."]);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SseEvent;
          setCurrentStep(data.step);

          if (data.message) {
            setSseLogs((prev) => [...prev, `[${data.step}] ${data.message}`]);
          }

          if (data.error) {
            setPipelineError(data.error);
            setSseLogs((prev) => [...prev, `[ERROR] Pipeline failed: ${data.error}`]);
            es.close();
            eventSourceRef.current = null;
            setSseActive(false);
            fetchDocumentDetails(false);
            return;
          }

          if (data.done) {
            es.close();
            eventSourceRef.current = null;
            setSseActive(false);
            setSseLogs((prev) => [...prev, "Stream closed. Syncing data..."]);
            // Reload details to fetch final chunks & status
            fetchDocumentDetails(false);
          }
        } catch (e) {
          console.error("SSE parse error:", e);
        }
      };

      es.onerror = () => {
        setSseLogs((prev) => [...prev, "Status stream interrupted. Attempting to reconnect..."]);
        // If it persists or falls over, we safely close
        es.close();
        eventSourceRef.current = null;
        setSseActive(false);
      };
    } catch (err) {
      console.error(err);
      setSseLogs((prev) => [
        ...prev,
        `[CRITICAL] Stream connection failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
      setSseActive(false);
    }
  };

  useEffect(() => {
    fetchDocumentDetails();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [id]);

  const handleManualSync = () => {
    fetchDocumentDetails(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading document details...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4 w-full">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-3 animate-bounce" />
        <h4 className="text-lg font-bold text-foreground">Failed to Load Document</h4>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error || "Document not found"}</p>
        <Link href="/admin/documents" className="mt-6">
          <Button className="rounded-xl flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Button>
        </Link>
      </div>
    );
  }

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Stepper logic
  const getStepIndex = (step: string | null) => {
    if (!step) return -1;
    if (step === "COMPLETED" || step === "DONE") return PIPELINE_STEPS.length;
    if (step === "FAILED") return -2;
    return PIPELINE_STEPS.findIndex((s) => s.key === step);
  };

  const currentStepIdx = getStepIndex(currentStep);

  // Chunks Filter and Pagination
  const filteredChunks = document.chunks.filter((chunk) =>
    chunk.content.toLowerCase().includes(chunkQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredChunks.length / chunksPerPage);
  const paginatedChunks = filteredChunks.slice(
    (currentPage - 1) * chunksPerPage,
    currentPage * chunksPerPage
  );

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/documents">
            <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{document.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[500px] truncate">
              ID: {document.id}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {document.status !== "DONE" && document.status !== "FAILED" && (
            <Button
              variant="outline"
              onClick={handleManualSync}
              className="rounded-xl flex items-center gap-2 border-border"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Status
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleViewFile}
            disabled={!document?.fileUrl}
            className="rounded-xl flex items-center gap-2 border-border"
          >
            <Download className="h-4 w-4" />
            View Original File
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document Information Card */}
        <Card className="p-6 rounded-2xl border-border bg-card shadow-sm h-fit lg:col-span-1 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Document Details</h3>
              <p className="text-xs text-muted-foreground">Ingested configuration settings</p>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Details list */}
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Format</span>
              <span className="font-semibold">{document.fileType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Size</span>
              <span className="font-semibold">{formatBytes(document.fileSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mime Type</span>
              <span className="font-mono text-xs max-w-[150px] truncate">{document.mimeType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created At</span>
              <span className="font-semibold">
                {new Date(document.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* RAG settings */}
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              <Settings className="h-3.5 w-3.5" />
              <span>Pipeline Config</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chunk Size</span>
              <span className="font-mono font-semibold">{document.chunkSize} chars</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chunk Overlap</span>
              <span className="font-mono font-semibold">{document.chunkOverlap} chars</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Chunks</span>
              <span className="font-mono font-semibold text-primary">{document.chunks.length}</span>
            </div>
          </div>

          {document.description && (
            <>
              <hr className="border-border/60" />
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Description
                </span>
                <p className="text-muted-foreground leading-relaxed mt-1">{document.description}</p>
              </div>
            </>
          )}
        </Card>

        {/* Live Pipeline Tracker or Chunks browser */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* RAG pipeline progress tracker */}
          <Card className="p-6 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <Activity className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">RAG Ingestion Pipeline</h3>
                  <p className="text-xs text-muted-foreground">Monitor real-time parsing & embedding tasks</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {document.status === "FAILED" && (
                  <Button
                    onClick={handleRetryPipeline}
                    disabled={retrying}
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg flex items-center gap-1 border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
                  >
                    {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    <span>Retry Pipeline</span>
                  </Button>
                )}
                <Badge
                  className={
                    document.status === "DONE"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : document.status === "FAILED"
                      ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                      : "bg-sky-500/10 text-sky-500 border border-sky-500/20 animate-pulse"
                  }
                >
                  {document.status}
                </Badge>
              </div>
            </div>

            {/* Pipeline Step Stepper */}
            <div className="relative flex flex-col md:flex-row justify-between gap-6 md:gap-2 mt-4 pb-2">
              {PIPELINE_STEPS.map((step, idx) => {
                const isCompleted = currentStepIdx > idx || document.status === "DONE";
                const isActive = currentStepIdx === idx && document.status !== "FAILED";
                const isFailed = document.status === "FAILED" && currentStepIdx === idx;

                return (
                  <div key={step.key} className="flex md:flex-col items-center md:text-center flex-1 relative gap-3">
                    {/* Circle Indicator */}
                    <div
                      className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 z-10 ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25"
                          : isActive
                          ? "border-primary bg-background text-primary shadow-md shadow-primary/20 scale-110 animate-pulse"
                          : isFailed
                          ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/25"
                          : "border-muted bg-background text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                    </div>

                    {/* Step Labels */}
                    <div className="flex flex-col text-left md:text-center">
                      <span
                        className={`text-xs font-bold ${
                          isActive ? "text-primary" : isFailed ? "text-rose-500" : "text-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground hidden md:block max-w-[120px] mx-auto mt-0.5">
                        {step.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live SSE Logging terminal */}
            {(sseActive || sseLogs.length > 0 || pipelineError) && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Terminal className="h-3.5 w-3.5" /> Pipeline Live Stream Console
                  </span>
                  {sseActive && <span className="text-sky-500 animate-pulse">● streaming</span>}
                </div>

                <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300 border border-slate-800 shadow-inner flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
                  {sseLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed">
                      <span className="text-slate-500 font-bold select-none mr-2">&gt;</span>
                      {log}
                    </div>
                  ))}
                  {pipelineError && (
                    <div className="text-rose-400 font-bold mt-1">
                      <span className="text-rose-500 font-bold select-none mr-2">&gt; ERROR:</span>
                      {pipelineError}
                    </div>
                  )}
                  {sseActive && (
                    <div className="flex items-center gap-1.5 text-sky-400 mt-0.5 animate-pulse">
                      <span className="text-sky-500 font-bold select-none mr-2">&gt;</span>
                      Waiting for next pipeline step event...
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Chunks Browser */}
          <Card className="p-6 rounded-2xl border-border bg-card shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Document Chunks Browser</h3>
                  <p className="text-xs text-muted-foreground">Browse and search parsed database records</p>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-2.5 py-1">
                {filteredChunks.length} Chunks
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search raw chunk content..."
                value={chunkQuery}
                onChange={(e) => {
                  setChunkQuery(e.target.value);
                  setCurrentPage(1); // reset to first page on search
                }}
                className="pl-9 pr-4 h-10 rounded-xl bg-background/50 border-border"
              />
            </div>

            {/* List of Chunks */}
            {filteredChunks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-2xl bg-muted/5">
                <Layers className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-semibold text-foreground">No chunks found</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                  {document.status === "DONE"
                    ? "Try adjusting your search filter."
                    : "Chunks will populate here once the ingestion pipeline completes successfully."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {paginatedChunks.map((chunk) => {
                  const isExpanded = expandedChunkId === chunk.id;
                  return (
                    <div
                      key={chunk.id}
                      className="border border-border/80 hover:border-border rounded-xl bg-muted/5 overflow-hidden transition-all duration-200"
                    >
                      {/* Chunk Header bar */}
                      <div
                        onClick={() => setExpandedChunkId(isExpanded ? null : chunk.id)}
                        className="p-3 bg-muted/10 hover:bg-muted/20 cursor-pointer flex items-center justify-between gap-4 select-none text-xs font-semibold"
                      >
                        <div className="flex items-center gap-3">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">
                            #{chunk.chunkIndex + 1}
                          </span>
                          {chunk.tokenCount !== null && (
                            <span className="text-muted-foreground">
                              Tokens: <strong className="text-foreground">{chunk.tokenCount}</strong>
                            </span>
                          )}
                          {chunk.pageNumber !== null && (
                            <span className="text-muted-foreground">
                              Page: <strong className="text-foreground">{chunk.pageNumber}</strong>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="text-[10px]">ID: {chunk.id.slice(0, 8)}...</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>

                      {/* Chunk Body content */}
                      <div className="p-4 flex flex-col gap-3">
                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                          {chunk.content}
                        </p>

                        {/* Collapsed/Expanded Metadata Details */}
                        {isExpanded && chunk.metadata && (
                          <div className="flex flex-col gap-1.5 mt-2 border-t border-border/60 pt-3">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <Info className="h-3 w-3" /> Parser Metadata JSON
                            </span>
                            <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[10px] text-slate-300 border border-slate-800 overflow-x-auto">
                              {JSON.stringify(chunk.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-2">
                    <span className="text-xs text-muted-foreground">
                      Page <strong className="text-foreground font-semibold">{currentPage}</strong> of{" "}
                      <strong className="text-foreground font-semibold">{totalPages}</strong>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                        className="rounded-lg border-muted text-xs h-8 px-3"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        className="rounded-lg border-muted text-xs h-8 px-3"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
