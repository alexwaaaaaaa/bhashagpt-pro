import { 
  MessageCircle, 
  Bot, 
  Languages, 
  Star, 
  Check,
  Play,
  Apple,
  Smartphone,
  Globe
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 opacity-90"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 mb-6">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-4">
              BhashaGPT Pro
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl sm:text-2xl lg:text-3xl text-purple-100 mb-8 font-light">
            Learn Any Language with AI Tutor
          </p>
          
          <p className="text-lg text-purple-200 mb-12 max-w-2xl mx-auto leading-relaxed">
            Experience the future of language learning with AI-powered conversations, 
            real-time translation, and personalized tutoring in 10+ languages.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button className="group relative px-8 py-4 bg-white text-purple-600 rounded-full font-semibold text-lg hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 shadow-2xl">
              <span className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Start Learning Free
              </span>
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-full font-semibold text-lg hover:bg-white/20 transition-all duration-300">
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">10+</div>
              <div className="text-sm text-purple-200">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">50K+</div>
              <div className="text-sm text-purple-200">Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">4.9</div>
              <div className="text-sm text-purple-200">Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to master any language with cutting-edge AI technology
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Voice Chat Feature */}
            <div className="group relative p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors duration-300">
                  <MessageCircle className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Voice Chat</h3>
                <p className="text-gray-300 leading-relaxed">
                  Practice speaking with AI tutors using advanced speech recognition and natural conversation flows.
                </p>
              </div>
            </div>

            {/* AI Avatar Feature */}
            <div className="group relative p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors duration-300">
                  <Bot className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">AI Avatar</h3>
                <p className="text-gray-300 leading-relaxed">
                  Learn from lifelike AI avatars that provide visual cues and engaging interactive experiences.
                </p>
              </div>
            </div>

            {/* Translation Feature */}
            <div className="group relative p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors duration-300">
                  <Languages className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Real-time Translation</h3>
                <p className="text-gray-300 leading-relaxed">
                  Instant translation between languages with context-aware AI for better understanding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-300">
              Start free, upgrade when you're ready for more features
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="relative p-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <div className="text-4xl font-bold text-white mb-4">$0<span className="text-lg text-gray-400">/month</span></div>
                <p className="text-gray-300">Perfect for getting started</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  '50 chat messages per month',
                  '10 minutes of voice interaction',
                  'Basic translation support',
                  'Community support'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button className="w-full py-3 px-6 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-full font-semibold hover:bg-white/20 transition-all duration-300">
                Get Started Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative p-8 bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl border border-purple-500/50">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="text-4xl font-bold text-white mb-4">$9.99<span className="text-lg text-gray-400">/month</span></div>
                <p className="text-gray-300">Everything you need to excel</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  'Unlimited chat messages',
                  'Unlimited voice interaction',
                  'AI avatar responses',
                  'Advanced translation',
                  'Priority support',
                  'Learning analytics'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg">
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Download Our App
          </h2>
          <p className="text-xl text-gray-300 mb-12">
            Take your language learning journey anywhere with our mobile apps
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all duration-300 transform hover:scale-105">
              <Apple className="w-8 h-8" />
              <div className="text-left">
                <div className="text-sm text-gray-300">Download on the</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </button>
            
            <button className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all duration-300 transform hover:scale-105">
              <Smartphone className="w-8 h-8" />
              <div className="text-left">
                <div className="text-sm text-gray-300">Get it on</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-300">
              Join thousands of happy learners worldwide
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Priya Sharma",
                role: "Software Engineer",
                content: "BhashaGPT Pro helped me learn Spanish in just 3 months! The AI tutor is incredibly patient and adaptive.",
                rating: 5,
                avatar: "PS"
              },
              {
                name: "Ahmed Hassan",
                role: "Business Analyst",
                content: "The voice chat feature is amazing. It feels like talking to a real person. My English has improved dramatically!",
                rating: 5,
                avatar: "AH"
              },
              {
                name: "Maria Rodriguez",
                role: "Teacher",
                content: "I use this app to learn Hindi for my students. The AI avatar makes learning so engaging and fun!",
                rating: 5,
                avatar: "MR"
              }
            ].map((testimonial, index) => (
              <div key={index} className="p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">BhashaGPT Pro</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                The future of language learning with AI-powered conversations and personalized tutoring.
              </p>
              <div className="flex gap-4">
                {['Twitter', 'Facebook', 'Instagram', 'LinkedIn'].map((social) => (
                  <button key={social} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors duration-300">
                    <Globe className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Download', 'Support'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 BhashaGPT Pro. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors duration-300">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors duration-300">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
