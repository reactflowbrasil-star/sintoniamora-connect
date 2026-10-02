# Graph Report - sintoniamora-connect  (2026-10-01)

## Corpus Check
- 95 files · ~60,785 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .lock 1, .toml 1)

## Summary
- 803 nodes · 1474 edges · 64 communities (49 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a0ed5d39`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- routeTree.gen.ts
- dependencies
- react
- sidebar.tsx
- pagination.tsx
- rest
- package.json
- compilerOptions
- carousel.tsx
- command.tsx
- server.ts
- components.json
- devDependencies
- form.tsx
- cn
- breadcrumb.tsx
- chart.tsx
- What You Must Do When Invoked
- eslint.config.js
- select.tsx
- drawer.tsx
- @tanstack/react-router
- index.tsx
- scripts
- menubar.tsx
- perfil.tsx
- sonner.tsx
- confirmar-email.tsx
- FileRoutesByPath
- overrides
- @lovable.dev/vite-tanstack-config
- 202610010004_social_layer.sql
- 202610010001_sintoniamora_core.sql
- __root.tsx
- graphify reference: extra exports and benchmark
- perfil-feminino.tsx
- 202610010002_harden_sintoniamora_core.sql
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- planos.tsx
- graphify reference: query, path, explain
- lucide-react
- Sintoniamora Connect
- supabase.ts
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- sheet.tsx
- cadastro.tsx
- feed.tsx
- AGENTS.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Routes
- extraction-spec.md
- scroll-area.tsx
- navigation-menu.tsx
- notificacoes.tsx
- hover-card.tsx
- mensagens.tsx
- popover.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 220 edges
2. `react` - 57 edges
3. `lucide-react` - 29 edges
4. `rest()` - 29 edges
5. `compilerOptions` - 22 edges
6. `@tanstack/react-router` - 16 edges
7. `FileRoutesByPath` - 15 edges
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

## Communities (64 total, 15 thin omitted)

### Community 0 - "routeTree.gen.ts"
Cohesion: 0.09
Nodes (22): getRouter(), CadastroRoute, ConfirmarEmailRoute, EntrarRoute, ExplorarRoute, FeedRoute, FileRoutesByFullPath, FileRoutesByTo (+14 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (53): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @hookform/resolvers, input-otp (+45 more)

### Community 2 - "react"
Cohesion: 0.08
Nodes (21): clsx, @radix-ui/react-avatar, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-slider, @radix-ui/react-switch, @radix-ui/react-tabs, react (+13 more)

### Community 3 - "sidebar.tsx"
Cohesion: 0.07
Nodes (31): Input, Separator, SidebarContent, SidebarContext, SidebarContextProps, SidebarFooter, SidebarGroup, SidebarGroupAction (+23 more)

### Community 4 - "pagination.tsx"
Cohesion: 0.12
Nodes (22): @radix-ui/react-alert-dialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay (+14 more)

### Community 5 - "rest"
Cohesion: 0.23
Nodes (15): getSession(), rest(), Explore(), block(), report(), toggleFollow(), Feed(), comment() (+7 more)

### Community 6 - "package.json"
Cohesion: 0.07
Nodes (26): name, private, sideEffects, type, date-fns, eslint, eslint-config-prettier, @hookform/resolvers (+18 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, exactOptionalPropertyTypes, jsx, lib, module, moduleResolution, noEmit (+15 more)

### Community 8 - "carousel.tsx"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 9 - "command.tsx"
Cohesion: 0.13
Nodes (16): cmdk, Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList (+8 more)

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
Cohesion: 0.09
Nodes (35): @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle (+27 more)

### Community 15 - "breadcrumb.tsx"
Cohesion: 0.22
Nodes (8): @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 16 - "chart.tsx"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "eslint.config.js"
Cohesion: 0.29
Nodes (6): @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 19 - "select.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-select, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 20 - "drawer.tsx"
Cohesion: 0.25
Nodes (7): vaul, DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 21 - "@tanstack/react-router"
Cohesion: 0.25
Nodes (4): @tanstack/react-query, @tanstack/react-router, Route, routeTree

### Community 22 - "index.tsx"
Cohesion: 0.33
Nodes (5): Brand(), Index(), profiles, Route, steps

### Community 23 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, build:dev, dev, format, lint, preview

### Community 24 - "menubar.tsx"
Cohesion: 0.11
Nodes (12): @radix-ui/react-menubar, Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator (+4 more)

### Community 25 - "perfil.tsx"
Cohesion: 0.21
Nodes (13): removeUpload(), signedUrl(), upload(), Limits, Media, MyProfile(), add(), remove() (+5 more)

### Community 27 - "confirmar-email.tsx"
Cohesion: 0.29
Nodes (11): isConfigured(), resendSignupConfirmation(), signIn(), verifySignupOtp(), ConfirmEmail(), resend(), submit(), Route (+3 more)

### Community 28 - "FileRoutesByPath"
Cohesion: 0.29
Nodes (7): Route, Route, Route, Route, Route, FileRoutesById, FileRoutesByPath

### Community 32 - "202610010004_social_layer.sql"
Cohesion: 0.09
Nodes (39): blocks_blocked_idx, comments_post_created_idx, comments_user_created_idx, conversation_members_user_idx, conversations_creator_created_idx, follows_following_idx, guard_conversation_member_count, likes_user_created_idx (+31 more)

### Community 33 - "202610010001_sintoniamora_core.sql"
Cohesion: 0.18
Nodes (9): guard_sintoniamora_profile_media, on_auth_user_created_sintoniamora, public.plan_features, public.private_profiles, public.profile_media, public.profiles, public.subscription_plans, public.subscriptions (+1 more)

### Community 34 - "__root.tsx"
Cohesion: 0.22
Nodes (6): LovableErrorOptions, LovableEvents, reportLovableError(), Window, ErrorComponent(), RootComponent()

### Community 35 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 36 - "perfil-feminino.tsx"
Cohesion: 0.33
Nodes (5): DemoProfileData, DemoProfileScreen(), FemaleProfile(), MaleProfile(), Route

### Community 37 - "202610010002_harden_sintoniamora_core.sql"
Cohesion: 0.29
Nodes (3): profile_media_user_created_idx, subscriptions_user_plan_status_idx, terms_acceptances_user_idx

### Community 40 - "planos.tsx"
Cohesion: 0.29
Nodes (5): Feature, labels, Plan, Plans(), Route

### Community 41 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 42 - "lucide-react"
Cohesion: 0.11
Nodes (15): input-otp, lucide-react, @radix-ui/react-accordion, @radix-ui/react-checkbox, react-resizable-panels, AccordionContent, AccordionItem, AccordionTrigger (+7 more)

### Community 43 - "Sintoniamora Connect"
Cohesion: 0.33
Nodes (5): Build with Lovable, Conectar autenticação, perfil e mídia, Confirmação de e-mail no deploy Netlify, Development, Sintoniamora Connect

### Community 44 - "supabase.ts"
Cohesion: 0.27
Nodes (11): authCallbackError(), AuthCallbackResult, callbackParameters, clearAuthCallbackUrl(), completeAuthCallback(), getValidSession(), loadAuthUser(), request() (+3 more)

### Community 45 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 46 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 47 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 48 - "sheet.tsx"
Cohesion: 0.27
Nodes (10): @radix-ui/react-dialog, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle (+2 more)

### Community 49 - "cadastro.tsx"
Cohesion: 0.67
Nodes (5): signUp(), isValidBirthDate(), maximumAdultBirthDate(), Register(), submit()

### Community 50 - "feed.tsx"
Cohesion: 0.33
Nodes (5): Comment, Like, Post, Profile, Route

### Community 56 - "scroll-area.tsx"
Cohesion: 0.67
Nodes (3): @radix-ui/react-scroll-area, ScrollArea, ScrollBar

### Community 58 - "navigation-menu.tsx"
Cohesion: 0.09
Nodes (23): class-variance-authority, @radix-ui/react-navigation-menu, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants (+15 more)

### Community 59 - "notificacoes.tsx"
Cohesion: 0.40
Nodes (4): labels, Notice, Profile, Route

### Community 61 - "mensagens.tsx"
Cohesion: 0.15
Nodes (13): items, MemberNav(), mobileItems, Follow, Profile, Route, Member, Message (+5 more)

## Knowledge Gaps
- **263 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+258 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 312 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `sidebar.tsx`, `pagination.tsx`, `package.json`, `carousel.tsx`, `command.tsx`, `form.tsx`, `cn`, `breadcrumb.tsx`, `chart.tsx`, `select.tsx`, `drawer.tsx`, `@tanstack/react-router`, `index.tsx`, `menubar.tsx`, `perfil.tsx`, `confirmar-email.tsx`, `__root.tsx`, `perfil-feminino.tsx`, `planos.tsx`, `lucide-react`, `sheet.tsx`, `cadastro.tsx`, `feed.tsx`, `scroll-area.tsx`, `navigation-menu.tsx`, `notificacoes.tsx`, `hover-card.tsx`, `mensagens.tsx`, `popover.tsx`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `react`, `sidebar.tsx`, `pagination.tsx`, `scroll-area.tsx`, `carousel.tsx`, `command.tsx`, `lucide-react`, `form.tsx`, `breadcrumb.tsx`, `chart.tsx`, `sheet.tsx`, `select.tsx`, `drawer.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `hover-card.tsx`, `popover.tsx`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _263 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `routeTree.gen.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09486166007905138 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03773584905660377 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.08374384236453201 - nodes in this community are weakly interconnected._