import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
describe('approved Rally Reactor public identity', () => {
  it('uses exact identity in browser, menu, description, package and README', () => {
    const html = read('index.html');
    expect(html).toContain('<title>Rally Reactor</title>');
    expect(html).toContain('<h1>Rally Reactor</h1>');
    expect(html).toContain('content="Rally Reactor:');
    expect(JSON.parse(read('package.json')).name).toBe('rally-reactor-game');
    const readme = read('README.md');
    expect(readme.split('\n')[0]).toBe('# Rally Reactor');
    expect(readme).toContain('[Play live](https://nateofspades.github.io/Rally_Reactor_Game/)');
    expect(readme).toContain('![Active gameplay](assets/screenshots/gameplay.png)');
  });
});
