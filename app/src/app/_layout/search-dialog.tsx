"use client";

import { usePathname } from "next/navigation";
import {
  SearchDialog as PrimitiveSearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps
} from "fumadocs-ui/components/dialog/search";
import { useDocsSearch } from "fumadocs-core/search/client";
import { create } from "@orama/orama";
import { toSearchLanguage } from "@scriptorium/server-api";
import { useI18n } from "fumadocs-ui/contexts/i18n";
import { parseDocsPathname } from "@scriptorium/ui";

export function SearchDialog(props: SharedProps) {
  const pathname = usePathname();
  const { locale } = useI18n();
  const docsPath = pathname ? parseDocsPathname(pathname) : undefined;
  const params = new URLSearchParams();
  if (docsPath?.refSlug) params.set("ref", docsPath.refSlug);
  if (docsPath?.language) params.set("lang", docsPath.language);
  const query = params.toString();
  const searchLanguage = toSearchLanguage(docsPath?.language ?? locale ?? "en");
  const { search, setSearch, query: result } = useDocsSearch({
    type: "static",
    from: `/api/search${query ? `?${query}` : ""}`,
    initOrama: () => create({ schema: { _: "string" }, language: searchLanguage })
  });

  return (
    <PrimitiveSearchDialog search={search} onSearchChange={setSearch} isLoading={result.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={result.data !== "empty" ? result.data : null} />
      </SearchDialogContent>
    </PrimitiveSearchDialog>
  );
}
