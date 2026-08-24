'use client';

import React, { useState, useEffect } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_RBAC_BASE_IP || 'http://localhost:5000/api';

interface NewsItem {
  title: string;
  description: string;
  url: string;
  published_at: string;
  source: string;
  author: string;
  tags: string[];
  reading_time?: number;
  comments?: number;
  score?: number;
}

interface CyberNewsProps {
  className?: string;
}

export function CyberNews({ className = '' }: CyberNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [cacheStatus, setCacheStatus] = useState<{ cached: boolean; timestamp: string | null }>({
    cached: false,
    timestamp: null
  });

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${BASE_URL}/news/cyber`);

        // Check cache status from response header
        const xCacheHeader = response.headers.get('X-Cache');
        setCacheStatus({
          cached: xCacheHeader === 'HIT',
          timestamp: xCacheHeader === 'HIT' ? new Date().toLocaleTimeString() : null
        });

        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }

        const data = await response.json();
        console.log(`[CYBER NEWS] Fetched ${data.news?.length || 0} news items (Cache: ${xCacheHeader || 'N/A'})`);
        setNews(data.news || []);
        setLastUpdated(new Date(data.last_updated));
      } catch (err: any) {
        console.error('Error fetching cyber news:', err);
        setError(err.message || 'Failed to load news');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();

    // Refresh every 30 minutes
    const interval = setInterval(fetchNews, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getSourceColor = (source: string) => {
    if (source === 'r/netsec') return 'text-orange-400';
    if (source === 'Dev.to') return 'text-purple-400';
    if (source === 'The Hacker News') return 'text-red-400';
    if (source === 'Krebs on Security') return 'text-cyan-400';
    if (source === 'CISA') return 'text-green-400';
    if (source === 'Schneier on Security') return 'text-yellow-400';
    if (source === 'SecurityWeek') return 'text-indigo-400';
    if (source === 'Dark Reading') return 'text-pink-400';
    if (source === 'Threatpost') return 'text-teal-400';
    return 'text-blue-400';
  };

  const getSourceBadgeColor = (source: string) => {
    if (source === 'r/netsec') return 'bg-orange-100 border-orange-300 text-orange-800';
    if (source === 'Dev.to') return 'bg-purple-100 border-purple-300 text-purple-800';
    if (source === 'The Hacker News') return 'bg-red-100 border-red-300 text-red-800';
    if (source === 'Krebs on Security') return 'bg-cyan-100 border-cyan-300 text-cyan-800';
    if (source === 'CISA') return 'bg-green-100 border-green-300 text-green-800';
    if (source === 'Schneier on Security') return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    if (source === 'SecurityWeek') return 'bg-indigo-100 border-indigo-300 text-indigo-800';
    if (source === 'Dark Reading') return 'bg-pink-100 border-pink-300 text-pink-800';
    if (source === 'Threatpost') return 'bg-teal-100 border-teal-300 text-teal-800';
    return 'bg-blue-100 border-blue-300 text-blue-800';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading && news.length === 0) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div className="bg-gradient-to-br from-white via-white to-blue-50/40 rounded-2xl border border-slate-200/70 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading cybersecurity news...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Light card container */}
      <div className="bg-gradient-to-br from-white via-white to-blue-50/40 rounded-2xl border border-slate-200/70 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">

        <div className="relative p-8">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Cybersecurity News Feed
                </h3>
                <p className="text-sm text-slate-500 mt-1">Latest updates from 9 trusted cybersecurity sources</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Cache Status Indicator */}
              {cacheStatus.cached && cacheStatus.timestamp && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">
                    Cached • {cacheStatus.timestamp}
                  </span>
                </div>
              )}

              {lastUpdated && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">Last Updated</p>
                  <p className="text-sm text-slate-600 font-mono">
                    {lastUpdated.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* News Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            {news.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                <div className="relative bg-blue-100/80 rounded-xl p-4 border border-blue-200 hover:border-cyan-500/30 transition-all duration-300 h-full flex flex-col">
                  {/* Source and Time */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getSourceBadgeColor(item.source)}`}>
                      {item.source}
                    </span>
                    <span className="text-xs text-slate-600">
                      {formatTimeAgo(item.published_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
                    {item.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2 flex-1">
                    {item.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-3 border-t border-blue-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate max-w-[100px]">{item.author}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.reading_time && item.reading_time > 0 && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{item.reading_time}m</span>
                        </div>
                      )}
                      {item.comments !== undefined && item.comments > 0 && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span>{item.comments}</span>
                        </div>
                      )}
                      {item.score !== undefined && item.score > 0 && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          <span>{item.score}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span key={tagIndex} className="text-xs px-2 py-0.5 bg-white border border-blue-200 text-slate-700 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>

          {/* Empty State */}
          {!isLoading && news.length === 0 && !error && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <p className="text-slate-500">No news available at the moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
