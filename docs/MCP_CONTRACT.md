# Planned MCP contract (not yet implemented)

MCP = Model Context Protocol, a standard interface for connecting tools to an AI host. The browser's local analysis is distinct from a remotely callable MCP server.

## Transport
- P2: `stdio` child process; no network port. Do not accept arbitrary commands to run.
- Later: Streamable HTTP if an explicitly approved use case needs remote access. Bind localhost by default, authenticate, validate Origin/Host, protect against DNS rebinding, and require opt-in exposure.

## Tools (planned; all inputs and output require bounded schemas)
| Name | Request | Safe response | Permission |
|---|---|---|---|
| `list_capabilities` | target name | verified capability names, versions, sources | read |
| `analyze_project` | allowlisted local root, scan profile | summarized facts without filenames/raw source unless explicitly requested | read-local |
| `propose_blueprint` | facts reference, goal, target | explanation + versioned Blueprint | compute |
| `validate_artifacts` | staged artifact ids | relative paths + non-sensitive findings | read-stage |
| `generate_artifacts` | approved blueprint id | staged artifact ids and preview | write-stage |
| `apply_configuration` | staged artifact ids, explicit confirmation token | changed paths + rollback reference | write-project, approval |
| `check_updates` | targets | source-dated candidate diffs | network opt-in |

## Security rule
A model-facing MCP response is subject to the same disclosure restrictions as a cloud API prompt. Return structured counts and flags by default, not raw project content. Never include credentials or internal absolute paths. Local computational execution does **not** imply the complete flow is offline when connected to cloud AI.

## Out of scope for first MCP iteration
Remote hosted deployment, public ChatGPT plugin marketplace, privileged execution of discovered MCP servers, auto-approval of changes.
