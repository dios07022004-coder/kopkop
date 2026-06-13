import { Suspense } from "react";
import { SuccessContent } from "@/components/checkout/success-content";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Спасибо за покупку",
  description: "Доступ к калькулятору и файлам активирован.",
  path: "/success",
  noindex: true,
});

export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Suspense fallback={<p className="text-center text-muted-foreground">Загрузка...</p>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
