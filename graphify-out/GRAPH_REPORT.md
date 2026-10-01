# Graph Report - sintoniamora-connect  (2026-10-01)

## Corpus Check
- 94 files · ~59,165 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .lock 1, .toml 1)

## Summary
- 787 nodes · 1433 edges · 58 communities (49 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `350643ab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- routeTree.gen.ts
- dependencies
- react
- sidebar.tsx
- carousel.tsx
- rest
- package.json
- compilerOptions
- navigation-menu.tsx
- command.tsx
- server.ts
- components.json
- devDependencies
- form.tsx
- cn
- supabase.ts
- chart.tsx
- What You Must Do When Invoked
- menubar.tsx
- select.tsx
- drawer.tsx
- scripts
- avatar.tsx
- tabs.tsx
- sonner.tsx
- 202610010004_social_layer.sql
- 202610010001_sintoniamora_core.sql
- __root.tsx
- graphify reference: extra exports and benchmark
- lucide-react
- 202610010002_harden_sintoniamora_core.sql
- context-menu.tsx
- cadastro.tsx
- planos.tsx
- graphify reference: query, path, explain
- input-otp.tsx
- Sintoniamora Connect
- accordion.tsx
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- radio-group.tsx
- resizable.tsx
- sheet.tsx
- AGENTS.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Routes
- extraction-spec.md
- class-variance-authority
- notificacoes.tsx
- feed.tsx
- mensagens.tsx
- badge.tsx
- alert.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 220 edges
2. `react` - 56 edges
3. `lucide-react` - 29 edges
4. `rest()` - 29 edges
5. `compilerOptions` - 22 edges
6. `@tanstack/react-router` - 15 edges
7. `FileRoutesByPath` - 14 edges
8. `getSession()` - 12 edges
9. `MyProfile()` - 12 edges
10. `What You Must Do When Invoked` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Interpreter guard for subcommands` --references--> `add()`  [INFERRED]
  .agents/skills/graphify/SKILL.md → src/routes/perfil.tsx
- `AccordionItem` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/accordion.tsx → src/lib/utils.ts
- `AccordionTrigger` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/accordion.tsx → src/lib/utils.ts
- `AccordionContent` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/accordion.tsx → src/lib/utils.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (58 total, 9 thin omitted)

### Community 0 - "routeTree.gen.ts"
Cohesion: 0.09
Nodes (27): getRouter(), Route, Route, Route, Route, CadastroRoute, EntrarRoute, ExplorarRoute (+19 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (53): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @hookform/resolvers, input-otp (+45 more)

### Community 2 - "react"
Cohesion: 0.09
Nodes (18): clsx, @radix-ui/react-checkbox, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-separator, @radix-ui/react-slider, @radix-ui/react-switch (+10 more)

### Community 3 - "sidebar.tsx"
Cohesion: 0.07
Nodes (31): Input, Separator, SidebarContent, SidebarContext, SidebarContextProps, SidebarFooter, SidebarGroup, SidebarGroupAction (+23 more)

### Community 4 - "carousel.tsx"
Cohesion: 0.07
Nodes (38): embla-carousel-react, @radix-ui/react-alert-dialog, @radix-ui/react-slot, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription (+30 more)

### Community 5 - "rest"
Cohesion: 0.16
Nodes (20): MemberNav(), rest(), Explore(), block(), report(), toggleFollow(), Follow, Profile (+12 more)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (35): name, overrides, rolldown, private, sideEffects, type, date-fns, eslint (+27 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, exactOptionalPropertyTypes, jsx, lib, module, moduleResolution, noEmit (+15 more)

### Community 8 - "navigation-menu.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 9 - "command.tsx"
Cohesion: 0.13
Nodes (17): cmdk, @radix-ui/react-dialog, Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem (+9 more)

### Community 10 - "server.ts"
Cohesion: 0.16
Nodes (14): @tanstack/react-start, consumeLastCapturedError(), describeError(), describeStatus(), originalConsoleError, safeStringify(), renderErrorPage(), fetch() (+6 more)

### Community 11 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 12 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+10 more)

### Community 13 - "form.tsx"
Cohesion: 0.18
Nodes (14): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+6 more)

### Community 14 - "cn"
Cohesion: 0.10
Nodes (32): @radix-ui/react-dropdown-menu, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator() (+24 more)

### Community 15 - "supabase.ts"
Cohesion: 0.19
Nodes (19): getSession(), getValidSession(), removeUpload(), request(), saveSession(), Session, signedUrl(), signOut() (+11 more)

### Community 16 - "chart.tsx"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 19 - "select.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-select, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 20 - "drawer.tsx"
Cohesion: 0.25
Nodes (7): vaul, DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 23 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, build:dev, dev, format, lint, preview

### Community 24 - "avatar.tsx"
Cohesion: 0.40
Nodes (4): @radix-ui/react-avatar, Avatar, AvatarFallback, AvatarImage

### Community 25 - "tabs.tsx"
Cohesion: 0.40
Nodes (4): @radix-ui/react-tabs, TabsContent, TabsList, TabsTrigger

### Community 32 - "202610010004_social_layer.sql"
Cohesion: 0.09
Nodes (39): blocks_blocked_idx, comments_post_created_idx, comments_user_created_idx, conversation_members_user_idx, conversations_creator_created_idx, follows_following_idx, guard_conversation_member_count, likes_user_created_idx (+31 more)

### Community 33 - "202610010001_sintoniamora_core.sql"
Cohesion: 0.18
Nodes (9): guard_sintoniamora_profile_media, on_auth_user_created_sintoniamora, public.plan_features, public.private_profiles, public.profile_media, public.profiles, public.subscription_plans, public.subscriptions (+1 more)

### Community 34 - "__root.tsx"
Cohesion: 0.22
Nodes (5): LovableErrorOptions, LovableEvents, reportLovableError(), Window, ErrorComponent()

### Community 35 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 36 - "lucide-react"
Cohesion: 0.12
Nodes (16): lucide-react, @tanstack/react-query, @tanstack/react-router, DemoProfileData, DemoProfileScreen(), Brand(), Index(), profiles (+8 more)

### Community 37 - "202610010002_harden_sintoniamora_core.sql"
Cohesion: 0.29
Nodes (3): profile_media_user_created_idx, subscriptions_user_plan_status_idx, terms_acceptances_user_idx

### Community 38 - "context-menu.tsx"
Cohesion: 0.18
Nodes (10): @radix-ui/react-context-menu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut() (+2 more)

### Community 39 - "cadastro.tsx"
Cohesion: 0.35
Nodes (9): isConfigured(), signIn(), signUp(), isValidBirthDate(), maximumAdultBirthDate(), Register(), submit(), Login() (+1 more)

### Community 40 - "planos.tsx"
Cohesion: 0.29
Nodes (5): Feature, labels, Plan, Plans(), Route

### Community 41 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 42 - "input-otp.tsx"
Cohesion: 0.33
Nodes (5): input-otp, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 43 - "Sintoniamora Connect"
Cohesion: 0.40
Nodes (4): Build with Lovable, Conectar autenticação, perfil e mídia, Development, Sintoniamora Connect

### Community 44 - "accordion.tsx"
Cohesion: 0.40
Nodes (4): @radix-ui/react-accordion, AccordionContent, AccordionItem, AccordionTrigger

### Community 45 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 46 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 47 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 48 - "radio-group.tsx"
Cohesion: 0.50
Nodes (3): @radix-ui/react-radio-group, RadioGroup, RadioGroupItem

### Community 49 - "resizable.tsx"
Cohesion: 0.25
Nodes (6): @radix-ui/react-scroll-area, react-resizable-panels, ResizableHandle(), ResizablePanelGroup(), ScrollArea, ScrollBar

### Community 50 - "sheet.tsx"
Cohesion: 0.31
Nodes (9): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants (+1 more)

### Community 58 - "class-variance-authority"
Cohesion: 0.29
Nodes (8): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 59 - "notificacoes.tsx"
Cohesion: 0.25
Nodes (6): items, mobileItems, labels, Notice, Profile, Route

### Community 60 - "feed.tsx"
Cohesion: 0.33
Nodes (5): Comment, Like, Post, Profile, Route

### Community 61 - "mensagens.tsx"
Cohesion: 0.33
Nodes (5): Member, Message, Profile, Route, Thread

### Community 62 - "badge.tsx"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 63 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

## Knowledge Gaps
- **260 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+255 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 310 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `sidebar.tsx`, `carousel.tsx`, `rest`, `package.json`, `navigation-menu.tsx`, `command.tsx`, `form.tsx`, `cn`, `supabase.ts`, `chart.tsx`, `menubar.tsx`, `select.tsx`, `drawer.tsx`, `avatar.tsx`, `tabs.tsx`, `__root.tsx`, `lucide-react`, `context-menu.tsx`, `cadastro.tsx`, `planos.tsx`, `input-otp.tsx`, `accordion.tsx`, `radio-group.tsx`, `resizable.tsx`, `sheet.tsx`, `class-variance-authority`, `notificacoes.tsx`, `feed.tsx`, `mensagens.tsx`, `badge.tsx`, `alert.tsx`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `react`, `sidebar.tsx`, `carousel.tsx`, `navigation-menu.tsx`, `command.tsx`, `form.tsx`, `chart.tsx`, `menubar.tsx`, `select.tsx`, `drawer.tsx`, `avatar.tsx`, `tabs.tsx`, `context-menu.tsx`, `input-otp.tsx`, `accordion.tsx`, `radio-group.tsx`, `resizable.tsx`, `sheet.tsx`, `class-variance-authority`, `badge.tsx`, `alert.tsx`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _260 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `routeTree.gen.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08994708994708994 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03773584905660377 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.09259259259259259 - nodes in this community are weakly interconnected._