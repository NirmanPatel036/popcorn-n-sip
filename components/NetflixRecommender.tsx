"use client"

import React, { useState, useEffect } from "react"
import { Search, Upload, Star, Filter, Loader2, CheckCircle, Film, Globe, Clock, ChevronDown, Database, Play, MonitorPlay, Tv } from "lucide-react"
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Recommendation {
  title: string
  language: string
  content_type: string
  hours_viewed: number
}

// Dummy movie data for demonstration
const dummyMovies = [
  { id: 1, title: "Midnight Echoes", genre: "Thriller", rating: 4.8, language: "English", content_type: "Movie", hours_viewed: 2500000 },
  { id: 2, title: "Ocean's Symphony", genre: "Drama", rating: 4.6, language: "English", content_type: "Movie", hours_viewed: 1800000 },
  { id: 3, title: "Digital Horizons", genre: "Sci-Fi", rating: 4.9, language: "English", content_type: "Series", hours_viewed: 3200000 },
  { id: 4, title: "Garden of Memories", genre: "Romance", rating: 4.4, language: "Spanish", content_type: "Movie", hours_viewed: 1200000 }
]

const genres = ["All", "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Mystery", "Romance", "Sci-Fi", "Thriller"]

export default function NetflixRecommender() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [ratingFilter, setRatingFilter] = useState(0)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [availableContent, setAvailableContent] = useState<string[]>([])
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const [filteredMovies, setFilteredMovies] = useState<{
    id: number
    title: string
    genre: string
    rating: number
    language: string
    content_type: string
    hours_viewed: number
  }[]>([])
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [userName, setUserName] = useState<string>("")
  
  interface UploadedDatasetItem {
    id: number
    title: string
    genre: string
    rating: number
    language: string
    hours_viewed: number
    content_type: string
  }
  const [uploadedDataset, setUploadedDataset] = useState<UploadedDatasetItem[]>([])
  const [datasetStats, setDatasetStats] = useState({ total: 0, movies: 0, series: 0, languages: 0 })

  // Custom hook for animated counter
  const useAnimatedCounter = (target: number, duration: number = 1000) => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
      if (target === 0) {
        setCount(0);
        return;
      }
      
      let start = 0;
      const startTime = Date.now();
      
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(easeOut * target);
        
        setCount(current);
        
        if (progress >= 1) {
          clearInterval(timer);
          setCount(target);
        }
      }, 16); // 60fps
      
      return () => clearInterval(timer);
    }, [target, duration]);
    
    return count;
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    const sourceMovies = uploadedDataset.length > 0 ? uploadedDataset : []

    const filtered = sourceMovies.filter(movie => {
      const matchesSearch = movie.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesGenre = selectedGenre === "All" || movie.genre === selectedGenre
      const matchesRating = movie.rating >= ratingFilter
      return matchesSearch && matchesGenre && matchesRating
    })

    setFilteredMovies(filtered)
  }, [searchTerm, selectedGenre, ratingFilter, uploadedDataset])

  useEffect(() => {
    const getUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.full_name) {
            setUserName(user.user_metadata.full_name)
        } else if (user?.email) {
            setUserName(user.email.split('@')[0])
        }
    }
        getUserData()
  }, [])

  const fetchRecommendations = async () => {
    if (!searchTerm.trim()) {
      setError("Please enter a content title")
      return
    }

    setLoading(true)
    setError("")
    setShowRecommendations(true)

    try {
      const response = await fetch(`${API_BASE_URL}/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content_title: searchTerm,
          top_k: 5,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to get recommendations")
      }

      const data = await response.json()
      setRecommendations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  const simulateUploadProgress = () => {
    setUploadProgress(0)
    setIsUploading(true)
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    simulateUploadProgress()
    
    try {
      const response = await fetch(`${API_BASE_URL}/upload-data`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload file")
      }

      const result = await response.json()
      setError("")
      setAvailableContent(result.content || [])
      
      // Use actual uploaded data or fallback to dummy data for demo
      const actualData = result.data || dummyMovies.slice(0, 8); // Use more comprehensive data
      setUploadedDataset(actualData)
      
      // Calculate statistics
      interface DatasetStats {
        total: number;
        movies: number;
        series: number;
        languages: number;
      }

      const stats: DatasetStats = {
        total: actualData.length,
        movies: actualData.filter((item: UploadedDatasetItem) => item.content_type === 'Movie').length,
        series: actualData.filter((item: UploadedDatasetItem) => item.content_type === 'Series').length,
        languages: [...new Set(actualData.map((item: UploadedDatasetItem) => item.language))].length
      }
      setDatasetStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file")
      setUploadProgress(0)
      setIsUploading(false)
    }
  }
  
  const formatHoursViewed = (hours: number) => {
    if (hours >= 1000000000) {
      return `${(hours / 1000000000).toFixed(1)}B`
    } else if (hours >= 1000000) {
      return `${(hours / 1000000).toFixed(1)}M`
    } else if (hours >= 1000) {
      return `${(hours / 1000).toFixed(1)}K`
    }
    return hours.toString()
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />)
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />)
    }
    return stars
  }

  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-black p-8 flex items-center justify-center">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <canvas 
          id="plexus-canvas" 
          className="w-full h-full opacity-70"
          ref={(canvas) => {
            if (canvas && !canvas.dataset.initialized) {
              canvas.dataset.initialized = 'true';
              const ctx = canvas.getContext('2d');
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
              
                interface Particle {
                x: number
                y: number
                vx: number
                vy: number
                size: number
                }
                const particles: Particle[] = [];
              const particleCount = 60;
              
              for (let i = 0; i < particleCount; i++) {
                particles.push({
                  x: Math.random() * canvas.width,
                  y: Math.random() * canvas.height,
                  vx: (Math.random() - 0.5) * 0.5,
                  vy: (Math.random() - 0.5) * 0.5,
                  size: Math.random() * 2 + 1
                });
              }
              
              function animate() {
                if (!ctx) return;
                if (!canvas) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = '#ff0000';
                ctx.fillStyle = '#ff0000';
                
                particles.forEach((particle, i) => {
                  particle.x += particle.vx;
                  particle.y += particle.vy;
                  
                  if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                  if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
                  
                  ctx.beginPath();
                  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                  ctx.fill();
                  
                  particles.forEach((otherParticle, j) => {
                    if (i !== j) {
                      const dx = particle.x - otherParticle.x;
                      const dy = particle.y - otherParticle.y;
                      const distance = Math.sqrt(dx * dx + dy * dy);
                      
                      if (distance < 100) {
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.globalAlpha = (100 - distance) / 100 * 0.7;
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                      }
                    }
                  });
                });
                
                requestAnimationFrame(animate);
              }
              animate();
            }
          }}
        />
      </div>

      <div className="w-[70%] max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          {/* Logout Button - Top Right */}
          <div className="absolute top-0 right-0 flex items-center gap-3">
            <span className="text-gray-300 text-sm">Hi, {userName}!</span>
            <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2"
            >
                Logout
            </button>
          </div>
          <div className="inline-flex items-center gap-3 mb-4 relative">
            <Film className="w-8 h-8 text-red-500" />
            <svg
              viewBox="0 0 100 200"
              className="absolute left-[calc(50%+4.5rem)] top-[-130px] h-[130px] w-[60px] z-0"
              fill="none"
              stroke="#f87171"
              strokeWidth="2"
            >
              <path d="M50 0 C40 60, 60 90, 30 130" />
            </svg>
            <h1 className="text-4xl font-bold text-white z-10">
              Popcorn
              <span className="relative italic swing text-red-400 z-10">n</span>
              Sip
            </h1>
          </div>

          <p className="text-gray-400 text-base">
            Discover your next favourite movie/show with AI-powered recommendations
          </p>
        </div>
          
        {/* Upload Section */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Data Management</h2>
          </div>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <label className="relative cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300">
                Upload CSV Data
              </div>
            </label>
          </div>

          {/* Upload Progress */}
          {(isUploading || uploadProgress > 0) && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm">Uploading...</span>
                <span className="text-white text-sm">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              {uploadProgress >= 100 && (
                <>
                  <div className="flex items-center gap-2 mt-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Upload completed successfully!</span>
                  </div>
                </>
              )}
           </div>
          )}
        </div>

        {/* Search and Filter Section */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Find Your Next Favourite</h2>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or genre from your dataset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300"
            />
          </div>

          {/* Filters and Recommendation Button */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Genre Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                  className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white hover:bg-gray-700 transition-all duration-300 text-sm"
                >
                  <Filter className="w-4 h-4" />
                  <span>{selectedGenre}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {showGenreDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg overflow-hidden z-20 min-w-[120px]">
                    {genres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => {
                          setSelectedGenre(genre)
                          setShowGenreDropdown(false)
                        }}
                        className="block w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors text-sm"
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating Filter */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Min Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingFilter(star === ratingFilter ? 0 : star)}
                      className="transition-colors duration-200"
                    >
                      <Star 
                        className={`w-4 h-4 ${
                          star <= ratingFilter ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Find Recommendations Button */}
            <button
              onClick={fetchRecommendations}
              disabled={!searchTerm.trim() || loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finding...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Find Recommendations
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-6 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Recommendations Section */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">AI Recommendations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Film className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                      {rec.content_type}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm">{rec.title}</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <Globe className="w-3 h-3" />
                      <span>{rec.language}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{formatHoursViewed(rec.hours_viewed)} hours viewed</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo Data Indicator */}
        {!searchTerm.trim() && filteredMovies.length === 0 && uploadedDataset.length === 0 && (
          <div className="mb-4 text-center">
            <span className="inline-flex items-center gap-2 bg-orange-900/30 border border-orange-500/50 text-orange-300 px-3 py-1 rounded-full text-sm">
              <Database className="w-4 h-4" />
              Demo Dataset
            </span>
          </div>
        )}

        {/* Movie Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 hover:bg-gray-800 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    {movie.content_type}
                  </span>
                </div>
                <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                  {movie.genre}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-3">
                {movie.title}
              </h3>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {renderStars(movie.rating)}
                  <span className="text-white font-semibold ml-1 text-sm">{movie.rating}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-400">
                  <Globe className="w-3 h-3" />
                  <span className="text-xs">{movie.language}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{formatHoursViewed(movie.hours_viewed)} hours viewed</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMovies.length === 0 && (
          <div className="text-center py-8">
            <button 
              onClick={() => {
                setSearchTerm("")
                setSelectedGenre("All")
                setRatingFilter(0)
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 text-center border border-gray-700">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-white text-sm">Finding perfect recommendations...</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-gray-800">
          <p className="text-gray-500 text-sm">
            💻 Nirman Patel • Built with Next.js, Tailwind CSS & ❤️ for AI • © 2025 Popcorn'n'Sip
          </p>
        </div>
      </div>
    </div>
  )
}