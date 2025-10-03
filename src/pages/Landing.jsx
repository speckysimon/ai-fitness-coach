import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Users, TrendingUp, Zap, CheckCircle, ArrowRight, Trophy, Brain, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/Button';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Fitness Coach</h1>
                <p className="text-xs text-gray-500">Train Smarter. Race Faster.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button
                onClick={() => navigate('/login')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
              <Zap className="w-4 h-4" />
              World's First AI-Powered Team Race Strategy
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Your AI Cycling Coach
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                For You & Your Team
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              Get personalized training plans, race-day strategies, and team coordination 
              powered by AI. Train like a pro, race like a team, win together.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
              >
                Start Training Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="text-lg px-8 py-6"
              >
                See How It Works
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-white"></div>
                </div>
                <span>Join cyclists already training smarter</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
                <span className="ml-2 text-gray-600 text-sm">Loved by cyclists worldwide</span>
              </div>
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80"
                alt="Cyclists racing in a peloton"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border-2 border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-600">Races Won</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-xl text-gray-600">
              From solo training to team tactics, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Individual Features */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For You</h3>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">AI Training Plans</p>
                    <p className="text-sm text-gray-600">Personalized plans that adapt to your progress and schedule</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Race Day Strategy</p>
                    <p className="text-sm text-gray-600">GPX-based pacing plans for any race route</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Smart Activity Matching</p>
                    <p className="text-sm text-gray-600">Automatic tracking of your training plan adherence</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Performance Analytics</p>
                    <p className="text-sm text-gray-600">Deep insights into your fitness, form, and progression</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Team Features */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border-2 border-purple-200 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                UNIQUE
              </div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Your Team</h3>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">AI Team Strategy</p>
                    <p className="text-sm text-gray-600">Coordinated race tactics based on each rider's strengths</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Role Assignment</p>
                    <p className="text-sm text-gray-600">AI assigns optimal roles: leader, sprinter, domestique, climber</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Synchronized Plans</p>
                    <p className="text-sm text-gray-600">Individual race plans that work together as a team</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Post-Race Analysis</p>
                    <p className="text-sm text-gray-600">Learn what worked and improve for next time</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature Icons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Brain className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">AI-Powered</h4>
              <p className="text-sm text-gray-600">Smart, adaptive coaching</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Flexible</h4>
              <p className="text-sm text-gray-600">Adapts to your life</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Race Ready</h4>
              <p className="text-sm text-gray-600">Win more races</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-8 h-8 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Data-Driven</h4>
              <p className="text-sm text-gray-600">Insights that matter</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes, see results in weeks
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Strava</h3>
              <p className="text-gray-600">
                Link your Strava account to import your training history and analyze your fitness
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Set Your Goals</h3>
              <p className="text-gray-600">
                Tell us about your target event, available time, and preferences. AI does the rest
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Train & Race</h3>
              <p className="text-gray-600">
                Follow your personalized plan, execute race strategies, and achieve your goals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-blue-100">Training Plans Generated</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Races Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-blue-100">User Satisfaction</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">AI Coaching Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold mb-4">
              <Zap className="w-4 h-4" />
              LIMITED TIME OFFER
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Free During Beta
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get unlimited access to all features while we're in beta. 
              No credit card required. No strings attached.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Single Beta Card */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-3xl p-12 relative overflow-hidden shadow-2xl">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
              
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-block bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-full mb-4">
                    🎉 BETA ACCESS
                  </div>
                  <h3 className="text-3xl font-bold mb-2">Everything Included</h3>
                  <div className="mb-4">
                    <span className="text-6xl font-bold">$0</span>
                    <span className="text-2xl text-blue-100">/month</span>
                  </div>
                  <p className="text-blue-100 text-lg">
                    Full access to all features during beta period
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Individual Features
                    </h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>Unlimited AI training plans</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>Advanced race strategies</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>Activity matching & tracking</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>Performance analytics</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>Export to bike computer</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Team Features
                    </h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>AI team race strategy</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>Automated role assignment</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>Coordinated race plans</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>Post-race analysis</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                        <span>Priority support</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-12 py-6 font-bold"
                    onClick={() => navigate('/login')}
                  >
                    Get Free Beta Access
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <p className="text-sm text-blue-100 mt-4">
                    ✓ No credit card required  •  ✓ Cancel anytime  •  ✓ Early adopter benefits
                  </p>
                </div>
              </div>
            </div>

            {/* Future pricing note */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                <strong>After beta:</strong> Individual plans from $12/month • Club plans from $75/month
                <br />
                <span className="text-sm">Beta users get special lifetime discounts 🎁</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Train Smarter?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of cyclists achieving their goals with AI-powered coaching
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6"
              onClick={() => navigate('/login')}
            >
              Start Free Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6"
              onClick={() => navigate('/methodology')}
            >
              Learn More
            </Button>
          </div>
          <p className="text-sm text-blue-100 mt-6">
            No credit card required • Free forever • Upgrade anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <span className="text-white font-bold">AI Fitness Coach</span>
              </div>
              <p className="text-sm">
                Train smarter. Race faster. Win together.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#" onClick={() => navigate('/methodology')} className="hover:text-white">How It Works</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" onClick={() => navigate('/changelog')} className="hover:text-white">Changelog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" onClick={() => navigate('/privacy')} className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" onClick={() => navigate('/terms')} className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2025 AI Fitness Coach. All rights reserved.</p>
            <p className="mt-2">Powered by Strava • Built for cyclists</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
