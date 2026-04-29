import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import hljs from 'highlight.js';
import { markedHighlight } from 'marked-highlight';
import { marked } from 'marked';

marked.use(
    markedHighlight({
        emptyLangClass: 'hljs',
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
    }),
);

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
    private readonly sanitizer = inject(DomSanitizer);

    transform(value: string | undefined | null): SafeHtml {
        if (!value) return '';
        const html = marked.parse(value, { async: false }) as string;
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }
}
