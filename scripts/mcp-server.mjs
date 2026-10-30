#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectArgument = process.argv.find(argument => argument.startsWith('--project='))?.slice('--project='.length);
if (!projectArgument) {
  console.error('MCP server requires --project=<directory>.');
  process.exit(2);
}

const project = path.resolve(projectArgument);
const projectStat = await lstat(project).catch(() => null);
if (!projectStat?.isDirectory() || projectStat.isSymbolicLink()) {
  console.error('MCP project must be an existing non-symlink directory.');
  process.exit(2);
}
const projectRoot = await realpath(project);
const registry = JSON.parse(await readFile(path.join(root, 'data', 'capability-registry-0.1.json'), 'utf8'));
const cliPath = path.join(root, 'scripts', 'cli.mjs');

function summarizeConfig(existingConfig) {
  const counts = {};
  for (const finding of existingConfig?.findings ?? []) {
    const key = `${finding.kind}:${finding.status}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function summarizeMcpConfig(mcpConfig) {
  const summary = { servers: 0, byTransport: {}, byStatus: {}, credentialLikeCount: 0 };
  for (const finding of mcpConfig?.findings ?? []) {
    summary.servers++;
    summary.byTransport[finding.transport] = (summary.byTransport[finding.transport] ?? 0) + 1;
    summary.byStatus[finding.status] = (summary.byStatus[finding.status] ?? 0) + 1;
    if (finding.hasCredentialLikeFields) summary.credentialLikeCount++;
  }
  return summary;
}

function redactFacts(output) {
  const facts = output.facts ?? {};
  return {
    filesSeen: facts.filesSeen,
    languages: facts.languages,
    frameworks: facts.frameworks,
    hasTests: facts.hasTests,
    hasGitHubActions: facts.hasGitHubActions,
    hasExistingAgentInstructions: facts.hasExistingAgentInstructions,
    hasExistingSkills: facts.hasExistingSkills,
    existingSettingsCount: facts.existingSettingsPaths?.length ?? 0,
    existingConfigStatuses: summarizeConfig(output.existingConfig),
    mcpConfig: summarizeMcpConfig(output.mcpConfig),
    warnings: facts.warnings,
  };
}

function redactBlueprint(blueprint) {
  return {
    schemaVersion: blueprint.schemaVersion,
    target: blueprint.target,
    workType: blueprint.workType,
    targetEdition: blueprint.targetEdition,
    targetVersion: blueprint.targetVersion,
    provenance: blueprint.provenance,
    agents: blueprint.agents,
    skills: blueprint.skills,
    reasons: blueprint.reasons,
    warnings: blueprint.warnings,
    security: blueprint.security,
  };
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: root,
      env: { PATH: process.env.PATH ?? '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderrBytes = 0;
    let bytes = 0;
    const timer = setTimeout(() => child.kill('SIGTERM'), 10_000);
    child.stdout.on('data', chunk => {
      bytes += chunk.byteLength;
      if (bytes <= 1_000_000) stdout += chunk.toString();
      else child.kill('SIGTERM');
    });
    child.stderr.on('data', chunk => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > 64_000) child.kill('SIGTERM');
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (code !== 0 || bytes > 1_000_000 || stderrBytes > 64_000) reject(new Error('Bounded project analysis failed.'));
      else {
        try { resolve(JSON.parse(stdout)); }
        catch { reject(new Error('Bounded project analysis returned invalid data.')); }
      }
    });
  });
}

function textResult(value, isError = false) {
  return { isError, content: [{ type: 'text', text: JSON.stringify(value) }] };
}

function buildServer() {
  const server = new McpServer({ name: 'universal-agent-architect', version: '0.1.0' });
  server.registerTool('list_capabilities', {
    description: 'Return the reviewed offline capability snapshot. No project files are read.',
    inputSchema: z.object({}),
  }, async () => textResult({
    schemaVersion: registry.schemaVersion,
    checkedAt: registry.checkedAt,
    entries: registry.entries.map(entry => ({
      target: entry.target,
      edition: entry.edition,
      version: entry.version,
      status: entry.status,
      capabilities: entry.capabilities,
    })),
  }));

  server.registerTool('analyze_project', {
    description: 'Analyze the fixed authorized project using bounded local metadata/config checks. Raw source and secrets are excluded.',
    inputSchema: z.object({}),
  }, async () => {
    try {
      const output = await runCli(['analyze', projectRoot, 'codex', 'baseline', '--config', '--mcp-config']);
      return textResult({ projectScope: 'fixed-startup-project', facts: redactFacts(output) });
    } catch {
      return textResult({ error: 'Project analysis failed safely.' }, true);
    }
  });

  server.registerTool('propose_blueprint', {
    description: 'Propose a deterministic blueprint for the fixed authorized project without writing files.',
    inputSchema: z.object({
      target: z.enum(['codex', 'claude-code', 'gemini-cli', 'antigravity', 'chatgpt']).default('codex'),
      securityProfile: z.enum(['baseline', 'strict']).default('baseline'),
    }),
  }, async ({ target, securityProfile }) => {
    try {
      const output = await runCli(['analyze', projectRoot, target, securityProfile, '--config', '--mcp-config']);
      return textResult({ projectScope: 'fixed-startup-project', blueprint: redactBlueprint(output.blueprint), facts: redactFacts(output) });
    } catch {
      return textResult({ error: 'Blueprint proposal failed safely.' }, true);
    }
  });
  return server;
}

console.error('UAA MCP stdio server ready; project scope is fixed and read-only.');
serveStdio(buildServer, { onerror: () => console.error('MCP transport error.') });
