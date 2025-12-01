import React, { useState } from 'react';
import { BookOpen, Calculator, TrendingUp, Zap, Heart, Activity, ChevronDown, ChevronUp, User, Target, Award, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

const Methodology = () => {
  const [expandedSections, setExpandedSections] = useState({
    intro: true,
    raceAnalysis: true,
    riderType: false,
    autoMatching: false,
    trainingAlignment: false,
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
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors p-4 sm:p-6 min-h-[60px]"
        onClick={() => toggleSection(id)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <CardTitle className="text-base sm:text-lg md:text-xl truncate">{title}</CardTitle>
          </div>
          {expandedSections[id] ? (
            <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          )}
        </div>
        {description && <CardDescription className="text-xs sm:text-sm mt-1">{description}</CardDescription>}
      </CardHeader>
      {expandedSections[id] && (
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
          <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
          Methodology & Science
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
          Understanding the calculations and research behind your training metrics
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click any section to expand or collapse
        </p>
      </div>

      <CollapsibleCard
        id="intro"
        title="Evidence-Based Training"
        icon={BookOpen}
      >
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
          AI Fitness Coach uses scientifically validated methods developed by leading sports scientists
          and adopted by professional coaches worldwide. All calculations are based on peer-reviewed
          research and industry-standard protocols.
        </p>
      </CollapsibleCard>

      <CollapsibleCard
        id="raceAnalysis"
        title="Post-Race Analysis & Learning Loop"
        icon={Trophy}
        description="AI-powered race analysis with pre-race fatigue assessment and continuous improvement"
      >
        <div>
          <h3 className="font-semibold text-base sm:text-lg mb-2">What is the Learning Loop?</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Our Post-Race Analysis system creates a complete learning loop that transforms race experiences
            into actionable insights. By analyzing your race performance, pre-race training load, and subjective
            feedback, the AI identifies what worked, what didn't, and automatically integrates these learnings
            into your future training plans.
          </p>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-3 sm:p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
          <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            The Complete Race Lifecycle
          </h4>
          <div className="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400 text-base sm:text-lg flex-shrink-0">1</span>
              <div><strong>Race Preparation:</strong> Generate race-day strategy with power targets and pacing plan</div>
            </div>
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400 text-base sm:text-lg flex-shrink-0">2</span>
              <div><strong>Race Execution:</strong> Complete the race and sync activity from Strava</div>
            </div>
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400 text-base sm:text-lg flex-shrink-0">3</span>
              <div><strong>Post-Race Feedback:</strong> Submit 2-minute survey with subjective experience</div>
            </div>
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400 text-base sm:text-lg flex-shrink-0">4</span>
              <div><strong>AI Analysis:</strong> GPT-4 analyzes performance, pacing, tactics, and pre-race fatigue</div>
            </div>
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400 text-base sm:text-lg flex-shrink-0">5</span>
              <div><strong>Training Integration:</strong> Next training plan automatically addresses weaknesses</div>
            </div>
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400 text-base sm:text-lg flex-shrink-0">6</span>
              <div><strong>Improved Performance:</strong> Race-informed training leads to better results</div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Pre-Race Training Load Analysis</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Our system examines the 14 days before your race to determine if you arrived fresh or carrying fatigue.
            This is critical for understanding race performance in context.
          </p>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <strong>Data Collected:</strong>
              <ul className="ml-4 mt-1 space-y-1 list-disc">
                <li>Total TSS (14 days) - Overall training load</li>
                <li>Average Daily TSS - Training intensity per day</li>
                <li>Week 2 TSS (days 14-8) - Training block before taper</li>
                <li>Week 1 TSS (days 7-1) - Taper week</li>
                <li>Taper Ratio - Week 1 TSS / Week 2 TSS (ideal: 40-60%)</li>
                <li>Individual activities with TSS values</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
              <strong>Example Analysis:</strong>
              <div className="font-mono text-xs mt-2 space-y-1">
                <div>Total TSS (14 days): 850</div>
                <div>Week 2 TSS: 520</div>
                <div>Week 1 TSS: 330</div>
                <div>Taper Ratio: 63% ⚠️ (slightly high)</div>
              </div>
              <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                AI Insight: "Your taper ratio was 63% (ideal is 40-60%), meaning you didn't reduce
                volume enough in the final week. This likely contributed to the heavy legs you felt."
              </p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">AI Analysis Components</h4>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <strong>1. Performance Scores (0-100):</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• <strong>Overall:</strong> Holistic race performance assessment</li>
                <li>• <strong>Pacing:</strong> Energy distribution and power management</li>
                <li>• <strong>Execution:</strong> Plan adherence and decision-making</li>
                <li>• <strong>Tactical:</strong> Race positioning and strategic choices</li>
              </ul>
            </div>
            <div>
              <strong>2. Fatigue State Assessment:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Was the athlete properly rested?</li>
                <li>• Taper quality evaluation (gradual reduction, intensity maintained)</li>
                <li>• Correlation between training load and performance</li>
                <li>• Freshness level at race start</li>
              </ul>
            </div>
            <div>
              <strong>3. Contextual Analysis:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Compares actual vs planned power/HR</li>
                <li>• Integrates athlete's subjective feedback</li>
                <li>• Considers pre-race training stress</li>
                <li>• Evaluates pacing strategy effectiveness</li>
              </ul>
            </div>
            <div>
              <strong>4. Actionable Recommendations:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• What went well (3-4 concise points)</li>
                <li>• What didn't go well (3-4 concise points)</li>
                <li>• Key insights and patterns</li>
                <li>• Specific recommendations for next race</li>
                <li>• Training focus areas to address</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Automatic Training Plan Integration</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            When you generate your next training plan, the AI automatically loads your last 3 race analyses
            and uses them to customize your training:
          </p>
          <div className="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <div>
              <strong>Race Data Sent to AI:</strong>
              <ul className="ml-4 mt-1 space-y-1 list-disc">
                <li>Performance scores (overall, pacing, execution, tactical)</li>
                <li>What went well and what didn't</li>
                <li>Training focus areas identified</li>
                <li>Specific recommendations from analysis</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-700 mt-2">
              <strong>Example Integration:</strong>
              <p className="text-xs mt-1 dark:text-gray-300">
                "This plan has been customized based on your recent race analysis. Key focus:
                <strong> Pacing Strategy</strong>. We're addressing your pacing score (60/100) and
                building on your strength in <strong>sustained power output</strong>. Sessions include
                specific pacing drills to improve energy distribution."
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">🎯 Taper Guidelines</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Research-backed taper ratios for optimal race-day freshness:
          </p>
          <div className="space-y-2 text-sm dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span><strong>40-50%:</strong> Aggressive taper (hard training blocks)</span>
              <span className="px-2 py-1 bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded text-xs">OPTIMAL</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>50-60%:</strong> Standard taper (most athletes)</span>
              <span className="px-2 py-1 bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded text-xs">OPTIMAL</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>60-70%:</strong> Light taper (moderate training)</span>
              <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded text-xs">ACCEPTABLE</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>70%+:</strong> Insufficient taper</span>
              <span className="px-2 py-1 bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded text-xs">CARRYING FATIGUE</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>&lt;40%:</strong> Excessive taper</span>
              <span className="px-2 py-1 bg-orange-200 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 rounded text-xs">DETRAINING RISK</span>
            </div>
          </div>
        </div>

        <div className="border-l-4 border-yellow-500 pl-4">
          <h4 className="font-semibold text-sm sm:text-base mb-2">📚 Academic Sources</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>
              <strong>Bosquet, L., et al.</strong> (2007). "Effects of tapering on performance: a meta-analysis."
              <em>Medicine & Science in Sports & Exercise, 39</em>(8), 1358-1365.
              <br />
              <a href="https://doi.org/10.1249/mss.0b013e31806010e0" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.1249/mss.0b013e31806010e0
              </a>
            </li>
            <li>
              <strong>Mujika, I., & Padilla, S.</strong> (2003). "Scientific bases for precompetition tapering strategies."
              <em>Medicine & Science in Sports & Exercise, 35</em>(7), 1182-1187.
              <br />
              <a href="https://doi.org/10.1249/01.MSS.0000074448.73931.11" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.1249/01.MSS.0000074448.73931.11
              </a>
            </li>
            <li>
              <strong>Thomas, L., & Busso, T.</strong> (2005). "A theoretical study of taper characteristics to optimize performance."
              <em>Medicine & Science in Sports & Exercise, 37</em>(9), 1615-1621.
              <br />
              <a href="https://doi.org/10.1249/01.mss.0000177461.94156.4b" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.1249/01.mss.0000177461.94156.4b
              </a>
            </li>
            <li>
              <strong>Banister, E. W., et al.</strong> (1999). "Modeling human performance in running."
              <em>Journal of Applied Physiology, 69</em>(3), 1171-1177.
              <br />
              <span className="text-xs text-gray-600">
                Foundational work on training stress and fatigue modeling (TSS/CTL/ATL concepts)
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">💡 Why This Matters</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc list-inside ml-2">
            <li>
              <strong>Complete Picture:</strong> Understanding performance requires context - race data alone
              isn't enough. Pre-race training load is critical for interpretation.
            </li>
            <li>
              <strong>Systematic Learning:</strong> Research shows that deliberate reflection and analysis
              accelerates skill acquisition and performance improvement.
            </li>
            <li>
              <strong>Fatigue Management:</strong> Studies demonstrate that proper tapering can improve
              performance by 2-6%. Our system helps you optimize this.
            </li>
            <li>
              <strong>Personalized Insights:</strong> Generic advice doesn't work. AI analysis considers YOUR
              specific data, feedback, and training history.
            </li>
            <li>
              <strong>Continuous Improvement:</strong> The learning loop ensures each race makes you smarter
              and better prepared for the next one.
            </li>
            <li>
              <strong>Competitive Advantage:</strong> No other platform connects pre-race training load,
              race performance, and future training in an automated learning loop.
            </li>
          </ul>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="riderType"
        title="Rider Type Classification"
        icon={User}
        description="Discover your unique athletic profile"
      >
        <div>
          <h3 className="font-semibold text-base sm:text-lg mb-2">What is Rider Type Classification?</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Our AI-powered system analyzes your power curve, activity patterns, and terrain preferences
            to automatically classify you into one of six rider types. This helps you understand your
            natural strengths and optimize your training focus.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">The Six Rider Types</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Sprinter</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Explosive power in short efforts (5-30s), excels in final sprints</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⛰️</span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Climber</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">High power-to-weight ratio, thrives on steep gradients and long climbs</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚴</span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Rouleur</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Consistent power output, strong on flat and rolling terrain</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Time Trialist</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Sustained high power (20-60min), excellent aerodynamic efficiency</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💥</span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Puncheur</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Strong on short, steep climbs (1-5min) and punchy efforts</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">All-Rounder</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Balanced abilities across all terrains and durations</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">How Classification Works</h4>
          <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
            <li><strong>Power Curve Analysis:</strong> Examines your best power across 8 durations (5s to 60min)</li>
            <li><strong>Terrain Preference:</strong> Analyzes elevation gain patterns in your activities</li>
            <li><strong>Power-to-Weight:</strong> Evaluates climbing ability relative to body weight</li>
            <li><strong>Consistency Metrics:</strong> Assesses power variability and sustained efforts</li>
            <li><strong>Confidence Score:</strong> Provides 0-100% confidence in classification</li>
          </ol>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">💡 Why This Matters</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside ml-2">
            <li><strong>Self-Awareness:</strong> Understand your natural athletic strengths</li>
            <li><strong>Training Focus:</strong> Optimize workouts for your rider type</li>
            <li><strong>Race Strategy:</strong> Choose events that suit your profile</li>
            <li><strong>Motivation:</strong> Embrace your unique identity as an athlete</li>
          </ul>
        </div>

        <div className="border-l-4 border-indigo-500 pl-4">
          <h4 className="font-semibold text-sm sm:text-base mb-2">📚 Academic Sources</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
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
        id="autoMatching"
        title="Automatic Activity Matching"
        icon={Zap}
        description="Intelligent session verification using multi-factor analysis"
      >
        <div>
          <h3 className="font-semibold text-base sm:text-lg mb-2">How Automatic Matching Works</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Our system automatically matches your completed activities to planned training sessions using
            a sophisticated multi-factor algorithm. This eliminates manual tracking errors and provides
            objective verification that your training aligns with your plan.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Matching Algorithm (4 Factors)</h4>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 min-w-[60px]">30 points</span>
              <div>
                <strong>Duration Match:</strong> Compares planned vs actual duration. Perfect match within 10%,
                partial credit up to 30% difference.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 min-w-[60px]">40 points</span>
              <div>
                <strong>Intensity Match:</strong> Analyzes power data (or heart rate) against training zones.
                Verifies you trained at the correct intensity for the session type.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 min-w-[60px]">20 points</span>
              <div>
                <strong>Activity Type:</strong> Confirms the activity is cycling (road or virtual).
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 min-w-[60px]">10 points</span>
              <div>
                <strong>TSS/Effort Match:</strong> Validates overall training stress matches expectations.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">✅ Matching Thresholds</h4>
          <div className="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span><strong>90-100%:</strong> Excellent match</span>
              <span className="px-2 py-1 bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded text-xs font-bold">AUTO-COMPLETE</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>80-89%:</strong> Very good match</span>
              <span className="px-2 py-1 bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded text-xs font-bold">AUTO-COMPLETE</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>70-79%:</strong> Good match</span>
              <span className="px-2 py-1 bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded text-xs font-bold">AUTO-COMPLETE</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>60-69%:</strong> Acceptable match</span>
              <span className="px-2 py-1 bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded text-xs font-bold">AUTO-COMPLETE</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>&lt;60%:</strong> Poor match</span>
              <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded text-xs font-bold">MANUAL REVIEW</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
            Sessions with ≥60% match score are automatically marked complete. Lower scores require manual verification.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">🎯 Intensity Zone Verification</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            The system verifies your activity intensity matches the planned session type using power-based zones:
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span><strong>Recovery:</strong></span>
              <span className="font-mono">0-55% FTP</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>Endurance:</strong></span>
              <span className="font-mono">55-75% FTP</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>Tempo:</strong></span>
              <span className="font-mono">75-90% FTP</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>Threshold:</strong></span>
              <span className="font-mono">90-105% FTP</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>VO2 Max:</strong></span>
              <span className="font-mono">105-120% FTP</span>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>Intervals:</strong></span>
              <span className="font-mono">105-130% FTP</span>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">💡 Hybrid Approach: Auto + Manual</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Our system combines the best of both worlds:
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside ml-2">
            <li><strong>Automatic:</strong> High-confidence matches (≥60%) are auto-completed</li>
            <li><strong>Manual Override:</strong> You can always manually mark sessions complete</li>
            <li><strong>Transparency:</strong> Every completion shows its match score and source</li>
            <li><strong>Quality Tracking:</strong> Alignment scores reflect actual training quality</li>
          </ul>
        </div>

        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-semibold text-sm sm:text-base mb-2">📚 Academic Sources</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>
              <strong>Jobson, S. A., et al.</strong> (2009). "The analysis and utilization of cycling training data."
              <em>Sports Medicine, 39</em>(10), 833-844.
              <br />
              <a href="https://doi.org/10.2165/11317840-000000000-00000" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.2165/11317840-000000000-00000
              </a>
            </li>
            <li>
              <strong>Sanders, D., & Heijboer, M.</strong> (2019). "Physical demands and power profile of different stage types
              within a cycling grand tour." <em>European Journal of Sport Science, 19</em>(6), 736-744.
              <br />
              <a href="https://doi.org/10.1080/17461391.2018.1554706" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.1080/17461391.2018.1554706
              </a>
            </li>
            <li>
              <strong>Passfield, L., et al.</strong> (2017). "Validity of the Training-Load Concept."
              <em>International Journal of Sports Physiology and Performance, 12</em>(Suppl 2), S2-42-S2-50.
              <br />
              <a href="https://doi.org/10.1123/ijspp.2016-0334" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.1123/ijspp.2016-0334
              </a>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">🔬 Why This Matters</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc list-inside ml-2">
            <li>
              <strong>Objective Verification:</strong> Removes subjective bias from training adherence tracking
            </li>
            <li>
              <strong>Quality Over Quantity:</strong> Ensures you're not just completing sessions, but doing them correctly
            </li>
            <li>
              <strong>Training Load Validation:</strong> Research shows that accurate training load monitoring is crucial
              for performance and injury prevention
            </li>
            <li>
              <strong>Intensity Distribution:</strong> Verifies you're training in the correct zones, which studies show
              is more important than total volume
            </li>
            <li>
              <strong>Reduced Cognitive Load:</strong> Automatic tracking means less time managing data, more time training
            </li>
          </ul>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="trainingAlignment"
        title="Training Alignment & Progress Tracking"
        icon={Target}
        description="Measuring adherence and progress towards your goals"
      >
        <div>
          <h3 className="font-semibold text-base sm:text-lg mb-2">What is Training Alignment?</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Training Alignment measures how well you're following your prescribed training plan. It compares
            the distribution of completed sessions against the planned distribution to calculate an alignment
            score (0-100%). Combined with our automatic activity matching system, this provides an objective,
            data-driven measure of training adherence and quality.
          </p>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">How Alignment is Calculated</h4>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="font-bold text-indigo-600">1.</span>
              <div>
                <strong>Planned Distribution:</strong> The AI generates a plan with specific session types
                (e.g., 40% Endurance, 30% Threshold, 20% Tempo, 10% Recovery)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-indigo-600">2.</span>
              <div>
                <strong>Completed Distribution:</strong> As you complete sessions, we track which types
                you've actually completed
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-indigo-600">3.</span>
              <div>
                <strong>Alignment Score:</strong> For each session type, we calculate:
                <div className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded border border-indigo-200 dark:border-indigo-700 mt-1">
                  completionRatio = (completed % / planned %) × 100
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-indigo-600">4.</span>
              <div>
                <strong>Weighted Average:</strong> The overall alignment is the weighted average of all
                session type completion ratios
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">✅ Perfect Alignment Example</h4>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><strong>Planned:</strong></div>
              <div><strong>Completed:</strong></div>
              <div>40% Endurance</div>
              <div>40% Endurance ✓</div>
              <div>30% Threshold</div>
              <div>30% Threshold ✓</div>
              <div>20% Tempo</div>
              <div>20% Tempo ✓</div>
              <div>10% Recovery</div>
              <div>10% Recovery ✓</div>
            </div>
            <div className="pt-2 border-t border-green-200">
              <strong>Result:</strong> 100% Alignment Score 🎯
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Following the plan exactly as prescribed results in optimal alignment and maximizes
              the effectiveness of your training.
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">⚠️ Partial Alignment Example</h4>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><strong>Planned:</strong></div>
              <div><strong>Completed:</strong></div>
              <div>40% Endurance</div>
              <div>20% Endurance (50% complete)</div>
              <div>30% Threshold</div>
              <div>15% Threshold (50% complete)</div>
              <div>20% Tempo</div>
              <div>10% Tempo (50% complete)</div>
              <div>10% Recovery</div>
              <div>5% Recovery (50% complete)</div>
            </div>
            <div className="pt-2 border-t border-yellow-200">
              <strong>Result:</strong> 50% Alignment Score
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Completing sessions proportionally maintains alignment, even if you haven't finished
              the entire plan. This shows you're following the prescribed distribution.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            "Working Towards" Rider Type System
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Each training plan event type maps to a target rider type with specific characteristics.
            As you complete your plan, you're developing the physiological adaptations needed to become
            that rider type. The AI uses this mapping to create race-specific workouts tailored to your event goals.
          </p>
          <div className="space-y-2 text-sm dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚴</span>
              <div><strong>Endurance Plan</strong> → Rouleur (sustained power, aerobic capacity)</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div><strong>Criterium Plan</strong> → Sprinter (explosive power, anaerobic capacity)</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⏱️</span>
              <div><strong>Time Trial Plan</strong> → Time Trialist (threshold power, pacing)</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⛰️</span>
              <div><strong>Climbing Plan</strong> → Climber (power-to-weight, VO2 max)</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <div><strong>Gran Fondo Plan</strong> → All Rounder (balanced abilities)</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💪</span>
              <div><strong>General Fitness</strong> → All Rounder (overall health, balanced training)</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">🎯 Race-Specific Training Intelligence</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Our AI training plan generator uses advanced prompt engineering to create workouts specifically
            designed for your target event. Every workout is contextualized to develop the exact physiological
            characteristics needed for race success.
          </p>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <strong>Event Type Analysis:</strong> The AI identifies your target rider type based on event
              selection and designs all workouts to develop those specific characteristics.
            </div>
            <div>
              <strong>Contextual Awareness:</strong> Plans consider your current fitness (FTP, training load),
              recent training history, days until event, and available training time.
            </div>
            <div>
              <strong>Workout Specificity:</strong> Each session includes detailed explanations of HOW it
              develops race-specific abilities, not just WHAT to do.
            </div>
            <div>
              <strong>Progressive Overload:</strong> Training builds from your current fitness level with
              proper periodization (Base → Build → Peak → Taper).
            </div>
            <div>
              <strong>Physiological Goals:</strong> Every event type maps to specific adaptations:
              <ul className="ml-4 mt-1 space-y-1">
                <li>• <strong>Endurance:</strong> Aerobic capacity, fat oxidation, muscular endurance</li>
                <li>• <strong>Criterium:</strong> Anaerobic capacity, sprint power, quick recovery</li>
                <li>• <strong>Time Trial:</strong> FTP improvement, lactate threshold, pacing discipline</li>
                <li>• <strong>Climbing:</strong> Power-to-weight ratio, VO2 max, climbing efficiency</li>
                <li>• <strong>Gran Fondo:</strong> Versatility, sustained power, endurance across terrains</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">📊 Overall Progress Calculation</h4>
          <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-indigo-200 dark:border-indigo-700 mb-2">
            Overall Progress = (Completion Rate × 0.7) + (Alignment Score × 0.3)
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Your overall progress combines two factors:
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside ml-2 mt-2">
            <li><strong>Completion Rate (70%):</strong> How many sessions you've completed</li>
            <li><strong>Alignment Score (30%):</strong> How well you're following the plan distribution</li>
          </ul>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            This weighted approach ensures that both quantity and quality of training are considered.
            You can achieve 90-100% progress by completing all sessions as prescribed.
          </p>
        </div>

        <div className="border-l-4 border-indigo-500 pl-4">
          <h4 className="font-semibold text-sm sm:text-base mb-2">📚 Academic Sources</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>
              <strong>Seiler, S., & Kjerland, G. Ø.</strong> (2006). "Quantifying training intensity distribution
              in elite endurance athletes: is there evidence for an 'optimal' distribution?"
              <em>Scandinavian Journal of Medicine & Science in Sports, 16</em>(1), 49-56.
              <br />
              <a href="https://doi.org/10.1111/j.1600-0838.2004.00418.x" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.1111/j.1600-0838.2004.00418.x
              </a>
            </li>
            <li>
              <strong>Stöggl, T. L., & Sperlich, B.</strong> (2015). "The training intensity distribution among
              well-trained and elite endurance athletes." <em>Frontiers in Physiology, 6</em>, 295.
              <br />
              <a href="https://doi.org/10.3389/fphys.2015.00295" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.3389/fphys.2015.00295
              </a>
            </li>
            <li>
              <strong>Esteve-Lanao, J., et al.</strong> (2007). "Impact of training intensity distribution on
              performance in endurance athletes." <em>Journal of Strength and Conditioning Research, 21</em>(3), 943-949.
              <br />
              <a href="https://doi.org/10.1519/R-19725.1" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.1519/R-19725.1
              </a>
            </li>
            <li>
              <strong>Bompa, T. O., & Haff, G. G.</strong> (2009). <em>Periodization: Theory and Methodology of Training</em> (5th ed.).
              Human Kinetics.
              <br />
              <span className="text-xs text-gray-600">
                Foundational text on training periodization and progressive overload principles
              </span>
            </li>
            <li>
              <strong>Foster, C., et al.</strong> (2001). "A new approach to monitoring exercise training."
              <em>Journal of Strength and Conditioning Research, 15</em>(1), 109-115.
              <br />
              <a href="https://doi.org/10.1519/00124278-200102000-00019" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                https://doi.org/10.1519/00124278-200102000-00019
              </a>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">💡 Why This Matters</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc list-inside ml-2">
            <li>
              <strong>Training Intensity Distribution (TID):</strong> Research shows that elite athletes follow
              specific intensity distributions (typically 80/20 or pyramidal). Our alignment system ensures
              you're following evidence-based distributions.
            </li>
            <li>
              <strong>Progressive Overload:</strong> By tracking both completion and alignment, we ensure you're
              applying progressive overload correctly across all training zones.
            </li>
            <li>
              <strong>Specificity Principle:</strong> The "Working Towards" system ensures your training is
              specific to your event goals, developing the exact physiological adaptations needed.
            </li>
            <li>
              <strong>Adherence Monitoring:</strong> Studies show that training adherence is one of the strongest
              predictors of performance improvement. Our system makes adherence visible and measurable.
            </li>
            <li>
              <strong>Motivation & Feedback:</strong> Real-time progress tracking provides immediate feedback,
              which research shows improves training adherence and outcomes.
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
          <h3 className="font-semibold text-base sm:text-lg mb-2">What is TSS?</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Training Stress Score (TSS) is a composite number that takes into account the duration
            and intensity of a workout to arrive at a single estimate of the overall training load
            and physiological stress created by that training session.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">Power-Based Calculation (Most Accurate)</h4>
          <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
            TSS = (Duration in hours) × (Intensity Factor)² × 100
            <br />
            <span className="text-gray-600 dark:text-gray-400">where Intensity Factor = Normalized Power / FTP</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            <strong>Example:</strong> A 1.5-hour ride at 200W normalized power with FTP of 250W:
            <br />
            IF = 200/250 = 0.8
            <br />
            TSS = 1.5 × 0.8² × 100 = <strong>96 TSS</strong>
          </p>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">Heart Rate-Based Estimation (Fallback)</h4>
          <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border border-indigo-200 dark:border-indigo-700">
            TSS ≈ (Duration in hours) × (Avg HR / Threshold HR)² × 100
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            Used when power data is unavailable. Assumes threshold heart rate of ~170 bpm.
          </p>
        </div>

        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-semibold text-sm sm:text-base mb-2">📚 Academic Sources</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
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
          <h3 className="font-semibold text-base sm:text-lg mb-2">What is FTP?</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            FTP is the highest average power you can sustain for approximately one hour.
            It represents your lactate threshold and is the cornerstone metric for power-based training.
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">Auto-Detection Method</h4>
          <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
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
        id="fthr"
        title="Functional Threshold Heart Rate (FTHR)"
        icon={Heart}
        description="Your sustainable heart rate benchmark"
      >
        <div>
          <h3 className="font-semibold text-base sm:text-lg mb-2">What is FTHR?</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            FTHR is the highest average heart rate you can sustain for approximately one hour.
            It represents your lactate threshold heart rate and is used to set heart rate training zones
            for athletes who train without a power meter.
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">Auto-Detection Method</h4>
          <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
            <li>Analyzes activities from the last 6 weeks with heart rate data</li>
            <li>Identifies your best 20-60 minute sustained efforts</li>
            <li>Applies standard FTHR test protocols:
              <ul className="ml-6 mt-1 list-disc list-inside">
                <li><strong>20-30 minute test:</strong> FTHR = 95% of average HR</li>
                <li><strong>30-60 minute effort:</strong> FTHR = 100% of average HR</li>
              </ul>
            </li>
            <li>Filters for steady-state efforts (excludes interval workouts)</li>
            <li>Updates automatically as you complete new workouts</li>
          </ol>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-3">
          <h4 className="font-semibold text-sm sm:text-base mb-2">Heart Rate Training Zones</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Once FTHR is established, training zones are calculated as percentages:
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside ml-2">
            <li><strong>Zone 1 (Recovery):</strong> &lt;68% FTHR</li>
            <li><strong>Zone 2 (Endurance):</strong> 69-83% FTHR</li>
            <li><strong>Zone 3 (Tempo):</strong> 84-94% FTHR</li>
            <li><strong>Zone 4 (Threshold):</strong> 95-105% FTHR</li>
            <li><strong>Zone 5 (VO2 Max):</strong> &gt;106% FTHR</li>
          </ul>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          <p><strong>Reference:</strong></p>
          <p>Friel, J. (2009). <em>The Cyclist's Training Bible</em> (4th ed.). VeloPress.</p>
          <p className="mt-1">
            <a
              href="https://www.trainingpeaks.com/blog/joe-friel-s-quick-guide-to-setting-zones/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              TrainingPeaks: Joe Friel's Guide to Setting Zones
            </a>
          </p>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="aerobic-efficiency"
        title="Aerobic Efficiency (Pw:HR Ratio)"
        icon={TrendingUp}
        description="Measuring cardiovascular fitness improvements"
      >
        <div>
          <h3 className="font-semibold text-base sm:text-lg mb-2">What is Aerobic Efficiency?</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Aerobic Efficiency, also known as Cardiac Efficiency or the Power-to-Heart Rate (Pw:HR) ratio,
            measures how much power you produce per heartbeat. It's calculated as <strong>Average Power ÷ Average Heart Rate</strong>
            and expressed in watts per beat per minute (W/bpm).
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">Why It Matters</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Aerobic efficiency is a key indicator of cardiovascular fitness and training adaptation:
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside ml-2">
            <li><strong>Increasing efficiency:</strong> Your heart is becoming more efficient at delivering oxygen to working muscles</li>
            <li><strong>Better aerobic capacity:</strong> You can produce more power with less cardiovascular strain</li>
            <li><strong>Training effectiveness:</strong> Indicates positive adaptations from endurance training</li>
            <li><strong>Fatigue indicator:</strong> Declining efficiency may signal overtraining or need for recovery</li>
          </ul>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-3">
          <h4 className="font-semibold text-sm sm:text-base mb-2">Calculation Method</h4>
          <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
            <li>Analyzes activities with both power and heart rate data</li>
            <li>Calculates efficiency ratio for each activity: <strong>Avg Power ÷ Avg HR</strong></li>
            <li>Tracks trend over the last 4 weeks</li>
            <li>Compares recent efficiency to earlier baseline</li>
            <li>Reports percentage change as improvement or decline</li>
          </ol>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mt-3">
          <h4 className="font-semibold text-sm sm:text-base mb-2">Interpreting Your Results</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc list-inside ml-2">
            <li><strong>Improving trend (+):</strong> Excellent! Your aerobic fitness is developing. Continue current training approach.</li>
            <li><strong>Stable trend (0):</strong> Maintaining fitness. Consider adding progressive overload if seeking improvement.</li>
            <li><strong>Declining trend (-):</strong> May indicate fatigue or overtraining. Consider adding recovery days or reducing intensity.</li>
          </ul>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          <p><strong>References:</strong></p>
          <p>Seiler, S. (2010). "What is best practice for training intensity and duration distribution in endurance athletes?"
            <em> International Journal of Sports Physiology and Performance</em>, 5(3), 276-291.</p>
          <p className="mt-1">
            <a
              href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3912323/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              NIH: Cardiac Output and Aerobic Capacity
            </a>
          </p>
          <p className="mt-1">
            <a
              href="https://www.trainingpeaks.com/blog/aerobic-decoupling-in-cycling/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              TrainingPeaks: Understanding Aerobic Decoupling
            </a>
          </p>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="zones"
        title="Training Load Zones"
        icon={TrendingUp}
        description="Understanding workout intensity and recovery"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-600 rounded">
            <div className="w-20 font-bold text-green-700 dark:text-green-400">1-49 TSS</div>
            <div className="flex-1">
              <div className="font-semibold text-green-900 dark:text-green-200">Easy / Recovery</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Low stress. Recoverable within hours. Promotes active recovery.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 rounded">
            <div className="w-20 font-bold text-yellow-700 dark:text-yellow-400">50-99 TSS</div>
            <div className="flex-1">
              <div className="font-semibold text-yellow-900 dark:text-yellow-200">Moderate</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Moderate stress. Recoverable in ~24 hours. Builds aerobic endurance.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 dark:border-orange-600 rounded">
            <div className="w-20 font-bold text-orange-700 dark:text-orange-400">100-149 TSS</div>
            <div className="flex-1">
              <div className="font-semibold text-orange-900 dark:text-orange-200">Hard</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                High stress. Requires 2 days recovery. Significant training stimulus.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 rounded">
            <div className="w-20 font-bold text-red-700 dark:text-red-400">150+ TSS</div>
            <div className="flex-1">
              <div className="font-semibold text-red-900 dark:text-red-200">Very Hard</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
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
          <h3 className="font-semibold text-base sm:text-lg mb-2">Why Not Just Average Power?</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Average power doesn't account for the physiological cost of power variability.
            A ride with many surges is more fatiguing than a steady ride at the same average power.
          </p>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">What is Normalized Power?</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
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
          <h3 className="font-semibold text-base sm:text-lg mb-2">How It Works</h3>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Our AI planner uses OpenAI's GPT-4 model, combined with your personal training data
            to generate periodized training plans following established coaching principles.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-sm sm:text-base mb-2">Periodization Principles</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside ml-2">
            <li><strong>Base Phase:</strong> Build aerobic capacity (Zone 2)</li>
            <li><strong>Build Phase:</strong> Increase intensity (Tempo, Threshold)</li>
            <li><strong>Peak Phase:</strong> Race-specific efforts</li>
            <li><strong>Taper:</strong> Reduce volume, maintain intensity</li>
          </ul>
        </div>
      </CollapsibleCard>

      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle>🔒 Data Privacy & Transparency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Your data stays yours.</strong> All calculations are performed locally or on our secure servers.
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside ml-2">
            <li>Activity data is cached locally in your browser</li>
            <li>No data is sold or shared with third parties</li>
            <li>You can revoke access at any time via Settings</li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6 border-t dark:border-gray-700">
        <p>
          This methodology is continuously updated based on the latest sports science research.
          <br />
          Last updated: November 2025 - Added FTHR & Aerobic Efficiency Tracking
        </p>
      </div>
    </div>
  );
};

export default Methodology;
