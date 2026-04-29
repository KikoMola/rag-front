import { TestBed } from '@angular/core/testing';
import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
    let pipe: MarkdownPipe;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        pipe = TestBed.runInInjectionContext(() => new MarkdownPipe());
    });

    it('returns empty string for null', () => {
        expect(pipe.transform(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(pipe.transform(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
        expect(pipe.transform('')).toBe('');
    });

    it('renders bold markdown', () => {
        const result = String(pipe.transform('**bold text**'));
        expect(result).toContain('<strong>bold text</strong>');
    });

    it('renders italic markdown', () => {
        const result = String(pipe.transform('*italic*'));
        expect(result).toContain('<em>italic</em>');
    });

    it('renders inline code', () => {
        const result = String(pipe.transform('`code`'));
        expect(result).toContain('<code>');
        expect(result).toContain('code');
    });

    it('renders heading', () => {
        const result = String(pipe.transform('# Heading'));
        expect(result).toContain('<h1');
        expect(result).toContain('Heading');
    });

    it('renders a paragraph', () => {
        const result = String(pipe.transform('Hello world'));
        expect(result).toContain('<p>');
        expect(result).toContain('Hello world');
    });

    it('renders a fenced code block', () => {
        const result = String(pipe.transform('```\nconst x = 1;\n```'));
        expect(result).toContain('<pre>');
        expect(result).toContain('<code>');
    });

    it('renders an unordered list', () => {
        const result = String(pipe.transform('- item one\n- item two'));
        expect(result).toContain('<ul>');
        expect(result).toContain('<li>');
    });

    it('wraps output in SafeHtml (does not return plain string)', () => {
        // bypassSecurityTrustHtml returns an object, not a primitive string
        const result = pipe.transform('**bold**');
        expect(typeof result).not.toBe('string');
    });
});
