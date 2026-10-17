Bug 3: Latency when opening an asset in Stage 8

  When you click an asset in the list panel, three things trigger in parallel:
  1. MasterReferenceCarousel fires ['master-reference-chain', ...] query → hits backend endpoint that does N+1 queries: one per prior scene + one for transformations + one for the stage 5 master. For a project with many      
  scenes, this is slow.
  2. GenerationAttemptCarousel fires ['scene-asset-attempts', ...] query → another API call
  3. VisualStateEditorPanel fires a useEffect that calls transformationEventService.fetchEvents() → yet another API call

  That's 3 separate API calls waterfall-triggered on asset selection, with the reference chain being the slowest due to N+1 DB queries.

  Optimization ideas:
  - Prefetch: When hovering over an asset in the list, prefetch the chain and attempts queries
  - Backend optimization: Combine the N+1 loop in the chain endpoint into a single query with a join
  - Bundled endpoint: Return chain + attempts data alongside the scene assets list (or in a single "asset detail" endpoint)
  - Cache reuse: The transformation events fetch in VisualStateEditorPanel fetches ALL events for the scene, then filters. This could use React Query + the same scene-level cache

*Spared for Later*:  Good call on holding off on the latency work — the N+1 backend change and prefetch wiring touch too many moving parts for a stage still in flux.

( THeres also alot of latency between             
  selecting and also opening an asset in stage 8 has like a really long load           
  period, why is this, lets investigate and see how to optimize the behavior )