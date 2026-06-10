// Minimal Deno type stubs so VS Code's Node/Bun TypeScript server stops
// flagging Deno globals in edge function files. The actual types come from
// Supabase's Deno runtime when deployed — these are IDE-only.
declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void
  const env: {
    get(key: string): string | undefined
  }
}
