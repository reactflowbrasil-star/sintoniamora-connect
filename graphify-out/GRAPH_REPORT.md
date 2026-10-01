# Graph Report - sintoniamora-connect  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 584 nodes · 1110 edges · 32 communities (26 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b4dd27c0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30

## God Nodes (most connected - your core abstractions)
1. `cn()` - 220 edges
2. `react` - 50 edges
3. `lucide-react` - 23 edges
4. `compilerOptions` - 22 edges
5. `MyProfile()` - 10 edges
6. `@tanstack/react-router` - 10 edges
7. `class-variance-authority` - 10 edges
8. `Button` - 10 edges
9. `FileRoutesByPath` - 9 edges
10. `buttonVariants` - 9 edges

## Surprising Connections (you probably didn't know these)
- `AccordionContent` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/accordion.tsx → src/lib/utils.ts
- `AccordionItem` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/accordion.tsx → src/lib/utils.ts
- `AccordionTrigger` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/accordion.tsx → src/lib/utils.ts
- `AlertDescription` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert.tsx → src/lib/utils.ts
- `AlertTitle` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (32 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (41): @tanstack/react-query, @tanstack/react-router, DemoProfileData, DemoProfileScreen(), LovableErrorOptions, LovableEvents, reportLovableError(), Window (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (53): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @hookform/resolvers, input-otp (+45 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (39): class-variance-authority, clsx, @radix-ui/react-accordion, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (42): @radix-ui/react-separator, @radix-ui/react-tooltip, Input, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter() (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (38): embla-carousel-react, @radix-ui/react-alert-dialog, @radix-ui/react-slot, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (23): getSession(), getValidSession(), isConfigured(), request(), rest(), saveSession(), Session, signedUrl() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (24): name, private, sideEffects, type, date-fns, eslint, eslint-config-prettier, @hookform/resolvers (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, exactOptionalPropertyTypes, jsx, lib, module, moduleResolution, noEmit (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (19): input-otp, lucide-react, @radix-ui/react-checkbox, @radix-ui/react-navigation-menu, react-resizable-panels, Checkbox, InputOTP, InputOTPGroup (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (17): cmdk, @radix-ui/react-dialog, Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (14): @tanstack/react-start, consumeLastCapturedError(), describeError(), describeStatus(), originalConsoleError, safeStringify(), renderErrorPage(), fetch() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (14): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (15): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Table, TableBody (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (10): @radix-ui/react-context-menu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut() (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (10): @radix-ui/react-dropdown-menu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.28
Nodes (8): @radix-ui/react-select, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (7): vaul, DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (6): @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (7): scripts, build, build:dev, dev, format, lint, preview

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (4): @radix-ui/react-avatar, Avatar, AvatarFallback, AvatarImage

### Community 25 - "Community 25"
Cohesion: 0.40
Nodes (4): @radix-ui/react-tabs, TabsContent, TabsList, TabsTrigger

## Knowledge Gaps
- **186 isolated node(s):** `DemoProfileData`, `LovableErrorOptions`, `LovableEvents`, `Window`, `FileRouteTypes` (+181 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 210 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 2` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 24`, `Community 25`?**
  _High betweenness centrality (0.246) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 14` to `Community 2`, `Community 3`, `Community 4`, `Community 8`, `Community 9`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 24`, `Community 25`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 1` to `Community 6`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **What connects `DemoProfileData`, `LovableErrorOptions`, `LovableEvents` to the rest of the system?**
  _186 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.056866303690260134 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03773584905660377 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05370101596516691 - nodes in this community are weakly interconnected._