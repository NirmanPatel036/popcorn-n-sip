"use client"

import React, { useState, useEffect } from "react"
import { Film, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, User } from "lucide-react"
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  

  // Form validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const isPasswordStrong = (password: string) => {
    return password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError("")
  setSuccess("")

  // Validation (keep your existing validation code)
  if (!email || !password) {
    setError("Please fill in all required fields")
    return
  }

  if (!isValidEmail(email)) {
    setError("Please enter a valid email address")
    return
  }

  if (!isLogin) {
    if (!fullName.trim()) {
      setError("Please enter your full name")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (!isPasswordStrong(password)) {
      setError("Password must be at least 8 characters with uppercase, lowercase, and number")
      return
    }
  }

  setLoading(true)

  try {
    if (isLogin) {
      // LOGIN with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message)
      }

      setSuccess("Login successful! Redirecting...")
      setTimeout(() => {
        // Redirect to main app
        window.location.href = '/recommender'
      }, 1500)

    } else {
      // SIGNUP with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      setSuccess("Account created successfully! Please check your email to verify your account.")
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : "An error occurred")
  } finally {
    setLoading(false)
  }
}

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setFullName("")
    setError("")
    setSuccess("")
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <canvas 
          id="plexus-canvas" 
          className="w-full h-full opacity-70"
          ref={(canvas) => {
            if (canvas && !canvas.dataset.initialized) {
              canvas.dataset.initialized = 'true';
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              
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
                if (!ctx || !canvas) return;
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

      {/* Login Form Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4 relative">
            <Film className="w-8 h-8 text-red-500" />
            <svg
              viewBox="0 0 100 200"
              className="absolute left-[calc(50%+3.5rem)] top-[-65px] h-[130px] w-[60px] z-0"
              fill="none"
              stroke="#f87171"
              strokeWidth="2"
            >
              <path d="M50 0 C40 60, 60 90, 30 130" />
            </svg>
            <h1 className="text-4xl font-bold text-white z-10">
              Popcorn
              <span className="relative italic text-red-400 z-10 inline-block transform-gpu animate-pulse" 
                    style={{
                      animation: 'swing 3s ease-in-out infinite',
                      transformOrigin: 'top center'
                    }}>n</span>
              Sip
            </h1>
          </div>
          <p className="text-gray-400 text-base">
            {isLogin ? "Welcome back! Sign in to continue" : "Join us and discover amazing content"}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-8 border border-gray-700 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? "Sign In" : "Create Account"}
            </h2>
            <p className="text-gray-400 text-sm">
              {isLogin 
                ? "Enter your credentials to access your account" 
                : "Fill in your details to get started"
              }
            </p>
          </div>

          <div className="space-y-4">
            {/* Full Name (Sign Up Only) */}
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                    placeholder="Enter your full name"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign Up Only) */}
            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                    placeholder="Confirm your password"
                    required={!isLogin}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-900/50 border border-green-500 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-green-200 text-sm">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isLogin ? "Signing In..." : "Creating Account..."}
                </>
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                </>
              )}
            </button>
          </div>

          {/* Toggle between Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={toggleMode}
                className="text-red-400 hover:text-red-300 font-medium ml-1 transition-colors"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>

          {/* Forgot Password (Login Only) */}
          {isLogin && (
            <div className="mt-4 text-center">
              <button className="text-gray-400 hover:text-gray-300 text-sm transition-colors">
                Forgot your password?
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            💻 Nirman Patel • Built with Next.js, Tailwind CSS & ❤️ for AI • © 2025 Popcorn'n'Sip
          </p>
        </div>
      </div>
    </div>
  )
}