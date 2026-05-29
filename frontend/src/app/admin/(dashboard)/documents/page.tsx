"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  X,
  FileCode,
  FileSpreadsheet,
  AlertCircle,
  Settings,
  Database,
  Layers,
  CheckCircle,
} from "lucide-react";

interface DocumentListItem {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: "PDF" | "DOCX" | "TXT" | "MD";
  mimeType: string;
  fileSize: number;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  currentStep: string | null;
  errorMessage: string | null;
  chunkSize: number;
  chunkOverlap: number;
  createdAt: string;
  chunkCount: number;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Upload Form State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [chunkSize, setChunkSize] = useState(1500);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await adminApiFetch<{ status: string; data: DocumentListItem[] }>(
        "/admin/documents"
      );
      if (res.status === "success") {
        setDocuments(res.data);
        setError(null);
      } else {
        setError("Failed to fetch documents");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while loading documents.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select a file to upload.");
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError("Please specify a document title.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Fetch Admin token
      const tokenRes = await fetch("/api/auth/token");
      if (!tokenRes.ok) throw new Error("Not authenticated");
      const { token } = (await tokenRes.json()) as { token: string };

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("description", uploadDescription);
      formData.append("chunkSize", chunkSize.toString());
      formData.append("chunkOverlap", chunkOverlap.toString());

      // 3. Make POST request
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiUrl}/admin/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${res.statusText}`);
      }

      const uploadResult = (await res.json()) as {
        status: string;
        data: { documentId: string; sseToken: string };
      };

      // Reset form and close drawer
      setUploadTitle("");
      setUploadDescription("");
      setUploadFile(null);
      setChunkSize(1500);
      setChunkOverlap(200);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploadOpen(false);

      // Redirect directly to the document details page to view the live SSE pipeline run
      router.push(`/admin/documents/${uploadResult.data.documentId}?token=${uploadResult.data.sseToken}`);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err instanceof Error ? err.message : "Document upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const res = await adminApiFetch<{ status: string }>(
        `/admin/documents/${deleteConfirmId}`,
        { method: "DELETE" }
      );
      if (res.status === "success") {
        setDocuments((prev) => prev.filter((doc) => doc.id !== deleteConfirmId));
        setDeleteConfirmId(null);
      } else {
        alert("Failed to delete the document.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during deletion.");
    } finally {
      setDeleting(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "PDF":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "DOCX":
        return <FileSpreadsheet className="h-5 w-5 text-blue-500" />;
      case "MD":
        return <FileCode className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: DocumentListItem["status"]) => {
    switch (status) {
      case "DONE":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">
            Ready
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-sky-500/10 text-sky-500 border border-sky-500/20 px-2 py-0.5 rounded-full text-xs font-semibold animate-pulse flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Indexing
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">
            Queued
          </Badge>
        );
    }
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const filteredDocs = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Compute metrics
  const totalDocs = documents.length;
  const readyChunks = documents.reduce((acc, doc) => acc + (doc.chunkCount || 0), 0);
  const activeProcessingCount = documents.filter((d) => d.status === "PROCESSING" || d.status === "PENDING").length;
  const failedCount = documents.filter((d) => d.status === "FAILED").length;

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload document sources, configure chunking parameters, and monitor your vector search RAG ingestion.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchDocuments(true)}
            disabled={loading || refreshing}
            className="rounded-xl border-border"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="rounded-xl flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 rounded-2xl border-border bg-card shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</p>
            <h3 className="text-2xl font-bold mt-1">{totalDocs}</h3>
          </div>
        </Card>
        <Card className="p-6 rounded-2xl border-border bg-card shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vector Chunks</p>
            <h3 className="text-2xl font-bold mt-1">{readyChunks}</h3>
          </div>
        </Card>
        <Card className="p-6 rounded-2xl border-border bg-card shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Indexing</p>
            <h3 className="text-2xl font-bold mt-1">{activeProcessingCount}</h3>
          </div>
        </Card>
        <Card className="p-6 rounded-2xl border-border bg-card shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Failures</p>
            <h3 className="text-2xl font-bold mt-1">{failedCount}</h3>
          </div>
        </Card>
      </div>

      {/* Main List Area */}
      <Card className="rounded-2xl border-border bg-card/40 backdrop-blur-sm overflow-hidden shadow-sm">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-10 rounded-xl bg-background/50"
            />
          </div>
        </div>

        {/* Loading / Error states */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
            <h4 className="text-base font-semibold text-foreground">Fetch Error</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
            <Button onClick={() => fetchDocuments(true)} className="mt-4 rounded-xl">
              Retry
            </Button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Database className="h-12 w-12 text-muted-foreground/30 mb-3 animate-pulse" />
            <h4 className="text-base font-semibold text-foreground">No documents found</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {searchQuery ? "Try refining your search query." : "Upload documents to feed the RAG pipeline."}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsUploadOpen(true)} className="mt-4 rounded-xl">
                Upload First File
              </Button>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-3.5">Document Details</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Size</th>
                  <th className="px-6 py-3.5">Chunks</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Added On</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-muted/10 group transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-[300px]">
                        <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {doc.title}
                        </span>
                        {doc.description && (
                          <span className="text-xs text-muted-foreground truncate mt-0.5">
                            {doc.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                        {getFileIcon(doc.fileType)}
                        {doc.fileType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                      {formatBytes(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-foreground font-semibold">
                      {doc.chunkCount}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/documents/${doc.id}`}>
                          <Button variant="outline" size="sm" className="h-8 rounded-lg flex items-center gap-1 border-muted hover:border-primary">
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Details</span>
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteConfirmId(doc.id)}
                          className="h-8 w-8 rounded-lg border-muted hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Upload Drawer Backdrop & Dialog */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end">
          {/* Main Panel */}
          <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Upload Knowledge Document</h3>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setIsUploadOpen(false);
                  setUploadError(null);
                }}
                className="rounded-xl h-8 w-8 border-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Drawer Body Form */}
            <form onSubmit={handleUploadSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Document Title
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Mitul Kanani Resume / Experience Docs"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="rounded-xl h-10 bg-muted/20"
                  required
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Textarea
                  placeholder="Provide context or a summary of this document (optional)"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="rounded-xl min-h-[80px] bg-muted/20 resize-none"
                />
              </div>

              {/* File Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Document File
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted hover:border-primary rounded-2xl p-6 text-center cursor-pointer transition-colors duration-200 bg-muted/5 flex flex-col items-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadFile(file);
                      if (file && !uploadTitle) {
                        // Prefill title with filename without extension
                        const cleanName = file.name.replace(/\.[^/.]+$/, "");
                        setUploadTitle(cleanName);
                      }
                    }}
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                  />
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {uploadFile ? (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-semibold text-foreground max-w-[280px] truncate">
                        {uploadFile.name}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes(uploadFile.size)} · Click to change file
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-semibold text-foreground">
                        Drag and drop your file here, or click to browse
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        Supported files: PDF, DOCX, TXT, MD (Max 50MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* RAG Parsing Settings */}
              <div className="border border-border/80 rounded-2xl p-4 bg-muted/10 flex flex-col gap-4 mt-2">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                  <Settings className="h-4 w-4 text-primary" />
                  <span>RAG Chunking Settings</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Chunk Size</span>
                      <span className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded text-[10px]">{chunkSize} chars</span>
                    </label>
                    <Input
                      type="number"
                      min={100}
                      max={2000}
                      value={chunkSize}
                      onChange={(e) => setChunkSize(parseInt(e.target.value) || 1500)}
                      className="rounded-xl h-9 bg-background"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Chunk Overlap</span>
                      <span className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded text-[10px]">{chunkOverlap} chars</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      value={chunkOverlap}
                      onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 200)}
                      className="rounded-xl h-9 bg-background"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  * Chunk Size determines the maximum characters per text slice. Overlap guarantees semantic continuity between adjacent chunks.
                </p>
              </div>

              {/* Drawer Footer */}
              <div className="mt-auto pt-6 border-t border-border flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  className="w-1/2 rounded-xl h-11 border-muted"
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-1/2 rounded-xl h-11"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    "Upload & Process"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-2xl border-border p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-foreground">Delete Document</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this document? This will remove all database text chunks, embeddings vectors, and its file stored on Cloudinary. This action is irreversible.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                className="w-1/2 rounded-xl h-10 border-muted"
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="w-1/2 rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white"
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
