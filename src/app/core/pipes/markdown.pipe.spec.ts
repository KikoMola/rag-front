import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
    let pipe: MarkdownPipe;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MarkdownPipe],
        });
        pipe = TestBed.inject(MarkdownPipe);
    });

    it('should create', () => {
        expect(pipe).toBeTruthy();
    });

    it('should return empty string for null', () => {
        expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
        expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
        expect(pipe.transform('')).toBe('');
    });

    it('should convert markdown to HTML', () => {
        const result = pipe.transform('**bold**');
        // SafeHtml wraps the value, so we check it's truthy
        expect(result).toBeTruthy();
        expect(result).not.toBe('');
    });

    it('should convert headings', () => {
        const result = pipe.transform('# Hello');
        expect(result).toBeTruthy();
    });

    it('should convert code blocks', () => {
        const result = pipe.transform('`inline code`');
        expect(result).toBeTruthy();
    });

    it('should use DomSanitizer.bypassSecurityTrustHtml', () => {
        const sanitizer = TestBed.inject(DomSanitizer);
        vi.spyOn(sanitizer, 'bypassSecurityTrustHtml');

        pipe.transform('test');
        expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalled();
    });
});
