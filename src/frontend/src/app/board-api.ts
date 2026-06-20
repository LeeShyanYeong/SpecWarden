import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Note } from './note';

interface BoardDto {
  notes: Note[];
}

/**
 * Talks to the board REST contract. The URL is relative so the browser stays
 * same-origin: a @component test stubs it via route interception, while @e2e
 * proxies it through to the real backend.
 */
@Injectable({ providedIn: 'root' })
export class BoardApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/board';

  async load(): Promise<Note[]> {
    const board = await firstValueFrom(this.http.get<BoardDto>(this.url));
    return board?.notes ?? [];
  }

  async save(notes: Note[]): Promise<void> {
    await firstValueFrom(this.http.put<unknown>(this.url, { notes }));
  }
}
