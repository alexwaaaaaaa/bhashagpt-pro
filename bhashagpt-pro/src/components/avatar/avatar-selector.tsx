'use client';

import React, { useState, useEffect } from 'react';
import { AvatarConfig } from '@/types/avatar';

interface AvatarSelectorProps {
  selectedAvatar: AvatarConfig | null;
  onAvatarSelect: (avatar: AvatarConfig) => void;
  language?: string;
  className?: string;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedAvatar,
  onAvatarSelect,
  language = 'en',
  className = '',
}) => {
  const [avatars, setAvatars] = useState<AvatarConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    gender: '',
    age: '',
    ethnicity: '',
  });

  useEffect(() => {
    fetchAvatars();
  }, [language, filters]);

  const fetchAvatars = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (language) params.append('language', language);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.age) params.append('age', filters.age);
      if (filters.ethnicity) params.append('ethnicity', filters.ethnicity);

      const response = await fetch(`/api/v1/avatar/avatars?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch avatars');
      }

      const data = await response.json();
      setAvatars(data.data);

      // Auto-select first avatar if none selected
      if (!selectedAvatar && data.data.length > 0) {
        onAvatarSelect(data.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load avatars');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value === prev[filterType as keyof typeof prev] ? '' : value,
    }));
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAvatars}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Choose Your Avatar</h3>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Gender Filter */}
          <div className="flex gap-1">
            {['male', 'female'].map((gender) => (
              <button
                key={gender}
                onClick={() => handleFilterChange('gender', gender)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filters.gender === gender
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
              </button>
            ))}
          </div>

          {/* Age Filter */}
          <div className="flex gap-1">
            {['young', 'middle', 'senior'].map((age) => (
              <button
                key={age}
                onClick={() => handleFilterChange('age', age)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filters.age === age
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {age.charAt(0).toUpperCase() + age.slice(1)}
              </button>
            ))}
          </div>

          {/* Clear Filters */}
          {(filters.gender || filters.age || filters.ethnicity) && (
            <button
              onClick={() => setFilters({ gender: '', age: '', ethnicity: '' })}
              className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 hover:bg-red-200"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {avatars.map((avatar) => (
          <div
            key={avatar.id}
            onClick={() => onAvatarSelect(avatar)}
            className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${
              selectedAvatar?.id === avatar.id
                ? 'ring-4 ring-blue-500 shadow-lg scale-105'
                : 'hover:shadow-md hover:scale-102'
            }`}
          >
            {/* Avatar Image */}
            <div className="aspect-square bg-gray-100">
              <img
                src={avatar.imageUrl}
                alt={avatar.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/avatar-placeholder.png';
                }}
              />
            </div>

            {/* Avatar Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
              <h4 className="text-white font-medium text-sm">{avatar.name}</h4>
              <p className="text-gray-300 text-xs">{avatar.description}</p>
              
              {/* Language Support */}
              <div className="flex flex-wrap gap-1 mt-1">
                {avatar.language.slice(0, 3).map((lang) => (
                  <span
                    key={lang}
                    className="bg-blue-600 text-white text-xs px-1 py-0.5 rounded"
                  >
                    {lang.toUpperCase()}
                  </span>
                ))}
                {avatar.language.length > 3 && (
                  <span className="text-gray-300 text-xs">
                    +{avatar.language.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* Selection Indicator */}
            {selectedAvatar?.id === avatar.id && (
              <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Avatar Tags */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                avatar.gender === 'male' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-pink-100 text-pink-800'
              }`}>
                {avatar.gender}
              </span>
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                {avatar.age}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {avatars.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">🤖</div>
          <p className="text-gray-600">No avatars found matching your criteria</p>
          <button
            onClick={() => setFilters({ gender: '', age: '', ethnicity: '' })}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Selected Avatar Info */}
      {selectedAvatar && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Selected Avatar: {selectedAvatar.name}</h4>
          <p className="text-blue-700 text-sm mb-2">{selectedAvatar.description}</p>
          <div className="flex flex-wrap gap-2">
            <div className="text-sm">
              <span className="font-medium text-blue-900">Languages:</span>
              <span className="text-blue-700 ml-1">
                {selectedAvatar.language.join(', ')}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-blue-900">Emotions:</span>
              <span className="text-blue-700 ml-1">
                {selectedAvatar.emotions.join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarSelector;