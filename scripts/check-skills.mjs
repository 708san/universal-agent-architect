import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const dir='.agents/skills';
const skillName = value => typeof value === 'string'
  && value.length >= 1
  && value.length <= 64
  && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
for (const item of await readdir(dir)) {
  const content=await readFile(path.join(dir,item,'SKILL.md'),'utf8');
  const match=/^---\nname: ([^\n]+)\ndescription: ([^\n]+)\n---\n/.exec(content);
  if (!match || !skillName(match[1]) || match[1]!==item || match[2].length === 0 || match[2].length>1024) throw new Error(`Invalid skill: ${item}`);
}
console.log('Skill frontmatter: OK');
