/**
 * Auto-Populate Template Service
 * Uses web search to automatically fill template data
 */

import { App, Notice } from 'obsidian';
import { WebSearchEngine } from '../../../research/web-search-engine';
import { ClippySettings } from '../../../types';

export interface TemplateData {
    [key: string]: string | number | string[];
}

export interface ContentData {
    title: string;
    genre?: string;
    year?: number;
    director?: string;
    author?: string;
    studio?: string;
    episodes?: number;
    runtime?: number;
    rating?: number;
    description?: string;
    cast?: string[];
    tags?: string[];
    source?: string;
    status?: string;
    coverUrl?: string;
}

export class AutoPopulateService {
    private app: App;
    private settings: ClippySettings;
    private webSearch: WebSearchEngine;

    constructor(app: App, settings: ClippySettings) {
        this.app = app;
        this.settings = settings;
        this.initializeWebSearch();
    }

    private initializeWebSearch() {
        const searxngConfig = {
            baseUrl: this.settings.research.searchEngine.searxngUrl || 'http://localhost:8888'
        };
        
        const tavilyConfig = this.settings.research.searchEngine.tavilyApiKey ? {
            apiKey: this.settings.research.searchEngine.tavilyApiKey,
            searchDepth: 'advanced' as const
        } : undefined;

        this.webSearch = new WebSearchEngine(searxngConfig, tavilyConfig);
    }

    /**
     * Auto-populate movie template data
     */
    async populateMovie(title: string): Promise<ContentData> {
        try {
            console.log(`🎬 Auto-populating movie: ${title}`);
            
            // Search for movie information
            const movieQuery = `"${title}" movie director year runtime rating imdb`;
            const results = await this.webSearch.search(movieQuery, {
                maxResults: 10,
                searchTerms: [title, 'movie', 'film'],
                qualityFilter: true,
                domains: ['imdb.com', 'rottentomatoes.com', 'metacritic.com', 'themoviedb.org']
            });

            const combinedText = results.map(r => `${r.title} ${r.snippet} ${r.content || ''}`).join(' ');
            
            return {
                title,
                ...this.extractMovieData(combinedText, title)
            };
        } catch (error) {
            console.error('Error populating movie data:', error);
            new Notice(`Failed to fetch movie data for "${title}"`);
            return { title };
        }
    }

    /**
     * Auto-populate TV show template data
     */
    async populateShow(title: string): Promise<ContentData> {
        try {
            console.log(`📺 Auto-populating show: ${title}`);
            
            // Search for show information
            const showQuery = `"${title}" tv show episodes seasons creator studio anime manga`;
            const results = await this.webSearch.search(showQuery, {
                maxResults: 12,
                searchTerms: [title, 'tv show', 'anime', 'series'],
                qualityFilter: true,
                domains: ['imdb.com', 'myanimelist.net', 'anidb.net', 'tvdb.com', 'wikipedia.org']
            });

            const combinedText = results.map(r => `${r.title} ${r.snippet} ${r.content || ''}`).join(' ');
            
            return {
                title,
                ...this.extractShowData(combinedText, title)
            };
        } catch (error) {
            console.error('Error populating show data:', error);
            new Notice(`Failed to fetch show data for "${title}"`);
            return { title };
        }
    }

    /**
     * Auto-populate habit template with research-based recommendations
     */
    async populateHabit(habitName: string): Promise<TemplateData> {
        try {
            console.log(`🎯 Auto-populating habit: ${habitName}`);
            
            // Search for habit best practices
            const habitQuery = `"${habitName}" habit how often frequency duration best time tips`;
            const results = await this.webSearch.search(habitQuery, {
                maxResults: 8,
                searchTerms: [habitName, 'habit', 'routine', 'frequency'],
                qualityFilter: true,
                domains: ['healthline.com', 'mayoclinic.org', 'psychology today.com', 'harvard.edu']
            });

            const combinedText = results.map(r => `${r.title} ${r.snippet} ${r.content || ''}`).join(' ');
            
            return {
                habit_name: habitName,
                ...this.extractHabitData(combinedText, habitName)
            };
        } catch (error) {
            console.error('Error populating habit data:', error);
            new Notice(`Failed to fetch habit recommendations for "${habitName}"`);
            return { habit_name: habitName };
        }
    }

