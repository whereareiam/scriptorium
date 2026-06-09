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

export function SearchDialog(props: SharedProps) {
  const pathname = usePathname();
  const refSlug = resolveRefSlug(pathname);
  const { search, setSearch, query } = useDocsSearch({
    type: "static",
    from: `/api/search${refSlug ? `?ref=${encodeURIComponent(refSlug)}` : ""}`
  });

  return (
    <PrimitiveSearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== "empty" ? query.data : null} />
      </SearchDialogContent>
    </PrimitiveSearchDialog>
  );
}

function resolveRefSlug(pathname: string | null) {
  if (!pathname) {
    return undefined;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "docs") {
    return undefined;
  }

  return segments[1];
}
