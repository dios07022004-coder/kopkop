"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildUtmUrl } from "@/lib/utm";

const PRESETS = [
  { label: "VK Реклама", source: "vk", medium: "cpc" },
  { label: "Яндекс Директ", source: "yandex", medium: "cpc" },
  { label: "Telegram", source: "telegram", medium: "social" },
  { label: "Instagram", source: "instagram", medium: "social" },
  { label: "Блогер", source: "blogger", medium: "referral" },
];

export function UtmBuilder({ baseUrl }: { baseUrl: string }) {
  const [source, setSource] = useState("vk");
  const [medium, setMedium] = useState("cpc");
  const [campaign, setCampaign] = useState("launch");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const url = useMemo(
    () => buildUtmUrl(baseUrl, { source, medium, campaign, content }),
    [baseUrl, source, medium, campaign, content],
  );

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="soft-card p-5 sm:p-6">
      <p className="font-semibold">Конструктор ссылок с UTM</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Создайте ссылку для рекламы — в таблице оплат будет видно, откуда пришёл клиент.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setSource(p.source);
              setMedium(p.medium);
            }}
            className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Источник (utm_source)" value={source} onChange={setSource} placeholder="vk" />
        <Field label="Канал (utm_medium)" value={medium} onChange={setMedium} placeholder="cpc" />
        <Field
          label="Кампания (utm_campaign)"
          value={campaign}
          onChange={setCampaign}
          placeholder="launch"
        />
        <Field
          label="Объявление (utm_content)"
          value={content}
          onChange={setContent}
          placeholder="banner1"
        />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
        <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        className="h-10"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
