import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';

describe('SearchService', () => {
    let service: SearchService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(SearchService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have an empty initial query', () => {
        expect(service.query()).toBe('');
    });

    it('should update query via set', () => {
        service.query.set('angular');
        expect(service.query()).toBe('angular');
    });

    it('should update query via update', () => {
        service.query.set('hello');
        service.query.update((prev) => prev + ' world');
        expect(service.query()).toBe('hello world');
    });
});
