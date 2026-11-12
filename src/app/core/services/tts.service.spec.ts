import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TtsService } from './tts.service';
import type { TtsAudio, TtsAudioListItem, TtsVoicesResponse } from '../models/tts-audio.model';

const API_BASE = 'http://localhost:8000/api/tts';

const mockItem: TtsAudioListItem = {
    id: 1,
    title: 'Tema 1',
    source_type: 'file',
    source_name: 'tema1.pdf',
    voice: 'ef_dora',
    speed: 1,
    status: 'done',
    progress: 100,
    char_count: 1200,
    duration_seconds: 83.4,
    size_bytes: 667968,
    error_message: null,
    created_at: '2026-11-12T10:00:00Z',
};

const mockAudio: TtsAudio = { ...mockItem, text_content: 'Texto del tema.' };

const mockVoices: TtsVoicesResponse = {
    default_voice: 'ef_dora',
    voices: [{ id: 'ef_dora', name: 'Dora', language: 'Español', gender: 'female' }],
};

describe('TtsService', () => {
    let service: TtsService;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(TtsService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('should list voices', () => {
        let result: TtsVoicesResponse | undefined;
        service.getVoices().subscribe((r) => (result = r));
        const req = httpTesting.expectOne(`${API_BASE}/voices`);
        expect(req.request.method).toBe('GET');
        req.flush(mockVoices);
        expect(result).toEqual(mockVoices);
    });

    it('should list audios', () => {
        let result: TtsAudioListItem[] | undefined;
        service.getAudios().subscribe((r) => (result = r));
        const req = httpTesting.expectOne(`${API_BASE}/audios`);
        expect(req.request.method).toBe('GET');
        req.flush([mockItem]);
        expect(result).toEqual([mockItem]);
    });

    it('should get a single audio', () => {
        let result: TtsAudio | undefined;
        service.getAudio(1).subscribe((r) => (result = r));
        const req = httpTesting.expectOne(`${API_BASE}/audios/1`);
        expect(req.request.method).toBe('GET');
        req.flush(mockAudio);
        expect(result).toEqual(mockAudio);
    });

    it('should create an audio from a file with a page range', () => {
        const file = new File(['content'], 'tema1.pdf', { type: 'application/pdf' });
        let result: TtsAudioListItem | undefined;
        service
            .createAudio({ file, voice: 'em_alex', speed: 1.25, pageStart: 3, pageEnd: 20, title: 'Tema 1' })
            .subscribe((r) => (result = r));

        const req = httpTesting.expectOne(`${API_BASE}/audios`);
        expect(req.request.method).toBe('POST');
        const body = req.request.body as FormData;
        expect(body.get('file')).toBeInstanceOf(File);
        expect(body.get('voice')).toBe('em_alex');
        expect(body.get('speed')).toBe('1.25');
        expect(body.get('page_start')).toBe('3');
        expect(body.get('page_end')).toBe('20');
        expect(body.get('title')).toBe('Tema 1');
        expect(body.has('text')).toBe(false);
        req.flush(mockItem);
        expect(result).toEqual(mockItem);
    });

    it('should create an audio from text or from an indexed document', () => {
        service.createAudio({ text: 'Hola mundo' }).subscribe();
        const textReq = httpTesting.expectOne(`${API_BASE}/audios`);
        const textBody = textReq.request.body as FormData;
        expect(textBody.get('text')).toBe('Hola mundo');
        expect(textBody.has('file')).toBe(false);
        expect(textBody.has('page_start')).toBe(false);
        textReq.flush(mockItem);

        service.createAudio({ documentId: 7, pageStart: null }).subscribe();
        const docReq = httpTesting.expectOne(`${API_BASE}/audios`);
        const docBody = docReq.request.body as FormData;
        expect(docBody.get('document_id')).toBe('7');
        expect(docBody.has('page_start')).toBe(false);
        docReq.flush(mockItem);
    });

    it('should delete an audio', () => {
        let completed = false;
        service.deleteAudio(1).subscribe({ complete: () => (completed = true) });
        const req = httpTesting.expectOne(`${API_BASE}/audios/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
        expect(completed).toBe(true);
    });

    it('should build file urls', () => {
        expect(service.fileUrl(4)).toBe(`${API_BASE}/audios/4/file`);
        expect(service.fileUrl(4, true)).toBe(`${API_BASE}/audios/4/file?download=true`);
    });
});
