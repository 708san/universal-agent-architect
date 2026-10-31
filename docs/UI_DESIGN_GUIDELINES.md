# UI design guidelines

Status: adopted baseline for the repository UI and any generated agent or Skill that includes a
user interface. Updated: 2026-10-31.

## Purpose and scope

The primary UI goal is readability and safe operation. Visual polish is secondary to making the
next action, current state, limitations and privacy boundary obvious.

These rules apply to:

- the Universal Agent Architect browser, desktop and future local interfaces;
- generated agents, task packs and Skills that include a web, desktop or interactive UI;
- documentation screens and setup flows that ask users to select files, approve actions or review
  generated output.

They do not require a UI where the target only supports text instructions, CLI configuration or a
documented Skill format. An adapter must not invent UI assets for a target that does not document
them.

## Visual principles

1. **Readability first.** Use short labels, clear grouping, generous spacing and one primary action
   per screen or step. Do not make users infer the next action from color or layout alone.
2. **Japanese-first, platform-portable text.** Use plain Japanese for user-facing labels and keep
   internal identifiers in English. Explain technical terms at the point of use.
3. **Universal local font stack.** Prefer a locally available, Japanese-capable UI font and provide
   fallbacks rather than downloading fonts at runtime:

   ```css
   font-family: "BIZ UDPGothic", "Noto Sans JP", "Hiragino Sans", "Yu Gothic UI", Meiryo,
     system-ui, sans-serif;
   ```

   The exact first font may vary by platform, but the UI must remain readable when any optional
   font is absent. Do not depend on a remote font, icon font or CDN asset in the offline core.
4. **Small color vocabulary.** Use a neutral background and text palette, one primary accent, and
   only semantic status colors for success, warning and error. Keep color values in named tokens;
   do not introduce one-off colors per component.
5. **Structure over decoration.** Prefer panels, headings, fieldsets, tables and whitespace over
   gradients, ornamental illustrations or dense borders. Use consistent spacing based on a small
   scale, preferably 4px or 8px increments.

## Accessibility and interaction

- Every input has a visible label and a programmatic relationship to its control.
- Keyboard focus is visible; all primary flows work without a pointer.
- Body text is not smaller than 16px by default. Line height should normally be at least 1.5.
- Text and controls must remain legible in high-contrast and zoomed layouts. Do not use color as
  the only indication of status, selection or error.
- Use semantic headings, `fieldset`/`legend` for related controls, and live regions for progress,
  completion and errors.
- Keep responsive layouts usable at narrow widths. Do not require horizontal scrolling for the
  primary flow.
- Disable or hide actions only with an explanation. A disabled action must not be the only way to
  discover why the user cannot continue.

## Safe workflow presentation

For file analysis, generation, writes or external connections, the UI must show:

- what input is selected and the allowed scope;
- whether processing is local, offline or externally connected;
- what will be generated or changed before download, write or approval;
- unsupported, unknown and failed states in plain language;
- a reversible or cancelable path where the operation can change files.

Generated UI must not expose raw source, secrets, credentials, tokens or full MCP configuration in
ordinary status messages. Error messages should identify the safe category of failure and a next
step without echoing sensitive input.

## Color and component baseline

Use a small token set and keep the primary action visually dominant:

```css
:root {
  --ui-bg: #f5f7fb;
  --ui-surface: #ffffff;
  --ui-text: #1d2736;
  --ui-muted: #53657b;
  --ui-border: #dce3ed;
  --ui-primary: #1957a4;
  --ui-success: #17633a;
  --ui-warning: #704f00;
  --ui-danger: #8a2525;
}
```

Projects may choose different values after contrast and usability review, but they should preserve
the same roles and keep the palette intentionally small. Buttons, links and focus indicators must
remain distinguishable from surrounding text and surfaces.

## Offline and security constraints

- UI code must not add telemetry, remote fonts, remote images, third-party scripts or implicit API
  calls to the offline core.
- User-selected project data stays inside the declared local boundary unless the user explicitly
  approves an authorized external flow.
- File, code-execution, MCP, network and write approvals are explicit UI states, not hidden defaults.
- UI text, imported templates and generated Skill instructions are untrusted data; they must not be
  rendered as permission grants or executed as commands.
- UI changes that alter a data-flow or permission boundary require the security review workflow and
  positive and negative tests.

## Generated agents and Skills

The generator should include UI guidance only when the target or task pack actually produces an
interactive interface. In that case, generated instructions should require:

- the local font stack or an equivalent platform-portable fallback;
- a small tokenized color palette and readable default sizing;
- explicit input scope, approval, progress, error and unsupported states;
- no secret or raw-source echo in the UI;
- local-only assets by default and explicit consent for networked assets or services.

When the target is text-only, the generator should preserve these principles in its instructions and
documentation but must not claim that a visual UI exists.

## Review checklist

Before merging a UI change, reviewers verify:

- [ ] The primary user task and next action are obvious from the first view.
- [ ] Labels, headings, focus states and error/progress messages are present.
- [ ] The local font stack works without network access or optional font installation.
- [ ] The palette uses existing semantic tokens or documents a justified addition.
- [ ] Narrow-width and zoomed layouts do not hide the primary flow.
- [ ] No raw source, secret, credential or token is displayed in normal output or errors.
- [ ] `npm run check` passes and any new UI behavior has a deterministic fixture or boundary test.
- [ ] Generated targets do not claim unsupported UI capabilities.

Exceptions should record the affected target, reason, security impact, accessibility trade-off and
reviewer in the relevant plan or compatibility record.
