"use client";

import * as React from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

/**
 * Mobile-only drawer exposing the docs navigation. The desktop renders the
 * sidebar inline (visible at `lg`+), so this button is hidden there.
 */
export function DocsMobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            aria-label="Open documentation navigation"
          />
        }
      >
        <MenuIcon className="size-4 mr-1.5" aria-hidden="true" />
        Docs menu
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 sm:w-[300px]">
        <SheetTitle className="sr-only">Documentation navigation</SheetTitle>
        <DocsSidebar onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
