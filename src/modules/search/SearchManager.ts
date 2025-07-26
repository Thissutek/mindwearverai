/**
 * SearchManager.ts
 * Handles search functionality for notes and tags
 */

import { NotepadData } from '../state/StateManager';

export interface SearchResult {
  id: string;
  type: 'note' | 'tag';
  title: string;
  content: string;
  tags: string[];
  lastModified: number;
  matchType: 'content' | 'tag' | 'both';
  relevanceScore: number;
}

export interface SearchOptions {
  query: string;
  searchContent: boolean;
  searchTags: boolean;
  caseSensitive: boolean;
  exactMatch: boolean;
}

export class SearchManager {
  private notes: Map<string, NotepadData> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map(); // word -> note IDs
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> note IDs

  constructor() {
    this.buildSearchIndex();
  }

  /**
   * Add or update a note in the search index
   */
  public indexNote(note: NotepadData): void {
    console.log('📇 Indexing note:', note.id, 'content length:', note.content.length, 'tags:', note.tags);
    this.notes.set(note.id, note);
    this.updateSearchIndex(note);
    this.updateTagIndex(note);
    console.log('📇 Total notes in index:', this.notes.size);
  }

  /**
   * Remove a note from the search index
   */
  public removeNote(noteId: string): void {
    const note = this.notes.get(noteId);
    if (note) {
      this.removeFromSearchIndex(note);
      this.removeFromTagIndex(note);
      this.notes.delete(noteId);
    }
  }

