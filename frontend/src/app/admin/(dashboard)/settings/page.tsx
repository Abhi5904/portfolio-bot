"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { adminApiFetch } from "@/lib/api-client";

interface SystemPromptData {
  systemPrompt: string;
  isDefault: boolean;
}

type ApiResponse = { status: string; message: string; data: SystemPromptData };

export default function SettingsPage() {
  const [prompt, setPrompt] = useState("");
  const [savedPrompt, setSavedPrompt] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch<ApiResponse>("/admin/settings/system-prompt");
      setPrompt(res.data.systemPrompt);
      setSavedPrompt(res.data.systemPrompt);
      setIsDefault(res.data.isDefault);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load the system prompt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!prompt.trim()) {
      setError("System prompt cannot be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await adminApiFetch<ApiResponse>("/admin/settings/system-prompt", {
        method: "PUT",
        body: JSON.stringify({ systemPrompt: prompt }),
      });
      setSavedPrompt(res.data.systemPrompt);
      setIsDefault(res.data.isDefault);
      setSavedAt(Date.now());
    } catch (err) {
      console.error(err);
      setError("Failed to save the system prompt.");
    } finally {
      setSaving(false);
    }
  };

  const isDirty = prompt !== savedPrompt;

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 py-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Chatbot Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure the system prompt that grounds every visitor conversation.
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-border p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold">System Prompt</label>
          {isDefault ? (
            <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold">
              Using default
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold">
              Custom
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={16}
              placeholder="You are a helpful assistant for..."
              className="rounded-xl font-mono text-sm leading-relaxed resize-y min-h-[280px] bg-background"
            />
            <p className="text-xs text-muted-foreground">
              The retrieved document context is appended automatically below this
              prompt on every request. {prompt.length} characters.
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setPrompt(savedPrompt)}
                disabled={!isDirty || saving}
                className="rounded-xl flex items-center gap-2 border-border"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>

              <div className="flex items-center gap-3">
                {savedAt && !isDirty && (
                  <span className="text-xs text-emerald-500 font-medium">Saved</span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="rounded-xl flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Prompt
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
