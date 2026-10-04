# Graph Report - sintoniamora-connect-github-deploy  (2026-10-04)

## Corpus Check
- 158 files · ~163,022 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 4, .css 4, .lock 1)

## Summary
- 1070 nodes · 2255 edges · 64 communities (51 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `32879f0d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- routeTree.gen.ts
- dependencies
- utils.ts
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
- tour-provider.tsx
- chart.tsx
- What You Must Do When Invoked
- eslint.config.js
- livecam.ts
- drawer.tsx
- lucide-react
- @supabase/supabase-js
- scripts
- menubar.tsx
- MyProfile
- sonner.tsx
- input-otp.tsx
- notificacoes.tsx
- overrides
- @lovable.dev/vite-tanstack-config
- getSession
- feed.tsx
- __root.tsx
- graphify reference: extra exports and benchmark
- perfil-masculino.tsx
- server.cjs
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- planos.tsx
- graphify reference: query, path, explain
- perfil.tsx
- Lives com Tencent RTC
- supabase.ts
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- @tanstack/react-router
- alert.tsx
- MemberNav
- AGENTS.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Routes
- extraction-spec.md
- react
- imports
- mensagens.tsx
- breadcrumb.tsx
- dashboard-alerts.tsx
- admin.tsx
- FileRoutesByPath

## God Nodes (most connected - your core abstractions)
1. `cn()` - 228 edges
2. `react` - 80 edges
3. `rest()` - 58 edges
4. `lucide-react` - 48 edges
5. `getSession()` - 46 edges
6. `@tanstack/react-router` - 25 edges
7. `MemberNav()` - 24 edges
8. `signedUrl()` - 23 edges
9. `FileRoutesByPath` - 23 edges
10. `rpc()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Criar foto ou vídeo pelo painel` --references--> `publishPost()`  [INFERRED]
  README.md → src/lib/feed/publish.ts
- `Upload de fotos e vídeos` --references--> `registerProfileMedia()`  [INFERRED]
  README.md → src/lib/media.ts
- `Interpreter guard for subcommands` --references--> `add()`  [INFERRED]
  .agents/skills/graphify/SKILL.md → src/routes/perfil.tsx
- `Livecam` --references--> `loadLiveDirectory()`  [INFERRED]
  README.md → src/lib/live/directory.ts
- `Login social com Google` --references--> `completeAuthCallback()`  [INFERRED]
  README.md → src/lib/supabase.ts

## Import Cycles
- None detected.

## Communities (64 total, 13 thin omitted)

### Community 0 - "routeTree.gen.ts"
Cohesion: 0.07
Nodes (30): getRouter(), AdminRoute, AjudaRoute, BuscaRoute, CadastroRoute, CompletarCadastroRoute, ConfirmarEmailRoute, DashboardRoute (+22 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (55): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @hookform/resolvers, input-otp (+47 more)

### Community 2 - "utils.ts"
Cohesion: 0.06
Nodes (26): clsx, @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, @radix-ui/react-slider, @radix-ui/react-switch (+18 more)

### Community 3 - "sidebar.tsx"
Cohesion: 0.06
Nodes (40): Input, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay (+32 more)

### Community 4 - "pagination.tsx"
Cohesion: 0.12
Nodes (23): @radix-ui/react-alert-dialog, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+15 more)

### Community 5 - "rest"
Cohesion: 0.18
Nodes (18): reportLiveViewer(), removeUpload(), rest(), Explore(), block(), report(), toggleFollow(), Feed() (+10 more)

### Community 6 - "package.json"
Cohesion: 0.08
Nodes (25): name, private, sideEffects, type, date-fns, eslint, eslint-config-prettier, @hookform/resolvers (+17 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, exactOptionalPropertyTypes, jsx, lib, module, moduleResolution, noEmit (+15 more)

### Community 8 - "carousel.tsx"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

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
Nodes (19): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+11 more)

### Community 13 - "form.tsx"
Cohesion: 0.18
Nodes (14): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+6 more)

### Community 14 - "cn"
Cohesion: 0.06
Nodes (51): @radix-ui/react-accordion, @radix-ui/react-avatar, @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, @radix-ui/react-select, AccordionContent, AccordionItem, AccordionTrigger (+43 more)

### Community 15 - "tour-provider.tsx"
Cohesion: 0.13
Nodes (24): Active, CardProps, Ctx, findTarget(), isVisible(), Phase, Rect, reducedMotion() (+16 more)

### Community 16 - "chart.tsx"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "eslint.config.js"
Cohesion: 0.29
Nodes (6): @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 19 - "livecam.ts"
Cohesion: 0.11
Nodes (32): ALL_CATEGORIES, categoriesFromInterests(), categoryLabel(), HostProfile, LIVECAM_CATEGORIES, LIVECAM_ROOM_LIMIT, LivecamCategory, LivecamCategoryId (+24 more)

### Community 20 - "drawer.tsx"
Cohesion: 0.25
Nodes (7): vaul, DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 21 - "lucide-react"
Cohesion: 0.07
Nodes (55): Livecam, lucide-react, trtc-sdk-v5, LiveActions(), LiveEndConfirm(), LiveMoreSheet(), LiveChat(), Credential (+47 more)

### Community 23 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, build:dev, dev, format, lint, preview

### Community 24 - "menubar.tsx"
Cohesion: 0.11
Nodes (12): @radix-ui/react-menubar, Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator (+4 more)

### Community 25 - "MyProfile"
Cohesion: 0.19
Nodes (16): describeRegistrationFailure(), isRowSecurityRejection(), mediaFailureMessage(), MediaRegistration, MISSING_BACKEND, newObjectId(), registerProfileMedia(), isMissingBackendObject() (+8 more)

### Community 27 - "input-otp.tsx"
Cohesion: 0.33
Nodes (5): input-otp, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 28 - "notificacoes.tsx"
Cohesion: 0.40
Nodes (4): labels, Notice, Profile, Route

### Community 32 - "getSession"
Cohesion: 0.16
Nodes (18): FeedItem, MediaGridFeed(), MediaRow, Member, OnlineMember, OnlineNow(), AccordionItem, PremiumAccordion() (+10 more)

### Community 33 - "feed.tsx"
Cohesion: 0.13
Nodes (25): CameraState, Capture, CaptureStudio(), pickRecorderType(), readableSize(), ACCEPT_ATTRIBUTE, ACCEPTED_MEDIA_TYPES, CAPTURED_PHOTO_TYPE (+17 more)

### Community 34 - "__root.tsx"
Cohesion: 0.09
Nodes (17): @tanstack/react-query, ACCENTS, ActivityPush, buildPush(), HIDDEN_PREFIXES, NAMES, pick(), PushType (+9 more)

### Community 35 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 36 - "perfil-masculino.tsx"
Cohesion: 0.23
Nodes (7): DemoProfileData, DemoProfileScreen(), MediaGridItem, FemaleProfile(), Route, MaleProfile(), Route

### Community 37 - "server.cjs"
Cohesion: 0.11
Nodes (12): sharp, art, header, OUT, pad, SOURCES, fs, http (+4 more)

### Community 40 - "planos.tsx"
Cohesion: 0.29
Nodes (5): Feature, labels, Plan, Plans(), Route

### Community 41 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 42 - "perfil.tsx"
Cohesion: 0.18
Nodes (10): LightboxMedia, MediaLightbox(), CoverDraft, Limits, Media, PlanFeature, Profile, PublicProfile() (+2 more)

### Community 43 - "Lives com Tencent RTC"
Cohesion: 0.14
Nodes (13): Ativação, Build with Lovable, Busca de membros, Criar foto ou vídeo pelo painel, Development, Diagnóstico rápido (live não abre / fica com 0 espectadores), Encerramento automático das lives, Funcionamento e limites conhecidos (+5 more)

### Community 44 - "supabase.ts"
Cohesion: 0.07
Nodes (60): Conectar autenticação, perfil e mídia, Domínio de produção e confirmação de e-mail, Login social com Google, Recuperar senha, GoogleMark(), authCallbackError(), AuthCallbackResult, callbackParameters (+52 more)

### Community 45 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 46 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 47 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 48 - "@tanstack/react-router"
Cohesion: 0.29
Nodes (5): @tanstack/react-router, ProfileMedia, PublicProfileData, Route, routeTree

### Community 49 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 50 - "MemberNav"
Cohesion: 0.26
Nodes (9): items, MemberNav(), mobileItems, useTours(), ALL_TOURS, HelpPage(), Follow, Profile (+1 more)

### Community 56 - "react"
Cohesion: 0.06
Nodes (39): class-variance-authority, @radix-ui/react-checkbox, @radix-ui/react-navigation-menu, @radix-ui/react-toggle, @radix-ui/react-toggle-group, react, ActiveUsersCounter(), OnlineRow (+31 more)

### Community 59 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/supabase-js, tls-sig-api-v2

### Community 61 - "mensagens.tsx"
Cohesion: 0.33
Nodes (5): Member, Message, Profile, Route, Thread

### Community 62 - "breadcrumb.tsx"
Cohesion: 0.22
Nodes (8): @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 64 - "dashboard-alerts.tsx"
Cohesion: 0.28
Nodes (8): Alert, createChime(), DashboardAlerts(), iconFor(), KIND_LABEL, Message, Notice, UnreadRow

### Community 65 - "admin.tsx"
Cohesion: 0.17
Nodes (9): Admin(), Feature, Overview, Plan, Report, Route, statuses, Tab (+1 more)

### Community 67 - "FileRoutesByPath"
Cohesion: 0.22
Nodes (9): Route, Route, Route, Route, Route, Route, Route, FileRoutesById (+1 more)

## Knowledge Gaps
- **374 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+369 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 432 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `utils.ts`, `sidebar.tsx`, `pagination.tsx`, `package.json`, `carousel.tsx`, `command.tsx`, `form.tsx`, `cn`, `tour-provider.tsx`, `chart.tsx`, `livecam.ts`, `drawer.tsx`, `lucide-react`, `menubar.tsx`, `input-otp.tsx`, `notificacoes.tsx`, `getSession`, `feed.tsx`, `__root.tsx`, `perfil-masculino.tsx`, `planos.tsx`, `perfil.tsx`, `supabase.ts`, `@tanstack/react-router`, `alert.tsx`, `MemberNav`, `mensagens.tsx`, `breadcrumb.tsx`, `dashboard-alerts.tsx`, `admin.tsx`?**
  _High betweenness centrality (0.284) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `utils.ts`, `sidebar.tsx`, `pagination.tsx`, `carousel.tsx`, `command.tsx`, `form.tsx`, `chart.tsx`, `alert.tsx`, `drawer.tsx`, `lucide-react`, `react`, `menubar.tsx`, `input-otp.tsx`, `breadcrumb.tsx`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lucide-react` to `utils.ts`, `sidebar.tsx`, `pagination.tsx`, `package.json`, `carousel.tsx`, `command.tsx`, `cn`, `tour-provider.tsx`, `livecam.ts`, `menubar.tsx`, `input-otp.tsx`, `notificacoes.tsx`, `getSession`, `feed.tsx`, `__root.tsx`, `perfil-masculino.tsx`, `planos.tsx`, `perfil.tsx`, `@tanstack/react-router`, `MemberNav`, `react`, `mensagens.tsx`, `breadcrumb.tsx`, `dashboard-alerts.tsx`, `admin.tsx`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _374 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `routeTree.gen.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06881720430107527 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03636363636363636 - nodes in this community are weakly interconnected._
- **Should `utils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._