    /**
     * Extract movie data from search results
     */
    private extractMovieData(text: string, title: string): Partial<ContentData> {
        const data: Partial<ContentData> = {};

        // Extract year (4-digit number, likely between 1900-2030)
        const yearMatch = text.match(/\b(19\d{2}|20[0-3]\d)\b/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);

        // Extract runtime (number followed by 'min' or 'minutes')
        const runtimeMatch = text.match(/(\d+)\s*(?:min|minutes)/i);
        if (runtimeMatch) data.runtime = parseInt(runtimeMatch[1]);

        // Extract director (common patterns)
        const directorPatterns = [
            /directed?\s*by[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i,
            /director[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i,
            /(?:film|movie)\s*by[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i
        ];
        
        for (const pattern of directorPatterns) {
            const match = text.match(pattern);
            if (match) {
                data.director = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Extract genre (common movie genres)
        const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Adventure', 'Fantasy', 'Animation', 'Documentary', 'Musical', 'Western', 'War', 'Crime', 'Biography', 'Historical'];
        const genreMatch = genres.find(genre => 
            new RegExp(`\\b${genre}\\b`, 'i').test(text)
        );
        if (genreMatch) data.genre = genreMatch;

        // Extract rating (number out of 10 or percentage)
        const ratingPatterns = [
            /(?:rating|score)[:\s]*(\d+(?:\.\d+)?)\s*(?:\/\s*10|out\s*of\s*10)/i,
            /(\d+(?:\.\d+)?)\s*\/\s*10/,
            /imdb[:\s]*(\d+(?:\.\d+)?)/i
        ];
        
        for (const pattern of ratingPatterns) {
            const match = text.match(pattern);
            if (match) {
                const rating = parseFloat(match[1]);
                if (rating <= 10) {
                    data.rating = Math.round(rating / 2); // Convert to 5-star scale
                    break;
                }
            }
        }

        // Set default values
        data.status = 'plan-to-watch';
        data.source = 'Original';

        return data;
    }

    /**
     * Extract TV show data from search results
     */
    private extractShowData(text: string, title: string): Partial<ContentData> {
        const data: Partial<ContentData> = {};

        // Extract year
        const yearMatch = text.match(/\b(19\d{2}|20[0-3]\d)\b/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);

        // Extract episode count
        const episodePatterns = [
            /(\d+)\s*episodes?/i,
            /episodes?[:\s]*(\d+)/i,
            /(?:season|series)[^0-9]*(\d+)\s*episodes?/i
        ];
        
        for (const pattern of episodePatterns) {
            const match = text.match(pattern);
            if (match) {
                data.episodes = parseInt(match[1]);
                break;
            }
        }

        // Extract creator/author
        const creatorPatterns = [
            /created?\s*by[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i,
            /creator[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i,
            /author[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i,
            /written\s*by[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i
        ];
        
        for (const pattern of creatorPatterns) {
            const match = text.match(pattern);
            if (match) {
                data.author = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Extract studio
        const studioPatterns = [
            /studio[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i,
            /produced?\s*by[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i,
            /animation[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i
        ];
        
        for (const pattern of studioPatterns) {
            const match = text.match(pattern);
            if (match) {
                data.studio = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Extract genre (anime/TV specific)
        const genres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Thriller', 'Shonen', 'Seinen', 'Shoujo', 'Josei', 'Supernatural', 'Sports', 'Psychological'];
        const genreMatch = genres.find(genre => 
            new RegExp(`\\b${genre}\\b`, 'i').test(text)
        );
        if (genreMatch) data.genre = genreMatch;

        // Extract source material
        const sourcePatterns = [
            /based\s*on[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i,
            /adapted?\s*from[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i,
            /source[:\s]+([^,\n.]+?)(?:[,\n.]|$)/i
        ];
        
        for (const pattern of sourcePatterns) {
            const match = text.match(pattern);
            if (match) {
                const source = match[1].trim();
                if (source.toLowerCase().includes('manga')) data.source = 'Manga';
                else if (source.toLowerCase().includes('novel')) data.source = 'Light Novel';
                else if (source.toLowerCase().includes('game')) data.source = 'Game';
                else data.source = 'Original';
                break;
            }
        }

        // Set defaults
        data.status = 'plan-to-watch';
        data.episodes = data.episodes || 12; // Default for anime
        if (!data.source) data.source = 'Original';

        return data;
    }

    /**
     * Extract habit recommendations from search results
     */
    private extractHabitData(text: string, habitName: string): Partial<TemplateData> {
        const data: Partial<TemplateData> = {};

        // Extract frequency recommendations
        const frequencyPatterns = [
            /(?:every|daily|each)\s*day/i,
            /(\d+)\s*times?\s*(?:per|a)\s*week/i,
            /(\d+)\s*times?\s*daily/i,
            /weekly|once\s*a\s*week/i
        ];

        if (text.match(frequencyPatterns[0])) {
            data.frequency = 'daily';
        } else if (text.match(frequencyPatterns[3])) {
            data.frequency = 'weekly';
        } else {
            const timesPerWeek = text.match(frequencyPatterns[1]);
            if (timesPerWeek) {
                const times = parseInt(timesPerWeek[1]);
                if (times >= 5) data.frequency = 'weekdays';
                else if (times === 3) data.frequency = '3x-week';
                else if (times === 2) data.frequency = '2x-week';
                else data.frequency = 'weekly';
            } else {
                data.frequency = 'daily'; // Default
            }
        }

        // Extract time duration
        const durationPatterns = [
            /(\d+)\s*(?:minutes?|mins?)/i,
            /(\d+)\s*(?:hours?|hrs?)/i,
            /(\d+(?:\.\d+)?)\s*hours?/i
        ];

        for (const pattern of durationPatterns) {
            const match = text.match(pattern);
            if (match) {
                const duration = parseInt(match[1]);
                if (pattern.source.includes('hour')) {
                    data.time_required = duration >= 1 ? `${duration} hour${duration > 1 ? 's' : ''}` : `${duration * 60} minutes`;
                } else {
                    data.time_required = `${duration} minutes`;
                }
                break;
            }
        }

        // Extract best time recommendations
        const timePatterns = [
            /morning|early|dawn|am\b/i,
            /evening|night|pm\b/i,
            /afternoon|midday|noon/i
        ];

        if (text.match(timePatterns[0])) {
            data.best_time = 'morning';
        } else if (text.match(timePatterns[1])) {
            data.best_time = 'evening';
        } else if (text.match(timePatterns[2])) {
            data.best_time = 'afternoon';
        } else {
            data.best_time = 'anytime';
        }

        // Determine category based on habit name
        const categories = {
            'health': ['exercise', 'workout', 'gym', 'run', 'walk', 'yoga', 'stretch'],
            'hygiene': ['brush', 'teeth', 'shower', 'wash', 'clean', 'skincare'],
            'productivity': ['work', 'study', 'read', 'write', 'plan', 'organize'],
            'mental-health': ['meditate', 'journal', 'gratitude', 'mindfulness', 'therapy']
        };

        const habitLower = habitName.toLowerCase();
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => habitLower.includes(keyword))) {
                data.category = category;
                break;
            }
        }

        // Set difficulty based on time and frequency
        const timeReq = data.time_required as string || '';
        const freq = data.frequency as string || '';
        
        if (freq === 'daily' && timeReq.includes('hour')) {
            data.difficulty = '4'; // Hard
        } else if (freq === 'daily' || timeReq.includes('hour')) {
            data.difficulty = '3'; // Medium
        } else {
            data.difficulty = '2'; // Easy
        }

        // Set defaults
        data.priority = 'medium';
        data.target_streak = '30';
        data.current_streak = '0';
        data.longest_streak = '0';
        data.total_completions = '0';

        return data;
    }

    /**
     * Generate smart template content with AI assistance
     */
    async generateTemplateWithAI(templateType: 'movie' | 'show' | 'habit', title: string): Promise<string> {
        try {
            let data: ContentData | TemplateData;
            
            switch (templateType) {
                case 'movie':
                    data = await this.populateMovie(title);
                    return this.generateMovieTemplate(data as ContentData);
                    
                case 'show':
                    data = await this.populateShow(title);
                    return this.generateShowTemplate(data as ContentData);
                    
                case 'habit':
                    data = await this.populateHabit(title);
                    return this.generateHabitTemplate(data as TemplateData);
                    
                default:
                    throw new Error(`Unknown template type: ${templateType}`);
            }
        } catch (error) {
            console.error('Error generating AI template:', error);
            new Notice(`Failed to generate ${templateType} template for "${title}"`);
            throw error;
        }
    }

    /**
     * Generate movie template content
     */
    private generateMovieTemplate(data: ContentData): string {
        const episodes = data.episodes || '';
        const runtime = data.runtime || '';
        
        return `---
cover: ${data.coverUrl || ''}
title: ${data.title}
director: ${data.director || ''}
studio: ${data.studio || ''}
genre: ${data.genre || ''}
status: ${data.status || 'plan-to-watch'}
rating: ${data.rating || ''}
year: ${data.year || ''}
runtime: ${runtime}
source: ${data.source || ''}
streaming_service: 
date_watched: 
tags:
  - ${data.status || 'plan-to-watch'}
  - movie
cssclass: zettelkasten
---

# 🎬 ${data.title}

${data.coverUrl ? `![cover|300](${data.coverUrl})` : ''}

*Auto-populated with web search data - verify and update as needed*

## 📋 Movie Information

**Title:** \`=(this.title)\`  
**Director:** \`=(this.director)\`  
**Studio:** \`=(this.studio)\`  
**Genre:** \`=(this.genre)\`  
**Source:** \`=(this.source)\`  
**Year:** \`=(this.year)\`  
**Runtime:** \`=(this.runtime)\` minutes (\`$= Math.floor(this.runtime / 60)\`h \`$= this.runtime % 60\`m)  
**Status:** \`=(this.status)\`  
**Rating:** \`=(choice(this.rating != "", this.rating + "⭐", "Not Rated"))\`  

${data.description ? `## 📝 Description\n\n${data.description}\n\n` : ''}---

## ⭐ My Review

### Overall Rating: ${data.rating ? data.rating + '/5 ⭐' : 'Not Rated'}

### My Thoughts
> *Write your detailed review here...*

### What I Loved ✅
- 

### What Could Be Better ❌
- 

---

## 🔗 Quick Links
**Watch:** 
**IMDB:** 
**Info:** 

---
*Auto-generated: ${new Date().toISOString().split('T')[0]}*`;
    }

    /**
     * Generate TV show template content
     */
    private generateShowTemplate(data: ContentData): string {
        const episodes = data.episodes || 12;
        
        let episodeList = '';
        for (let i = 1; i <= episodes; i++) {
            episodeList += `- [ ] Episode ${i}\n`;
        }

        return `---
cover: ${data.coverUrl || ''}
title: ${data.title}
author: ${data.author || ''}
studio: ${data.studio || ''}
genre: ${data.genre || ''}
status: ${data.status || 'plan-to-watch'}
rating: ${data.rating || ''}
season: 1
episodes: ${episodes}
year: ${data.year || ''}
source: ${data.source || ''}
streaming_service: 
tags:
  - ${data.status || 'plan-to-watch'}
  - tv-show
cssclass: zettelkasten
---

# 📺 ${data.title}

${data.coverUrl ? `![cover|300](${data.coverUrl})` : ''}

*Auto-populated with web search data - verify and update as needed*

## 📋 Show Information

**Title:** \`=(this.title)\`  
**Creator:** \`=(this.author)\`  
**Studio:** \`=(this.studio)\`  
**Genre:** \`=(this.genre)\`  
**Source:** \`=(this.source)\`  
**Year:** \`=(this.year)\`  
**Season:** \`=(this.season)\`  
**Episodes:** \`=(this.episodes)\`  
**Status:** \`=(this.status)\`  
**Rating:** \`=(choice(this.rating != "", this.rating + "⭐", "Not Rated"))\`  

---

## 📊 Watching Progress

### Episode Tracking
**Progress:** \`$= let totalEps = this.episodes || ${episodes}; let watchedEps = length(filter(split(file.content, "\\n"), (line) => contains(line, "- [x] Episode"))); Math.round((watchedEps / totalEps) * 100)\`% (\`$= length(filter(split(file.content, "\\n"), (line) => contains(line, "- [x] Episode")))\`/\`$= this.episodes || ${episodes}\` episodes)

**Episodes:**
${episodeList}

${data.description ? `## 📝 Description\n\n${data.description}\n\n` : ''}---

## ⭐ My Review

### Overall Rating: ${data.rating ? data.rating + '/5 ⭐' : 'Not Rated'}

### My Thoughts
> *Write your thoughts here...*

### Favorite Characters
- 

### What I Liked ✅
- 

### What Could Be Better ❌
- 

---

## 🔗 Quick Links
**Watch:** 
**Info:** 

---
*Auto-generated: ${new Date().toISOString().split('T')[0]}*`;
    }

    /**
     * Generate habit template content
     */
    private generateHabitTemplate(data: TemplateData): string {
        return `---
habit_name: ${data.habit_name}
category: ${data.category || 'other'}
difficulty: ${data.difficulty || '3'}
frequency: ${data.frequency || 'daily'}
time_required: ${data.time_required || '30 minutes'}
best_time: ${data.best_time || 'morning'}
priority: ${data.priority || 'medium'}
start_date: ${new Date().toISOString().split('T')[0]}
target_streak: ${data.target_streak || '30'}
current_streak: ${data.current_streak || '0'}
longest_streak: ${data.longest_streak || '0'}
total_completions: ${data.total_completions || '0'}
tags:
  - habits
  - habit-tracking
  - ${data.category || 'other'}
cssclass: habit-profile
---

# 🎯 ${data.habit_name} - Habit Profile

*Auto-populated with research-based recommendations - customize as needed*

## 📋 Habit Details

**Habit:** \`=(this.habit_name)\`  
**Category:** \`=(this.category)\` 
**Difficulty:** \`=(this.difficulty)\`/5 ⭐  
**Frequency:** \`=(this.frequency)\`  
**Time Required:** \`=(this.time_required)\`  
**Best Time:** \`=(this.best_time)\`  
**Priority:** \`=(this.priority)\`  

**Started:** \`=(this.start_date)\`  
**Days Active:** \`$= Math.floor((moment().diff(moment(dv.current().start_date), 'days')))\`

---

## 🎯 Habit Strategy

### Why This Habit Matters
> **Research shows:** This habit can improve your health, productivity, and well-being.

### Success Triggers
- **Cue/Trigger:** Set a specific time and location
- **Reward:** Celebrate small wins
- **Environment:** Prepare your space the night before

---

## 📅 Daily Tracking

Use this format in your daily notes:
\`\`\`
- [ ] ${data.habit_name} (${data.time_required}) 📅 YYYY-MM-DD 🔁 ${data.frequency} #Habit/${(data.habit_name as string).replace(/\s+/g, '')}
\`\`\`

---
*Auto-generated: ${new Date().toISOString().split('T')[0]}*`;
    }
}