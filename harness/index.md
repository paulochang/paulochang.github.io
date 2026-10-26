# Agent Harness Tracker — Paulo Chang

How the major AI coding agents compare on the parts of a team harness you can share: instruction files, skills, agent profiles, hooks, policy, MCP servers, code intelligence and packaging.

Data last reviewed 26 October 2026. Tracking 7 tools across 47 capabilities. Live page: https://paulochang.com/harness/ · Raw data: https://paulochang.com/harness/data.json

Levels: `N` Native; `C` Compatible: reads another host's format, or available via config; `P` Partial: opt-in, limited to some interfaces, or reduced; `-` None; `?` Unverified.

## Tools

### Claude Code

Has the most hooks of any tool (33 events, 5 handler types), plus path-scoped rules and skills that can fork into subagents. Other tools often read its formats. It reads AGENTS.md only in some cases and ignores .agents/skills.

- Headless: `claude -p`
- Config: `.claude/`, `~/.claude/`, `~/.claude.json`
- Last reviewed: 2026-10-26

Distinctive:

- **33 hook events, 5 handler types.** Handlers can be command, http, mcp_tool, prompt or (experimental) agent. updatedToolOutput works for any tool, PreToolUse can defer, and PermissionRequest hooks can supply updatedInput.
- **Skills that fork and carry hooks.** Skills can run in a subagent (context: fork), pre-approve tools, ship their own hooks, inject live shell output with ! blocks, and scope by paths.
- **Auto permission mode.** In auto mode a classifier (Sonnet 5 by default) reviews actions. Since v2.1.283 it is the built-in starting mode for interactive sessions, but not for claude -p or the Agent SDK. There is also dontAsk, and a sandbox that protects credentials. Anthropic reports 93% of prompts approved.
- **Subagent isolation and memory.** Worktree isolation, per-agent persistent memory, per-agent hooks and MCP scoping, depth 3 / concurrency 20 limits, --agent main-session mode.
- **Plugins with dependencies and monitors.** userConfig with secure storage, dependencies, monitors, LSP servers, bin on PATH, seven plugin source types, org policy over marketplaces.
- **Cloud, teleport and scheduling.** Cloud sessions, --teleport, Remote Control, Channels, cloud scheduled tasks (formerly routines), /loop, auto-fix PRs, agent teams.
- **Claude as MCP server and SDK.** claude mcp serve exposes Claude Code as an MCP server. The Agent SDK (Python, TypeScript) runs the same engine and loads .claude/ config.

Gotchas:

- AGENTS.md is skipped if any CLAUDE.md or CLAUDE.local.md exists on the path, even a tiny one. Use a CLAUDE.md that contains @AGENTS.md.
- Does not read .agents/skills. Put skills in .claude/skills as a link or copy.
- Hooks fail open by default: a mistyped path or exit 1 won't block. Only exit 2 (blocking events), valid deny JSON or onFailure: "block" (command/http, v2.1.295+) blocks.
- claude -p and cloud sessions run repo hooks and .mcp.json servers with no trust prompt unless --bare.
- Glob and Grep are off by default, so a Grep|Glob hook matcher never fires. Searches arrive as Bash calls.
- Cloud sessions ignore ~/.claude and user-only plugins. Commit skills and settings to the repo.
- The managed-only Project instructions setting drops project CLAUDE.md, breaking the @AGENTS.md wrapper.

### OpenAI Codex

Codex is built around the sandbox. Sandbox mode and approval policy are separate, and execpolicy rules are testable. Hooks work much like Claude's but need a trust review. Agent profiles are TOML, with Claude plugin manifests as a fallback.

- Headless: `codex exec`
- Config: `.codex/`, `~/.codex/`, `.agents/`, `~/.agents/`, `AGENTS.md`, `/etc/codex/`
- Last reviewed: 2026-10-26

Distinctive:

- **Sandbox x approval axes.** Sandbox mode and approval policy are set independently, with granular approvals and an auto_review (Guardian) reviewer. Permission profiles support extends and network domain rules.
- **execpolicy Starlark rules.** prefix_rule() with match/not_match self-tests, checked with 'codex execpolicy check'. The most restrictive rule wins. These rules are command policy, not instructions.
- **Hash-keyed hook trust.** Hooks that are not managed must be approved in /hooks, and the approval is tied to a hash of the hook definition. Untrusted projects skip project .codex layers. Managed hooks skip review.
- **AGENTS.override.md.** Per-directory local override plus configurable fallback filenames, under a 32 KiB combined cap.
- **mcp_tool and async hooks.** Hook handler type mcp_tool, async command hooks (max 8), Interrupt event, and spill files for oversized hook context.
- **Per-agent TOML.** Agent TOML sets model, model_reasoning_effort (up to ultra), skill config and feature switches. Sandbox, approvals and MCP servers are inherited from the parent.
- **GitHub Action and SDKs.** openai/codex-action with safety-strategy, TypeScript and Python SDKs (Python drives the app-server). codex mcp-server was removed.
- **Reads Claude and Cursor marketplaces.** Marketplace lookup includes .claude-plugin/ and .cursor-plugin/ files, and sets CLAUDE_PLUGIN_ROOT for plugin hooks.

