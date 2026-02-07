import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

const contentPath = path.join(process.cwd(), 'src', 'data', 'content.json');
const docsIndexPath = path.resolve(process.cwd(), '..', 'docs', 'index.html');
const docsStylesPath = path.resolve(process.cwd(), '..', 'docs', 'assets', 'styles.css');

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let existing = { text: {}, links: {}, cssVars: {} };
    try {
      const raw = await readFile(contentPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        existing = {
          text: parsed.text || {},
          links: parsed.links || {},
          cssVars: parsed.cssVars || {}
        };
      }
    } catch (err) {
      // 初回保存や読み込み失敗時は空のまま
    }

    const normalized = {
      text: { ...existing.text, ...(payload.text || {}) },
      links: { ...existing.links, ...(payload.links || {}) },
      cssVars: { ...existing.cssVars, ...(payload.cssVars || {}) }
    };

    await writeFile(contentPath, JSON.stringify(normalized, null, 2), 'utf-8');

    try {
      let html = await readFile(docsIndexPath, 'utf-8');
      const textEntries = Object.entries(normalized.text);
      for (const [id, value] of textEntries) {
        const regex = new RegExp(`(<[^>]*data-edit-id="${id}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`);
        html = html.replace(regex, (match, open, _inner, close) => `${open}${value}${close}`);
      }
      const linkEntries = Object.entries(normalized.links);
      for (const [key, href] of linkEntries) {
        const regex = new RegExp(`(<[^>]*data-edit-link="${key}"[^>]*href=)(["'])([^"']*)(["'])`, 'g');
        html = html.replace(regex, (match, prefix, quote, _old, suffix) => `${prefix}${quote}${href}${suffix}`);
      }
      await writeFile(docsIndexPath, html, 'utf-8');
    } catch (err) {
      // docs/index.html がない場合は無視
    }

    try {
      let css = await readFile(docsStylesPath, 'utf-8');
      for (const [varName, value] of Object.entries(normalized.cssVars)) {
        const regex = new RegExp(`(${varName}\\s*:\\s*)url\\([^;]*\\);`);
        css = css.replace(regex, `$1${value};`);
      }
      await writeFile(docsStylesPath, css, 'utf-8');
    } catch (err) {
      // docs/assets/styles.css がない場合は無視
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: 'save failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