  /**
   * Search through notes and tags
   */
  public search(options: SearchOptions): SearchResult[] {
    console.log('🔍 SearchManager.search called with:', options);
    console.log('🔍 Current index has', this.notes.size, 'notes');
    
    if (!options.query.trim()) {
      console.log('🔍 Empty query, returning no results');
      return [];
    }

    const query = options.caseSensitive ? options.query : options.query.toLowerCase();
    const results: SearchResult[] = [];
    const processedNotes = new Set<string>();

    // Search by tags if enabled
    if (options.searchTags) {
      const tagResults = this.searchByTags(query, options);
      tagResults.forEach(result => {
        results.push(result);
        processedNotes.add(result.id);
      });
    }

    // Search by content if enabled
    if (options.searchContent) {
      const contentResults = this.searchByContent(query, options, processedNotes);
      contentResults.forEach(result => {
        const existingResult = results.find(r => r.id === result.id);
        if (existingResult) {
          // Merge results - note matches both content and tags
          existingResult.matchType = 'both';
          existingResult.relevanceScore = Math.max(existingResult.relevanceScore, result.relevanceScore);
        } else {
          results.push(result);
        }
      });
    }

    // Sort by relevance score (descending) and then by last modified (descending)
    return results.sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.lastModified - a.lastModified;
    });
  }

  /**
   * Get all unique tags across all notes
   */
  public getAllTags(): string[] {
    const allTags = new Set<string>();
    this.notes.forEach(note => {
      note.tags?.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }

  /**
   * Get notes by specific tag
   */
  public getNotesByTag(tag: string): NotepadData[] {
    const noteIds = this.tagIndex.get(tag.toLowerCase()) || new Set();
    return Array.from(noteIds)
      .map(id => this.notes.get(id))
      .filter((note): note is NotepadData => note !== undefined)
      .sort((a, b) => b.lastModified - a.lastModified);
  }

  private buildSearchIndex(): void {
    this.searchIndex.clear();
    this.tagIndex.clear();
    
    this.notes.forEach(note => {
      this.updateSearchIndex(note);
      this.updateTagIndex(note);
    });
  }

  private updateSearchIndex(note: NotepadData): void {
    // Remove old entries for this note
    this.removeFromSearchIndex(note);

    // Tokenize content
    const words = this.tokenize(note.content);
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word)!.add(note.id);
    });
  }

  private updateTagIndex(note: NotepadData): void {
    // Remove old entries for this note
    this.removeFromTagIndex(note);

    // Index tags
    note.tags?.forEach(tag => {
      const normalizedTag = tag.toLowerCase();
      if (!this.tagIndex.has(normalizedTag)) {
        this.tagIndex.set(normalizedTag, new Set());
      }
      this.tagIndex.get(normalizedTag)!.add(note.id);
    });
  }

  private removeFromSearchIndex(note: NotepadData): void {
    this.searchIndex.forEach((noteIds, word) => {
      noteIds.delete(note.id);
      if (noteIds.size === 0) {
        this.searchIndex.delete(word);
      }
    });
  }

  private removeFromTagIndex(note: NotepadData): void {
    this.tagIndex.forEach((noteIds, tag) => {
      noteIds.delete(note.id);
      if (noteIds.size === 0) {
        this.tagIndex.delete(tag);
      }
    });
  }

  private searchByTags(query: string, options: SearchOptions): SearchResult[] {
    const results: SearchResult[] = [];
    const queryTag = query.replace(/^#+/, '').toLowerCase(); // Remove # prefix if present

    this.tagIndex.forEach((noteIds, tag) => {
      let matches = false;
      
      if (options.exactMatch) {
        matches = tag === queryTag;
      } else {
        matches = tag.includes(queryTag);
      }

      if (matches) {
        noteIds.forEach(noteId => {
          const note = this.notes.get(noteId);
          if (note) {
            results.push({
              id: note.id,
              type: 'note',
              title: this.generateTitle(note.content),
              content: note.content,
              tags: note.tags || [],
              lastModified: note.lastModified,
              matchType: 'tag',
              relevanceScore: this.calculateTagRelevance(tag, queryTag, options.exactMatch)
            });
          }
        });
      }
    });

    return results;
  }

  private searchByContent(query: string, options: SearchOptions, excludeNoteIds: Set<string>): SearchResult[] {
    const results: SearchResult[] = [];
    const queryWords = this.tokenize(options.caseSensitive ? query : query.toLowerCase());

    if (queryWords.length === 0) {
      return results;
    }

    // Find notes that contain query words
    const candidateNotes = new Map<string, number>(); // noteId -> match count

    queryWords.forEach(word => {
      const noteIds = this.searchIndex.get(word) || new Set();
      noteIds.forEach(noteId => {
        if (!excludeNoteIds.has(noteId)) {
          candidateNotes.set(noteId, (candidateNotes.get(noteId) || 0) + 1);
        }
      });
    });

    // Score and filter results
    candidateNotes.forEach((matchCount, noteId) => {
      const note = this.notes.get(noteId);
      if (note) {
        const relevanceScore = this.calculateContentRelevance(note.content, query, matchCount, queryWords.length);
        
        // Only include if it has reasonable relevance
        if (relevanceScore > 0.1) {
          results.push({
            id: note.id,
            type: 'note',
            title: this.generateTitle(note.content),
            content: note.content,
            tags: note.tags || [],
            lastModified: note.lastModified,
            matchType: 'content',
            relevanceScore
          });
        }
      }
    });

    return results;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter out very short words
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set(['the', 'and', 'but', 'for', 'are', 'with', 'this', 'that', 'from', 'they', 'have', 'been', 'will', 'would', 'could', 'should']);
    return stopWords.has(word);
  }

  private calculateTagRelevance(tag: string, query: string, exactMatch: boolean): number {
    if (exactMatch && tag === query) {
      return 1.0;
    }
    
    if (tag.startsWith(query)) {
      return 0.9;
    }
    
    if (tag.includes(query)) {
      return 0.7;
    }
    
    return 0.5;
  }

  private calculateContentRelevance(content: string, query: string, matchCount: number, totalQueryWords: number): number {
    const contentLength = content.length;
    const queryLength = query.length;
    
    // Base score from match ratio
    let score = matchCount / totalQueryWords;
    
    // Boost for exact phrase matches
    if (content.toLowerCase().includes(query.toLowerCase())) {
      score += 0.3;
    }
    
    // Adjust for content length (shorter content with matches is more relevant)
    if (contentLength > 0) {
      score *= Math.min(1.0, 500 / contentLength);
    }
    
    // Boost for query length relative to content
    if (queryLength > 0 && contentLength > 0) {
      score *= Math.min(1.0, queryLength / (contentLength * 0.1));
    }
    
    return Math.min(1.0, score);
  }

  private generateTitle(content: string): string {
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + '...';
    }
    return firstLine || 'Untitled Note';
  }
}

// Global search manager instance
export const searchManager = new SearchManager();