Gotchas:

- In Codex, .codex/rules/*.rules is command policy (prefix_rule), not instructions. Do not generate instruction rules there.
- Hook matchers have no Read or Grep tools, so file reads show up as Bash. Hosted web_search fires no hooks.
- Unsupported hook outputs (ask, updatedMCPToolOutput, empty-reason deny) fail open and the tool call proceeds.
- Hook prompt and agent handlers are skipped silently, so Claude hook files load and do nothing.
- Hooks and project .codex config need trust review (/hooks); CI needs managed hooks or --dangerously-bypass-hook-trust.
- AGENTS.md stops loading files at 32 KiB combined (project_doc_max_bytes), with no imports or globs. The docs have moved to learn.chatgpt.com/docs.

### GitHub Copilot

Copilot is several products that share some files: VS Code Local and Agent Host, the CLI, the cloud agent and code review. It reads more formats than other tools (AGENTS.md, CLAUDE.md, GEMINI.md, .claude), and governance sits in GitHub org settings.

- Headless: `copilot -p`
- Config: `~/.copilot/`, `~/.agents/`, `~/.claude/ (VS Code reads; CLI reads some)`
- Last reviewed: 2026-10-26

Distinctive:

- **excludeAgent on path instructions.** Scope an *.instructions.md file to code-review or cloud-agent only, so a rule can target which Copilot agent reads it.
- **Custom-agent handoffs (VS Code).** Agent frontmatter lists handoffs (label, agent, prompt, send, model) for guided transitions between agents. Not supported on Cloud.
- **MCP inputs prompting (VS Code).** In the VS Code format, an inputs array with ${input:id} asks for secrets at runtime instead of storing them. Also envFile and a sandbox per server. The Copilot harness skips servers that need ${input:}.
- **Policy hooks users cannot disable.** CLI hooks under /etc/github-copilot/policy.d always apply. disableAllHooks in repo settings skips every hook except these.
- **HTTP and prompt hook handlers plus extra events.** http handlers (HTTPS required for preToolUse), userPromptTransformed, permissionRequest, errorOccurred events.
- **Cloud agent with setup steps and firewall.** Turns an issue into a PR in a short-lived Actions environment, set up with copilot-setup-steps.yml and behind a built-in firewall. /delegate hands work over from the CLI. Orgs can add custom agents and instructions.
- **CLI autopilot, fleet, /after, first-class LSP.** Autopilot mode, --fleet, /after scheduled prompts, --ui-server (unverified), and lsp.json LSP config with copilot lsp list.
- **Hosted Copilot Memory.** GitHub-hosted repo and user memory shared across cloud agent, review and CLI, with citations validated against the branch.
- **Agent-scoped hooks.** A hooks field in agent frontmatter runs hooks only for that agent. CLI since 1.0.97; Local and Copilot harness in VS Code. Remote and org-hosted agents do not run them.

Gotchas:

- Hook counts depend on the interface: 14 for CLI and cloud agent, 8 for VS Code Local, where notification, errorOccurred and userPromptTransformed never fire.
- Timeouts fail open for every event, including preToolUse, even though preToolUse errors deny.
- VS Code Local ignores hook matcher values, so every command for the event runs.
- The CLI does not read .vscode/mcp.json. Use .mcp.json or .github/mcp.json (root key mcpServers).
- VS Code skill names with invalid characters silently fail to load. The name must match the directory.
- The cloud agent loads only committed repo files. It cannot see symlinks, user scope or plugins.
- Cloud reads hooks from the default branch, but instructions and skills from the head branch.
- VS Code prompt files, handoffs, chat.useHooks and chat.useClaudeHooks apply to the Local harness only.

### Cursor

An IDE that reads Claude and Codex formats by default, including CLAUDE.md, skills, agents and hooks. After Claude it has the most hooks: 21 events, with failClosed per hook and prompt handlers. It also runs Cloud Agents.

- Headless: `agent -p`
- Config: `.cursor/`, `~/.cursor/`
- Last reviewed: 2026-10-26

Distinctive:

- **Per-action hook events.** beforeShellExecution, beforeReadFile, beforeMCPExecution, Tab hooks and afterAgentThought target an action type by event instead of a matcher.
- **failClosed and loop_limit.** Each hook can choose to fail closed. loop_limit (default 5) caps the follow-up loops from stop and subagentStop.
- **Apply Intelligently rules.** Description-activated rules, lighter than a skill, alongside globs, always and manual modes.
- **sessionStart env injection.** A sessionStart hook can return an env object that sets environment variables for the session, plus additional_context.
- **Auto-review run mode.** Model-based classifier with plain-English allow_instructions and block_instructions in permissions.json; docs say it is not a security boundary.
- **Cloud Agents environments.** Triggered from Slack, PR comments, Linear, API; environment defined in .cursor/environment.json; secrets in dashboard.
- **Team marketplaces.** Private plugin marketplaces with Default Off, Default On or Required, managed by Organization Groups.
- **.cursorignore breadth.** One ignore file also covers Tab and @-mentions, though terminal and MCP bypass it.

Gotchas:

- Rules need the .mdc extension. A plain .md in .cursor/rules is silently ignored.
- CLAUDE.md and AGENTS.md are both always applied, so duplicated text loads twice.
- agent -p: the CLI usage page says full write access in non-interactive mode (Codex exec is read-only by default), but the headless page says changes are only proposed without --force (verify).
- Cloud Agents skip user hooks, sessionStart/sessionEnd, MCP hooks and Tab hooks.
- Claude Notification and PermissionRequest hooks do not run via Third-Party Imports, and matchers behave differently from Claude's.
- Old cursor.com/docs/context/* URLs return Page not found. Use /docs/rules, /docs/skills and /docs/mcp.

### Gemini CLI

For enterprise and paid API keys only since consumer access ended on 2026-06-18. It has hooks at the model level (BeforeModel, AfterModel, BeforeToolSelection), a TOML policy engine with tiers, and remote subagents over A2A.

- Headless: `gemini -p`
- Config: `.gemini/`, `~/.gemini/`, `GEMINI.md`
- Last reviewed: 2026-10-26

Distinctive:

- **Model-level hooks.** BeforeModel, AfterModel and BeforeToolSelection can override or mock requests, redact responses and filter the tool list. Claude has no equivalent.
- **Tiered policy engine.** Numeric priorities, regex argsPattern, per-subagent rules and approval-mode scoping across default/extension/user/admin tiers. Workspace tier is non-functional.
- **A2A remote subagents.** Subagents with kind: remote delegate to agents running elsewhere; @agentname forces delegation.
- **Namespaced TOML commands.** Subdirs become :namespaces; !{cmd} runs shell with confirmation and @{path} embeds files, respecting ignore files.
- **Multi-backend sandbox.** GEMINI_SANDBOX selects Seatbelt, Docker, Podman, gVisor runsc or LXC; Windows native sandbox also available.
- **Auto Memory (experimental).** Mines transcripts and drafts .patch memory updates and SKILL.md files into a project inbox for review.
- **Folder trust.** Untrusted folders skip project settings, .env, MCP servers and custom commands; extension installs blocked.

Gotchas:

- Consumer access (AI Pro/Ultra, free Code Assist) ended 2026-06-18. Google's word is 'transitioning', not 'successor'. Paid API keys and enterprise continue.
- The gemini-cli README now carries the Antigravity notice (since 2026-10-16) and agrees with the Google blog. The repo's quota-and-pricing doc still mentions a free tier and is out of date.
- Workspace policy TOML in .gemini/policies does not work (#18186), so a repo cannot ship policy.
- Hook exit codes: docs say exit 2 blocks, source says only exit 1 warns and other non-zero denies. Emit JSON and exit 0.
- Hook stdout must be pure JSON. Plain text breaks parsing, and the hook then defaults to allow.
- .geminiignore is advisory: shell, writes and fallback grep bypass it, and the model can opt out on most tools.
- Untrusted folders (default: any unlisted folder): project and user hooks, workspace skills, project agents and project GEMINI.md/AGENTS.md are not loaded (source and test, v0.65.0). Headless runs exit with an error unless --skip-trust or GEMINI_CLI_TRUST_WORKSPACE=true.

### Antigravity

Google's tool for consumers moving off Gemini CLI. Workspace config lives in .agents/: rules, skills, agents, hooks.json and mcp_config.json. It has six hook events and user-level permissions only, is closed source, and its three surfaces use different global folders.

- Headless: `agy -p`
- Config: `~/.gemini/config/`, `~/.gemini/antigravity-cli/`, `~/.gemini/antigravity-ide/`, `~/.gemini/antigravity/`
- Last reviewed: 2026-10-26

Distinctive:

- **Loop-scripting hooks.** PreInvocation/PostInvocation injectSteps (tool calls, user or ephemeral messages) and terminationBehavior (force_continue/terminate). Stop can force the agent to keep going.
- **Richer permission decisions.** PreToolUse decisions include auto_approve, force_ask and deny_unless_prior_grant, plus permissionOverrides and overwrite, beyond allow/deny/ask.
- **Four rule activation modes.** always_on, model_decision, glob and manual (@-mention) in .agents/rules, with a 24 KB per-file and 20k-token shared budget.
- **Async multi-agent orchestration.** invoke_subagent, /boost, git-worktree branch workspaces, nesting depth 10, transient agents via define_subagent, subagent hooks: frontmatter (2.0 v2.17.0).
- **Structured headless I/O.** --json-schema output and stream-json input for continuous headless sessions; status envelope with usage and conversation_id.
- **Knowledge Items and artifacts.** IDE/2.0 auto-extracted persistent memory (KIs), artifacts, browser agent with recordings, voice dictation.
- **Gemini migration path.** agy plugin import gemini and /migrate-workflows; plugin sync between the 2.0 app and the CLI.

Gotchas:

- Hooks and MCP live under .agents/ (hooks.json, mcp_config.json), not .gemini/. Do not reuse a Gemini CLI settings.json hook or MCP block.
- Permissions are user-level only (~/.gemini/antigravity-cli/settings.json). A repo cannot ship allow/deny rules, so committed guards need a gate elsewhere.
- Rules with missing frontmatter or a camelCase trigger (alwaysOn) are silently discarded. Subfolders of .agents/rules are ignored without .agents/rules.json.
- PreInvocation/PostInvocation are per model call, not prompt-submit or stop. SessionStart runs once at session initialization, but the hook payload omits the event name.
- Global skill folders differ per surface (antigravity-cli vs config); hooks.json is shared. Remote MCP: use serverUrl (url also accepted, httpUrl not); Streamable HTTP only.
- Do not say Gemini CLI is dead. Consumer access ended 2026-06-18, but paid API keys and enterprise continue, and Google says 'transitioning'.

### OpenCode

An open-source TUI and background-service coding agent (V2, 2.x). Hooks are in-process JS/TS plugins, not shell commands. It reads AGENTS.md only (no CLAUDE.md fallback) and skills from .opencode, .claude and .agents. No triggered rules or marketplace; V2 runs no language servers. V1 (1.x) is the legacy line.

- Headless: `opencode run`
- Config: `~/.config/opencode/`, `~/.claude/skills (read)`, `~/.agents/skills (read)`, `~/.local/share/opencode/`
- Last reviewed: 2026-10-26

Distinctive:

- **Policies.** Admin-enforced allow/deny on providers, tools and integrations that never prompt and outrank permissions; system policies outrank all.
- **Plugins as code.** In-process plugins with one mutable event per hook, including a permission-evaluate hook and model and HTTP request hooks. No process is spawned per hook.
- **Client/server architecture.** A background service plus `opencode serve`, `opencode api` and `--server` let several clients share sessions; auth via OPENCODE_SERVER_PASSWORD.
- **Code Mode.** Tools, including MCP tools, are reachable through one `execute` tool; `codemode: false` exposes a server's tools directly.
- **Remote and nested instructions.** `instructions` accepts URLs (5 s timeout) and globs; nested AGENTS.md files load on read.
- **Auto-approve flag.** `opencode run --auto` approves ask permissions for unattended runs; without it ask is auto-rejected.
- **Claude skills kill switch.** OPENCODE_DISABLE_CLAUDE_CODE or _SKILLS removes only the .claude/skills roots, to avoid double loading.
- **Two product lines.** V2 (2.1.x, opencode.ai/v2/docs) is described here. V1 (1.19.x) differs in plugins, LSP, CLAUDE.md fallback and config keys.

Gotchas:

- CLAUDE.md is not read; put guidance in AGENTS.md or add instructions: ["CLAUDE.md"]. .claude/skills are read, so .agents/skills and .claude/skills can double-load.
- .claude/agents, .claude/commands and .mcp.json are not read.
- Default permissions allow edits, shell and external-directory access; only dotenv reads ask.
- Environment variables are read when the background service starts; run `opencode service stop` after changing them.
- MCP tools sit behind the execute Code Mode tool unless the server sets codemode: false.
- Permission rules are last-match-wins, the opposite of Claude's fixed deny > ask > allow.
- No shell hooks: guards must be JS plugins that throw. V1 plugins fail to load in V2.
- No triggered rules: `instructions` globs only select files that are then always loaded.

## Capability matrix

### Interfaces & headless

| Capability | Tier | Claude Code | OpenAI Codex | GitHub Copilot | Cursor | Gemini CLI | Antigravity | OpenCode |
|---|---|---|---|---|---|---|---|---|
| Terminal CLI / TUI | - | `N` claude | `N` codex (TUI) | `N` copilot (TUI) | `N` agent CLI (Agent/Plan/Ask modes) | `N` gemini (terminal CLI) | `N` agy (Go TUI) | `N` opencode (TUI) |
| IDE (editor or extension) | - | `N` VS Code, JetBrains, desktop app | `N` IDE extension; desktop app | `N` VS Code agent mode (Local and Copilot harness); JetBrains | `N` Cursor IDE (VS Code fork) | `-` | `N` Antigravity IDE (VS Code fork) + 2.0 desktop app | `P` IDE extension (opens the TUI in a terminal) |
| Cloud / background agent | - | `N` claude.ai/code, claude --cloud, --teleport | `N` Codex Cloud (web, mobile, desktop; `codex cloud` CLI) | `N` Cloud coding agent (GitHub Actions) | `N` Cloud Agents (background) | `-` | `?` | `-` |
| Headless run from a script (prompt in, exit) | P0 | `N` claude -p | `N` codex exec | `N` copilot -p "..." | `N` agent -p | `N` gemini -p / --prompt | `N` agy -p / --print / --prompt | `N` opencode run |
| Headless with machine-readable (JSON) output | P0 | `N` --output-format json \| stream-json; --json-schema | `N` codex exec --json; --output-schema | `N` --output-format json | `N` --output-format json\|stream-json | `N` --output-format json \| stream-json | `N` --output-format json\|stream-json; --json-schema | `N` opencode run --format json |

### Instructions & rules

| Capability | Tier | Claude Code | OpenAI Codex | GitHub Copilot | Cursor | Gemini CLI | Antigravity | OpenCode |
|---|---|---|---|---|---|---|---|---|
| Reads AGENTS.md | P1 | `P` AGENTS.md (v2.1.277+, only if no CLAUDE.md) | `N` AGENTS.md; AGENTS.override.md | `N` AGENTS.md | `N` AGENTS.md (root + nested) | `C` context.fileName: ["AGENTS.md","GEMINI.md"] | `N` AGENTS.md (also .agents/AGENTS.md) | `N` AGENTS.md |
| Reads CLAUDE.md | P1 | `N` CLAUDE.md, .claude/CLAUDE.md, CLAUDE.local.md | `C` project_doc_fallback_filenames | `C` CLAUDE.md (root, .claude/CLAUDE.md); GEMINI.md | `C` CLAUDE.md (project root) | `C` context.fileName: ["CLAUDE.md"] | `?` | `C` instructions: ["CLAUDE.md"] (explicit only) |
| Own always-on instruction file (host-specific name) | P2 | `N` CLAUDE.md | `P` AGENTS.override.md | `N` .github/copilot-instructions.md | `N` .cursor/rules/*.mdc (alwaysApply: true) | `N` GEMINI.md (~/.gemini/GEMINI.md + repo) | `N` GEMINI.md; ~/.gemini/GEMINI.md | `-` |
| Per-folder (nested) instruction files | P1 | `N` subdirectory CLAUDE.md (lazy) | `N` nested AGENTS.md (root to cwd) | `P` AGENTS.md nearest-wins; chat.useNestedAgentsMdFiles | `N` nested AGENTS.md | `N` GEMINI.md just-in-time in subdirs | `N` AGENTS.md / GEMINI.md / .agents/rules per directory | `N` AGENTS.md (walk up; also on read) |
| Inline @-imports of other files | P3 | `N` @path imports | `-` | `P` @ file references | `?` | `N` @./file.md, @../shared/x.md | `P` @[label](path) in rules | `-` |
| Triggered rules scoped by file glob | P2 | `N` .claude/rules/*.md (paths) | `-` | `N` *.instructions.md with applyTo | `N` .cursor/rules/*.mdc (globs) | `-` | `N` .agents/rules/*.md with trigger: glob, globs: | `-` |
| Rules activated by description (model decides) | P3 | `-` | `-` | `P` VS Code instructions file description match | `N` 'Apply Intelligently' (description only) | `-` | `N` trigger: model_decision + description | `-` |

### Skills

| Capability | Tier | Claude Code | OpenAI Codex | GitHub Copilot | Cursor | Gemini CLI | Antigravity | OpenCode |
|---|---|---|---|---|---|---|---|---|
| Skills in .agents/skills | P1 | `-` | `N` .agents/skills; ~/.agents/skills | `N` .agents/skills, ~/.agents/skills | `N` .agents/skills/, ~/.agents/skills/ | `N` .agents/skills/ (workspace), ~/.agents/skills/ (user) | `N` .agents/skills/<name>/SKILL.md | `N` `.agents/skills/`, ~/.agents/skills/ |
| Skills in .claude/skills | P1 | `N` .claude/skills/<name>/SKILL.md | `-` | `C` .claude/skills | `C` .claude/skills/, ~/.claude/skills/ | `-` | `?` | `C` `.claude/skills/`, ~/.claude/skills/ |
| Agent Skills spec (SKILL.md, progressive disclosure) | P1 | `N` SKILL.md (agentskills.io compatible) | `N` SKILL.md (name, description) | `N` SKILL.md (name, description required) | `N` SKILL.md, name must match folder | `N` SKILL.md via activate_skill | `N` SKILL.md, progressive disclosure | `N` SKILL.md via `skill` tool |
| Host-specific skill frontmatter extensions | P3 | `N` context: fork, paths, allowed-tools, hooks, when_to_use, effort... | `P` agents/openai.yaml sidecar | `N` allowed-tools; VS Code argument-hint, user-invocable, disable-model-invocation, context: fork | `N` paths, disable-model-invocation, icon, color, metadata | `-` | `?` | `P` metadata.opencode/autoinvoke, disable-model-invocation |

### Agent profiles & commands

| Capability | Tier | Claude Code | OpenAI Codex | GitHub Copilot | Cursor | Gemini CLI | Antigravity | OpenCode |
|---|---|---|---|---|---|---|---|---|
| User commands as their own format | P3 | `P` .claude/commands/<name>.md | `P` ~/.codex/prompts/*.md (/prompts:name) | `P` .claude/commands/*.md (CLI); .github/prompts/*.prompt.md (VS Code Local) | `N` .cursor/commands/*.md | `N` .gemini/commands/*.toml | `-` | `N` .opencode/commands/*.md |
| Agent profiles (named sub-agents) | P2 | `N` .claude/agents/*.md | `N` .codex/agents/*.toml | `N` .github/agents/*.agent.md | `N` .cursor/agents/*.md | `N` .gemini/agents/*.md (project), ~/.gemini/agents/ | `N` .agents/agents/<name>.md or <name>/agent.md | `N` .opencode/agents/*.md |
| Agent profile can restrict its tools | P2 | `N` tools / disallowedTools (Agent(x) limits spawns) | `P` features.shell_tool\|apps\|plugins\|memories = false; skills.config | `N` tools: frontmatter (aliases execute, read, edit, search, agent, web, todo) | `P` readonly: true | `N` tools: [...] (wildcards *, mcp_*) | `N` tools: [view_file, run_command, ...] | `N` `permissions` per agent |
| Reads another host's agent-profile folder | P2 | `-` | `-` | `C` .claude/agents/ (VS Code and CLI), ~/.claude/agents (VS Code) | `C` .claude/agents, .codex/agents | `-` | `?` | `-` |

### Hooks

| Capability | Tier | Claude Code | OpenAI Codex | GitHub Copilot | Cursor | Gemini CLI | Antigravity | OpenCode |
|---|---|---|---|---|---|---|---|---|
| Shell-command hooks (event count in note) | P2 | `N` hooks in settings.json (33 events) | `N` .codex/hooks.json or [hooks] in config.toml | `N` .github/hooks/*.json | `N` .cursor/hooks.json (21 events) | `N` hooks in settings.json (11 events) | `N` .agents/hooks.json (6 events) | `P` JS/TS plugins (no shell hooks) |
| Event: session.start | P2 | `N` SessionStart | `N` SessionStart | `N` sessionStart / SessionStart | `N` sessionStart | `N` SessionStart | `N` SessionStart | `P` `session.created` (event) |
| Event: tool.before | P2 | `N` PreToolUse | `N` PreToolUse | `N` preToolUse / PreToolUse | `N` preToolUse (+ beforeShellExecution, beforeReadFile, beforeMCPExecution) | `N` BeforeTool | `N` PreToolUse (matcher) | `N` ctx.tool.hook("execute.before") |
| Event: tool.after | P2 | `N` PostToolUse (+ PostToolUseFailure, PostToolBatch) | `N` PostToolUse | `N` postToolUse / PostToolUse | `N` postToolUse (+ postToolUseFailure, afterShellExecution, afterFileEdit) | `N` AfterTool | `N` PostToolUse | `N` ctx.tool.hook("execute.after") |
| Event: agent.stop | P2 | `N` Stop (+ SubagentStop) | `N` Stop (and SubagentStop) | `N` agentStop / Stop | `N` stop (+ subagentStop) | `N` AfterAgent | `N` Stop | `P` `session.idle` (event) |
| Hook can block a tool call | P2 | `N` exit 2 or permissionDecision deny | `N` permissionDecision: deny; exit 2 | `N` permissionDecision: deny; exit 2 | `N` exit code 2 or permission: deny | `N` decision:"deny" + reason (BeforeTool) | `N` PreToolUse decision: deny\|ask\|force_ask\|deny_unless_prior_grant | `N` throw in execute.before; permission evaluate hook |
| Hook can inject context | P2 | `N` additionalContext | `N` hookSpecificOutput.additionalContext | `P` additionalContext | `P` additional_context | `N` hookSpecificOutput.additionalContext | `N` injectSteps (SessionStart / Pre/PostInvocation) | `N` ctx.session.hook("context" \| "prompt") |
| Hook can rewrite tool input | P3 | `N` PreToolUse updatedInput | `N` PreToolUse updatedInput | `N` modifiedArgs (preToolUse) | `N` preToolUse updated_input | `N` hookSpecificOutput.tool_input (BeforeTool) | `N` overwrite in PreToolUse | `N` assign event.input in execute.before |
| Hook can rewrite tool output | P3 | `N` PostToolUse updatedToolOutput | `-` | `P` modifiedResult (postToolUse) | `P` postToolUse updated_mcp_tool_output | `P` AfterTool decision:deny replaces result | `-` | `N` assign event.result in execute.after |
| Model-level hooks (before/after model call) | P3 | `-` | `P` PreModelRequest / PostModelRequest | `-` | `-` | `N` BeforeModel, AfterModel, BeforeToolSelection | `P` PreInvocation / PostInvocation | `N` ctx.session.hook("model.request" \| "http.request" \| "http.response") |
| Inferential hook handlers (prompt/agent) | P3 | `N` type: prompt \| agent | `-` | `P` prompt handler | `N` type: prompt (LLM evaluates condition, returns {ok, reason?}) | `-` | `-` | `-` |
| Hooks can be configured or default to fail closed | P2 | `N` onFailure: "block" (command and http hooks, v2.1.295+) | `-` | `P` preToolUse fail-closed on error | `N` failClosed (per hook, default false) | `P` | `P` | `P` throw = block |
| Reads Claude Code hook configuration | P2 | `-` | `P` plugin hooks/hooks.json (Claude plugins) | `C` CLI and VS Code Copilot harness read .claude/settings(.local).json; VS Code Local needs chat.useClaudeHooks | `C` Third-Party Imports: .claude/settings*.json | `-` | `-` | `-` |

### Policy, sandbox & ignore

| Capability | Tier | Claude Code | OpenAI Codex | GitHub Copilot | Cursor | Gemini CLI | Antigravity | OpenCode |
|---|---|---|---|---|---|---|---|---|
| Allow / ask / deny permission rules | P2 | `N` permissions allow/ask/deny in settings.json | `N` .rules prefix_rule(); approval_policy; permission profiles | `P` --allow-tool / --deny-tool Kind(arg) | `N` cli.json Shell()/Read()/Write()/WebFetch()/Mcp() tokens | `N` Policy engine TOML: allow \| deny \| ask_user | `N` permissions allow/ask/deny: command(...), read_file, write_file, read_url, execute_url, mcp | `N` `permissions` array in opencode.json |
| Permissions can be committed in the repo | P2 | `N` .claude/settings.json | `P` .codex/config.toml; .codex/rules/ | `P` VS Code workspace settings (chat.tools.*) | `P` .cursor/cli.json, .cursor/sandbox.json | `-` .gemini/policies/*.toml (non-functional) | `-` | `N` project `opencode.json` |
| OS-level sandbox | P2 | `N` /sandbox (Seatbelt, bubblewrap) | `N` sandbox_mode (Seatbelt / bubblewrap / Windows) | `P` CLI --sandbox; VS Code sandbox; Cloud firewall | `N` sandbox.json; --sandbox enabled\|disabled | `N` -s / GEMINI_SANDBOX / tools.sandbox | `P` enableTerminalSandbox | `-` |
| Ignore list that actually holds | P3 | `P` permissions.deny Read(...), sandbox.filesystem.denyRead | `P` permission-profile filesystem deny globs; permissions.filesystem.deny_read | `P` Content exclusion (GitHub settings) | `P` .cursorignore (gitignore syntax) | `P` .geminiignore | `-` .antigravityignore (changelog only) | `P` `permissions` read patterns; .gitignore |
| Org / enterprise managed policy | P3 | `N` managed-settings.json, MDM, server-managed | `N` requirements.toml; MDM; cloud bundle | `N` Org/enterprise policy, hook policy dir, content exclusion | `N` Team/Enterprise dashboard policy; enterprise hooks.json | `N` Admin policy tier (/etc/gemini-cli/policies) | `?` | `N` managed system settings, macOS MDM; V2 `policies` |

### MCP (tool servers)

| Capability | Tier | Claude Code | OpenAI Codex | GitHub Copilot | Cursor | Gemini CLI | Antigravity | OpenCode |
|---|---|---|---|---|---|---|---|---|
| MCP client | P1 | `N` claude mcp add\|list\|... | `N` [mcp_servers.<id>]; codex mcp add | `N` MCP client | `N` mcpServers | `N` mcpServers in settings.json | `N` mcpServers in mcp_config.json | `N` `mcp.servers` |
| Project-level MCP config file (path in note) | P2 | `N` .mcp.json | `N` .codex/config.toml | `N` .vscode/mcp.json + .mcp.json; CLI .mcp.json / .github/mcp.json | `N` .cursor/mcp.json | `N` .gemini/settings.json (mcpServers) | `N` .agents/mcp_config.json | `N` opencode.json[c] `mcp.servers` |
| Remote (HTTP) MCP servers | P2 | `N` type: http, url, headers, headersHelper, oauth | `N` url + auth / bearer_token_env_var | `N` type: http / sse, url, headers | `N` url, headers, auth (OAuth) | `N` url (SSE) / httpUrl (streamable HTTP) | `N` serverUrl | `N` type: remote (url, headers, oauth) |

### Code intelligence & memory

| Capability | Tier | Claude Code | OpenAI Codex | GitHub Copilot | Cursor | Gemini CLI | Antigravity | OpenCode |
|---|---|---|---|---|---|---|---|---|
| Language-server tool exposed to the model | P3 | `N` LSP tool via plugins (.lsp.json) | `-` | `P` CLI .github/lsp.json, ~/.copilot/lsp-config.json | `-` | `-` | `-` | `-` |
| Automatic memory across sessions | P3 | `N` auto memory: ~/.claude/projects/<project>/memory/MEMORY.md | `P` [features] memories; ~/.codex/memories/ | `N` Copilot Memory (GitHub-hosted) | `?` | `N` GEMINI.md memory tiers + experimental Auto Memory | `P` Knowledge Items (KIs) | `-` |

### Packages & distribution

| Capability | Tier | Claude Code | OpenAI Codex | GitHub Copilot | Cursor | Gemini CLI | Antigravity | OpenCode |
|---|---|---|---|---|---|---|---|---|
| Plugin / extension packages | P2 | `N` .claude-plugin/plugin.json | `N` .codex-plugin/plugin.json; root plugin.json | `N` plugin.json (Agent Plugins 1.0/1.1 or legacy) | `N` .cursor-plugin/plugin.json; root plugin.json | `N` Extensions: gemini-extension.json | `N` plugin.json + skills/, agents/, rules/, hooks.json, mcp_config.json | `P` `plugins` array + .opencode/plugins/ |
| Marketplace / catalog | P2 | `N` .claude-plugin/marketplace.json | `N` .agents/plugins/marketplace.json | `N` marketplace.json; awesome-copilot built in, copilot-plugins added manually | `N` Cursor Marketplace; team marketplaces | `P` geminicli.com/extensions gallery | `P` /plugin Discover tab | `-` |
| Agent Plugins 1.0 client | P1 | `-` | `N` root plugin.json with agent-plugins.org $schema | `N` Agent Plugins 1.0 (plugin.json with $schema) | `N` root plugin.json (open standard) | `-` | `-` | `-` |
| Reads Claude plugin manifest (.claude-plugin/) | P2 | `N` .claude-plugin/plugin.json | `C` .claude-plugin/plugin.json (fallback) | `C` .claude-plugin/plugin.json | `?` | `-` | `-` | `-` |

## What changed

- 2026-10-26: reviewed 7 tools; 12 level changes:
  - Antigravity, User commands as their own format: `P` → `-`
  - Antigravity, Hooks can be configured or default to fail closed: `?` → `P`
  - Antigravity, Ignore list that actually holds: `?` → `-`
  - OpenAI Codex, Model-level hooks (before/after model call): `-` → `P`
  - Gemini CLI, Host-specific skill frontmatter extensions: `?` → `-`
  - Gemini CLI, Hooks can be configured or default to fail closed: `?` → `P`
  - OpenCode, Cloud / background agent: `P` → `-`
  - OpenCode, Per-folder (nested) instruction files: `P` → `N`
  - OpenCode, Host-specific skill frontmatter extensions: `-` → `P`
  - OpenCode, Hook can inject context: `P` → `N`
  - OpenCode, Model-level hooks (before/after model call): `P` → `N`
  - OpenCode, Language-server tool exposed to the model: `P` → `-`
- 2026-10-18: reviewed 7 tools; 2 level changes:
  - Antigravity, Event: session.start: `-` → `N`
  - Antigravity, Hook can rewrite tool input: `?` → `N`
- 2026-10-12: reviewed 7 tools; 3 level changes:
  - Antigravity, Org / enterprise managed policy: `-` → `?`
  - Claude Code, Hooks can be configured or default to fail closed: `-` → `N`
  - OpenCode, IDE (editor or extension): `?` → `P`
- 2026-09-29: first published with 7 tools and 47 capabilities.

## Main sources

- Claude Code: [Documentation](https://code.claude.com/docs/en/overview), [Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- OpenAI Codex: [Documentation](https://learn.chatgpt.com/docs/), [Source code](https://github.com/openai/codex)
- GitHub Copilot: [Documentation](https://docs.github.com/en/copilot), [VS Code agent customization](https://code.visualstudio.com/docs/agent-customization/overview), [CLI changelog](https://github.com/github/copilot-cli/blob/main/changelog.md)
- Cursor: [Documentation](https://cursor.com/docs)
- Gemini CLI: [Documentation](https://geminicli.com/docs/), [Source code](https://github.com/google-gemini/gemini-cli), [Move to Antigravity CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
- Antigravity: [Documentation](https://antigravity.google/docs/overview), [CLI changelog](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md), [Move from Gemini CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
- OpenCode: [Documentation](https://opencode.ai/docs/), [Source code](https://github.com/anomalyco/opencode)

---

[GitHub](https://github.com/paulochang) · [LinkedIn](https://www.linkedin.com/in/paulochang)
