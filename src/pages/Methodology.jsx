import React, { useState } from 'react';
import { BookOpen, Calculator, TrendingUp, Zap, Heart, Activity, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

const Methodology = () => {
  const [expandedSections, setExpandedSections] = useState({
    intro: true,
    riderType: false,
    tss: false,
    ftp: false,
    zones: false,
    np: false,
    ai: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const CollapsibleCard = ({ id, title, icon: Icon, description, children }) => (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => toggleSection(id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" />
            <CardTitle>{title}</CardTitle>
          </div>
          {expandedSections[id] ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {expandedSections[id] && (
        <CardContent className="space-y-4">
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Methodology & Science
        </h1>
        <p className="text-gray-600 mt-2">
          Understanding the calculations and research behind your training metrics
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Click any section to expand or collapse
        </p>
      </div>

      <CollapsibleCard
        id="intro"
        title="Evidence-Based Training"
        icon={BookOpen}
      >
        <p className="text-gray-700">
          AI Fitness Coach uses scientifically validated methods developed by leading sports scientists 
          and adopted by professional coaches worldwide. All calculations are based on peer-reviewed 
          research and industry-standard protocols.
        </p>
      </CollapsibleCard>

      <CollapsibleCard
        id="riderType"
        title="Rider Type Classification"
        icon={User}
        description="Discover your unique athletic profile"
      >
        <div>
          <h3 className="font-semibold text-lg mb-2">What is Rider Type Classification?</h3>
          <p className="text-gray-700">
            Our AI-powered system analyzes your power curve, activity patterns, and terrain preferences 
            to automatically classify you into one of six rider types. This helps you understand your 
            natural strengths and optimize your training focus.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">The Six Rider Types</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <div className="font-semibold text-gray-900">Sprinter</div>
                <div className="text-sm text-gray-700">Explosive power in short efforts (5-30s), excels in final sprints</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⛰️</span>
              <div>
                <div className="font-semibold text-gray-900">Climber</div>
                <div className="text-sm text-gray-700">High power-to-weight ratio, thrives on steep gradients and long climbs</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚴</span>
              <div>
                <div className="font-semibold text-gray-900">Rouleur</div>
                <div className="text-sm text-gray-700">Consistent power output, strong on flat and rolling terrain</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <div className="font-semibold text-gray-900">Time Trialist</div>
                <div className="text-sm text-gray-700">Sustained high power (20-60min), excellent aerodynamic efficiency</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💥</span>
              <div>
                <div className="font-semibold text-gray-900">Puncheur</div>
                <div className="text-sm text-gray-700">Strong on short, steep climbs (1-5min) and punchy efforts</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="font-semibold text-gray-900">All-Rounder</div>
                <div className="text-sm text-gray-700">Balanced abilities across all terrains and durations</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How Classification Works</h4>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li><strong>Power Curve Analysis:</strong> Examines your best power across 8 durations (5s to 60min)</li>
            <li><strong>Terrain Preference:</strong> Analyzes elevation gain patterns in your activities</li>
            <li><strong>Power-to-Weight:</strong> Evaluates climbing ability relative to body weight</li>
            <li><strong>Consistency Metrics:</strong> Assesses power variability and sustained efforts</li>
            <li><strong>Confidence Score:</strong> Provides 0-100% confidence in classification</li>
          </ol>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">💡 Why This Matters</h4>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-2">
            <li><strong>Self-Awareness:</strong> Understand your natural athletic strengths</li>
            <li><strong>Training Focus:</strong> Optimize workouts for your rider type</li>
            <li><strong>Race Strategy:</strong> Choose events that suit your profile</li>
            <li><strong>Motivation:</strong> Embrace your unique identity as an athlete</li>
          </ul>
        </div>

        <div className="border-l-4 border-purple-500 pl-4">
          <h4 className="font-semibold mb-2">📚 Academic Sources</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              <strong>Pinot, J., & Grappe, F.</strong> (2011). "The record power profile to assess performance 
              in elite cyclists." <em>International Journal of Sports Medicine, 32</em>(11), 839-844.
            </li>
            <li>
              <strong>Quod, M. J., et al.</strong> (2010). "The power profile predicts road race performance." 
              <em>International Journal of Sports Medicine, 31</em>(6), 397-401.
            </li>
            <li>
              <strong>Lucia, A., et al.</strong> (2001). "Physiological differences between professional and elite 
              road cyclists." <em>International Journal of Sports Medicine, 22</em>(5), 321-326.
            </li>
          </ul>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="tss"
        title="Training Stress Score (TSS)"
        icon={Calculator}
        description="Quantifying training load and fatigue"
      >
        <div>
          <h3 className="font-semibold text-lg mb-2">What is TSS?</h3>
          <p className="text-gray-700">
            Training Stress Score (TSS) is a composite number that takes into account the duration 
            and intensity of a workout to arrive at a single estimate of the overall training load 
            and physiological stress created by that training session.
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Power-Based Calculation (Most Accurate)</h4>
          <div className="font-mono text-sm bg-white p-3 rounded border border-blue-200">
            TSS = (Duration in hours) × (Intensity Factor)² × 100
            <br />
            <span className="text-gray-600">where Intensity Factor = Normalized Power / FTP</span>
          </div>
          <p className="text-sm text-gray-700 mt-2">
            <strong>Example:</strong> A 1.5-hour ride at 200W normalized power with FTP of 250W:
            <br />
            IF = 200/250 = 0.8
            <br />
            TSS = 1.5 × 0.8² × 100 = <strong>96 TSS</strong>
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Heart Rate-Based Estimation (Fallback)</h4>
          <div className="font-mono text-sm bg-white p-3 rounded border border-purple-200">
            TSS ≈ (Duration in hours) × (Avg HR / Threshold HR)² × 100
          </div>
          <p className="text-sm text-gray-700 mt-2">
            Used when power data is unavailable. Assumes threshold heart rate of ~170 bpm.
          </p>
        </div>

        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-semibold mb-2">📚 Academic Sources</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              <strong>Coggan, A. R.</strong> (2003). "Training and Racing Using a Power Meter."
            </li>
            <li>
              <strong>Allen, H., & Coggan, A.</strong> (2010). <em>Training and Racing with a Power Meter</em> (2nd ed.). VeloPress.
            </li>
          </ul>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="ftp"
        title="Functional Threshold Power (FTP)"
        icon={Zap}
        description="Your sustainable power benchmark"
      >
        <div>
          <h3 className="font-semibold text-lg mb-2">What is FTP?</h3>
          <p className="text-gray-700">
            FTP is the highest average power you can sustain for approximately one hour. 
            It represents your lactate threshold and is the cornerstone metric for power-based training.
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Auto-Detection Method</h4>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Analyzes activities from the last 6 weeks with power data</li>
            <li>Identifies your best 20-60 minute sustained efforts</li>
            <li>Applies standard FTP test protocols:
              <ul className="ml-6 mt-1 list-disc list-inside">
                <li><strong>20-minute test:</strong> FTP = 95% of average power</li>
                <li><strong>60-minute effort:</strong> FTP = 100% of average power</li>
              </ul>
            </li>
            <li>Updates automatically as you complete new workouts</li>
          </ol>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="zones"
        title="Training Load Zones"
        icon={TrendingUp}
        description="Understanding workout intensity and recovery"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
            <div className="w-20 font-bold text-green-700">1-49 TSS</div>
            <div className="flex-1">
              <div className="font-semibold text-green-900">Easy / Recovery</div>
              <div className="text-sm text-gray-700">
                Low stress. Recoverable within hours. Promotes active recovery.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
            <div className="w-20 font-bold text-yellow-700">50-99 TSS</div>
            <div className="flex-1">
              <div className="font-semibold text-yellow-900">Moderate</div>
              <div className="text-sm text-gray-700">
                Moderate stress. Recoverable in ~24 hours. Builds aerobic endurance.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
            <div className="w-20 font-bold text-orange-700">100-149 TSS</div>
            <div className="flex-1">
              <div className="font-semibold text-orange-900">Hard</div>
              <div className="text-sm text-gray-700">
                High stress. Requires 2 days recovery. Significant training stimulus.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="w-20 font-bold text-red-700">150+ TSS</div>
            <div className="flex-1">
              <div className="font-semibold text-red-900">Very Hard</div>
              <div className="text-sm text-gray-700">
                Very high stress. Requires 3+ days recovery. Race efforts.
              </div>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="np"
        title="Normalized Power (NP)"
        icon={Activity}
        description="Accounting for variability in effort"
      >
        <div>
          <h3 className="font-semibold text-lg mb-2">Why Not Just Average Power?</h3>
          <p className="text-gray-700">
            Average power doesn't account for the physiological cost of power variability. 
            A ride with many surges is more fatiguing than a steady ride at the same average power.
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">What is Normalized Power?</h4>
          <p className="text-sm text-gray-700">
            Normalized Power is a weighted average that accounts for the variable nature of cycling power. 
            It represents the "equivalent" steady power that would produce the same physiological stress.
          </p>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="ai"
        title="AI Training Plan Generation"
        icon={Heart}
        description="Personalized periodization using GPT-4"
      >
        <div>
          <h3 className="font-semibold text-lg mb-2">How It Works</h3>
          <p className="text-gray-700">
            Our AI planner uses OpenAI's GPT-4 model, combined with your personal training data 
            to generate periodized training plans following established coaching principles.
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Periodization Principles</h4>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-2">
            <li><strong>Base Phase:</strong> Build aerobic capacity (Zone 2)</li>
            <li><strong>Build Phase:</strong> Increase intensity (Tempo, Threshold)</li>
            <li><strong>Peak Phase:</strong> Race-specific efforts</li>
            <li><strong>Taper:</strong> Reduce volume, maintain intensity</li>
          </ul>
        </div>
      </CollapsibleCard>

      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle>🔒 Data Privacy & Transparency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-700">
            <strong>Your data stays yours.</strong> All calculations are performed locally or on our secure servers.
          </p>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-2">
            <li>Activity data is cached locally in your browser</li>
            <li>No data is sold or shared with third parties</li>
            <li>You can revoke access at any time via Settings</li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500 py-6 border-t">
        <p>
          This methodology is continuously updated based on the latest sports science research.
          <br />
          Last updated: October 2025
        </p>
      </div>
    </div>
  );
};

export default Methodology;
