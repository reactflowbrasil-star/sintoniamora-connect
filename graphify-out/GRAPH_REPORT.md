# Graph Report - sintoniamora-connect-github-deploy  (2026-10-04)

## Corpus Check
- 160 files · ~168,526 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 4, .css 4, .lock 1)

## Summary
- 1104 nodes · 2320 edges · 70 communities (51 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3905dd76`
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
- sheet.tsx
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
- busca.tsx
- drawer.tsx
- live-provider.tsx
- @supabase/supabase-js
- scripts
- menubar.tsx
- perfil.tsx
- sonner.tsx
- carousel.tsx
- select.tsx
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
- perfil-publico.tsx
- Lives com Tencent RTC
- supabase.ts
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- avatar.tsx
- navigation-menu.tsx
- FileRoutesByPath
- AGENTS.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Routes
- extraction-spec.md
- react
- scroll-area.tsx
- hover-card.tsx
- imports
- popover.tsx
- @tanstack/react-router
- progress.tsx
- slider.tsx
- router.tsx
- admin.tsx
- tabs.tsx
- allowScripts
- switch.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 228 edges
2. `react` - 80 edges
3. `rest()` - 64 edges
4. `lucide-react` - 48 edges
5. `getSession()` - 47 edges
6. `@tanstack/react-router` - 25 edges
7. `signedUrl()` - 25 edges
8. `MemberNav()` - 24 edges
9. `MyProfile()` - 24 edges
10. `FileRoutesByPath` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Criar foto ou vídeo pelo painel` --references--> `publishPost()`  [INFERRED]
  README.md → src/lib/feed/publish.ts
- `Interpreter guard for subcommands` --references--> `add()`  [INFERRED]
  .agents/skills/graphify/SKILL.md → src/routes/perfil.tsx
- `Livecam` --references--> `loadLiveDirectory()`  [INFERRED]
  README.md → src/lib/live/directory.ts
- `Login social com Google` --references--> `completeAuthCallback()`  [INFERRED]
  README.md → src/lib/supabase.ts
- `Recuperar senha` --references--> `completeAuthCallback()`  [INFERRED]
  README.md → src/lib/supabase.ts

## Import Cycles
- None detected.

## Communities (70 total, 19 thin omitted)

### Community 0 - "routeTree.gen.ts"
Cohesion: 0.07
Nodes (27): AdminRoute, AjudaRoute, BuscaRoute, CadastroRoute, CompletarCadastroRoute, ConfirmarEmailRoute, DashboardRoute, EntrarRoute (+19 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (56): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, ffmpeg-static, @hookform/resolvers (+48 more)

### Community 2 - "utils.ts"
Cohesion: 0.11
Nodes (29): input-otp, lucide-react, @radix-ui/react-checkbox, @radix-ui/react-radio-group, react-resizable-panels, LiveActions(), LiveEndConfirm(), LiveMoreSheet() (+21 more)

### Community 3 - "sidebar.tsx"
Cohesion: 0.07
Nodes (31): Input, Separator, SidebarContent, SidebarContext, SidebarContextProps, SidebarFooter, SidebarGroup, SidebarGroupAction (+23 more)

### Community 4 - "pagination.tsx"
Cohesion: 0.08
Nodes (30): @radix-ui/react-alert-dialog, @radix-ui/react-slot, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter() (+22 more)

### Community 5 - "rest"
Cohesion: 0.11
Nodes (31): removeUpload(), rest(), upload(), Explore(), block(), report(), toggleFollow(), Feed() (+23 more)

### Community 6 - "package.json"
Cohesion: 0.07
Nodes (28): name, private, sideEffects, type, clsx, date-fns, eslint, eslint-config-prettier (+20 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, exactOptionalPropertyTypes, jsx, lib, module, moduleResolution, noEmit (+15 more)

### Community 8 - "sheet.tsx"
Cohesion: 0.31
Nodes (9): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants (+1 more)

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
Cohesion: 0.08
Nodes (40): @radix-ui/react-accordion, @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, AccordionContent, AccordionItem, AccordionTrigger, Card, CardContent (+32 more)

### Community 15 - "tour-provider.tsx"
Cohesion: 0.13
Nodes (25): Active, CardProps, Ctx, findTarget(), isVisible(), Phase, Rect, reducedMotion() (+17 more)

### Community 16 - "chart.tsx"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "eslint.config.js"
Cohesion: 0.29
Nodes (6): @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 19 - "busca.tsx"
Cohesion: 0.11
Nodes (32): ALL_CATEGORIES, categoryLabel(), HostProfile, LIVECAM_CATEGORIES, LIVECAM_ROOM_LIMIT, LivecamCategory, LivecamCategoryId, LivecamRoom (+24 more)

### Community 20 - "drawer.tsx"
Cohesion: 0.25
Nodes (7): vaul, DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 21 - "live-provider.tsx"
Cohesion: 0.08
Nodes (40): Livecam, trtc-sdk-v5, Credential, describeJoinFailure(), EMPTY_METRICS, LiveContext, LiveContextValue, LiveProvider() (+32 more)

### Community 23 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, build:dev, dev, format, lint, preview

### Community 24 - "menubar.tsx"
Cohesion: 0.11
Nodes (12): @radix-ui/react-menubar, Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator (+4 more)

### Community 25 - "perfil.tsx"
Cohesion: 0.18
Nodes (16): categoriesFromInterests(), describeRegistrationFailure(), isRowSecurityRejection(), mediaFailureMessage(), MediaRegistration, MISSING_BACKEND, registerProfileMedia(), isMissingBackendObject() (+8 more)

### Community 27 - "carousel.tsx"
Cohesion: 0.17
Nodes (15): embla-carousel-react, Button, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem (+7 more)

### Community 28 - "select.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-select, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 32 - "getSession"
Cohesion: 0.15
Nodes (19): FeedItem, MediaGridFeed(), MediaRow, Member, OnlineMember, OnlineNow(), AccordionItem, PremiumAccordion() (+11 more)

### Community 33 - "feed.tsx"
Cohesion: 0.14
Nodes (24): CameraState, Capture, CaptureStudio(), pickRecorderType(), readableSize(), ACCEPT_ATTRIBUTE, ACCEPTED_MEDIA_TYPES, CAPTURED_PHOTO_TYPE (+16 more)

### Community 34 - "__root.tsx"
Cohesion: 0.08
Nodes (25): ACCENTS, ActivityPush, buildPush(), HIDDEN_PREFIXES, NAMES, pick(), PushType, SocialProofToasts() (+17 more)

### Community 35 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 36 - "perfil-masculino.tsx"
Cohesion: 0.23
Nodes (7): DemoProfileData, DemoProfileScreen(), MediaGridItem, FemaleProfile(), Route, MaleProfile(), Route

### Community 37 - "server.cjs"
Cohesion: 0.06
Nodes (31): sharp, art, header, OUT, pad, SOURCES, authenticatedUser(), canReadMedia() (+23 more)

### Community 40 - "planos.tsx"
Cohesion: 0.29
Nodes (5): Feature, labels, Plan, Plans(), Route

### Community 41 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 42 - "perfil-publico.tsx"
Cohesion: 0.36
Nodes (5): LightboxMedia, MediaLightbox(), ProfileMedia, PublicProfile(), PublicProfileData

### Community 43 - "Lives com Tencent RTC"
Cohesion: 0.14
Nodes (13): Ativação, Build with Lovable, Busca de membros, Criar foto ou vídeo pelo painel, Development, Diagnóstico rápido (live não abre / fica com 0 espectadores), Encerramento automático das lives, Funcionamento e limites conhecidos (+5 more)

### Community 44 - "supabase.ts"
Cohesion: 0.07
Nodes (59): Conectar autenticação, perfil e mídia, Domínio de produção e confirmação de e-mail, Login social com Google, Recuperar senha, Alert, createChime(), DashboardAlerts(), iconFor() (+51 more)

### Community 45 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 46 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 47 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 48 - "avatar.tsx"
Cohesion: 0.40
Nodes (4): @radix-ui/react-avatar, Avatar, AvatarFallback, AvatarImage

### Community 49 - "navigation-menu.tsx"
Cohesion: 0.09
Nodes (23): class-variance-authority, @radix-ui/react-navigation-menu, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants (+15 more)

### Community 50 - "FileRoutesByPath"
Cohesion: 0.18
Nodes (11): Route, Route, Route, Route, Route, Route, Route, Route (+3 more)

### Community 56 - "react"
Cohesion: 0.13
Nodes (18): react, ActiveUsersCounter(), OnlineRow, BeforeInstallPromptEvent, InstallPrompt(), isIOS(), isStandalone(), PHRASES (+10 more)

### Community 57 - "scroll-area.tsx"
Cohesion: 0.67
Nodes (3): @radix-ui/react-scroll-area, ScrollArea, ScrollBar

### Community 59 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/supabase-js, tls-sig-api-v2

### Community 61 - "@tanstack/react-router"
Cohesion: 0.14
Nodes (17): @tanstack/react-router, items, MemberNav(), mobileItems, useTours(), HelpPage(), Follow, Profile (+9 more)

### Community 64 - "router.tsx"
Cohesion: 0.33
Nodes (5): @tanstack/react-query, getRouter(), Register, routeTree, startInstance

### Community 65 - "admin.tsx"
Cohesion: 0.17
Nodes (9): Admin(), Feature, Overview, Plan, Report, Route, statuses, Tab (+1 more)

### Community 66 - "tabs.tsx"
Cohesion: 0.40
Nodes (4): @radix-ui/react-tabs, TabsContent, TabsList, TabsTrigger

## Knowledge Gaps
- **386 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+381 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 448 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `utils.ts`, `sidebar.tsx`, `pagination.tsx`, `package.json`, `sheet.tsx`, `command.tsx`, `form.tsx`, `cn`, `tour-provider.tsx`, `chart.tsx`, `busca.tsx`, `drawer.tsx`, `live-provider.tsx`, `menubar.tsx`, `perfil.tsx`, `carousel.tsx`, `select.tsx`, `getSession`, `feed.tsx`, `__root.tsx`, `perfil-masculino.tsx`, `planos.tsx`, `perfil-publico.tsx`, `supabase.ts`, `avatar.tsx`, `navigation-menu.tsx`, `scroll-area.tsx`, `hover-card.tsx`, `popover.tsx`, `@tanstack/react-router`, `progress.tsx`, `slider.tsx`, `admin.tsx`, `tabs.tsx`, `switch.tsx`?**
  _High betweenness centrality (0.277) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `utils.ts`, `sidebar.tsx`, `pagination.tsx`, `sheet.tsx`, `command.tsx`, `form.tsx`, `chart.tsx`, `drawer.tsx`, `menubar.tsx`, `carousel.tsx`, `select.tsx`, `avatar.tsx`, `navigation-menu.tsx`, `scroll-area.tsx`, `hover-card.tsx`, `popover.tsx`, `progress.tsx`, `slider.tsx`, `tabs.tsx`, `switch.tsx`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `utils.ts` to `sidebar.tsx`, `pagination.tsx`, `package.json`, `sheet.tsx`, `command.tsx`, `cn`, `tour-provider.tsx`, `busca.tsx`, `menubar.tsx`, `perfil.tsx`, `carousel.tsx`, `select.tsx`, `getSession`, `feed.tsx`, `__root.tsx`, `perfil-masculino.tsx`, `planos.tsx`, `perfil-publico.tsx`, `supabase.ts`, `navigation-menu.tsx`, `react`, `@tanstack/react-router`, `admin.tsx`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _386 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `routeTree.gen.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03571428571428571 - nodes in this community are weakly interconnected._
- **Should `utils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11153846153846154 - nodes in this community are weakly interconnected._