import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const dir='.agents/skills';
for (const item of await readdir(dir)) {
  const content=await readFile(path.join(dir,item,'SKILL.md'),'utf8');
  const match=/^---\nname: ([a-z0-9]+(?:-[a-z0-9]+)*)\ndescription: ([^\n]+)\n---\n/.exec(content);
  if (!match || match[1]!==item || match[2].length>1024) throw new Error(`Invalid skill: ${item}`);
}
console.log('Skill frontmatter: OK');
